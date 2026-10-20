/**
 * RestoHub E2E Test Suite:
 * Validates Phase 1 through Phase 11 Requirements:
 * - Scenario A: Restaurant Onboarding (RH-XXXX code, branch, owner membership, idempotency)
 * - Scenario B: Direct Staff Provisioning & Authentication (Normalized login ID, role, branch, password)
 * - Scenario C: Empty-state Correctness (New restaurant starts with 0 staff, 0 orders, 0 menu items)
 * - Scenario D: Multi-Tenant Isolation (Restaurant A vs Restaurant B data separation)
 * - Scenario E: Role-Based Access Control (Waiter vs Owner permissions)
 * - Scenario F: Account Deactivation & Credential Reset
 * - Scenario G: Data Continuity (Spice Garden records unaffected)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lolbdfykmoarhblkjgaa.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbGJkZnlrbW9hcmhibGtqZ2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUyMDgsImV4cCI6MjEwNzY0MTIwOH0.tF6MxCtPPi_bTEIc_zJNHtFUWMGIgmNY_M8aXvXQy1c';

const SPICE_GARDEN_ID = 'e7b1a0e1-0000-4000-8000-000000000001';

async function loginAs(email, password = 'Password@123') {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Failed to login as ${email}: ${error.message}`);
  }
  return { client, user: data.user, session: data.session };
}

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function run() {
  console.log('==================================================================');
  console.log('RestoHub: Full E2E Staff Onboarding, Persistence & Security Tests');
  console.log('==================================================================\n');

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // Log in as existing Spice Garden owner
  const { client: ownerClient, user: ownerUser } = await loginAs('owner@restohub.io');

  // ==========================================
  // SCENARIO A: RESTAURANT CREATION & ID
  // ==========================================
  console.log('--- SCENARIO A: Restaurant Creation & Uniqueness ---');
  const testRestaurantName = `Bistro Test ${Date.now().toString(36).toUpperCase()}`;
  const { data: createdRestaurant, error: createError } = await ownerClient.rpc('create_restaurant_with_owner', {
    p_restaurant_name: testRestaurantName,
    p_outlet_name: 'Main Dining',
    p_outlet_code: 'MD01',
    p_currency: 'INR',
    p_currency_symbol: '₹',
    p_timezone: 'Asia/Kolkata',
    p_full_name: 'Arjun Mehta',
    p_tax_cgst_pct: 2.5,
    p_tax_sgst_pct: 2.5,
    p_phone: '9876543210',
    p_address: '123 Test Street',
  });

  assert(!createError && createdRestaurant?.restaurant_id, 'Restaurant created via atomic RPC');
  assert(
    /^RH-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4,6}$/.test(createdRestaurant.restaurant_code),
    `Restaurant ID matches RH-XXXX format: ${createdRestaurant?.restaurant_code}`
  );
  assert(createdRestaurant.outlet_id, 'Initial branch created and returned');

  const newRestaurantId = createdRestaurant.restaurant_id;
  const newOutletId = createdRestaurant.outlet_id;
  const newRestaurantCode = createdRestaurant.restaurant_code;

  // Verify DB uniqueness constraint
  const { error: dupCodeError } = await ownerClient.from('restaurants').insert({
    name: 'Duplicate Code Test',
    restaurant_code: newRestaurantCode,
    slug: `dup-${Date.now()}`,
  });
  assert(dupCodeError !== null, 'Database uniqueness constraint blocks duplicate restaurant codes');

  // ==========================================
  // SCENARIO C: NEW RESTAURANTS START EMPTY
  // ==========================================
  console.log('\n--- SCENARIO C: New Restaurants Start Empty ---');
  // Check staff count: should only have 1 membership (the owner), zero waiters, zero managers
  const { data: newMemberships } = await ownerClient
    .from('restaurant_memberships')
    .select('*, user_profiles(*)')
    .eq('restaurant_id', newRestaurantId);

  assert(newMemberships.length === 1, `Newly created restaurant has exactly 1 membership (Owner), found: ${newMemberships.length}`);
  assert(newMemberships[0].role === 'owner', 'The single membership is the owner role');

  const { data: newOrders } = await ownerClient
    .from('orders')
    .select('*')
    .eq('restaurant_id', newRestaurantId);
  assert(newOrders.length === 0, `Zero orders in newly created restaurant, found: ${newOrders.length}`);

  const { data: newMenu } = await ownerClient
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', newRestaurantId);
  assert(newMenu.length === 0, `Zero menu items in newly created restaurant, found: ${newMenu.length}`);

  // ==========================================
  // SCENARIO B: OWNER-CREATED STAFF ACCOUNTS
  // ==========================================
  console.log('\n--- SCENARIO B: Direct Staff Provisioning ---');
  const staffLoginId = `waiter_${Date.now().toString(36)}`;
  const staffPassword = 'TempPassword@123';
  const staffFullName = 'Kavita Sharma';

  // 1. Owner provisions staff
  const { data: provisionedStaff, error: provisionError } = await ownerClient.rpc('provision_staff_account', {
    p_restaurant_id: newRestaurantId,
    p_outlet_id: newOutletId,
    p_full_name: staffFullName,
    p_login_id: staffLoginId.toUpperCase(), // Test case insensitivity / normalization
    p_email: null, // Test auto-generated scoped email
    p_password: staffPassword,
    p_role: 'waiter',
  });

  assert(!provisionError && provisionedStaff?.success, `Staff account provisioned: ${provisionedStaff?.login_id}`);
  assert(provisionedStaff.login_id === staffLoginId.toLowerCase(), 'Login ID normalized to lowercase');
  assert(provisionedStaff.role === 'waiter', 'Staff assigned waiter role');

  // 2. Reject duplicate Staff Login ID in same restaurant
  const { error: dupStaffError } = await ownerClient.rpc('provision_staff_account', {
    p_restaurant_id: newRestaurantId,
    p_outlet_id: newOutletId,
    p_full_name: 'Duplicate Staff',
    p_login_id: staffLoginId.toLowerCase(),
    p_email: null,
    p_password: staffPassword,
    p_role: 'waiter',
  });
  assert(dupStaffError !== null, 'Duplicate Staff Login ID in same restaurant is rejected');

  // 3. Resolve staff login email via Restaurant ID + Login ID
  const { data: resolvedEmail, error: resolveErr } = await anonClient.rpc('resolve_staff_login_email', {
    p_identifier: staffLoginId,
    p_restaurant_identifier: newRestaurantCode,
    p_branch_code: 'MD01',
  });
  assert(!resolveErr && resolvedEmail === provisionedStaff.email, `Resolved staff login email correctly: ${resolvedEmail}`);

  // 4. Authenticate as the new waiter
  const { client: newWaiterClient, user: newWaiterUser } = await loginAs(resolvedEmail, staffPassword);
  assert(newWaiterUser?.id === provisionedStaff.user_id, 'Waiter successfully authenticated via Supabase Auth');

  // 5. Verify invalid password rejected
  let badPasswordRejected = false;
  try {
    await loginAs(resolvedEmail, 'WrongPassword999');
  } catch {
    badPasswordRejected = true;
  }
  assert(badPasswordRejected, 'Invalid password correctly rejected by Supabase Auth');

  // ==========================================
  // SCENARIO D: TENANT ISOLATION
  // ==========================================
  console.log('\n--- SCENARIO D: Tenant Isolation ---');
  // New waiter querying Spice Garden orders directly via DB
  const { data: leakedOrders } = await newWaiterClient
    .from('orders')
    .select('*')
    .eq('restaurant_id', SPICE_GARDEN_ID);
  assert(leakedOrders.length === 0, 'New restaurant waiter CANNOT view Spice Garden orders (RLS isolated)');

  // New waiter querying Spice Garden menu items directly via DB
  const { data: leakedMenu } = await newWaiterClient
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', SPICE_GARDEN_ID);
  assert(leakedMenu.length === 0, 'New restaurant waiter CANNOT view Spice Garden menu items (RLS isolated)');

  // Cross-tenant login resolution rejection: Waiter using Spice Garden's Restaurant ID
  const { data: crossTenantResolved } = await anonClient.rpc('resolve_staff_login_email', {
    p_identifier: staffLoginId,
    p_restaurant_identifier: 'RH-SPICE', // Spice Garden's ID
  });
  assert(crossTenantResolved === null, 'Waiter CANNOT resolve email against another restaurant ID');

  // Cross-branch login resolution rejection: Waiter using invalid branch code
  const { data: crossBranchResolved } = await anonClient.rpc('resolve_staff_login_email', {
    p_identifier: staffLoginId,
    p_restaurant_identifier: newRestaurantCode,
    p_branch_code: 'NON_EXISTENT_BRANCH',
  });
  assert(crossBranchResolved === null, 'Staff login rejected when branch code does not match');

  // ==========================================
  // SCENARIO E: ROLE ISOLATION
  // ==========================================
  console.log('\n--- SCENARIO E: Role Isolation ---');
  // Waiter cannot update restaurant settings
  const { data: updateAttempt, error: waiterSettingsError } = await newWaiterClient
    .from('restaurants')
    .update({ name: 'Hacked Restaurant' })
    .eq('id', newRestaurantId)
    .select();

  const { data: currentRestaurant } = await ownerClient
    .from('restaurants')
    .select('name')
    .eq('id', newRestaurantId)
    .single();

  assert(
    (waiterSettingsError !== null || !updateAttempt || updateAttempt.length === 0) &&
      currentRestaurant?.name !== 'Hacked Restaurant',
    'Waiter CANNOT modify restaurant settings (RLS blocked: 0 rows modified)'
  );

  // Waiter cannot provision another staff member
  const { error: waiterProvisionError } = await newWaiterClient.rpc('provision_staff_account', {
    p_restaurant_id: newRestaurantId,
    p_outlet_id: newOutletId,
    p_full_name: 'Unauthorized User',
    p_login_id: 'unauth01',
    p_email: null,
    p_password: 'Password@123',
    p_role: 'waiter',
  });
  assert(waiterProvisionError !== null, 'Waiter CANNOT call provision_staff_account (RPC permission check blocked)');

  // Waiter cannot elevate themselves to super admin
  const { error: superAdminEscalationError } = await newWaiterClient
    .from('user_profiles')
    .update({ is_super_admin: true })
    .eq('id', newWaiterUser.id);
  assert(superAdminEscalationError !== null, 'Waiter CANNOT escalate themselves to Super Admin (trigger blocked)');

  // ==========================================
  // SCENARIO F: DEACTIVATION & PASSWORD RESET
  // ==========================================
  console.log('\n--- SCENARIO F: Account Management & Deactivation ---');
  // 1. Owner resets waiter password
  const newStaffPasswordUpdated = 'NewUpdatedPass@456';
  const { data: resetResult, error: resetError } = await ownerClient.rpc('reset_staff_password', {
    p_restaurant_id: newRestaurantId,
    p_membership_id: provisionedStaff.membership_id,
    p_new_password: newStaffPasswordUpdated,
  });
  assert(!resetError && resetResult?.success, 'Owner successfully reset staff password');

  // Authenticate with newly reset password
  const { user: updatedWaiterUser } = await loginAs(resolvedEmail, newStaffPasswordUpdated);
  assert(updatedWaiterUser?.id === provisionedStaff.user_id, 'Waiter successfully logs in with new password');

  // 2. Deactivate waiter account
  const { data: updateRes, error: deactivateError } = await ownerClient.rpc('update_staff_member', {
    p_restaurant_id: newRestaurantId,
    p_membership_id: provisionedStaff.membership_id,
    p_full_name: 'Kavita Sharma (Deactivated)',
    p_role: 'waiter',
    p_outlet_id: newOutletId,
    p_is_active: false,
  });
  assert(!deactivateError && updateRes?.success, 'Owner deactivated staff account');

  // Verify deactivated staff cannot resolve login
  const { data: deactivatedResolve } = await anonClient.rpc('resolve_staff_login_email', {
    p_identifier: staffLoginId,
    p_restaurant_identifier: newRestaurantCode,
  });
  assert(deactivatedResolve === null, 'Deactivated staff member CANNOT resolve login email');

  // ==========================================
  // SCENARIO G: DATA CONTINUITY (SPICE GARDEN)
  // ==========================================
  console.log('\n--- SCENARIO G: Existing Data Continuity ---');
  const { data: spiceGarden } = await ownerClient
    .from('restaurants')
    .select('*, outlets(*)')
    .eq('id', SPICE_GARDEN_ID)
    .single();

  assert(spiceGarden && spiceGarden.name.includes('Spice Garden'), `Spice Garden restaurant record is intact (${spiceGarden?.name})`);
  assert(spiceGarden.restaurant_code === 'RH-SPICE', 'Spice Garden restaurant code RH-SPICE is intact');
  assert(spiceGarden.outlets.length >= 2, `Spice Garden branches intact (${spiceGarden.outlets.length} branches)`);

  const { data: spiceStaff } = await ownerClient
    .from('restaurant_memberships')
    .select('*')
    .eq('restaurant_id', SPICE_GARDEN_ID);
  assert(spiceStaff.length >= 4, `Spice Garden staff memberships intact (${spiceStaff.length} members)`);

  console.log('\n==================================================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
  console.log('==================================================================');

  if (passedTests === totalTests) {
    console.log('ALL E2E STAFF ONBOARDING, PERSISTENCE & SECURITY TESTS PASSED!');
  } else {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
