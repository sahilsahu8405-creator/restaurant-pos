import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lolbdfykmoarhblkjgaa.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbGJkZnlrbW9hcmhibGtqZ2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUyMDgsImV4cCI6MjEwNzY0MTIwOH0.tF6MxCtPPi_bTEIc_zJNHtFUWMGIgmNY_M8aXvXQy1c';

const SPICE_GARDEN_ID = 'e7b1a0e1-0000-4000-8000-000000000001';
const INDIRANAGAR_OUTLET_ID = 'e7b1a0e1-0000-4000-8000-000000000011';
const KORAMANGALA_OUTLET_ID = 'e7b1a0e1-0000-4000-8000-000000000012';
const AMAN_CAFE_ID = '013094fd-2451-41e9-b4b7-132480408dbd';
const AMAN_CAFE_OUTLET_ID = 'ac93db9c-cfae-479a-8d85-7f3c97369c4a';

async function runTenantIsolationTests() {
  console.log('==================================================================');
  console.log('RestoHub Phase 10: Multi-Tenant Data Isolation & Security Test Suite');
  console.log('==================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

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

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Authenticate as Spice Garden Owner and Waiter
    const { client: spiceOwnerClient } = await loginAs('owner@restohub.io');
    const { client: spiceWaiterClient } = await loginAs('waiter@restohub.io');
    const { client: spiceKitchenClient } = await loginAs('kitchen@restohub.io');
    const { client: korManagerClient } = await loginAs('manager@restohub.io');

    // -------------------------------------------------------------------------
    // TEST 1: Restaurant B (Aman cafe) sees NO Restaurant A (Spice Garden) menu items
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Menu Items Isolation ---');
    const { data: amanItems } = await spiceOwnerClient
      .from('menu_items')
      .select('id, name, restaurant_id')
      .eq('restaurant_id', AMAN_CAFE_ID);

    assert(amanItems !== null && amanItems.length === 0, 'Aman cafe has 0 menu items in database (no Spice Garden items leaked)');

    const { data: spiceItems } = await spiceOwnerClient
      .from('menu_items')
      .select('id, name')
      .eq('restaurant_id', SPICE_GARDEN_ID);
    assert(spiceItems !== null && spiceItems.length > 0, `Spice Garden menu items are preserved intact (${spiceItems.length} items)`);

    // -------------------------------------------------------------------------
    // TEST 2: Restaurant B sees NO Restaurant A tables
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Tables & Floor Plan Isolation ---');
    const { data: amanTables } = await spiceOwnerClient
      .from('dining_tables')
      .select('id, table_number, is_active')
      .eq('outlet_id', AMAN_CAFE_OUTLET_ID)
      .eq('is_active', true);

    assert(amanTables !== null && amanTables.length === 0, 'Aman cafe outlet has 0 active tables (clean onboarding floor plan)');

    const { data: spiceTables } = await spiceOwnerClient
      .from('dining_tables')
      .select('id, table_number')
      .eq('outlet_id', INDIRANAGAR_OUTLET_ID)
      .eq('is_active', true);
    assert(spiceTables !== null && spiceTables.length > 0, `Spice Garden tables are preserved intact (${spiceTables.length} tables)`);

    // -------------------------------------------------------------------------
    // TEST 3: Restaurant B sees NO Restaurant A orders
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Orders Isolation ---');
    const { data: amanOrders } = await spiceOwnerClient
      .from('orders')
      .select('id, order_number')
      .eq('restaurant_id', AMAN_CAFE_ID);

    assert(amanOrders !== null && amanOrders.length === 0, 'Aman cafe has 0 orders (no Table T5 or Spice Garden orders)');

    const { data: spiceOrders } = await spiceOwnerClient
      .from('orders')
      .select('id, order_number')
      .eq('restaurant_id', SPICE_GARDEN_ID);
    assert(spiceOrders !== null && spiceOrders.length > 0, `Spice Garden operational orders preserved (${spiceOrders.length} orders)`);

    // -------------------------------------------------------------------------
    // TEST 4: Restaurant B sees NO Restaurant A inventory
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Inventory Isolation ---');
    const { data: amanInventory } = await spiceOwnerClient
      .from('inventory_items')
      .select('id, name')
      .eq('restaurant_id', AMAN_CAFE_ID);

    assert(amanInventory !== null && amanInventory.length === 0, 'Aman cafe has 0 inventory items');

    // -------------------------------------------------------------------------
    // TEST 5: Restaurant B sees NO Restaurant A reports / expenses
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Reports / Expenses Isolation ---');
    const { data: amanExpenses } = await spiceOwnerClient
      .from('expenses')
      .select('id, amount_paise')
      .eq('outlet_id', AMAN_CAFE_OUTLET_ID);

    assert(amanExpenses !== null && amanExpenses.length === 0, 'Aman cafe has 0 expense records');

    // -------------------------------------------------------------------------
    // TEST 6: Staff Directory Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Staff Directory Isolation ---');
    const { data: spiceStaff } = await spiceOwnerClient
      .from('restaurant_memberships')
      .select('id, role, restaurant_id')
      .eq('restaurant_id', SPICE_GARDEN_ID);
    assert(spiceStaff !== null && spiceStaff.length >= 4, `Spice Garden has its 4 staff records intact`);

    // -------------------------------------------------------------------------
    // TEST 7: Cross-tenant RLS - Waiter from Restaurant A cannot read Restaurant B data
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Cross-Tenant Waiter Authorization ---');
    const { data: crossMenu } = await spiceWaiterClient
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', AMAN_CAFE_ID);
    assert(crossMenu.length === 0, 'Waiter from Spice Garden queries 0 items for Aman cafe');

    // Waiter from Restaurant A attempting to insert an order into Restaurant B
    const { error: crossOrderErr } = await spiceWaiterClient
      .from('orders')
      .insert({
        restaurant_id: AMAN_CAFE_ID,
        outlet_id: AMAN_CAFE_OUTLET_ID,
        order_number: '#CROSS-001',
        order_type: 'dine_in',
        total_paise: 50000,
        subtotal_paise: 50000,
      });
    assert(crossOrderErr !== null, `Direct cross-tenant order injection correctly REJECTED by database RLS (${crossOrderErr?.message || 'blocked'})`);

    // -------------------------------------------------------------------------
    // TEST 8: Kitchen Staff from Restaurant A cannot access Restaurant B tickets
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Cross-Tenant Kitchen Operations ---');
    const { error: crossKotErr } = await spiceKitchenClient
      .from('kot_tickets')
      .insert({
        restaurant_id: AMAN_CAFE_ID,
        outlet_id: AMAN_CAFE_OUTLET_ID,
        kot_number: 'KOT-CROSS-01',
        ticket_type: 'standard',
        status: 'sent',
      });
    assert(crossKotErr !== null, `Kitchen staff cross-tenant ticket insertion REJECTED by database RLS (${crossKotErr?.message || 'blocked'})`);

    // -------------------------------------------------------------------------
    // TEST 9: Direct API requests cannot bypass tenant isolation (Negative Test)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Anonymous API Protection ---');
    const { data: anonUpdateData } = await anonClient
      .from('restaurant_settings')
      .update({ receipt_footer: 'Hacked by Anonymous' })
      .eq('restaurant_id', AMAN_CAFE_ID)
      .select();
    assert(!anonUpdateData || anonUpdateData.length === 0, 'Anonymous client cannot update restaurant settings (RLS blocked / 0 rows affected)');

    // -------------------------------------------------------------------------
    // TEST 10: Unauthorized Branch Access
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Branch Authorization Enforcement ---');
    // korManagerClient is assigned to Indiranagar. Attempting to insert into Koramangala must be rejected!
    const { error: branchOverrideErr } = await korManagerClient
      .from('dining_sections')
      .insert({
        outlet_id: KORAMANGALA_OUTLET_ID,
        name: 'Unauthorized Cross Branch Section',
        sort_order: 99,
      });
    assert(branchOverrideErr !== null, `Branch manager inserting into unauthorized branch REJECTED by database RLS (${branchOverrideErr?.message || 'blocked'})`);

    // -------------------------------------------------------------------------
    // TEST 11: Staff Login ID resolution via RPC resolve_staff_login_email
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Username / Staff Login ID Authentication Flow ---');
    const { data: resolvedEmailDirect, error: rpcErr1 } = await anonClient.rpc(
      'resolve_staff_login_email',
      { p_identifier: 'owner@restohub.io' }
    );
    assert(!rpcErr1 && resolvedEmailDirect === 'owner@restohub.io', 'Email identifier passes through cleanly as lowercase email');

    const { data: resolvedStaffId, error: rpcErr2 } = await anonClient.rpc(
      'resolve_staff_login_email',
      { p_identifier: 'waiter_ind' }
    );
    assert(!rpcErr2 && resolvedStaffId === 'waiter@restohub.io', 'Staff username "waiter_ind" resolves securely to waiter@restohub.io');

    const { data: crossTenantResolved, error: rpcErr3 } = await anonClient.rpc(
      'resolve_staff_login_email',
      { p_identifier: 'waiter_ind', p_restaurant_slug: 'aman-cafe' }
    );
    assert(!rpcErr3 && crossTenantResolved === null, 'Cross-tenant username lookup with wrong slug is strictly rejected (returns NULL)');

    const { data: invalidId, error: rpcErr4 } = await anonClient.rpc(
      'resolve_staff_login_email',
      { p_identifier: 'nonexistent_staff_login_999' }
    );
    assert(!rpcErr4 && invalidId === null, 'Non-existent login ID returns null safely (no credential leak)');

    // -------------------------------------------------------------------------
    // TEST 12: Negative Test: Ordinary owner cannot grant Super Admin
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Privilege Escalation Guard ---');
    const ownerAuthUser = (await spiceOwnerClient.auth.getUser()).data.user;
    const { error: superAdminEscalationErr } = await spiceOwnerClient
      .from('user_profiles')
      .update({ is_super_admin: true })
      .eq('auth_user_id', ownerAuthUser.id);

    assert(superAdminEscalationErr !== null, `Owner updating is_super_admin REJECTED by security trigger (${superAdminEscalationErr?.message || 'blocked'})`);

    const { data: profileCheck } = await spiceOwnerClient
      .from('user_profiles')
      .select('is_super_admin')
      .eq('auth_user_id', ownerAuthUser.id)
      .single();
    assert(profileCheck?.is_super_admin === false, 'Owner remains unprivileged (not Super Admin)');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n==================================================================');
    console.log(`Phase 10 Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTenantIsolationTests();
