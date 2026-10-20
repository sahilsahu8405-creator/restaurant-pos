import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lolbdfykmoarhblkjgaa.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbGJkZnlrbW9hcmhibGtqZ2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUyMDgsImV4cCI6MjEwNzY0MTIwOH0.tF6MxCtPPi_bTEIc_zJNHtFUWMGIgmNY_M8aXvXQy1c';

const SPICE_GARDEN_ID = 'e7b1a0e1-0000-4000-8000-000000000001';
const INDIRANAGAR_ID = 'e7b1a0e1-0000-4000-8000-000000000011';
const KORAMANGALA_ID = 'e7b1a0e1-0000-4000-8000-000000000012';
const OTHER_RESTAURANT_ID = 'e7b1a0e1-0000-4000-8000-000000000002';

async function runTests() {
  console.log('========================================================');
  console.log('RestoHub Production Security & RBAC Test Suite');
  console.log('========================================================\n');

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

  // Helper to create an authenticated client
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

  try {
    // 1. OWNER TEST
    console.log('--- 1. Testing OWNER Permissions (owner@restohub.io) ---');
    const { client: ownerClient } = await loginAs('owner@restohub.io');

    const { data: ownerSettings, error: ownerSettingsErr } = await ownerClient
      .from('restaurant_settings')
      .select('*')
      .eq('restaurant_id', SPICE_GARDEN_ID);

    assert(!ownerSettingsErr && ownerSettings && ownerSettings.length > 0, 'Owner can read restaurant settings');

    // Owner can update settings
    const testFooter = `Verified by Owner at ${new Date().toISOString()}`;
    const { error: ownerUpdateErr } = await ownerClient
      .from('restaurant_settings')
      .update({ receipt_footer: testFooter })
      .eq('restaurant_id', SPICE_GARDEN_ID);

    assert(!ownerUpdateErr, 'Owner can successfully update restaurant settings');

    // Owner can read payments and financial records
    const { data: ownerPayments, error: ownerPayErr } = await ownerClient
      .from('payments')
      .select('*')
      .eq('restaurant_id', SPICE_GARDEN_ID);

    assert(!ownerPayErr && ownerPayments && ownerPayments.length > 0, 'Owner can read financial payments');

    // Owner cannot read unrelated tenant's restaurant data
    const { data: otherRestData } = await ownerClient
      .from('restaurants')
      .select('*')
      .eq('id', OTHER_RESTAURANT_ID);

    assert(!otherRestData || otherRestData.length === 0, 'Owner CANNOT read other tenant restaurant data');

    // 2. MANAGER TEST
    console.log('\n--- 2. Testing MANAGER Permissions (manager@restohub.io) ---');
    const { client: managerClient } = await loginAs('manager@restohub.io');

    // Manager can read settings (read-only for operational config)
    const { data: mgrSettings, error: mgrSettingsErr } = await managerClient
      .from('restaurant_settings')
      .select('*')
      .eq('restaurant_id', SPICE_GARDEN_ID);

    assert(!mgrSettingsErr && mgrSettings && mgrSettings.length > 0, 'Manager can read operational settings');

    // Manager CANNOT update restaurant settings (RLS must reject/ignore)
    const { data: mgrUpdatedSettings } = await managerClient
      .from('restaurant_settings')
      .update({ receipt_footer: 'Hacked by manager' })
      .eq('restaurant_id', SPICE_GARDEN_ID)
      .select();

    assert(!mgrUpdatedSettings || mgrUpdatedSettings.length === 0, 'Manager CANNOT update protected restaurant settings');

    // Manager can access assigned outlet orders
    const { data: mgrOrders } = await managerClient
      .from('orders')
      .select('*')
      .eq('outlet_id', INDIRANAGAR_ID);

    assert(mgrOrders && mgrOrders.length > 0, 'Manager can access assigned outlet orders');

    // 3. WAITER TEST
    console.log('\n--- 3. Testing WAITER Permissions (waiter@restohub.io) ---');
    const { client: waiterClient } = await loginAs('waiter@restohub.io');

    // Waiter CANNOT read restaurant settings
    const { data: waiterSettings } = await waiterClient
      .from('restaurant_settings')
      .select('*')
      .eq('restaurant_id', SPICE_GARDEN_ID);

    assert(!waiterSettings || waiterSettings.length === 0, 'Waiter is DENIED access to restaurant settings (RLS returns 0 rows)');

    // Waiter CANNOT read payments
    const { data: waiterPayments } = await waiterClient
      .from('payments')
      .select('*')
      .eq('restaurant_id', SPICE_GARDEN_ID);

    assert(!waiterPayments || waiterPayments.length === 0, 'Waiter is DENIED access to customer payment records');

    // Waiter CANNOT read inventory
    const { data: waiterInventory } = await waiterClient
      .from('inventory_items')
      .select('*')
      .eq('restaurant_id', SPICE_GARDEN_ID);

    assert(!waiterInventory || waiterInventory.length === 0, 'Waiter is DENIED access to inventory stock & costs');

    // Waiter CANNOT read expenses
    const { data: waiterExpenses } = await waiterClient
      .from('expenses')
      .select('*');

    assert(!waiterExpenses || waiterExpenses.length === 0, 'Waiter is DENIED access to restaurant expenses');

    // Waiter CAN access assigned outlet menu items
    const { data: waiterMenu } = await waiterClient
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', SPICE_GARDEN_ID);

    assert(waiterMenu && waiterMenu.length > 0, 'Waiter CAN read available menu items for their restaurant');

    // Waiter CAN access assigned outlet tables
    const { data: waiterTables } = await waiterClient
      .from('dining_tables')
      .select('*')
      .eq('outlet_id', INDIRANAGAR_ID);

    assert(waiterTables && waiterTables.length > 0, 'Waiter CAN read tables for assigned outlet');

    // 4. KITCHEN / KDS TEST
    console.log('\n--- 4. Testing KITCHEN Permissions (kitchen@restohub.io) ---');
    const { client: kitchenClient } = await loginAs('kitchen@restohub.io');

    // Kitchen CANNOT read payments
    const { data: kdsPayments } = await kitchenClient
      .from('payments')
      .select('*');

    assert(!kdsPayments || kdsPayments.length === 0, 'Kitchen staff is DENIED access to payments');

    // Kitchen CANNOT read settings
    const { data: kdsSettings } = await kitchenClient
      .from('restaurant_settings')
      .select('*');

    assert(!kdsSettings || kdsSettings.length === 0, 'Kitchen staff is DENIED access to restaurant settings');

    // Kitchen CANNOT read expenses
    const { data: kdsExpenses } = await kitchenClient
      .from('expenses')
      .select('*');

    assert(!kdsExpenses || kdsExpenses.length === 0, 'Kitchen staff is DENIED access to expenses');

    // Kitchen CAN read order items for active tickets
    const { data: kdsItems } = await kitchenClient
      .from('order_items')
      .select('*');

    assert(kdsItems && kdsItems.length > 0, 'Kitchen staff CAN read order items to prepare tickets');

    // 5. CROSS-TENANT & CROSS-BRANCH ISOLATION
    console.log('\n--- 5. Testing Cross-Tenant & Cross-Branch Isolation ---');
    // Waiter assigned to Indiranagar tries to query Koramangala orders
    const { data: crossBranchOrders } = await waiterClient
      .from('orders')
      .select('*')
      .eq('outlet_id', KORAMANGALA_ID);

    assert(!crossBranchOrders || crossBranchOrders.length === 0, 'Waiter CANNOT access unassigned branch orders');

    // Waiter tries to query other tenant's orders
    const { data: crossTenantOrders } = await waiterClient
      .from('orders')
      .select('*')
      .eq('restaurant_id', OTHER_RESTAURANT_ID);

    assert(!crossTenantOrders || crossTenantOrders.length === 0, 'Waiter CANNOT access other tenant orders');

    // 6. ANONYMOUS ATTACK TEST
    console.log('\n--- 6. Testing Unauthenticated / Anonymous Access Denial ---');
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { data: anonOrders } = await anonClient.from('orders').select('*');
    assert(!anonOrders || anonOrders.length === 0, 'Unauthenticated / Anon requests to orders return 0 rows (DENIED)');

    const { data: anonSettings } = await anonClient.from('restaurant_settings').select('*');
    assert(!anonSettings || anonSettings.length === 0, 'Unauthenticated / Anon requests to settings return 0 rows (DENIED)');

    const { data: anonPayments } = await anonClient.from('payments').select('*');
    assert(!anonPayments || anonPayments.length === 0, 'Unauthenticated / Anon requests to payments return 0 rows (DENIED)');

    // 7. SELF-ROLE ELEVATION ATTACK TEST
    console.log('\n--- 7. Testing Self-Role Elevation Attacks ---');
    // Waiter tries to elevate own membership to 'owner'
    const { data: elevatedMembership } = await waiterClient
      .from('restaurant_memberships')
      .update({ role: 'owner' })
      .eq('user_id', (await waiterClient.auth.getUser()).data.user.id)
      .select();

    assert(!elevatedMembership || elevatedMembership.length === 0, 'Waiter CANNOT elevate own role to owner (RLS rejects write)');

    // Waiter tries to insert self into another restaurant as owner
    const { error: rogueMembershipErr } = await waiterClient
      .from('restaurant_memberships')
      .insert({
        restaurant_id: OTHER_RESTAURANT_ID,
        user_id: (await waiterClient.auth.getUser()).data.user.id,
        role: 'owner',
      });

    assert(!!rogueMembershipErr, 'Waiter CANNOT grant themselves membership in another restaurant');

    // 8. UNINTENDED INVITATION CLAIM ATTACK
    console.log('\n--- 8. Testing Invitation Claim Security ---');
    // Try to accept a fake or expired token
    const { error: invalidTokenErr } = await waiterClient.rpc('accept_staff_invitation', {
      p_token: 'NON_EXISTENT_TOKEN_9999',
    });
    assert(!!invalidTokenErr, 'Invalid or expired invitation token is REJECTED');

    // 9. CROSS-TENANT MANAGER & KITCHEN ISOLATION
    console.log('\n--- 9. Testing Cross-Tenant Manager & Kitchen Isolation ---');
    const { data: mgrOtherRest } = await managerClient
      .from('restaurants')
      .select('*')
      .eq('id', OTHER_RESTAURANT_ID);
    assert(!mgrOtherRest || mgrOtherRest.length === 0, 'Manager CANNOT access Restaurant B data');

    const { data: kdsOtherRest } = await kitchenClient
      .from('restaurants')
      .select('*')
      .eq('id', OTHER_RESTAURANT_ID);
    assert(!kdsOtherRest || kdsOtherRest.length === 0, 'Kitchen staff CANNOT access Restaurant B data');

    // 10. SPICE GARDEN BACKWARDS COMPATIBILITY
    console.log('\n--- 10. Verifying Spice Garden Operational Data Continuity ---');
    const { data: sgTables } = await ownerClient
      .from('dining_tables')
      .select('*')
      .in('outlet_id', [INDIRANAGAR_ID, KORAMANGALA_ID]);
    assert(sgTables && sgTables.length > 0, `Spice Garden tables intact (${sgTables?.length || 0} tables found)`);

    const { data: sgMenu } = await ownerClient
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', SPICE_GARDEN_ID);
    assert(sgMenu && sgMenu.length > 0, `Spice Garden menu items intact (${sgMenu?.length || 0} items found)`);

    const { data: sgOrders } = await ownerClient
      .from('orders')
      .select('*')
      .eq('restaurant_id', SPICE_GARDEN_ID);
    assert(sgOrders && sgOrders.length > 0, `Spice Garden orders intact (${sgOrders?.length || 0} orders found)`);

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
