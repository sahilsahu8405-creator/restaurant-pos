-- Fix Restaurant ID uniqueness, Staff Account Provisioning, Persistence, and Staff Login
-- Migration: 20261019113000_fix_restaurant_ids_and_staff_auth.sql

-- 1. Database Constraints: Enforce uniqueness and non-null on restaurants.restaurant_code
ALTER TABLE public.restaurants ALTER COLUMN restaurant_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_restaurants_restaurant_code 
ON public.restaurants USING btree (upper(restaurant_code));

-- 2. Database Constraints: Enforce case-insensitive uniqueness of staff login_id per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS uq_restaurant_memberships_login_id
ON public.restaurant_memberships (restaurant_id, lower(login_id))
WHERE login_id IS NOT NULL;

-- 3. Function: create_restaurant_with_owner (generate collision-resistant readable ID format: RH-XXXXXX e.g. RH-K4A8X2)
CREATE OR REPLACE FUNCTION public.create_restaurant_with_owner(
    p_restaurant_name TEXT,
    p_outlet_name TEXT,
    p_outlet_code TEXT DEFAULT 'MAIN',
    p_currency TEXT DEFAULT 'INR',
    p_currency_symbol TEXT DEFAULT '₹',
    p_timezone TEXT DEFAULT 'Asia/Kolkata',
    p_full_name TEXT DEFAULT NULL,
    p_tax_cgst_pct NUMERIC DEFAULT 2.50,
    p_tax_sgst_pct NUMERIC DEFAULT 2.50,
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_auth_uid UUID;
    v_user_email TEXT;
    v_profile_id UUID;
    v_restaurant_id UUID;
    v_outlet_id UUID;
    v_membership_id UUID;
    v_slug TEXT;
    v_base_slug TEXT;
    v_slug_suffix INT := 1;
    -- 32 readable characters avoiding ambiguous 0, 1, I, O
    v_chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    v_code TEXT;
    v_code_candidate TEXT;
    v_attempts INT := 0;
BEGIN
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated. Please sign in or register an account first.';
    END IF;

    IF trim(COALESCE(p_restaurant_name, '')) = '' THEN
        RAISE EXCEPTION 'Restaurant name cannot be empty.';
    END IF;

    IF trim(COALESCE(p_outlet_name, '')) = '' THEN
        RAISE EXCEPTION 'Branch / outlet name cannot be empty.';
    END IF;

    -- Fetch user email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_auth_uid;

    -- Upsert user profile
    INSERT INTO public.user_profiles (auth_user_id, email, full_name, phone)
    VALUES (
        v_auth_uid,
        v_user_email,
        COALESCE(NULLIF(trim(p_full_name), ''), split_part(v_user_email, '@', 1)),
        NULLIF(trim(p_phone), '')
    )
    ON CONFLICT (auth_user_id)
    DO UPDATE SET
        full_name = COALESCE(NULLIF(trim(p_full_name), ''), user_profiles.full_name),
        email = COALESCE(v_user_email, user_profiles.email),
        phone = COALESCE(NULLIF(trim(p_phone), ''), user_profiles.phone)
    RETURNING id INTO v_profile_id;

    -- Generate a clean, unique slug from restaurant name
    v_base_slug := lower(regexp_replace(trim(p_restaurant_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    IF v_base_slug = '' THEN
        v_base_slug := 'restaurant';
    END IF;

    v_slug := v_base_slug;
    WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE slug = v_slug) LOOP
        v_slug_suffix := v_slug_suffix + 1;
        v_slug := v_base_slug || '-' || v_slug_suffix;
    END LOOP;

    -- Generate unique short Restaurant ID: format RH-XXXXXX (e.g. RH-K4A8X2)
    LOOP
        v_attempts := v_attempts + 1;
        v_code_candidate := 'RH-' ||
            substr(v_chars, floor(random() * 32)::int + 1, 1) ||
            substr(v_chars, floor(random() * 32)::int + 1, 1) ||
            substr(v_chars, floor(random() * 32)::int + 1, 1) ||
            substr(v_chars, floor(random() * 32)::int + 1, 1) ||
            substr(v_chars, floor(random() * 32)::int + 1, 1) ||
            substr(v_chars, floor(random() * 32)::int + 1, 1);
        
        IF NOT EXISTS (SELECT 1 FROM public.restaurants WHERE upper(restaurant_code) = upper(v_code_candidate)) THEN
            v_code := v_code_candidate;
            EXIT;
        END IF;

        IF v_attempts > 100 THEN
            v_code := 'RH-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
            EXIT;
        END IF;
    END LOOP;

    -- 1. Create Restaurant record with unique restaurant_code
    INSERT INTO public.restaurants (
        name,
        slug,
        restaurant_code,
        currency,
        currency_symbol,
        timezone,
        business_email,
        primary_phone
    ) VALUES (
        trim(p_restaurant_name),
        v_slug,
        v_code,
        COALESCE(NULLIF(trim(p_currency), ''), 'INR'),
        COALESCE(NULLIF(trim(p_currency_symbol), ''), '₹'),
        COALESCE(NULLIF(trim(p_timezone), ''), 'Asia/Kolkata'),
        v_user_email,
        NULLIF(trim(p_phone), '')
    )
    RETURNING id INTO v_restaurant_id;

    -- 2. Create Initial Outlet record
    INSERT INTO public.outlets (
        restaurant_id,
        name,
        code,
        address,
        phone,
        is_active
    ) VALUES (
        v_restaurant_id,
        trim(p_outlet_name),
        upper(COALESCE(NULLIF(trim(p_outlet_code), ''), 'MAIN')),
        jsonb_build_object('full', COALESCE(trim(p_address), '')),
        NULLIF(trim(p_phone), ''),
        true
    )
    RETURNING id INTO v_outlet_id;

    -- 3. Create Default Restaurant Settings
    INSERT INTO public.restaurant_settings (
        restaurant_id,
        enable_kot,
        enable_kds,
        enable_table_management,
        enable_inventory,
        enable_customer_crm,
        default_tax_rate_cgst_pct,
        default_tax_rate_sgst_pct,
        invoice_prefix,
        kot_prefix,
        receipt_footer
    ) VALUES (
        v_restaurant_id,
        true,
        true,
        true,
        true,
        false,
        COALESCE(p_tax_cgst_pct, 2.50),
        COALESCE(p_tax_sgst_pct, 2.50),
        'INV-',
        'KOT-',
        'Thank you for dining with us!'
    );

    -- 4. Associate verified owner with the new restaurant
    INSERT INTO public.restaurant_memberships (
        user_id,
        restaurant_id,
        outlet_id,
        role,
        is_active
    ) VALUES (
        v_profile_id,
        v_restaurant_id,
        NULL,
        'owner',
        true
    )
    RETURNING id INTO v_membership_id;

    -- 5. Audit Log
    INSERT INTO public.audit_logs (
        restaurant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        v_restaurant_id,
        v_profile_id,
        'create_restaurant_with_owner',
        'restaurants',
        v_restaurant_id::text,
        jsonb_build_object(
            'restaurant_name', p_restaurant_name,
            'slug', v_slug,
            'restaurant_code', v_code,
            'outlet_id', v_outlet_id,
            'membership_id', v_membership_id,
            'role', 'owner'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'restaurant_id', v_restaurant_id,
        'restaurant_name', p_restaurant_name,
        'slug', v_slug,
        'restaurant_code', v_code,
        'outlet_id', v_outlet_id,
        'profile_id', v_profile_id,
        'membership_id', v_membership_id,
        'role', 'owner'
    );
END;
$$;

-- 4. Function: resolve_staff_login_email (strictly scoped to restaurant)
DROP FUNCTION IF EXISTS public.resolve_staff_login_email(text, text);
DROP FUNCTION IF EXISTS public.resolve_staff_login_email(text, text, text);

CREATE OR REPLACE FUNCTION public.resolve_staff_login_email(
    p_identifier TEXT,
    p_restaurant_identifier TEXT DEFAULT NULL,
    p_branch_code TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_restaurant_id UUID;
    v_outlet_id UUID;
    v_user_id UUID;
    v_member_outlet_id UUID;
    v_email TEXT;
    v_clean_ident TEXT;
    v_clean_rest TEXT;
    v_clean_branch TEXT;
BEGIN
    IF p_identifier IS NULL OR trim(p_identifier) = '' THEN
        RETURN NULL;
    END IF;

    v_clean_ident := lower(trim(p_identifier));
    v_clean_rest := trim(COALESCE(p_restaurant_identifier, ''));
    v_clean_branch := trim(COALESCE(p_branch_code, ''));

    -- Staff Login ID requires restaurant identifier
    IF v_clean_rest = '' AND NOT v_clean_ident LIKE '%@%' THEN
        RETURN NULL;
    END IF;

    -- If restaurant identifier is provided, resolve restaurant strictly
    IF v_clean_rest <> '' THEN
        SELECT r.id INTO v_restaurant_id
        FROM public.restaurants r
        WHERE upper(r.restaurant_code) = upper(v_clean_rest)
           OR lower(r.slug) = lower(v_clean_rest)
           OR r.id::text = v_clean_rest
        LIMIT 1;

        IF v_restaurant_id IS NULL THEN
            -- Restaurant identifier not found
            RETURN NULL;
        END IF;
    END IF;

    -- If branch code is provided, resolve outlet for this restaurant
    IF v_clean_branch <> '' THEN
        IF v_restaurant_id IS NULL THEN
            RETURN NULL;
        END IF;

        SELECT o.id INTO v_outlet_id
        FROM public.outlets o
        WHERE o.restaurant_id = v_restaurant_id
          AND (upper(o.code) = upper(v_clean_branch) OR o.id::text = v_clean_branch)
        LIMIT 1;

        IF v_outlet_id IS NULL THEN
            -- Outlet specified does not belong to this restaurant
            RETURN NULL;
        END IF;
    END IF;

    -- Lookup staff in active restaurant_memberships strictly within resolved restaurant
    SELECT m.user_id, m.outlet_id, up.email INTO v_user_id, v_member_outlet_id, v_email
    FROM public.restaurant_memberships m
    JOIN public.user_profiles up ON up.id = m.user_id
    JOIN public.restaurants r ON r.id = m.restaurant_id
    WHERE m.is_active = true
      AND (
          lower(m.login_id) = v_clean_ident
          OR lower(up.email) = v_clean_ident
      )
      AND (
          (v_restaurant_id IS NOT NULL AND m.restaurant_id = v_restaurant_id)
          OR (v_restaurant_id IS NULL AND v_clean_ident LIKE '%@%')
      )
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- If staff member is restricted to a specific outlet, verify match
        IF v_member_outlet_id IS NOT NULL AND v_outlet_id IS NOT NULL THEN
            IF v_member_outlet_id <> v_outlet_id THEN
                -- Staff member is not authorized for this branch
                RETURN NULL;
            END IF;
        END IF;

        RETURN v_email;
    END IF;

    -- Also check pending invitations
    SELECT inv.email INTO v_email
    FROM public.staff_invitations inv
    WHERE (lower(inv.login_id) = v_clean_ident OR lower(inv.email) = v_clean_ident)
      AND inv.accepted_at IS NULL
      AND (inv.expires_at IS NULL OR inv.expires_at > now())
      AND (
          (v_restaurant_id IS NOT NULL AND inv.restaurant_id = v_restaurant_id)
          OR (v_restaurant_id IS NULL AND v_clean_ident LIKE '%@%')
      )
      AND (
          v_outlet_id IS NULL
          OR inv.outlet_id IS NULL
          OR inv.outlet_id = v_outlet_id
      )
    LIMIT 1;

    RETURN v_email;
END;
$$;

-- 2-argument overload for backwards compatibility
CREATE OR REPLACE FUNCTION public.resolve_staff_login_email(
    p_identifier TEXT,
    p_restaurant_slug TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    RETURN public.resolve_staff_login_email(p_identifier, p_restaurant_slug, NULL::text);
END;
$$;

-- 5. Function: provision_staff_account (atomically provision credentials and membership)
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
        RAISE EXCEPTION 'Only active restaurant owners can provision staff accounts for this restaurant';
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

    -- Strict check for conflict within this restaurant
    IF EXISTS (
        SELECT 1 FROM public.restaurant_memberships
        WHERE restaurant_id = p_restaurant_id
          AND lower(login_id) = v_norm_login_id
    ) THEN
        RAISE EXCEPTION 'Staff Login ID "%" already exists in this restaurant', v_norm_login_id;
    END IF;

    -- Tenant-scoped Auth Email to ensure distinct identity and collision-free auth across restaurants
    IF p_email IS NOT NULL AND trim(p_email) <> '' THEN
        -- If optional email provided, check if it's already used by another user in this restaurant
        SELECT id INTO v_existing_profile_id
        FROM public.user_profiles
        WHERE lower(email) = lower(trim(p_email));

        IF v_existing_profile_id IS NOT NULL THEN
            IF EXISTS (
                SELECT 1 FROM public.restaurant_memberships
                WHERE restaurant_id = p_restaurant_id AND user_id = v_existing_profile_id
            ) THEN
                RAISE EXCEPTION 'A staff member with email % already has a membership in this restaurant', trim(p_email);
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email))) THEN
            v_target_email := lower(trim(p_email));
        ELSE
            -- Scoped email for staff identity to prevent cross-tenant auth collisions
            v_target_email := v_norm_login_id || '.' || lower(v_restaurant_code) || '@staff.restohub.internal';
        END IF;
    ELSE
        v_target_email := v_norm_login_id || '.' || lower(v_restaurant_code) || '@staff.restohub.internal';
    END IF;

    -- Check if target email already exists in auth.users
    SELECT id INTO v_existing_profile_id
    FROM public.user_profiles
    WHERE lower(email) = v_target_email;

    IF v_existing_profile_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.restaurant_memberships
            WHERE restaurant_id = p_restaurant_id AND user_id = v_existing_profile_id
        ) THEN
            RAISE EXCEPTION 'A staff member with login ID "%" already exists in this restaurant', v_norm_login_id;
        END IF;
        v_new_user_id := v_existing_profile_id;
        -- Update password for provisioned staff identity
        UPDATE auth.users
        SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
            updated_at = now()
        WHERE id = v_new_user_id;
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

    -- Create membership with login_id
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

    -- Audit log
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

-- 6. Function: update_staff_member
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
        RAISE EXCEPTION 'Staff membership not found in this restaurant';
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
    WHERE id = p_membership_id
      AND restaurant_id = p_restaurant_id;

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
            'is_active', p_is_active,
            'full_name', trim(p_full_name)
        )
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Function: reset_staff_password
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

-- 8. Function: get_user_authorized_memberships_v2 (returns active and inactive memberships so frontend correctly detects deactivation status)
CREATE OR REPLACE FUNCTION public.get_user_authorized_memberships_v2()
RETURNS TABLE(
    membership_id uuid,
    restaurant_id uuid,
    restaurant_name text,
    restaurant_slug text,
    restaurant_code text,
    currency text,
    currency_symbol text,
    outlet_id uuid,
    outlet_name text,
    outlet_code text,
    role text,
    login_id text,
    is_active boolean,
    created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT 
        rm.id AS membership_id,
        r.id AS restaurant_id,
        r.name AS restaurant_name,
        r.slug AS restaurant_slug,
        r.restaurant_code,
        r.currency,
        r.currency_symbol,
        o.id AS outlet_id,
        o.name AS outlet_name,
        o.code AS outlet_code,
        rm.role,
        rm.login_id,
        rm.is_active,
        rm.created_at
    FROM public.restaurant_memberships rm
    JOIN public.restaurants r ON r.id = rm.restaurant_id
    JOIN public.user_profiles up ON up.id = rm.user_id
    LEFT JOIN public.outlets o ON o.id = rm.outlet_id
    WHERE up.auth_user_id = auth.uid()
    ORDER BY rm.is_active DESC, rm.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.create_restaurant_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_staff_login_email(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_staff_login_email(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_staff_account(uuid, uuid, text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_staff_password(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_member(uuid, uuid, text, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_authorized_memberships_v2() TO authenticated;
