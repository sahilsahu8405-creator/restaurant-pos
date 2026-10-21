import React, { useEffect, useState } from 'react';
import {
  Store,
  Receipt,
  ChefHat,
  Printer,
  Package,
  Layers,
  Palette,
  Bell,
  Database,
  CheckCircle,
  Save,
  Download,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  X,
  Wifi,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sliders,
  Loader2,
  Building2,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Lock,
  AlertTriangle,
  Image as ImageIcon,
  Users,
  Copy,
  Zap,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { localRepository } from '../../services/localRepository';
import { printService } from '../../services/printService';
import { generateKdsPairingCodeInSupabase } from '../../services/supabaseClient';
import { KitchenStation, RestaurantSettings } from '../../types';
import { ReceiptDesigner } from './ReceiptDesigner';
import { StaffManagementTab } from './StaffManagementTab';
import {
  getRolePermissions,
  validateRestaurantData,
  validateBranchData,
} from '../../utils/permissions';

export const SettingsView: React.FC = () => {
  const {
    restaurant,
    settings,
    activeOutlet,
    activeRole,
    updateSettings,
    updateRestaurantProfile,
    updateOutletProfile,
    addToast,
  } = useApp();
  const { membership, user, profile, logout } = useAuth();
  const [isConfirmSignOutOpen, setIsConfirmSignOutOpen] = useState(false);
  const verifiedRestaurantCode = restaurant?.restaurantCode || membership?.restaurantCode;

  const permissions = getRolePermissions(activeRole);

  const [activeTab, setActiveTab] = useState<
    'profile' | 'billing' | 'kitchen' | 'printers' | 'features' | 'backup' | 'staff'
  >('profile');

  const [pairingModal, setPairingModal] = useState<{
    stationName: string;
    code: string;
    expiresIn: number;
  } | null>(null);

  const [printerSubTab, setPrinterSubTab] = useState<'designer' | 'hardware'>('designer');

  // Kitchen Stations state
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [isAddStationOpen, setIsAddStationOpen] = useState(false);
  const [stationName, setStationName] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [stationPrinter, setStationPrinter] = useState('Kitchen Thermal Printer 1');
  const [stationIsDefault, setStationIsDefault] = useState(false);

  const loadStations = async () => {
    if (activeOutlet) {
      const list = await localRepository.getKitchenStations(activeOutlet.id);
      setStations(list);
    }
  };

  useEffect(() => {
    loadStations();
  }, [activeOutlet]);

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationName.trim() || !stationCode.trim()) {
      addToast('Station name and short code are required', 'error');
      return;
    }
    await localRepository.saveKitchenStation({
      name: stationName.trim(),
      code: stationCode.trim().toUpperCase(),
      printerName: stationPrinter,
      isDefault: stationIsDefault,
      restaurantId: restaurant?.id || '',
      outletId: activeOutlet?.id || '',
    });
    setIsAddStationOpen(false);
    setStationName('');
    setStationCode('');
    setStationIsDefault(false);
    await loadStations();
    addToast(`Kitchen Station "${stationName}" created successfully`, 'success');
  };

  const handleDeleteStation = async (id: string) => {
    await localRepository.deleteKitchenStation(id);
    await loadStations();
    addToast('Kitchen Station removed', 'info');
  };

  // Form states initialized from active settings
  const [formData, setFormData] = useState<RestaurantSettings>(
    settings || {
      id: 'set-001',
      restaurantId: 'rest-001',
      enableKot: true,
      enableKds: true,
      enableTableManagement: true,
      enableInventory: true,
      enableCustomerCrm: false,
      cgstPct: 2.5,
      sgstPct: 2.5,
      invoicePrefix: 'INV-',
      kotPrefix: 'KOT-',
      receiptFooter: 'Thank you for dining with us!',
      currencySymbol: '₹',
      roundingRule: 'nearest_rupee',
      operatingHours: '11:00 AM - 11:30 PM',
      primaryPhone: '+91 98765 43210',
      gstin: '29ABCDE1234F1Z5',
      fssaiLicense: '11223344556677',
    }
  );

  // Restaurant Profile State
  const [restaurantForm, setRestaurantForm] = useState({
    name: restaurant?.name || '',
    legalName: restaurant?.legalName || '',
    businessEmail: restaurant?.businessEmail || '',
    primaryPhone: restaurant?.primaryPhone || restaurant?.settings?.primaryPhone || '',
    gstin: restaurant?.gstin || restaurant?.settings?.gstin || '',
    fssaiLicense: restaurant?.fssaiLicense || restaurant?.settings?.fssaiLicense || '',
    operatingHours: restaurant?.operatingHours || restaurant?.settings?.operatingHours || '',
    currency: restaurant?.currency || 'INR',
    currencySymbol: restaurant?.currencySymbol || '₹',
    timezone: restaurant?.timezone || 'Asia/Kolkata',
    logoUrl: restaurant?.logoUrl || '',
  });

  // Selected Branch ID for Editing in Branch Profile
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    activeOutlet?.id || (restaurant?.outlets?.[0]?.id ?? '')
  );

  // Branch Profile State
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    fssaiLicense: '',
    operatingHours: '',
    isActive: true,
  });

  // Validation errors & Unsaved changes tracking
  const [restaurantErrors, setRestaurantErrors] = useState<Record<string, string>>({});
  const [branchErrors, setBranchErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [pendingTab, setPendingTab] = useState<
    'profile' | 'billing' | 'kitchen' | 'printers' | 'features' | 'backup' | null
  >(null);

  // Hydrate restaurantForm when restaurant data loads or updates
  useEffect(() => {
    if (restaurant) {
      setRestaurantForm((prev) => ({
        ...prev,
        name: restaurant.name || '',
        legalName: restaurant.legalName || '',
        businessEmail: restaurant.businessEmail || '',
        primaryPhone: restaurant.primaryPhone || restaurant.settings?.primaryPhone || '',
        gstin: restaurant.gstin || restaurant.settings?.gstin || '',
        fssaiLicense: restaurant.fssaiLicense || restaurant.settings?.fssaiLicense || '',
        operatingHours: restaurant.operatingHours || restaurant.settings?.operatingHours || '',
        currency: restaurant.currency || 'INR',
        currencySymbol: restaurant.currencySymbol || '₹',
        timezone: restaurant.timezone || 'Asia/Kolkata',
        logoUrl: restaurant.logoUrl || '',
      }));
    }
  }, [restaurant]);

  // Hydrate branchForm when selected branch changes or restaurant outlets load
  useEffect(() => {
    if (restaurant && restaurant.outlets && restaurant.outlets.length > 0) {
      const activeId = selectedBranchId || activeOutlet?.id || restaurant.outlets[0].id;
      const targetBranch = restaurant.outlets.find((o) => o.id === activeId) || restaurant.outlets[0];
      if (targetBranch) {
        if (selectedBranchId !== targetBranch.id) {
          setSelectedBranchId(targetBranch.id);
        }
        setBranchForm({
          name: targetBranch.name || '',
          code: targetBranch.code || '',
          address:
            typeof targetBranch.address === 'object' && targetBranch.address
              ? (targetBranch.address as any).full ||
                (targetBranch.address as any).street ||
                JSON.stringify(targetBranch.address)
              : targetBranch.address || '',
          phone: targetBranch.phone || '',
          email: targetBranch.email || '',
          gstin: targetBranch.gstin || '',
          fssaiLicense: targetBranch.fssaiLicense || '',
          operatingHours: targetBranch.operatingHours || '',
          isActive: targetBranch.isActive !== undefined ? targetBranch.isActive : true,
        });
      }
    }
  }, [restaurant, selectedBranchId, activeOutlet]);

  const [isSaving, setIsSaving] = useState(false);

  const handleTabClick = (
    tabId: 'profile' | 'billing' | 'kitchen' | 'printers' | 'features' | 'backup'
  ) => {
    if (hasUnsavedChanges && activeTab === 'profile' && tabId !== 'profile') {
      setPendingTab(tabId);
      setShowDiscardConfirm(true);
      return;
    }
    setActiveTab(tabId);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setRestaurantErrors({});
    setBranchErrors({});

    try {
      if (activeTab === 'profile') {
        // Permission check
        if (!permissions.canEditRestaurantProfile && !permissions.canEditBranchProfile) {
          addToast(
            `Unauthorized: Signed in as ${permissions.roleDisplayName}. You do not have permission to modify settings.`,
            'error'
          );
          setIsSaving(false);
          return;
        }

        // Validate Restaurant Data if user has permission
        if (permissions.canEditRestaurantProfile) {
          const restErrs = validateRestaurantData({
            name: restaurantForm.name,
            legalName: restaurantForm.legalName,
            primaryPhone: restaurantForm.primaryPhone,
            businessEmail: restaurantForm.businessEmail,
            gstin: restaurantForm.gstin,
            fssaiLicense: restaurantForm.fssaiLicense,
            operatingHours: restaurantForm.operatingHours,
            timezone: restaurantForm.timezone,
          });

          if (Object.keys(restErrs).length > 0) {
            setRestaurantErrors(restErrs);
            const firstErr = Object.values(restErrs)[0];
            addToast(`Validation error: ${firstErr}`, 'error');
            setIsSaving(false);
            return;
          }
        }

        // Validate Branch Data if user has permission
        if (permissions.canEditBranchProfile) {
          const bErrs = validateBranchData({
            name: branchForm.name,
            code: branchForm.code,
            phone: branchForm.phone,
            email: branchForm.email,
            gstin: branchForm.gstin,
            fssaiLicense: branchForm.fssaiLicense,
          });

          if (Object.keys(bErrs).length > 0) {
            setBranchErrors(bErrs);
            const firstErr = Object.values(bErrs)[0];
            addToast(`Branch validation error: ${firstErr}`, 'error');
            setIsSaving(false);
            return;
          }
        }

        // 1. Save restaurant-level profile if authorized
        if (permissions.canEditRestaurantProfile && restaurant) {
          await updateRestaurantProfile({
            name: restaurantForm.name.trim(),
            legalName: restaurantForm.legalName.trim() || undefined,
            businessEmail: restaurantForm.businessEmail.trim() || undefined,
            primaryPhone: restaurantForm.primaryPhone.trim() || undefined,
            gstin: restaurantForm.gstin.trim().toUpperCase() || undefined,
            fssaiLicense: restaurantForm.fssaiLicense.trim() || undefined,
            operatingHours: restaurantForm.operatingHours.trim() || undefined,
            currency: restaurantForm.currency as any,
            currencySymbol:
              restaurantForm.currency === 'USD'
                ? '$'
                : restaurantForm.currency === 'EUR'
                ? '€'
                : restaurantForm.currency === 'AED'
                ? 'AED'
                : '₹',
            timezone: restaurantForm.timezone,
            logoUrl: restaurantForm.logoUrl.trim() || undefined,
          });
        }

        // 2. Save branch-level profile if authorized
        if (permissions.canEditBranchProfile && selectedBranchId) {
          await updateOutletProfile(selectedBranchId, {
            name: branchForm.name.trim(),
            code: branchForm.code.trim().toUpperCase(),
            phone: branchForm.phone.trim() || undefined,
            email: branchForm.email.trim() || undefined,
            address: branchForm.address.trim() || undefined,
            operatingHours: branchForm.operatingHours.trim() || undefined,
            gstin: branchForm.gstin.trim().toUpperCase() || undefined,
            fssaiLicense: branchForm.fssaiLicense.trim() || undefined,
            isActive: branchForm.isActive,
          });
        }

        setHasUnsavedChanges(false);
      } else {
        await updateSettings(formData);
      }
    } catch (err: any) {
      addToast(err?.message || 'Failed to save settings. Please verify details and try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  type PrinterStatusState = 'checking' | 'connected' | 'not_connected' | 'error';

  const [receiptStatus, setReceiptStatus] = useState<PrinterStatusState>('checking');
  const [kotStatus, setKotStatus] = useState<PrinterStatusState>('checking');
  const [isTestingReceipt, setIsTestingReceipt] = useState(false);
  const [isTestingKot, setIsTestingKot] = useState(false);
  const [isAdvancedSetupOpen, setIsAdvancedSetupOpen] = useState(false);

  const checkReceiptStatus = async (silent = false) => {
    setReceiptStatus('checking');
    try {
      const connType = formData.receiptConnectionType || 'local_agent';
      const ep = formData.receiptEndpoint || 'http://127.0.0.1:9100/print';
      const res = await printService.checkPrinterStatus(connType, ep);
      if (res.online) {
        setReceiptStatus('connected');
        if (!silent) addToast(`Receipt Printer Connected: ${res.message}`, 'success');
      } else {
        setReceiptStatus('not_connected');
        if (!silent) addToast(`Receipt Printer Unavailable: ${res.message}`, 'warning');
      }
    } catch (err: any) {
      setReceiptStatus('error');
      if (!silent) addToast(`Receipt Printer Error: ${err?.message || 'Connection check failed'}`, 'error');
    }
  };

  const checkKotStatus = async (silent = false) => {
    setKotStatus('checking');
    try {
      const connType = formData.kotConnectionType || 'local_agent';
      const ep = formData.kotEndpoint || 'http://127.0.0.1:9100/print';
      const res = await printService.checkPrinterStatus(connType, ep);
      if (res.online) {
        setKotStatus('connected');
        if (!silent) addToast(`Kitchen KOT Printer Connected: ${res.message}`, 'success');
      } else {
        setKotStatus('not_connected');
        if (!silent) addToast(`Kitchen KOT Printer Unavailable: ${res.message}`, 'warning');
      }
    } catch (err: any) {
      setKotStatus('error');
      if (!silent) addToast(`Kitchen KOT Printer Error: ${err?.message || 'Connection check failed'}`, 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'printers') {
      checkReceiptStatus(true);
      checkKotStatus(true);
    }
  }, [activeTab]);

  const handleTestPrintReceipt = async () => {
    setIsTestingReceipt(true);
    try {
      const printerName = formData.receiptPrinterName || 'Receipt Printer';
      const paperWidth = formData.receiptPaperWidth || '80mm';
      const connType = formData.receiptConnectionType || 'local_agent';
      const ep = formData.receiptEndpoint || 'http://127.0.0.1:9100/print';

      const res = await printService.printTest(printerName, paperWidth, connType, ep);
      if (res.success) {
        addToast(`Test receipt sent successfully to ${printerName} (${paperWidth})`, 'success');
        setReceiptStatus('connected');
      } else {
        addToast(`Test print failed: ${res.error || res.message}`, 'error');
        setReceiptStatus('error');
      }
    } catch (err: any) {
      addToast(`Test print error: ${err?.message || 'Print job failed'}`, 'error');
      setReceiptStatus('error');
    } finally {
      setIsTestingReceipt(false);
    }
  };

  const handleTestPrintKot = async () => {
    setIsTestingKot(true);
    try {
      const printerName = formData.kotPrinterName || 'Kitchen KOT Printer';
      const paperWidth = (formData.kotPaperWidth as '58mm' | '80mm') || '80mm';
      const connType = formData.kotConnectionType || 'local_agent';
      const ep = formData.kotEndpoint || 'http://127.0.0.1:9100/print';

      const res = await printService.printTest(printerName, paperWidth, connType, ep);
      if (res.success) {
        addToast(`Test KOT ticket sent successfully to ${printerName} (${paperWidth})`, 'success');
        setKotStatus('connected');
      } else {
        addToast(`Test print failed: ${res.error || res.message}`, 'error');
        setKotStatus('error');
      }
    } catch (err: any) {
      addToast(`Test print error: ${err?.message || 'Print job failed'}`, 'error');
      setKotStatus('error');
    } finally {
      setIsTestingKot(false);
    }
  };

  const renderPrinterStatusBadge = (status: PrinterStatusState) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </span>
        );
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800/80">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
            Checking Connection
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Connection Error
          </span>
        );
      case 'not_connected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            Not Connected
          </span>
        );
    }
  };

  const handleExportData = () => {
    const backupJson = JSON.stringify({
      restaurant,
      settings: formData,
      exportedAt: new Date().toISOString(),
    }, null, 2);

    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restohub-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addToast('Configuration backup JSON exported successfully', 'success');
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-[#0B0F17] select-none">
      {/* Settings Navigation Tabs */}
      <aside className="w-full md:w-64 bg-white dark:bg-[#121824] border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-2 md:p-4 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0 scrollbar-none">
        <span className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Restaurant Configuration
        </span>

        {[
          { id: 'profile', label: 'Restaurant & Outlets', icon: Store },
          { id: 'billing', label: 'Taxes & Invoicing', icon: Receipt },
          { id: 'kitchen', label: 'Kitchen & KDS/KOT', icon: ChefHat },
          { id: 'printers', label: 'Printing & Printers', icon: Printer },
          { id: 'features', label: 'Module Toggles', icon: Layers },
          { id: 'backup', label: 'Data & Backup', icon: Database },
          { id: 'staff', label: 'Staff & Permissions', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as any)}
              className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 bg-slate-50 md:bg-transparent dark:bg-slate-800/40 md:dark:bg-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Mobile Sign Out Button */}
        <button
          type="button"
          onClick={() => setIsConfirmSignOutOpen(true)}
          className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>

        {/* Desktop Active User Card & Sign Out */}
        <div className="hidden md:flex flex-col mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Logged In As</span>
            <span className="font-bold text-slate-900 dark:text-white truncate block">{profile?.fullName || user?.email}</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold capitalize">{activeRole}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsConfirmSignOutOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Settings Form Body */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col justify-between max-w-full md:max-w-4xl w-full">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white capitalize truncate">
                {activeTab === 'profile' && 'Restaurant Profile & Business Details'}
                {activeTab === 'billing' && 'Billing, GST & Receipt Settings'}
                {activeTab === 'kitchen' && 'Kitchen Order Tickets & KDS Configuration'}
                {activeTab === 'printers' && 'Printing & Printers'}
                {activeTab === 'features' && 'Feature & Workflow Modules'}
                {activeTab === 'backup' && 'Data Export & System Synchronization'}
                {activeTab === 'staff' && 'Staff Directory & Access Control'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 sm:line-clamp-none">
                {activeTab === 'staff'
                  ? 'Manage restaurant team members, staff roles, outlet assignments, and send secure cryptographic invitations'
                  : activeTab === 'printers'
                  ? 'Configure receipt and kitchen printing for your restaurant.'
                  : 'Changes persist immediately and dynamically customize operational workflows'}
              </p>
            </div>

            {activeTab !== 'staff' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="self-end sm:self-auto shrink-0 flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            )}
          </div>

          {/* TAB 1: Profile & Business Details */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* ROLE & PERMISSION BANNER */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  permissions.canEditRestaurantProfile
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : permissions.canEditBranchProfile
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                    : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {permissions.canEditRestaurantProfile ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : permissions.canEditBranchProfile ? (
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-xs">
                  <div className="flex flex-wrap items-center gap-2 font-bold">
                    <span>Signed in as {permissions.roleDisplayName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        permissions.canEditRestaurantProfile
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                          : permissions.canEditBranchProfile
                          ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {permissions.canEditRestaurantProfile
                        ? 'Full Owner Access'
                        : permissions.canEditBranchProfile
                        ? 'Branch Manager Access'
                        : 'View-Only Access'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                    {permissions.canEditRestaurantProfile
                      ? 'You have administrative permissions to configure restaurant-wide brand identity, legal registrations, financial currency, timezone defaults, and all branch outlets.'
                      : permissions.canEditBranchProfile
                      ? 'You can update branch-specific contact information, location address, and operational hours for the selected outlet. Organization-wide legal registration and financial settings are managed by the Restaurant Owner.'
                      : 'You have view-only access to restaurant and branch profile settings. Contact your Restaurant Owner or Manager if business details need updating.'}
                  </p>
                </div>
              </div>

              {/* UNSAVED CHANGES REMINDER */}
              {hasUnsavedChanges && (
                <div className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    You have unsaved profile changes.
                  </span>
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                    Remember to click &quot;Save Settings&quot; above to persist.
                  </span>
                </div>
              )}

              {/* CARD 1: RESTAURANT PROFILE (ORGANIZATION & BRAND) */}
              <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-xs shadow-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Restaurant Profile & Legal Entity
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Organization branding, central tax registration, currency and timezone
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {verifiedRestaurantCode && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(verifiedRestaurantCode);
                          addToast(`Copied Restaurant ID: ${verifiedRestaurantCode}`, 'info');
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 cursor-pointer transition-all"
                        title="Click to copy permanent Restaurant ID"
                      >
                        <span className="text-[10px] uppercase font-sans text-slate-400 font-bold">Restaurant ID:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-mono font-extrabold">{verifiedRestaurantCode}</span>
                      </button>
                    )}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Restaurant-Wide
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Restaurant Brand Name */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Restaurant Brand Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={restaurantForm.name}
                      onChange={(e) => {
                        setRestaurantForm({ ...restaurantForm, name: e.target.value });
                        setHasUnsavedChanges(true);
                        if (restaurantErrors.name) setRestaurantErrors({ ...restaurantErrors, name: '' });
                      }}
                      disabled={!permissions.canEditRestaurantProfile}
                      placeholder="e.g. Spice Garden"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditRestaurantProfile
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {restaurantErrors.name && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {restaurantErrors.name}
                      </span>
                    )}
                    {!permissions.canEditRestaurantProfile && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Only editable by Restaurant Owner
                      </span>
                    )}
                  </div>

                  {/* Legal Entity / Business Name */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Legal / Registered Business Name
                    </label>
                    <input
                      type="text"
                      value={restaurantForm.legalName}
                      onChange={(e) => {
                        setRestaurantForm({ ...restaurantForm, legalName: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      disabled={!permissions.canEditLegalAndFinancials}
                      placeholder="e.g. Spice Garden Hospitality LLP"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditLegalAndFinancials
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {!permissions.canEditLegalAndFinancials && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Legal name requires Owner authorization
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Restaurant GSTIN */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      GSTIN Identification Number (Parent)
                    </label>
                    <input
                      type="text"
                      value={restaurantForm.gstin}
                      onChange={(e) => {
                        setRestaurantForm({ ...restaurantForm, gstin: e.target.value.toUpperCase() });
                        setHasUnsavedChanges(true);
                        if (restaurantErrors.gstin) setRestaurantErrors({ ...restaurantErrors, gstin: '' });
                      }}
                      disabled={!permissions.canEditLegalAndFinancials}
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      maxLength={15}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
                        !permissions.canEditLegalAndFinancials
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {restaurantErrors.gstin && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {restaurantErrors.gstin}
                      </span>
                    )}
                  </div>

                  {/* FSSAI License */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      FSSAI Food License # (Central)
                    </label>
                    <input
                      type="text"
                      value={restaurantForm.fssaiLicense}
                      onChange={(e) => {
                        setRestaurantForm({ ...restaurantForm, fssaiLicense: e.target.value });
                        setHasUnsavedChanges(true);
                        if (restaurantErrors.fssaiLicense)
                          setRestaurantErrors({ ...restaurantErrors, fssaiLicense: '' });
                      }}
                      disabled={!permissions.canEditLegalAndFinancials}
                      placeholder="14-digit numeric license"
                      maxLength={14}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
                        !permissions.canEditLegalAndFinancials
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {restaurantErrors.fssaiLicense && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {restaurantErrors.fssaiLicense}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Support Phone */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Primary Support Phone
                    </label>
                    <input
                      type="text"
                      value={restaurantForm.primaryPhone}
                      onChange={(e) => {
                        setRestaurantForm({ ...restaurantForm, primaryPhone: e.target.value });
                        setHasUnsavedChanges(true);
                        if (restaurantErrors.primaryPhone)
                          setRestaurantErrors({ ...restaurantErrors, primaryPhone: '' });
                      }}
                      disabled={!permissions.canEditRestaurantProfile}
                      placeholder="+91 98765 43210"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditRestaurantProfile
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {restaurantErrors.primaryPhone && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {restaurantErrors.primaryPhone}
                      </span>
                    )}
                  </div>

                  {/* Business Email */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Business Email
                    </label>
                    <input
                      type="email"
                      value={restaurantForm.businessEmail}
                      onChange={(e) => {
                        setRestaurantForm({ ...restaurantForm, businessEmail: e.target.value });
                        setHasUnsavedChanges(true);
                        if (restaurantErrors.businessEmail)
                          setRestaurantErrors({ ...restaurantErrors, businessEmail: '' });
                      }}
                      disabled={!permissions.canEditRestaurantProfile}
                      placeholder="contact@spicegarden.com"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditRestaurantProfile
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {restaurantErrors.businessEmail && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {restaurantErrors.businessEmail}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Currency */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Default Currency
                    </label>
                    <select
                      value={restaurantForm.currency}
                      onChange={(e) => {
                        setRestaurantForm({
                          ...restaurantForm,
                          currency: e.target.value as any,
                          currencySymbol:
                            e.target.value === 'USD'
                              ? '$'
                              : e.target.value === 'EUR'
                              ? '€'
                              : e.target.value === 'AED'
                              ? 'AED'
                              : '₹',
                        });
                        setHasUnsavedChanges(true);
                      }}
                      disabled={!permissions.canEditLegalAndFinancials}
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditLegalAndFinancials
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="AED">AED (AED) - UAE Dirham</option>
                    </select>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Default Time Zone
                    </label>
                    <select
                      value={restaurantForm.timezone}
                      onChange={(e) => {
                        setRestaurantForm({ ...restaurantForm, timezone: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      disabled={!permissions.canEditLegalAndFinancials}
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditLegalAndFinancials
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST • UTC+05:30)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST • UTC+04:00)</option>
                      <option value="Europe/London">Europe/London (GMT • UTC+00:00)</option>
                      <option value="America/New_York">America/New_York (EST • UTC-05:00)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT • UTC+08:00)</option>
                    </select>
                  </div>

                  {/* General Operating Hours */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      General Operating Hours
                    </label>
                    <input
                      type="text"
                      value={restaurantForm.operatingHours}
                      onChange={(e) => {
                        setRestaurantForm({ ...restaurantForm, operatingHours: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      disabled={!permissions.canEditRestaurantProfile}
                      placeholder="e.g. 11:00 AM - 11:30 PM (Mon-Sun)"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditRestaurantProfile
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                  </div>
                </div>

                {/* Logo URL */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Restaurant Logo Image URL
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                      {restaurantForm.logoUrl ? (
                        <img
                          src={restaurantForm.logoUrl}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=120';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <input
                      type="url"
                      value={restaurantForm.logoUrl}
                      onChange={(e) => {
                        setRestaurantForm({ ...restaurantForm, logoUrl: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      disabled={!permissions.canEditRestaurantProfile}
                      placeholder="https://example.com/logo.png"
                      className={`flex-1 p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                        !permissions.canEditRestaurantProfile
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: BRANCH PROFILE (LOCATIONS & OUTLETS) */}
              <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-xs shadow-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Branch & Outlet Locations
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Branch-specific contact numbers, address, and operating hours
                      </p>
                    </div>
                  </div>

                  {/* Branch Selector Switcher */}
                  {restaurant?.outlets && restaurant.outlets.length > 0 && (
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                      {restaurant.outlets.map((outlet) => (
                        <button
                          key={outlet.id}
                          type="button"
                          onClick={() => setSelectedBranchId(outlet.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selectedBranchId === outlet.id
                              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {outlet.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Branch Display Name */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Branch Display Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={branchForm.name}
                      onChange={(e) => {
                        setBranchForm({ ...branchForm, name: e.target.value });
                        setHasUnsavedChanges(true);
                        if (branchErrors.branchName) setBranchErrors({ ...branchErrors, branchName: '' });
                      }}
                      disabled={!permissions.canEditBranchProfile}
                      placeholder="e.g. Spice Garden (Indiranagar)"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditBranchProfile
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {branchErrors.branchName && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {branchErrors.branchName}
                      </span>
                    )}
                  </div>

                  {/* Branch Short Code */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Branch Short Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={branchForm.code}
                      onChange={(e) => {
                        setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() });
                        setHasUnsavedChanges(true);
                        if (branchErrors.branchCode) setBranchErrors({ ...branchErrors, branchCode: '' });
                      }}
                      disabled={!permissions.canManageBranches}
                      placeholder="e.g. IND-01"
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
                        !permissions.canManageBranches
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {branchErrors.branchCode && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {branchErrors.branchCode}
                      </span>
                    )}
                    {!permissions.canManageBranches && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Short codes managed by Restaurant Owner
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Branch Phone */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Branch Contact Phone
                    </label>
                    <input
                      type="text"
                      value={branchForm.phone}
                      onChange={(e) => {
                        setBranchForm({ ...branchForm, phone: e.target.value });
                        setHasUnsavedChanges(true);
                        if (branchErrors.branchPhone) setBranchErrors({ ...branchErrors, branchPhone: '' });
                      }}
                      disabled={!permissions.canEditBranchContact}
                      placeholder="+91 98765 43210"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditBranchContact
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {branchErrors.branchPhone && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {branchErrors.branchPhone}
                      </span>
                    )}
                  </div>

                  {/* Branch Operating Hours */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Branch Operating Hours
                    </label>
                    <input
                      type="text"
                      value={branchForm.operatingHours}
                      onChange={(e) => {
                        setBranchForm({ ...branchForm, operatingHours: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      disabled={!permissions.canEditBranchOperatingHours}
                      placeholder="e.g. 11:30 AM - 11:00 PM"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                        !permissions.canEditBranchOperatingHours
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                  </div>
                </div>

                {/* Branch Address */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Branch Location Address
                  </label>
                  <input
                    type="text"
                    value={branchForm.address}
                    onChange={(e) => {
                      setBranchForm({ ...branchForm, address: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!permissions.canEditBranchProfile}
                    placeholder="e.g. 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038"
                    className={`w-full p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      !permissions.canEditBranchProfile
                        ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Branch Specific GSTIN */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Branch-Specific GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      value={branchForm.gstin}
                      onChange={(e) => {
                        setBranchForm({ ...branchForm, gstin: e.target.value.toUpperCase() });
                        setHasUnsavedChanges(true);
                        if (branchErrors.branchGstin) setBranchErrors({ ...branchErrors, branchGstin: '' });
                      }}
                      disabled={!permissions.canEditLegalAndFinancials}
                      placeholder="Leave blank to use restaurant GSTIN"
                      maxLength={15}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
                        !permissions.canEditLegalAndFinancials
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {branchErrors.branchGstin && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {branchErrors.branchGstin}
                      </span>
                    )}
                  </div>

                  {/* Branch FSSAI */}
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Branch Food Handler License (FSSAI)
                    </label>
                    <input
                      type="text"
                      value={branchForm.fssaiLicense}
                      onChange={(e) => {
                        setBranchForm({ ...branchForm, fssaiLicense: e.target.value });
                        setHasUnsavedChanges(true);
                        if (branchErrors.branchFssai) setBranchErrors({ ...branchErrors, branchFssai: '' });
                      }}
                      disabled={!permissions.canEditBranchProfile}
                      placeholder="14-digit license"
                      maxLength={14}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
                        !permissions.canEditBranchProfile
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none'
                      }`}
                    />
                    {branchErrors.branchFssai && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                        {branchErrors.branchFssai}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* UNSAVED CHANGES DISCARD CONFIRMATION MODAL */}
          {showDiscardConfirm && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 max-w-sm w-full space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Unsaved Changes
                    </h4>
                    <p className="text-xs text-slate-500">
                      You have unsaved changes in Restaurant Profile.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  If you switch tabs without saving, your edits will be discarded. Do you wish to discard them?
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscardConfirm(false);
                      setPendingTab(null);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Stay & Keep Editing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasUnsavedChanges(false);
                      setShowDiscardConfirm(false);
                      if (pendingTab) setActiveTab(pendingTab);
                      setPendingTab(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                  >
                    Discard Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Taxes & Invoicing */}
          {activeTab === 'billing' && (
            <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-xs shadow-xs">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
                  Indian restaurant GST regulation: Standard restaurant food service attracts 5.0% GST split equally as 2.5% Central GST (CGST) and 2.5% State GST (SGST). All bill calculations update automatically when these rates are modified.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">CGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.cgstPct}
                    onChange={(e) => setFormData({ ...formData, cgstPct: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">SGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.sgstPct}
                    onChange={(e) => setFormData({ ...formData, sgstPct: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Invoice Number Prefix</label>
                  <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">KOT Number Prefix</label>
                  <input
                    type="text"
                    value={formData.kotPrefix}
                    onChange={(e) => setFormData({ ...formData, kotPrefix: e.target.value })}
                    className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Thermal Receipt Footer Message</label>
                <input
                  type="text"
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  className="w-full mt-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Kitchen & KDS/KOT */}
          {activeTab === 'kitchen' && (
            <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 text-xs shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Enable Kitchen Display System (KDS)</h4>
                    <p className="text-slate-500 mt-0.5">
                      Show digital Kanban screen for kitchen chefs to accept, cook and serve items.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.enableKds}
                    onChange={(e) => setFormData({ ...formData, enableKds: e.target.checked })}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Enable Kitchen Order Tickets (KOT)</h4>
                    <p className="text-slate-500 mt-0.5">
                      Generate printable paper tickets to kitchen thermal printers upon order submission.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.enableKot}
                    onChange={(e) => setFormData({ ...formData, enableKot: e.target.checked })}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Kitchen Preparation Stations */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Configured Kitchen Preparation Stations
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Route menu items (Tandoor, Main Kitchen, Bar) to specific station displays & printers.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddStationOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Station</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {stations.map((stn) => (
                    <div
                      key={stn.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {stn.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                            {stn.code}
                          </span>
                          {stn.isDefault && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {stn.printerName ? `Printer: ${stn.printerName}` : 'Digital KDS only'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const dbOutletId =
                                activeOutlet?.id === 'outlet-blr-02'
                                  ? 'e7b1a0e1-0000-4000-8000-000000000012'
                                  : activeOutlet?.id?.includes('-') && activeOutlet.id.length >= 32
                                  ? activeOutlet.id
                                  : 'e7b1a0e1-0000-4000-8000-000000000011';
                              const res = await generateKdsPairingCodeInSupabase(
                                dbOutletId,
                                stn.id,
                                `${stn.name} Display`
                              );
                              setPairingModal({
                                stationName: stn.name,
                                code: res.pairingCode,
                                expiresIn: res.expiresInMinutes,
                              });
                            } catch (err: any) {
                              addToast(err?.message || 'Failed to generate KDS pairing code', 'error');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                        >
                          Pair Terminal
                        </button>

                        {!stn.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStation(stn.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Delete Station"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Station Modal */}
              {isAddStationOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                  <div className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Add Kitchen Station</h4>
                      <button
                        type="button"
                        onClick={() => setIsAddStationOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-300">Station Name</label>
                      <input
                        type="text"
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        placeholder="e.g. Tandoor Section"
                        className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-300">Station Code (Short)</label>
                      <input
                        type="text"
                        value={stationCode}
                        onChange={(e) => setStationCode(e.target.value)}
                        placeholder="e.g. TANDOOR"
                        className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold uppercase"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-300">Assigned Hardware Printer</label>
                      <select
                        value={stationPrinter}
                        onChange={(e) => setStationPrinter(e.target.value)}
                        className="w-full mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      >
                        <option>Kitchen Thermal Printer 1</option>
                        <option>Tandoor Section Printer</option>
                        <option>Bar Counter Printer</option>
                        <option>Digital KDS Only (No Paper)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isDefaultStation"
                        checked={stationIsDefault}
                        onChange={(e) => setStationIsDefault(e.target.checked)}
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <label htmlFor="isDefaultStation" className="font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                        Set as Default Kitchen Station
                      </label>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleCreateStation}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        Create Station
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddStationOpen(false)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Printing & Printers */}
          {activeTab === 'printers' && (
            <div className="space-y-6">
              {/* Printing Sub-Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setPrinterSubTab('designer')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                    printerSubTab === 'designer'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Receipt Designer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterSubTab('hardware')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                    printerSubTab === 'hardware'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Hardware Printers & Connections</span>
                </button>
              </div>

              {printerSubTab === 'designer' ? (
                <ReceiptDesigner
                  onPaperWidthChange={(width) =>
                    setFormData((prev) => ({ ...prev, receiptPaperWidth: width }))
                  }
                />
              ) : (
                <div className="space-y-6 animate-fade-in">
                  {/* TWO PRINTER CARDS SIDE BY SIDE ON DESKTOP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* CARD A: RECEIPT PRINTER */}
                    <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 flex flex-col justify-between shadow-xs">
                      <div className="space-y-4">
                        {/* Header: Title, Description, and Live Status Badge */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-blue-600" />
                              <span>Receipt Printer</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Customer bills and invoices
                            </p>
                          </div>
                          {renderPrinterStatusBadge(receiptStatus)}
                        </div>

                        {/* Offline / Unavailable Inline Alert */}
                        {receiptStatus !== 'connected' && receiptStatus !== 'checking' && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="leading-snug">
                              Printing service is unavailable. Start or reconnect your configured printing service to enable direct printing.
                            </p>
                          </div>
                        )}

                        {/* Printer Name */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Printer Name
                          </label>
                          <input
                            type="text"
                            value={formData.receiptPrinterName ?? 'Cashier Thermal Printer'}
                            onChange={(e) => setFormData({ ...formData, receiptPrinterName: e.target.value })}
                            placeholder="e.g. Receipt Thermal Printer"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                          />
                        </div>

                        {/* Connection Type */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Connection Type
                          </label>
                          <select
                            value={formData.receiptConnectionType || 'local_agent'}
                            onChange={(e) => setFormData({ ...formData, receiptConnectionType: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                          >
                            <option value="local_agent">Local Print Service (ESC/POS)</option>
                            <option value="network_escpos">Direct Network Printer (Ethernet / Wi-Fi)</option>
                            <option value="web_serial">Direct USB Web Serial</option>
                            <option value="browser">Browser System Print Dialog</option>
                          </select>
                        </div>

                        {/* Paper Size: 58 mm / 80 mm / A4 */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Paper Size & Format
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: '58mm', label: '58 mm', sub: 'Compact Roll' },
                              { id: '80mm', label: '80 mm', sub: 'Standard Roll' },
                              { id: 'a4', label: 'A4 Page', sub: 'HP / InkTank / Laser' },
                            ].map((size) => {
                              const active = (formData.receiptPaperWidth || '80mm') === size.id;
                              return (
                                <button
                                  key={size.id}
                                  type="button"
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      receiptPaperWidth: size.id as any,
                                      receiptConfig: prev.receiptConfig
                                        ? { ...prev.receiptConfig, paperWidth: size.id as any }
                                        : undefined,
                                    }))
                                  }
                                  className={`py-2 px-2 rounded-xl text-center transition-all border ${
                                    active
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <div className="text-xs font-black">{size.label}</div>
                                  <div className={`text-[10px] mt-0.5 ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {size.sub}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Number of Copies */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Number of Copies
                          </label>
                          <select
                            value={formData.receiptCopies || 1}
                            onChange={(e) => setFormData({ ...formData, receiptCopies: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                          >
                            <option value={1}>1 Copy (Customer)</option>
                            <option value={2}>2 Copies (Customer + Merchant)</option>
                            <option value={3}>3 Copies (Customer + Kitchen + Accounts)</option>
                          </select>
                        </div>

                        {/* Automatic Receipt Printing Toggle */}
                        <div className="pt-1">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formData.autoPrintReceipt ?? true}
                              onChange={(e) => setFormData({ ...formData, autoPrintReceipt: e.target.checked })}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              Automatic receipt printing
                            </span>
                          </label>
                          <span className="text-[10px] text-slate-400 block ml-6.5 mt-0.5">
                            Print receipt automatically upon bill settlement
                          </span>
                        </div>
                      </div>

                      {/* Test Print Button */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                        <button
                          type="button"
                          onClick={handleTestPrintReceipt}
                          disabled={isTestingReceipt}
                          className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                        >
                          {isTestingReceipt ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : (
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>{isTestingReceipt ? 'Sending Print Job...' : 'Test Print'}</span>
                        </button>
                      </div>
                    </div>

                    {/* CARD B: KITCHEN KOT PRINTER */}
                    <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 flex flex-col justify-between shadow-xs">
                      <div className="space-y-4">
                        {/* Header: Title, Description, and Live Status Badge */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <ChefHat className="w-4 h-4 text-amber-500" />
                              <span>Kitchen KOT Printer</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Kitchen order tickets
                            </p>
                          </div>
                          {renderPrinterStatusBadge(kotStatus)}
                        </div>

                        {/* Offline / Unavailable Inline Alert */}
                        {kotStatus !== 'connected' && kotStatus !== 'checking' && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="leading-snug">
                              Printing service is unavailable. Start or reconnect your configured printing service to enable direct printing.
                            </p>
                          </div>
                        )}

                        {/* Printer Name */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Printer Name
                          </label>
                          <input
                            type="text"
                            value={formData.kotPrinterName ?? 'Kitchen KOT Printer'}
                            onChange={(e) => setFormData({ ...formData, kotPrinterName: e.target.value })}
                            placeholder="e.g. Kitchen KOT Printer"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                          />
                        </div>

                        {/* Kitchen Station */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Kitchen Station
                          </label>
                          <select
                            value={formData.kotStation || 'all'}
                            onChange={(e) => setFormData({ ...formData, kotStation: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                          >
                            <option value="all">All Kitchen Stations</option>
                            <option value="main">Main Kitchen</option>
                            <option value="bar">Bar & Beverages</option>
                            <option value="grill">Grill & Tandoor</option>
                            {stations.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Paper Size: 58 mm / 80 mm */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Paper Size
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: '58mm', label: '58 mm' },
                              { id: '80mm', label: '80 mm' },
                            ].map((size) => {
                              const active = (formData.kotPaperWidth || '80mm') === size.id;
                              return (
                                <button
                                  key={size.id}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, kotPaperWidth: size.id as any })}
                                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                                    active
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {size.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Number of Copies */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Number of Copies
                          </label>
                          <select
                            value={formData.kotCopies || 1}
                            onChange={(e) => setFormData({ ...formData, kotCopies: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                          >
                            <option value={1}>1 Copy (Kitchen)</option>
                            <option value={2}>2 Copies (Kitchen + Expediter)</option>
                            <option value={3}>3 Copies</option>
                          </select>
                        </div>

                        {/* Automatic KOT Printing Toggle */}
                        <div className="pt-1">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formData.autoPrintKot ?? true}
                              onChange={(e) => setFormData({ ...formData, autoPrintKot: e.target.checked })}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              Automatic KOT printing
                            </span>
                          </label>
                          <span className="text-[10px] text-slate-400 block ml-6.5 mt-0.5">
                            Print KOT automatically when order is submitted
                          </span>
                        </div>
                      </div>

                      {/* Test Print Button */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                        <button
                          type="button"
                          onClick={handleTestPrintKot}
                          disabled={isTestingKot}
                          className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                        >
                          {isTestingKot ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                          ) : (
                            <ChefHat className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span>{isTestingKot ? 'Sending Print Job...' : 'Test Print'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* DIRECT SILENT PRINTING (SKIP PREVIEW DIALOG) */}
                  <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-slate-900/40 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 p-5 space-y-3.5 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Direct Silent Printing (No Preview Popups)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              Instant Counter Mode
                            </span>
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                            To send bills & invoices straight to your printer (e.g. HP Smart Tank, Thermal POS) without clicking "Print" in the browser preview dialog every time, launch your counter browser in <strong>Kiosk Silent Print Mode</strong>:
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Windows Terminal / POS Counter Launch Shortcut:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const cmd = 'chrome.exe --kiosk-printing --app=https://restaurant-pos-gilt-seven.vercel.app/app';
                            navigator.clipboard.writeText(cmd);
                            addToast('Copied Kiosk Mode shortcut command to clipboard!', 'success');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] flex items-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-800"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Command</span>
                        </button>
                      </div>
                      <code className="block p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] select-all break-all border border-slate-200 dark:border-slate-700">
                        chrome.exe --kiosk-printing --app=https://restaurant-pos-gilt-seven.vercel.app/app
                      </code>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        💡 <strong>How it works:</strong> Running Chrome or Edge with <code>--kiosk-printing</code> bypasses the print dialog completely and sends prints straight to your Windows default printer in 0.1 seconds.
                      </p>
                    </div>
                  </div>

                  {/* ADVANCED SETUP (COLLAPSED BY DEFAULT) */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121824] overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setIsAdvancedSetupOpen(!isAdvancedSetupOpen)}
                      className="w-full flex items-center justify-between p-4.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sliders className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <div>
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            Advanced Setup
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Connection endpoints, protocol diagnostics and agent configuration
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="text-[11px] font-semibold">
                          {isAdvancedSetupOpen ? 'Hide Diagnostics' : 'Show Diagnostics'}
                        </span>
                        {isAdvancedSetupOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {isAdvancedSetupOpen && (
                      <div className="p-4.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Receipt Printer Endpoint
                            </label>
                            <input
                              type="text"
                              value={formData.receiptEndpoint || 'http://127.0.0.1:9100/print'}
                              onChange={(e) => setFormData({ ...formData, receiptEndpoint: e.target.value })}
                              placeholder="http://127.0.0.1:9100/print"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Local bridge or raw network TCP endpoint for customer receipt printing
                            </span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Kitchen KOT Printer Endpoint
                            </label>
                            <input
                              type="text"
                              value={formData.kotEndpoint || 'http://127.0.0.1:9100/print'}
                              onChange={(e) => setFormData({ ...formData, kotEndpoint: e.target.value })}
                              placeholder="http://127.0.0.1:9100/print"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Local bridge or raw network TCP endpoint for kitchen order ticket printing
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            <span>Direct Silent Bridge: </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              ESC/POS Service on port 9100
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              checkReceiptStatus(false);
                              checkKotStatus(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors self-start sm:self-auto"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                            <span>Re-check Hardware Diagnostics</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Feature Toggles */}
          {activeTab === 'features' && (
            <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs shadow-xs">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Table Management Module</h4>
                  <p className="text-slate-500 mt-0.5">Enable visual floor plan, table assignment, and table occupancy.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableTableManagement}
                  onChange={(e) => setFormData({ ...formData, enableTableManagement: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Inventory & Raw Materials</h4>
                  <p className="text-slate-500 mt-0.5">Enable stock ledger, ingredient deductions, and low stock warnings.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableInventory}
                  onChange={(e) => setFormData({ ...formData, enableInventory: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 6: Backup & Export */}
          {activeTab === 'backup' && (
            <div className="bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs shadow-xs">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Export Full Configuration & Menu Backup</h4>
                  <p className="text-slate-500 mt-0.5">Download a JSON snapshot of current restaurant settings, catalog, and outlets.</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: Staff & Permissions */}
          {activeTab === 'staff' && <StaffManagementTab />}
        </div>
      </main>

      {/* KDS Pairing Code Display Modal */}
      {pairingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <ChefHat className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Pair KDS Display
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Station: <span className="font-bold text-slate-700 dark:text-slate-300">{pairingModal.stationName}</span>
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                6-Digit Terminal Pairing Code
              </span>
              <span className="font-mono text-3xl font-black text-blue-600 dark:text-blue-400 tracking-widest select-all">
                {pairingModal.code}
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block mt-1">
                Expires in {pairingModal.expiresIn} minutes
              </span>
            </div>

            <p className="text-xs text-slate-500 text-left leading-relaxed">
              On the kitchen tablet or monitor, click <strong>"Pair KDS Terminal"</strong> on the login screen and enter this code. The device will be securely authorized without sharing owner passwords.
            </p>

            <button
              type="button"
              onClick={() => setPairingModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {isConfirmSignOutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#121824] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Sign Out?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Are you sure you want to exit your session?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmSignOutOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmSignOutOpen(false);
                  logout();
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm shadow-rose-600/30"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
