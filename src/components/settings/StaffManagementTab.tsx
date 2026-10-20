import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  Mail,
  Building2,
  ChefHat,
  Smartphone,
  AlertTriangle,
  Loader2,
  Trash2,
  Check,
  RefreshCw,
  KeyRound,
  Edit2,
  Lock,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchStaffMembersFromSupabase,
  createStaffInvitationInSupabase,
  fetchStaffInvitationsFromSupabase,
  revokeStaffInvitationInSupabase,
  updateStaffMembershipStatusInSupabase,
  fetchAuditLogsFromSupabase,
  provisionStaffAccountInSupabase,
  resetStaffPasswordInSupabase,
  updateStaffMemberInSupabase,
} from '../../services/supabaseClient';
import { AuditLog, RestaurantMembership, RoleType, StaffInvitation } from '../../types';

export const StaffManagementTab: React.FC = () => {
  const { restaurant, activeOutlet, addToast } = useApp();
  const { role, isSuperAdmin, user, profile, membership } = useAuth();
  const verifiedRestaurantCode = restaurant?.restaurantCode || membership?.restaurantCode;

  const [memberships, setMemberships] = useState<RestaurantMembership[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal states
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [provisionMode, setProvisionMode] = useState<'direct' | 'invite'>('direct');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoginId, setInviteLoginId] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleType>('waiter');
  const [inviteOutletId, setInviteOutletId] = useState<string>(activeOutlet?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState<any>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Edit Staff Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<RestaurantMembership | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<RoleType>('waiter');
  const [editOutletId, setEditOutletId] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Reset Password Modal State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resettingMembership, setResettingMembership] = useState<RestaurantMembership | null>(null);
  const [newStaffPassword, setNewStaffPassword] = useState('');

  const canManageStaff = role === 'owner' || isSuperAdmin;

  const loadData = async () => {
    const targetRestId = membership?.restaurantId || restaurant?.id;
    if (!targetRestId) return;
    setIsLoading(true);
    try {
      const [mList, invList, aLogs] = await Promise.all([
        fetchStaffMembersFromSupabase(targetRestId),
        fetchStaffInvitationsFromSupabase(targetRestId),
        fetchAuditLogsFromSupabase(targetRestId),
      ]);
      setMemberships(mList);
      setInvitations(invList);
      setAuditLogs(aLogs);
    } catch (err: any) {
      console.warn('Failed to load staff management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurant?.id, membership?.restaurantId]);

  const handleToggleStatus = async (targetMembership: RestaurantMembership) => {
    if (!canManageStaff) {
      addToast('Only restaurant owners can modify staff account status', 'error');
      return;
    }

    if (targetMembership.role === 'owner') {
      addToast('Owner privileges cannot be deactivated here', 'warning');
      return;
    }

    const nextStatus = !targetMembership.isActive;
    const targetRestId = membership?.restaurantId || restaurant?.id;
    if (!targetRestId) {
      addToast('Restaurant context could not be verified', 'error');
      return;
    }

    try {
      await updateStaffMemberInSupabase({
        restaurantId: targetRestId,
        membershipId: targetMembership.id,
        fullName: targetMembership.userProfile?.fullName || 'Staff Member',
        role: targetMembership.role,
        outletId: targetMembership.outletId,
        isActive: nextStatus,
      });

      addToast(
        `Staff member ${targetMembership.userProfile?.fullName || 'account'} ${
          nextStatus ? 'activated' : 'deactivated'
        }`,
        nextStatus ? 'success' : 'info'
      );
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to update staff status', 'error');
    }
  };

  const openAddStaffModal = () => {
    setProvisionMode('direct');
    setProvisionSuccess(null);
    setGeneratedToken(null);
    setInviteName('');
    setInviteEmail('');
    setInviteLoginId('');
    setInvitePassword('');
    setInviteRole('waiter');
    setInviteOutletId(activeOutlet?.id || restaurant?.outlets[0]?.id || '');
    setIsInviteOpen(true);
  };

  const closeAddStaffModal = () => {
    setIsInviteOpen(false);
    setProvisionSuccess(null);
    setGeneratedToken(null);
    setInviteName('');
    setInviteEmail('');
    setInviteLoginId('');
    setInvitePassword('');
    setInviteRole('waiter');
  };

  const handleModeSwitch = (mode: 'direct' | 'invite') => {
    setProvisionMode(mode);
    setInvitePassword('');
    setProvisionSuccess(null);
    setGeneratedToken(null);
  };

  const handleCreateStaff = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();
    const targetRestId = membership?.restaurantId || restaurant?.id;
    if (!targetRestId) {
      addToast('Cannot verify restaurant context for staff account creation', 'error');
      return;
    }

    if (!inviteName.trim()) {
      addToast('Please enter the staff member full name', 'error');
      return;
    }
    if (!inviteLoginId.trim()) {
      addToast('Please enter a Staff Login ID (at least 3 characters)', 'error');
      return;
    }

    // Owner email protection: staff email must never be the owner email
    const ownerEmail = user?.email || profile?.email;
    if (ownerEmail && inviteEmail.trim().toLowerCase() === ownerEmail.toLowerCase()) {
      addToast('Cannot assign the owner account email address to a staff member.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (provisionMode === 'direct') {
        if (!invitePassword || invitePassword.length < 6) {
          addToast('Password must be at least 6 characters', 'error');
          setIsSubmitting(false);
          return;
        }

        const res = await provisionStaffAccountInSupabase({
          restaurantId: targetRestId,
          outletId: inviteOutletId || undefined,
          fullName: inviteName.trim(),
          loginId: inviteLoginId.trim().toLowerCase(),
          email: inviteEmail.trim() || undefined,
          password: invitePassword,
          role: inviteRole,
        });

        setProvisionSuccess(res);
        addToast(`Staff member "${inviteName}" created and credentials provisioned!`, 'success');
        await loadData();
      } else {
        if (!inviteEmail.trim()) {
          addToast('Email address is required to generate an invitation link', 'error');
          setIsSubmitting(false);
          return;
        }

        const { token } = await createStaffInvitationInSupabase({
          restaurantId: targetRestId,
          outletId: inviteOutletId || undefined,
          email: inviteEmail.trim(),
          fullName: inviteName.trim(),
          role: inviteRole,
          loginId: inviteLoginId.trim().toLowerCase() || undefined,
        });

        setGeneratedToken(token);
        addToast(`Invitation created successfully for ${inviteName}`, 'success');
        await loadData();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to provision staff member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (m: RestaurantMembership) => {
    setEditingMembership(m);
    setEditName(m.userProfile?.fullName || '');
    setEditRole(m.role as RoleType);
    setEditOutletId(m.outletId || '');
    setEditIsActive(m.isActive);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRestId = membership?.restaurantId || restaurant?.id;
    if (!targetRestId || !editingMembership) return;

    setIsSubmitting(true);
    try {
      await updateStaffMemberInSupabase({
        restaurantId: targetRestId,
        membershipId: editingMembership.id,
        fullName: editName.trim(),
        role: editRole,
        outletId: editOutletId || undefined,
        isActive: editIsActive,
      });

      addToast('Staff member details updated successfully', 'success');
      setIsEditOpen(false);
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to update staff member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResetPasswordModal = (m: RestaurantMembership) => {
    setResettingMembership(m);
    setNewStaffPassword('');
    setIsResetPasswordOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRestId = membership?.restaurantId || restaurant?.id;
    if (!targetRestId || !resettingMembership) return;

    if (!newStaffPassword || newStaffPassword.length < 6) {
      addToast('New password must be at least 6 characters', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetStaffPasswordInSupabase({
        restaurantId: targetRestId,
        membershipId: resettingMembership.id,
        newPassword: newStaffPassword,
      });

      addToast('Credentials successfully reset for staff member', 'success');
      setIsResetPasswordOpen(false);
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to reset credentials', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}?invite=${token}`;
    navigator.clipboard.writeText(link);
    addToast('Invitation link copied to clipboard!', 'info');
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!canManageStaff) {
      addToast('Only restaurant owners can revoke invitations', 'error');
      return;
    }
    try {
      await revokeStaffInvitationInSupabase(invitationId);
      addToast('Staff invitation successfully revoked', 'info');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to revoke staff invitation', 'error');
    }
  };

  const ownerMemberships = memberships.filter((m) => m.role === 'owner');
  const staffMemberships = memberships.filter((m) => m.role !== 'owner');

  return (
    <div className="space-y-8 select-none">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Staff & Role-Based Access Control (RBAC)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Manage authorized staff members, role boundaries, and branch scoping. All permissions are verified directly at the Supabase database layer via Row Level Security (RLS).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="Refresh Staff List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {canManageStaff && (
            <button
              onClick={openAddStaffModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Unique Restaurant ID & Staff Sign-in Information Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-blue-500/40 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Staff Authentication Scope
            </span>
            <span className="text-xs text-slate-300 font-medium">Multi-Tenant Identifier</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-300 font-semibold">Restaurant ID:</span>
              <span className="text-xl font-black font-mono text-emerald-400 tracking-wider">
                {verifiedRestaurantCode || 'Unverified'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (verifiedRestaurantCode) {
                  navigator.clipboard.writeText(verifiedRestaurantCode);
                  addToast(`Copied Restaurant ID: ${verifiedRestaurantCode}`, 'info');
                } else {
                  addToast('Restaurant ID is not verified.', 'warning');
                }
              }}
              className="p-1.5 rounded-lg bg-blue-600/40 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-400/40 cursor-pointer transition-all shadow-xs"
              title="Copy Restaurant ID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Staff log in using this <strong className="text-white">Restaurant ID</strong> + their individual <strong className="text-white">Staff Login ID</strong> + <strong className="text-white">Password</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Branches:</span>
          {restaurant?.outlets.map((o) => (
            <span
              key={o.id}
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-200 border border-slate-700/80 flex items-center gap-1.5"
            >
              <span className="text-slate-300">{o.name}:</span>
              <strong className="text-emerald-400">{o.code}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Restaurant Personnel ({memberships.length} Total: {ownerMemberships.length} Owner, {staffMemberships.length} Staff)
          </h3>
          <span className="text-[11px] text-slate-400">
            Live Database Records • Multi-Tenant Protected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-bold">Personnel</th>
                <th className="pb-3 font-bold">Role</th>
                <th className="pb-3 font-bold">Assigned Branch</th>
                <th className="pb-3 font-bold">Status</th>
                <th className="pb-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {memberships.map((m) => {
                const name = m.userProfile?.fullName || 'Staff User';
                const email = m.userProfile?.email || '—';
                const outletText = m.outletName || (m.outletId ? 'Branch Assigned' : 'All Branches (Enterprise)');

                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center shrink-0 text-xs ${
                            m.role === 'owner'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{name}</span>
                            {m.loginId && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                                @{m.loginId}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          m.role === 'owner'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : m.role === 'manager'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            : m.role === 'kitchen'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>

                    <td className="py-3.5 pr-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{outletText}</span>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 text-right">
                      {canManageStaff && m.role !== 'owner' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(m)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openResetPasswordModal(m)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                            title="Reset password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(m)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                              m.isActive
                                ? 'border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            {m.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Protected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Phase 3 & Phase 10: Empty State when no non-owner staff exist yet */}
        {staffMemberships.length === 0 && (
          <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 my-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No staff members yet.</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Your restaurant starts clean with zero default waiters. Directly create manager, waiter, or kitchen staff accounts to enable multi-tenant logins.
              </p>
            </div>
            {canManageStaff && (
              <button
                type="button"
                onClick={openAddStaffModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Pending Staff Invitations ({invitations.filter((i) => !i.acceptedAt).length})
          </h3>

          <div className="space-y-2">
            {invitations.map((inv) => {
              const isExpired = !inv.acceptedAt && new Date(inv.expiresAt).getTime() < Date.now();
              return (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{inv.fullName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {inv.role}
                      </span>
                      {inv.acceptedAt ? (
                        <span className="text-emerald-500 font-bold text-[10px]">Accepted</span>
                      ) : isExpired ? (
                        <span className="text-rose-500 font-bold text-[10px]">Revoked / Expired</span>
                      ) : (
                        <span className="text-amber-500 font-bold text-[10px]">Pending Enrollment</span>
                      )}
                    </div>
                    <div className="text-slate-400 mt-0.5 flex items-center gap-2 text-[11px]">
                      <span>{inv.email}</span>
                      {inv.loginId && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-blue-400 font-bold">@{inv.loginId}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-mono">{inv.token}</span>
                      {inv.expiresAt && !inv.acceptedAt && (
                        <>
                          <span>•</span>
                          <span className={isExpired ? 'text-rose-400' : 'text-slate-400'}>
                            {isExpired ? 'Expired' : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {!inv.acceptedAt && !isExpired && (
                      <button
                        type="button"
                        onClick={() => copyInviteLink(inv.token)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>
                    )}

                    {!inv.acceptedAt && !isExpired && canManageStaff && (
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors cursor-pointer"
                        title="Revoke and expire invitation immediately"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Security Audit Log Preview */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
          Security & Access Audit Logs
        </h3>

        {auditLogs.length === 0 ? (
          <div className="text-xs text-slate-400 py-3 italic">
            Audit logs will be populated as security events occur.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.entityType}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {JSON.stringify(log.details)}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Add / Provision / Invite Staff Member */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              type="button"
              onClick={closeAddStaffModal}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-1">Add Restaurant Staff Member</h3>
            <p className="text-xs text-slate-400 mb-3">
              Provision direct credentials or generate an invitation link for your team.
            </p>

            <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Restaurant ID:</span>
              <span className="font-mono font-bold text-emerald-400">{verifiedRestaurantCode || 'Unverified'}</span>
            </div>

            {/* Mode Selector */}
            {!provisionSuccess && !generatedToken && (
              <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('direct')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    provisionMode === 'direct'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Direct Account Provisioning
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('invite')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    provisionMode === 'invite'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Invite Link Only
                </button>
              </div>
            )}

            {provisionSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Staff Account Successfully Provisioned!</span>
                  </div>
                  <p className="text-xs text-emerald-300">
                    The account is now active. The staff member can log in immediately from the Staff Login screen using:
                  </p>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Restaurant ID:</span>
                      <strong className="text-emerald-400">{provisionSuccess.restaurant_code}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Staff Login ID:</span>
                      <strong className="text-blue-400">{provisionSuccess.login_id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Auth Email:</span>
                      <span className="text-slate-300 truncate max-w-[200px]">{provisionSuccess.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Role:</span>
                      <strong className="text-amber-400 uppercase">{provisionSuccess.role}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeAddStaffModal}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : generatedToken ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Invitation Ready!</span>
                  </div>
                  <p className="text-xs text-emerald-300">
                    Share this unique token or link with {inviteName}. It will expire in 7 days.
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 font-mono text-xs text-white border border-slate-700 flex items-center justify-between">
                    <span className="truncate pr-2">{generatedToken}</span>
                    <button
                      type="button"
                      onClick={() => copyInviteLink(generatedToken)}
                      className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shrink-0 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeAddStaffModal}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateStaff(e);
                }}
                className="space-y-4"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
              >

                <div>
                  <label htmlFor="staff_new_fullname" className="block text-xs font-bold text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="staff_new_fullname"
                    name="staff_new_fullname"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Sunil Verma"
                    required
                    autoComplete="off"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="staff_new_login_id" className="block text-xs font-bold text-slate-300 mb-1">
                      Staff Login ID <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="staff_new_login_id"
                      name="staff_new_login_id"
                      value={inviteLoginId}
                      onChange={(e) => setInviteLoginId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="e.g. sunil01"
                      required
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Unique within restaurant</p>
                  </div>

                  <div>
                    <label htmlFor="staff_new_email_address" className="block text-xs font-bold text-slate-300 mb-1">
                      Email {provisionMode === 'direct' ? '(Optional)' : '(Required)'}
                    </label>
                    <input
                      type="email"
                      id="staff_new_email_address"
                      name="staff_new_email_address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="sunil@restaurant.com"
                      required={provisionMode === 'invite'}
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {provisionMode === 'direct' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="staff_new_account_password" className="text-xs font-bold text-slate-300">
                        Initial Password <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-amber-400 font-medium">Temporary password</span>
                    </div>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        id="staff_new_account_password"
                        name="staff_new_account_password"
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        placeholder="•••••••••••• (min 6 characters)"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 pl-9 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Staff will sign in with this password + their Staff Login ID and Restaurant ID. They can update it after first login.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as RoleType)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="waiter">Waiter (Floor Staff)</option>
                      <option value="kitchen">Kitchen Staff / KDS</option>
                      <option value="manager">Branch Manager</option>
                      <option value="cashier">Cashier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Assigned Branch</label>
                    <select
                      value={inviteOutletId}
                      onChange={(e) => setInviteOutletId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {restaurant?.outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={closeAddStaffModal}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCreateStaff(e);
                    }}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Provisioning...</span>
                      </>
                    ) : (
                      <span>{provisionMode === 'direct' ? 'Provision Account' : 'Generate Invite'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Staff Member */}
      {isEditOpen && editingMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-1">Edit Staff Member</h3>
            <p className="text-xs text-slate-400 mb-4">
              Update authorized role, branch assignment, or active status.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  name="staff_edit_fullname"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as RoleType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="waiter">Waiter</option>
                    <option value="kitchen">Kitchen Staff</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Assigned Branch</label>
                  <select
                    value={editOutletId}
                    onChange={(e) => setEditOutletId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {restaurant?.outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Account Status</label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="account_status"
                      checked={editIsActive}
                      onChange={() => setEditIsActive(true)}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span className="text-emerald-400 font-bold">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="account_status"
                      checked={!editIsActive}
                      onChange={() => setEditIsActive(false)}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span className="text-rose-400 font-bold">Deactivated</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Staff Password */}
      {isResetPasswordOpen && resettingMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => {
                setIsResetPasswordOpen(false);
                setNewStaffPassword('');
              }}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-1">Reset Staff Credentials</h3>
            <p className="text-xs text-slate-400 mb-4">
              Set a new temporary password for{' '}
              <strong className="text-white">{resettingMembership.userProfile?.fullName}</strong> (@{resettingMembership.loginId}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    name="staff_reset_account_password"
                    id="staff_reset_account_password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="•••••••••••• (min 6 characters)"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 pl-9 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPasswordOpen(false);
                    setNewStaffPassword('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
