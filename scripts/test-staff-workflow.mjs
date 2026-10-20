import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lolbdfykmoarhblkjgaa.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbGJkZnlrbW9hcmhibGtqZ2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUyMDgsImV4cCI6MjEwNzY0MTIwOH0.tF6MxCtPPi_bTEIc_zJNHtFUWMGIgmNY_M8aXvXQy1c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING RESTOHUB STAFF & MULTI-TENANT VERIFICATION');
  console.log('====================================================\n');

  const timestamp = Date.now().toString().slice(-6);
  const alphaEmail = `owner.alpha.${timestamp}@test.restohub.internal`;
  const betaEmail = `owner.beta.${timestamp}@test.restohub.internal`;
  const defaultPassword = 'TestPassword123!';

  let alphaOwnerId = null;
  let betaOwnerId = null;
  let alphaRest = null;
  let betaRest = null;

  try {
    // ----------------------------------------------------
    // TEST A: Create Restaurant Alpha
    // ----------------------------------------------------
    console.log('--- TEST A: Create Restaurant Alpha ---');
    const { data: alphaAuth, error: alphaAuthErr } = await supabase.auth.signUp({
      email: alphaEmail,
      password: defaultPassword,
    });
    if (alphaAuthErr) throw alphaAuthErr;
    alphaOwnerId = alphaAuth.user.id;
    assert(alphaOwnerId, `Signed up Alpha Owner (${alphaEmail})`);

    // Call create_restaurant_with_owner as authenticated Alpha owner
    const alphaClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    await alphaClient.auth.setSession({
      access_token: alphaAuth.session.access_token,
      refresh_token: alphaAuth.session.refresh_token,
    });

    const { data: alphaRpcData, error: alphaRpcErr } = await alphaClient.rpc('create_restaurant_with_owner', {
      p_restaurant_name: `Restaurant Alpha ${timestamp}`,
      p_outlet_name: 'Alpha Main Branch',
      p_outlet_code: 'AMAIN',
      p_currency: 'INR',
      p_currency_symbol: '₹',
      p_full_name: 'Alpha Owner',
      p_phone: '+919876543210',
    });
    if (alphaRpcErr) throw alphaRpcErr;

    alphaRest = alphaRpcData;
    assert(alphaRest.restaurant_id, `Alpha Restaurant ID created: ${alphaRest.restaurant_id}`);
    assert(alphaRest.restaurant_code, `Alpha Restaurant Code generated: ${alphaRest.restaurant_code}`);
    assert(/^RH-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(alphaRest.restaurant_code) || /^RH-[A-Z0-9]{4,8}$/.test(alphaRest.restaurant_code),
      `Alpha Restaurant Code matches collision-resistant format: ${alphaRest.restaurant_code}`);

    // Verify stored in Supabase
    const { data: alphaDbRow, error: alphaFetchErr } = await supabase
      .from('restaurants')
      .select('id, name, restaurant_code')
      .eq('id', alphaRest.restaurant_id)
      .single();
    if (alphaFetchErr) throw alphaFetchErr;
    assert(alphaDbRow.restaurant_code === alphaRest.restaurant_code, `Alpha Code verified in database: ${alphaDbRow.restaurant_code}`);
    console.log('✅ TEST A PASSED\n');

    // ----------------------------------------------------
    // TEST B: Create Restaurant Beta
    // ----------------------------------------------------
    console.log('--- TEST B: Create Restaurant Beta ---');
    const { data: betaAuth, error: betaAuthErr } = await supabase.auth.signUp({
      email: betaEmail,
      password: defaultPassword,
    });
    if (betaAuthErr) throw betaAuthErr;
    betaOwnerId = betaAuth.user.id;

    const betaClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    await betaClient.auth.setSession({
      access_token: betaAuth.session.access_token,
      refresh_token: betaAuth.session.refresh_token,
    });

    const { data: betaRpcData, error: betaRpcErr } = await betaClient.rpc('create_restaurant_with_owner', {
      p_restaurant_name: `Restaurant Beta ${timestamp}`,
      p_outlet_name: 'Beta Central',
      p_outlet_code: 'BCENT',
      p_currency: 'INR',
      p_currency_symbol: '₹',
      p_full_name: 'Beta Owner',
      p_phone: '+919876543211',
    });
    if (betaRpcErr) throw betaRpcErr;

    betaRest = betaRpcData;
    assert(betaRest.restaurant_id, `Beta Restaurant ID created: ${betaRest.restaurant_id}`);
    assert(betaRest.restaurant_code, `Beta Restaurant Code generated: ${betaRest.restaurant_code}`);
    assert(betaRest.restaurant_code !== alphaRest.restaurant_code,
      `Alpha (${alphaRest.restaurant_code}) and Beta (${betaRest.restaurant_code}) have distinct IDs`);
    console.log('✅ TEST B PASSED\n');

    // ----------------------------------------------------
    // TEST C: Verify Saved IDs and Memberships Consistency
    // ----------------------------------------------------
    console.log('--- TEST C: Verify Consistency of Saved IDs ---');
    const { data: alphaMem } = await alphaClient.rpc('get_user_authorized_memberships_v2');
    assert(alphaMem && alphaMem.length > 0, 'Alpha Owner retrieved memberships');
    assert(alphaMem[0].restaurant_code === alphaRest.restaurant_code,
      `Alpha membership has correct code: ${alphaMem[0].restaurant_code}`);

    const { data: betaMem } = await betaClient.rpc('get_user_authorized_memberships_v2');
    assert(betaMem && betaMem.length > 0, 'Beta Owner retrieved memberships');
    assert(betaMem[0].restaurant_code === betaRest.restaurant_code,
      `Beta membership has correct code: ${betaMem[0].restaurant_code}`);
    console.log('✅ TEST C PASSED\n');

    // ----------------------------------------------------
    // TEST D: Create Waiter ravi01 in Alpha
    // ----------------------------------------------------
    console.log('--- TEST D: Provision Waiter ravi01 in Alpha ---');
    const waiterPassword = 'RaviPassword123!';
    const { data: alphaStaffResult, error: alphaStaffErr } = await alphaClient.rpc('provision_staff_account', {
      p_restaurant_id: alphaRest.restaurant_id,
      p_outlet_id: alphaRest.outlet_id,
      p_role: 'waiter',
      p_full_name: 'Ravi Kumar',
      p_login_id: 'ravi01',
      p_email: null,
      p_password: waiterPassword,
    });
    if (alphaStaffErr) throw alphaStaffErr;
    assert(alphaStaffResult.success === true, 'Staff provisioning succeeded');
    assert(alphaStaffResult.login_id === 'ravi01', `Staff Login ID assigned: ${alphaStaffResult.login_id}`);
    const alphaStaffUserId = alphaStaffResult.user_id;

    // Verify DB records exist via Alpha owner client (RLS protected)
    const { data: memRecord, error: memFetchErr } = await alphaClient
      .from('restaurant_memberships')
      .select('id, user_id, restaurant_id, role, login_id, is_active')
      .eq('user_id', alphaStaffUserId)
      .eq('restaurant_id', alphaRest.restaurant_id)
      .single();
    if (memFetchErr) throw memFetchErr;
    assert(memRecord.login_id === 'ravi01', 'Membership record contains normalized login_id: ravi01');
    assert(memRecord.role === 'waiter', 'Membership role is waiter');
    assert(memRecord.is_active === true, 'Membership is active');
    console.log('✅ TEST D PASSED\n');

    // ----------------------------------------------------
    // TEST E: Log in with Alpha Restaurant ID + ravi01 + Password
    // ----------------------------------------------------
    console.log('--- TEST E: Log in as ravi01 using Alpha Restaurant ID ---');
    const { data: resolvedEmail, error: resolveErr } = await supabase.rpc('resolve_staff_login_email', {
      p_identifier: 'ravi01',
      p_restaurant_identifier: alphaRest.restaurant_code,
      p_branch_code: 'AMAIN',
    });
    if (resolveErr) throw resolveErr;
    assert(resolvedEmail && resolvedEmail.length > 0, `Resolved staff login email: ${resolvedEmail}`);

    const waiterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: waiterAuth, error: waiterSignInErr } = await waiterClient.auth.signInWithPassword({
      email: resolvedEmail,
      password: waiterPassword,
    });
    if (waiterSignInErr) throw waiterSignInErr;
    assert(waiterAuth.user.id === alphaStaffUserId, 'Waiter authenticated to correct Auth identity');
    console.log('✅ TEST E PASSED\n');

    // ----------------------------------------------------
    // TEST F: Verify Waiter Role and Workspace Scoping
    // ----------------------------------------------------
    console.log('--- TEST F: Verify Waiter Access & Scoping ---');
    const { data: waiterMems, error: waiterMemsErr } = await waiterClient.rpc('get_user_authorized_memberships_v2');
    if (waiterMemsErr) throw waiterMemsErr;
    assert(waiterMems.length === 1, 'Waiter has exactly 1 membership');
    assert(waiterMems[0].role === 'waiter', `Waiter membership role verified as "${waiterMems[0].role}"`);
    assert(waiterMems[0].restaurant_id === alphaRest.restaurant_id, 'Scoped strictly to Alpha restaurant');
    console.log('✅ TEST F PASSED\n');

    // ----------------------------------------------------
    // TEST G: Attempt to Log ravi01 into Beta (Must Fail)
    // ----------------------------------------------------
    console.log('--- TEST G: Attempt Cross-Tenant Login to Beta (Must Fail) ---');
    const { data: crossTenantEmail, error: crossResolveErr } = await supabase.rpc('resolve_staff_login_email', {
      p_identifier: 'ravi01',
      p_restaurant_identifier: betaRest.restaurant_code,
      p_branch_code: 'BCENT',
    });
    assert(crossTenantEmail === null, 'resolve_staff_login_email returned NULL for ravi01 in Beta');
    console.log('✅ TEST G PASSED\n');

    // ----------------------------------------------------
    // TEST H: Create ravi01 in Beta (Should Succeed)
    // ----------------------------------------------------
    console.log('--- TEST H: Provision ravi01 in Beta (Per-Tenant Login ID) ---');
    const { data: betaStaffResult, error: betaStaffErr } = await betaClient.rpc('provision_staff_account', {
      p_restaurant_id: betaRest.restaurant_id,
      p_outlet_id: betaRest.outlet_id,
      p_role: 'waiter',
      p_full_name: 'Ravi Verma (Beta)',
      p_login_id: 'ravi01',
      p_email: null,
      p_password: 'BetaRaviPassword123!',
    });
    if (betaStaffErr) throw betaStaffErr;
    assert(betaStaffResult.success === true, 'ravi01 created successfully in Beta');
    assert(betaStaffResult.user_id !== alphaStaffUserId,
      `Beta ravi01 has distinct Auth identity (${betaStaffResult.user_id} vs ${alphaStaffUserId})`);
    console.log('✅ TEST H PASSED\n');

    // ----------------------------------------------------
    // TEST I: Duplicate Login ID in Alpha (Must Fail)
    // ----------------------------------------------------
    console.log('--- TEST I: Attempt Duplicate Login ID in Alpha (Must Fail) ---');
    let duplicateFailed = false;
    const { error: dupErr } = await alphaClient.rpc('provision_staff_account', {
      p_restaurant_id: alphaRest.restaurant_id,
      p_outlet_id: alphaRest.outlet_id,
      p_role: 'waiter',
      p_full_name: 'Ravi Duplicate',
      p_login_id: 'ravi01',
      p_email: null,
      p_password: 'AnyPassword123!',
    });
    if (dupErr) {
      duplicateFailed = true;
      assert(dupErr.message.includes('already in use'), `Failed with clear error: "${dupErr.message}"`);
    }
    assert(duplicateFailed, 'Duplicate login ID in same restaurant was blocked');
    console.log('✅ TEST I PASSED\n');

    // ----------------------------------------------------
    // TEST J: Edit Waiter Branch and Deactivate
    // ----------------------------------------------------
    console.log('--- TEST J: Edit Waiter Branch and Deactivate Account ---');
    const { data: updateRes, error: updateErr } = await alphaClient.rpc('update_staff_member', {
      p_restaurant_id: alphaRest.restaurant_id,
      p_membership_id: alphaStaffResult.membership_id,
      p_full_name: 'Ravi Kumar Senior',
      p_role: 'waiter',
      p_outlet_id: alphaRest.outlet_id,
      p_is_active: false,
    });
    if (updateErr) throw updateErr;
    assert(updateRes.success === true, 'update_staff_member returned success');

    const { data: updatedMem, error: fetchUpdatedErr } = await alphaClient
      .from('restaurant_memberships')
      .select('is_active')
      .eq('id', alphaStaffResult.membership_id)
      .single();
    if (fetchUpdatedErr) throw fetchUpdatedErr;
    assert(updatedMem.is_active === false, 'Account marked inactive in DB');

    // Verify subsequent login resolution is blocked for deactivated account
    const { data: deactivatedResolved } = await supabase.rpc('resolve_staff_login_email', {
      p_identifier: 'ravi01',
      p_restaurant_identifier: alphaRest.restaurant_code,
      p_branch_code: null,
    });
    assert(deactivatedResolved === null, 'Deactivated waiter login resolution returned NULL (blocked)');
    console.log('✅ TEST J PASSED\n');

    // ----------------------------------------------------
    // TEST K: Reactivate and Verify Restoration
    // ----------------------------------------------------
    console.log('--- TEST K: Reactivate Waiter & Verify Authentication Restoration ---');
    const { data: reactivateRes, error: reactivateErr } = await alphaClient.rpc('update_staff_member', {
      p_restaurant_id: alphaRest.restaurant_id,
      p_membership_id: alphaStaffResult.membership_id,
      p_full_name: 'Ravi Kumar Senior',
      p_role: 'waiter',
      p_outlet_id: alphaRest.outlet_id,
      p_is_active: true,
    });
    if (reactivateErr) throw reactivateErr;
    assert(reactivateRes.success === true, 'Reactivate RPC returned success');

    const { data: reactivatedResolved, error: resolveKerr } = await supabase.rpc('resolve_staff_login_email', {
      p_identifier: 'ravi01',
      p_restaurant_identifier: alphaRest.restaurant_code,
      p_branch_code: null,
    });
    if (resolveKerr) throw resolveKerr;
    assert(reactivatedResolved !== null, `Reactivated login resolved: ${reactivatedResolved}`);

    // Verify password reset RPC
    const newWaiterPassword = 'NewRaviPassword456!';
    const { data: resetResult, error: resetErr } = await alphaClient.rpc('reset_staff_password', {
      p_restaurant_id: alphaRest.restaurant_id,
      p_membership_id: alphaStaffResult.membership_id,
      p_new_password: newWaiterPassword,
    });
    if (resetErr) throw resetErr;
    assert(resetResult.success === true, 'Staff password reset succeeded');

    // Sign in with new password
    const { data: newSignIn, error: newSignInErr } = await waiterClient.auth.signInWithPassword({
      email: reactivatedResolved,
      password: newWaiterPassword,
    });
    if (newSignInErr) throw newSignInErr;
    assert(newSignIn.user.id === alphaStaffUserId, 'Signed in with updated password successfully');
    console.log('✅ TEST K PASSED\n');

    // ----------------------------------------------------
    // TEST L: Security Boundaries & Failure Recovery
    // ----------------------------------------------------
    console.log('--- TEST L: Security Boundaries & Partial Failures ---');

    // 1. Invalid password length (< 6 chars)
    let shortPassFailed = false;
    const { error: shortPassErr } = await alphaClient.rpc('provision_staff_account', {
      p_restaurant_id: alphaRest.restaurant_id,
      p_outlet_id: alphaRest.outlet_id,
      p_role: 'waiter',
      p_full_name: 'Short Pass',
      p_login_id: 'short01',
      p_email: null,
      p_password: '123',
    });
    if (shortPassErr) {
      shortPassFailed = true;
      assert(shortPassErr.message.includes('at least 6 characters'), `Blocked short password: "${shortPassErr.message}"`);
    }
    assert(shortPassFailed, 'Short password creation blocked');

    // 2. Non-owner attempting to provision staff (Cross-authorization guard)
    let unauthorizedProvisionBlocked = false;
    const { error: unauthErr } = await waiterClient.rpc('provision_staff_account', {
      p_restaurant_id: alphaRest.restaurant_id,
      p_outlet_id: alphaRest.outlet_id,
      p_role: 'waiter',
      p_full_name: 'Hacker Waiter',
      p_login_id: 'hack01',
      p_email: null,
      p_password: 'Password123!',
    });
    if (unauthErr) {
      unauthorizedProvisionBlocked = true;
      assert(unauthErr.message.includes('Only restaurant owners or managers'), `Unauthorized provision rejected: "${unauthErr.message}"`);
    }
    assert(unauthorizedProvisionBlocked, 'Waiter cannot provision staff');

    // 3. Attempting to create superadmin role
    let superadminCreationBlocked = false;
    const { error: saErr } = await alphaClient.rpc('provision_staff_account', {
      p_restaurant_id: alphaRest.restaurant_id,
      p_outlet_id: alphaRest.outlet_id,
      p_role: 'superadmin',
      p_full_name: 'Fake SuperAdmin',
      p_login_id: 'admin01',
      p_email: null,
      p_password: 'Password123!',
    });
    if (saErr) {
      superadminCreationBlocked = true;
      assert(saErr.message.includes('Permitted roles are'), `Superadmin creation blocked: "${saErr.message}"`);
    }
    assert(superadminCreationBlocked, 'Owner cannot create superadmin accounts');

    // 4. Invalid Restaurant ID lookup
    const { data: invalidRestResolved } = await supabase.rpc('resolve_staff_login_email', {
      p_identifier: 'ravi01',
      p_restaurant_identifier: 'RH-NONEXISTENT',
      p_branch_code: null,
    });
    assert(invalidRestResolved === null, 'Non-existent Restaurant ID returns null');

    console.log('✅ TEST L PASSED\n');

    console.log('====================================================');
    console.log('🎉 ALL TESTS A THROUGH L PASSED WITH 100% SUCCESS!');
    console.log('====================================================');
  } catch (err) {
    console.error('TEST RUN FAILED:', err);
    process.exit(1);
  }
}

runTests();
