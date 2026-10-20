-- Staff Direct Provisioning, Credential Reset, and Staff Profile Management
-- Fixes Phase 4, Phase 5, Phase 10

CREATE OR REPLACE FUNCTION public.provision_staff_account(
    p_restaurant_id uuid,
    p_outlet_id uuid,
    p_full_name text,
    p_login_id text,
    p_email text,
    p_password text,
    p_role text,
    p_station_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_auth_id uuid := auth.uid();
    v_caller_profile_id uuid;
    v_is_owner boolean := false;
    v_restaurant_code text;
    v_norm_login_id text;
    v_target_email text;
    v_new_user_id uuid;
    v_existing_profile_id uuid;
    v_membership_id uuid;
    v_encrypted_pw text;
BEGIN
    IF v_caller_auth_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to provision staff accounts';
    END IF;

    SELECT up.id INTO v_caller_profile_id
    FROM public.user_profiles up
    WHERE up.auth_user_id = v_caller_auth_id;

    IF v_caller_profile_id IS NULL THEN
        RAISE EXCEPTION 'Caller user profile not found';
    END IF;

    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = v_caller_profile_id AND is_super_admin = true) THEN
        v_is_owner := true;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.restaurant_memberships m
            WHERE m.restaurant_id = p_restaurant_id
              AND m.user_id = v_caller_profile_id
              AND m.role = 'owner'
              AND m.is_active = true
        ) INTO v_is_owner;
    END IF;

    IF NOT v_is_owner THEN
        RAISE EXCEPTION 'Only active restaurant owners can provision staff accounts';
    END IF;

    IF p_role NOT IN ('manager', 'waiter', 'kitchen', 'cashier') THEN
        RAISE EXCEPTION 'Invalid staff role: % (Allowed roles: manager, waiter, kitchen, cashier)', p_role;
    END IF;

    SELECT restaurant_code INTO v_restaurant_code
    FROM public.restaurants
    WHERE id = p_restaurant_id;

    IF v_restaurant_code IS NULL THEN
        RAISE EXCEPTION 'Restaurant not found';
    END IF;

    IF p_outlet_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.outlets WHERE id = p_outlet_id AND restaurant_id = p_restaurant_id) THEN
            RAISE EXCEPTION 'Branch does not belong to this restaurant';
        END IF;
    END IF;

    IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
        RAISE EXCEPTION 'Staff full name is required';
    END IF;

    IF p_login_id IS NULL OR trim(p_login_id) = '' THEN
        RAISE EXCEPTION 'Staff Login ID is required';
    END IF;

    v_norm_login_id := lower(trim(p_login_id));

    IF length(v_norm_login_id) < 3 THEN
        RAISE EXCEPTION 'Staff Login ID must be at least 3 characters';
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.restaurant_memberships
        WHERE restaurant_id = p_restaurant_id
          AND lower(login_id) = v_norm_login_id
    ) THEN
        RAISE EXCEPTION 'Staff Login ID "%" already exists in this restaurant', v_norm_login_id;
    END IF;

    IF p_email IS NOT NULL AND trim(p_email) <> '' THEN
        v_target_email := lower(trim(p_email));
    ELSE
        v_target_email := v_norm_login_id || '.' || lower(v_restaurant_code) || '@staff.restohub.internal';
    END IF;

    SELECT id INTO v_existing_profile_id
    FROM public.user_profiles
    WHERE lower(email) = v_target_email;

    IF v_existing_profile_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.restaurant_memberships
            WHERE restaurant_id = p_restaurant_id AND user_id = v_existing_profile_id
        ) THEN
            RAISE EXCEPTION 'A staff member with email % already has a membership in this restaurant', v_target_email;
        END IF;
        v_new_user_id := v_existing_profile_id;
    ELSE
        v_new_user_id := gen_random_uuid();
        v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            v_new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            v_target_email,
            v_encrypted_pw,
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('full_name', trim(p_full_name)),
            now(),
            now()
        );

        INSERT INTO auth.identities (
            id,
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_new_user_id::text,
            v_new_user_id,
            jsonb_build_object('sub', v_new_user_id::text, 'email', v_target_email, 'full_name', trim(p_full_name), 'email_verified', true, 'phone_verified', false),
            'email',
            now(),
            now(),
            now()
        );

        INSERT INTO public.user_profiles (
            id,
            auth_user_id,
            email,
            full_name,
            is_super_admin,
            created_at
        ) VALUES (
            v_new_user_id,
            v_new_user_id,
            v_target_email,
            trim(p_full_name),
            false,
            now()
        );
    END IF;

    INSERT INTO public.restaurant_memberships (
        id,
        user_id,
        restaurant_id,
        outlet_id,
        role,
        login_id,
        is_active,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_new_user_id,
        p_restaurant_id,
        p_outlet_id,
        p_role,
        v_norm_login_id,
        true,
        now()
    )
    RETURNING id INTO v_membership_id;

    INSERT INTO public.audit_logs (
        restaurant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_restaurant_id,
        v_caller_profile_id,
        'provision_staff_account',
        'restaurant_memberships',
        v_membership_id::text,
        jsonb_build_object(
            'staff_name', trim(p_full_name),
            'login_id', v_norm_login_id,
            'email', v_target_email,
            'role', p_role,
            'outlet_id', p_outlet_id,
            'membership_id', v_membership_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'membership_id', v_membership_id,
        'user_id', v_new_user_id,
        'restaurant_code', v_restaurant_code,
        'login_id', v_norm_login_id,
        'email', v_target_email,
        'role', p_role,
        'outlet_id', p_outlet_id,
        'full_name', trim(p_full_name)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_staff_password(
    p_restaurant_id uuid,
    p_membership_id uuid,
    p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_auth_id uuid := auth.uid();
    v_caller_profile_id uuid;
    v_is_owner boolean := false;
    v_target_user_id uuid;
    v_target_role text;
    v_target_login_id text;
    v_target_email text;
BEGIN
    IF v_caller_auth_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT up.id INTO v_caller_profile_id
    FROM public.user_profiles up
    WHERE up.auth_user_id = v_caller_auth_id;

    IF v_caller_profile_id IS NULL THEN
        RAISE EXCEPTION 'Caller user profile not found';
    END IF;

    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = v_caller_profile_id AND is_super_admin = true) THEN
        v_is_owner := true;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.restaurant_memberships m
            WHERE m.restaurant_id = p_restaurant_id
              AND m.user_id = v_caller_profile_id
              AND m.role = 'owner'
              AND m.is_active = true
        ) INTO v_is_owner;
    END IF;

    IF NOT v_is_owner THEN
        RAISE EXCEPTION 'Only restaurant owners can reset staff credentials';
    END IF;

    SELECT m.user_id, m.role, m.login_id, up.email
    INTO v_target_user_id, v_target_role, v_target_login_id, v_target_email
    FROM public.restaurant_memberships m
    JOIN public.user_profiles up ON up.id = m.user_id
    WHERE m.id = p_membership_id
      AND m.restaurant_id = p_restaurant_id;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Staff membership not found in this restaurant';
    END IF;

    IF v_target_role = 'owner' THEN
        RAISE EXCEPTION 'Owner credentials cannot be reset through staff password reset';
    END IF;

    IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters';
    END IF;

    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = v_target_user_id;

    INSERT INTO public.audit_logs (
        restaurant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_restaurant_id,
        v_caller_profile_id,
        'reset_staff_password',
        'restaurant_memberships',
        p_membership_id::text,
        jsonb_build_object(
            'membership_id', p_membership_id,
            'target_login_id', v_target_login_id,
            'target_email', v_target_email
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password successfully reset'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_member(
    p_restaurant_id uuid,
    p_membership_id uuid,
    p_full_name text,
    p_role text,
    p_outlet_id uuid,
    p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_auth_id uuid := auth.uid();
    v_caller_profile_id uuid;
    v_is_owner boolean := false;
    v_target_user_id uuid;
    v_current_role text;
BEGIN
    IF v_caller_auth_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT up.id INTO v_caller_profile_id
    FROM public.user_profiles up
    WHERE up.auth_user_id = v_caller_auth_id;

    IF v_caller_profile_id IS NULL THEN
        RAISE EXCEPTION 'Caller user profile not found';
    END IF;

    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = v_caller_profile_id AND is_super_admin = true) THEN
        v_is_owner := true;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.restaurant_memberships m
            WHERE m.restaurant_id = p_restaurant_id
              AND m.user_id = v_caller_profile_id
              AND m.role = 'owner'
              AND m.is_active = true
        ) INTO v_is_owner;
    END IF;

    IF NOT v_is_owner THEN
        RAISE EXCEPTION 'Only restaurant owners can edit staff details';
    END IF;

    SELECT m.user_id, m.role INTO v_target_user_id, v_current_role
    FROM public.restaurant_memberships m
    WHERE m.id = p_membership_id
      AND m.restaurant_id = p_restaurant_id;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Staff membership not found';
    END IF;

    IF v_current_role = 'owner' THEN
        RAISE EXCEPTION 'Owner membership cannot be edited via staff management';
    END IF;

    IF p_role NOT IN ('manager', 'waiter', 'kitchen', 'cashier') THEN
        RAISE EXCEPTION 'Invalid role: %', p_role;
    END IF;

    IF p_outlet_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.outlets WHERE id = p_outlet_id AND restaurant_id = p_restaurant_id) THEN
            RAISE EXCEPTION 'Branch does not belong to this restaurant';
        END IF;
    END IF;

    UPDATE public.restaurant_memberships
    SET role = p_role,
        outlet_id = p_outlet_id,
        is_active = p_is_active
    WHERE id = p_membership_id;

    IF p_full_name IS NOT NULL AND trim(p_full_name) <> '' THEN
        UPDATE public.user_profiles
        SET full_name = trim(p_full_name)
        WHERE id = v_target_user_id;

        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{full_name}', to_jsonb(trim(p_full_name)))
        WHERE id = v_target_user_id;
    END IF;

    INSERT INTO public.audit_logs (
        restaurant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_restaurant_id,
        v_caller_profile_id,
        'update_staff_member',
        'restaurant_memberships',
        p_membership_id::text,
        jsonb_build_object(
            'membership_id', p_membership_id,
            'role', p_role,
            'outlet_id', p_outlet_id,
            'is_active', p_is_active
        )
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_staff_account(uuid, uuid, text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_staff_password(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_member(uuid, uuid, text, text, uuid, boolean) TO authenticated;
