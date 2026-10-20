import React from 'react';
import {
  ShieldCheck,
  Building2,
  Server,
  Activity,
  CreditCard,
  CheckCircle,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SuperAdminView: React.FC = () => {
  const { addToast } = useApp();

  const tenants = [
    {
      id: 'rest-001',
      name: 'Spice Garden Group',
      slug: 'spice-garden',
      plan: 'Growth Tier (Multi-outlet)',
      outletsCount: 2,
      mrrPaise: 499900, // ₹4,999/mo
      status: 'active',
      joinedDate: '2026-06-15',
    },
    {
      id: 'rest-002',
      name: 'Dhaba By The Highway',
      slug: 'highway-dhaba',
      plan: 'Starter Tier',
      outletsCount: 1,
      mrrPaise: 199900, // ₹1,999/mo
      status: 'active',
      joinedDate: '2026-08-01',
    },
    {
      id: 'rest-003',
      name: 'Brew & Bake Artisanal Cafe',
      slug: 'brew-and-bake',
      plan: 'Growth Tier',
      outletsCount: 3,
      mrrPaise: 499900,
      status: 'trialing',
      joinedDate: '2026-10-02',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0B0F17] overflow-y-auto select-none p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Super Admin SaaS Workspace
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              Platform Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multi-tenant subscription management, database health & tenant provisioning
          </p>
        </div>

        <button
          onClick={() => addToast('Tenant onboarding wizard initialized', 'info')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
        >
          <span>+ Provision New Restaurant</span>
        </button>
      </div>

      {/* Platform Health & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400">Total Restaurants</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">14 Tenants</div>
          <span className="text-[11px] text-emerald-500 font-bold">100% active</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400">Active Outlets</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">28 Outlets</div>
          <span className="text-[11px] text-slate-400">Across Bengaluru & Mumbai</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400">Platform MRR</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">₹84,972</div>
          <span className="text-[11px] text-emerald-500 font-bold">+18% MoM growth</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400">Supabase Engine</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-5 h-5" />
            <span>Healthy</span>
          </div>
          <span className="text-[11px] text-slate-400">PostgreSQL 17 • 26 Tables Locked</span>
        </div>
      </div>

      {/* Database Connection Card */}
      <div className="p-5 rounded-3xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-blue-950 dark:text-blue-200">
              Connected Supabase PostgreSQL Project
            </h3>
            <p className="text-xs text-blue-700/80 dark:text-blue-300 font-mono mt-0.5">
              Project ID: lolbdfykmoarhblkjgaa (Region: ap-southeast-1)
            </p>
          </div>
        </div>

        <a
          href="https://supabase.com/dashboard/project/lolbdfykmoarhblkjgaa"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-xs hover:bg-blue-50 transition-colors"
        >
          <span>Open Console</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Multi-Tenant Directory Table */}
      <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">Onboarded Restaurant Chains</h2>
          <span className="text-xs text-slate-400">{tenants.length} Active Organizations</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
              <th className="p-4 pl-6">Restaurant Name</th>
              <th className="p-4">Outlets</th>
              <th className="p-4">Subscription Plan</th>
              <th className="p-4">Status</th>
              <th className="p-4 pr-6 text-right">MRR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="p-4 pl-6">
                  <span className="font-bold text-slate-900 dark:text-white block">{t.name}</span>
                  <span className="text-[10px] text-slate-400">slug: /{t.slug}</span>
                </td>
                <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                  {t.outletsCount} Outlets
                </td>
                <td className="p-4 text-blue-600 dark:text-blue-400 font-bold">{t.plan}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="p-4 pr-6 text-right font-black text-sm text-slate-900 dark:text-white">
                  ₹{(t.mrrPaise / 100).toLocaleString('en-IN')}/mo
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
