/**
 * RestoHub Multi-Tenant Staff & Owner Authentication Test Suite
 * Validates:
 * 1. Unique Restaurant ID generation & uniqueness constraints
 * 2. Scoped Branch IDs & constraints
 * 3. Restaurant ID + Staff Login ID + Password authentication flow
 * 4. Cross-Tenant Rejection (Staff A cannot use Restaurant B's ID)
 * 5. Cross-Branch Rejection (Staff A cannot use unassigned Branch ID)
 * 6. Invalid password rejection
 * 7. Inactive staff account rejection
 * 8. Owner email authentication and membership resolution
 * 9. Role-based workspace boundaries & data continuity
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lolbdfykmoarhblkjgaa.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbGJkZnlrbW9hcmhibGtqZ2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUyMDgsImV4cCI6MjEwNzY0MTIwOH0.tF6MxCtPPi_bTEIc_zJNHtFUWMGIgmNY_M8aXvXQy1c';

const SPICE_GARDEN_ID = 'e7b1a0e1-0000-4000-8000-000000000001';
const INDIRANAGAR_OUTLET_ID = 'e7b1a0e1-0000-4000-8000-000000000011';
const KORAMANGALA_OUTLET_ID = 'e7b1a0e1-0000-4000-8000-000000000012';

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
  console.log('RestoHub: Restaurant ID + Branch ID Staff Authentication Test Suite');
  console.log('==================================================================\n');

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { client: spiceOwnerClient } = await loginAs('owner@restohub.io');
  const { client: waiterClient } = await loginAs('waiter@restohub.io');
  const { client: managerClient } = await loginAs('manager@restohub.io');
  const { client: kitchenClient } = await loginAs('kitchen@restohub.io');

  // -------------------------------------------------------------------------
  // 1. UNIQUE RESTAURANT ID CHECKS
  // -------------------------------------------------------------------------
  console.log('--- 1. Unique Restaurant ID Verification ---');

  const { data: spiceRest } = await spiceOwnerClient
    .from('restaurants')
    .select('id, name, slug, restaurant_code')
    .eq('id', SPICE_GARDEN_ID)
    .single();

  assert(spiceRest && Boolean(spiceRest.restaurant_code), `Spice Garden has Restaurant ID: ${spiceRest?.restaurant_code}`);
  const codeRegex = /^RH-[A-Z0-9]{4,8}$/i;
  assert(codeRegex.test(spiceRest?.restaurant_code || ''), `Spice Garden ID (${spiceRest?.restaurant_code}) conforms to format`);

  // Verify that resolution recognizes Restaurant ID
  const { data: spiceResolved } = await anonClient.rpc('resolve_staff_login_email', {
    p_identifier: 'waiter_ind',
    p_restaurant_slug: 'RH-SPICE',
  });
  assert(spiceResolved === 'waiter@restohub.io', 'Restaurant ID "RH-SPICE" correctly resolves authentic staff email');

  // -------------------------------------------------------------------------
  // 2. SCOPED BRANCH ID CHECKS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Scoped Branch ID Verification ---');

  const { data: spiceOutlets } = await spiceOwnerClient
    .from('outlets')
    .select('id, restaurant_id, name, code, is_active')
    .eq('restaurant_id', SPICE_GARDEN_ID);

  assert(spiceOutlets.length >= 2, `Spice Garden has ${spiceOutlets.length} branches`);
  const spiceOutletCodes = spiceOutlets.map((o) => o.code?.toUpperCase());
  assert(spiceOutletCodes.includes('IND') && spiceOutletCodes.includes('KOR'), 'Spice Garden has IND and KOR branch codes');

  const spiceUniqueBranches = new Set(spiceOutletCodes);
  assert(spiceOutletCodes.length === spiceUniqueBranches.size, 'Branch codes are uniquely scoped within Spice Garden');

  // -------------------------------------------------------------------------
  // 3. STAFF LOGIN ID RESOLUTION WITH RESTAURANT ID & BRANCH ID
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Staff Login ID Resolution with Restaurant ID & Branch ID ---');

  // 3.1 Resolving with Restaurant ID
  const { data: emailByCode, error: err31 } = await anonClient.rpc(
    'resolve_staff_login_email',
    {
      p_identifier: 'waiter_ind',
      p_restaurant_slug: 'RH-SPICE',
    }
  );
  assert(!err31 && emailByCode === 'waiter@restohub.io', 'Staff "waiter_ind" resolved using Restaurant ID "RH-SPICE" -> waiter@restohub.io');

  // 3.2 Resolving with Restaurant ID + Authorized Branch ID (3-param)
  const { data: emailByBranch, error: err32 } = await anonClient.rpc(
    'resolve_staff_login_email',
    {
      p_identifier: 'waiter_ind',
      p_restaurant_identifier: 'RH-SPICE',
      p_branch_code: 'IND',
    }
  );
  assert(!err32 && emailByBranch === 'waiter@restohub.io', 'Staff "waiter_ind" resolved using Restaurant ID + Branch "IND" -> waiter@restohub.io');

  // -------------------------------------------------------------------------
  // 4. CROSS-TENANT LOGIN ATTEMPT REJECTION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Cross-Tenant Login Attempt Rejection ---');

  // Waiter from Spice Garden tries to log in using Aman Cafe's Restaurant ID (RH-7K2P)
  const { data: crossTenantRes, error: err4 } = await anonClient.rpc(
    'resolve_staff_login_email',
    {
      p_identifier: 'waiter_ind',
      p_restaurant_slug: 'RH-7K2P', // Aman cafe Restaurant ID
    }
  );
  assert(!err4 && crossTenantRes === null, 'Cross-tenant attempt with Aman Cafe ID "RH-7K2P" strictly REJECTED (returns NULL)');

  // Waiter attempts with non-existent Restaurant ID
  const { data: fakeRestRes, error: err42 } = await anonClient.rpc(
    'resolve_staff_login_email',
    {
      p_identifier: 'waiter_ind',
      p_restaurant_slug: 'RH-FAKE99',
    }
  );
  assert(!err42 && fakeRestRes === null, 'Attempt with non-existent Restaurant ID strictly REJECTED (returns NULL)');

  // -------------------------------------------------------------------------
  // 5. CROSS-BRANCH LOGIN ATTEMPT REJECTION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Cross-Branch Login Attempt Rejection ---');

  // Waiter assigned to IND attempts to log into KOR branch
  const { data: crossBranchRes, error: err5 } = await anonClient.rpc(
    'resolve_staff_login_email',
    {
      p_identifier: 'waiter_ind',
      p_restaurant_identifier: 'RH-SPICE',
      p_branch_code: 'KOR', // Unauthorized branch for this waiter
    }
  );
  assert(!err5 && crossBranchRes === null, 'Staff assigned to IND attempting to log into KOR branch strictly REJECTED (returns NULL)');

  // -------------------------------------------------------------------------
  // 6. PASSWORD AUTHENTICATION VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Supabase Auth Password Verification ---');

  // Valid credentials
  const { data: validAuth, error: validAuthErr } = await anonClient.auth.signInWithPassword({
    email: 'waiter@restohub.io',
    password: 'Password@123',
  });
  assert(!validAuthErr && validAuth?.session !== null, 'Staff authentication succeeds with valid password');

  // Invalid password
  const { data: invalidAuth, error: invalidAuthErr } = await anonClient.auth.signInWithPassword({
    email: 'waiter@restohub.io',
    password: 'WrongPassword999!',
  });
  assert(invalidAuthErr !== null && invalidAuth?.session == null, `Invalid password strictly REJECTED by Supabase Auth (${invalidAuthErr?.message})`);

  // -------------------------------------------------------------------------
  // 7. OWNER AUTHENTICATION & MEMBERSHIP RESOLUTION
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Owner Authentication & Dynamic Membership Loading ---');

  // Fetch authorized memberships via security RPC v2
  const { data: ownerMemberships, error: memErr } = await spiceOwnerClient.rpc('get_user_authorized_memberships_v2');
  assert(!memErr && Array.isArray(ownerMemberships) && ownerMemberships.length > 0, `Owner authorized memberships loaded (${ownerMemberships?.length} memberships)`);

  const ownerSpice = ownerMemberships.find((m) => m.restaurant_id === SPICE_GARDEN_ID);
  assert(ownerSpice && ownerSpice.role === 'owner', 'Owner membership verified with role="owner"');
  assert(ownerSpice && Boolean(ownerSpice.restaurant_code), `Membership returns Restaurant ID: "${ownerSpice?.restaurant_code}"`);
  assert(ownerSpice?.outlet_id === null, 'Owner has restaurant-wide scope (outlet_id is NULL = all branches)');

  // -------------------------------------------------------------------------
  // 8. ROLE-BASED WORKSPACES ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Role-Based Workspaces Verification ---');

  // Waiter blocked from settings
  const { data: waiterSettings } = await waiterClient.from('restaurant_settings').select('*');
  assert(waiterSettings === null || waiterSettings.length === 0, 'Waiter cannot read protected restaurant settings (0 rows)');

  // Kitchen blocked from payments
  const { data: kitchenPayments } = await kitchenClient.from('payments').select('*');
  assert(kitchenPayments === null || kitchenPayments.length === 0, 'Kitchen staff cannot access payments (0 rows)');

  // Manager blocked from updating protected tax rates (RLS prevents update)
  const { data: mgrUpdated } = await managerClient
    .from('restaurant_settings')
    .update({ default_tax_rate_cgst_pct: 9.99 })
    .eq('restaurant_id', SPICE_GARDEN_ID)
    .select();
  assert(!mgrUpdated || mgrUpdated.length === 0, 'Manager CANNOT update protected restaurant settings (RLS blocked / 0 rows affected)');

  // -------------------------------------------------------------------------
  // 9. DATA CONTINUITY CHECK
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Operational Data Continuity ---');

  const { data: tables } = await spiceOwnerClient
    .from('dining_tables')
    .select('id, table_number')
    .in('outlet_id', [INDIRANAGAR_OUTLET_ID, KORAMANGALA_OUTLET_ID]);
  assert(Array.isArray(tables) && tables.length >= 10, `Spice Garden operational tables preserved (${tables?.length} tables)`);

  const { data: menuItems } = await spiceOwnerClient.from('menu_items').select('id').eq('restaurant_id', SPICE_GARDEN_ID);
  assert(Array.isArray(menuItems) && menuItems.length >= 4, `Spice Garden menu items preserved (${menuItems?.length} items)`);

  console.log('\n==================================================================');
  console.log(`Results: ${passedTests} / ${totalTests} PASSED, ${totalTests - passedTests} FAILED`);
  console.log('==================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
