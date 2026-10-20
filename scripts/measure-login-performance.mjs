/**
 * RestoHub Login Performance Benchmark
 * Measures:
 * 1. resolveStaffLoginEmail latency
 * 2. Supabase signInWithPassword latency
 * 3. getCurrentUserProfileAndMemberships latency
 * 4. End-to-end simulated staff login time
 * 5. End-to-end simulated owner login time
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lolbdfykmoarhblkjgaa.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbGJkZnlrbW9hcmhibGtqZ2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUyMDgsImV4cCI6MjEwNzY0MTIwOH0.tF6MxCtPPi_bTEIc_zJNHtFUWMGIgmNY_M8aXvXQy1c';

async function measure() {
  console.log('========================================================');
  console.log('RestoHub: Authentication Performance Benchmark');
  console.log('========================================================\n');

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // 1. Staff Email Resolution Benchmark
  const t0 = performance.now();
  const { data: resolvedEmail } = await client.rpc('resolve_staff_login_email', {
    p_identifier: 'waiter_ind',
    p_restaurant_identifier: 'RH-SPICE',
    p_branch_code: 'IND',
  });
  const t1 = performance.now();
  const staffResolveTime = Math.round(t1 - t0);
  console.log(`[1] Staff Login ID Resolution: ${staffResolveTime} ms (Resolved: ${resolvedEmail})`);

  // 2. Staff Authentication Benchmark
  const t2 = performance.now();
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: resolvedEmail,
    password: 'Password@123',
  });
  const t3 = performance.now();
  const authTime = Math.round(t3 - t2);
  console.log(`[2] Supabase Auth Verification: ${authTime} ms (Success: ${!authErr})`);

  // 3. User Profile & Authorized Memberships Query Benchmark
  const t4 = performance.now();
  const [profileRes, membershipsRes] = await Promise.all([
    client.from('user_profiles').select('*').eq('auth_user_id', authData.user.id).single(),
    client.rpc('get_user_authorized_memberships_v2'),
  ]);
  const t5 = performance.now();
  const profileMembershipsTime = Math.round(t5 - t4);
  console.log(`[3] Profile & Authorized Memberships Fetch: ${profileMembershipsTime} ms (${membershipsRes.data?.length || 0} memberships)`);

  const totalStaffLoginMs = staffResolveTime + authTime + profileMembershipsTime;
  console.log(`\n--> Total Staff Login Latency (Resolution + Auth + RBAC): ${totalStaffLoginMs} ms`);

  // 4. Owner Login Benchmark
  const t6 = performance.now();
  const { data: ownerAuth, error: ownerErr } = await client.auth.signInWithPassword({
    email: 'owner@restohub.io',
    password: 'Password@123',
  });
  const t7 = performance.now();
  const ownerAuthTime = Math.round(t7 - t6);

  const t8 = performance.now();
  const [ownerProfile, ownerMemberships] = await Promise.all([
    client.from('user_profiles').select('*').eq('auth_user_id', ownerAuth.user.id).single(),
    client.rpc('get_user_authorized_memberships_v2'),
  ]);
  const t9 = performance.now();
  const ownerRBAC = Math.round(t9 - t8);

  const totalOwnerLoginMs = ownerAuthTime + ownerRBAC;
  console.log(`--> Total Owner Login Latency (Auth + RBAC): ${totalOwnerLoginMs} ms`);

  console.log('\n========================================================');
  console.log(`Benchmark Complete: Staff=${totalStaffLoginMs}ms, Owner=${totalOwnerLoginMs}ms`);
  console.log('========================================================');
}

measure().catch(console.error);
