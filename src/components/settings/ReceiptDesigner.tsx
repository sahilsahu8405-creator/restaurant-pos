import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Receipt,
  Printer,
  Upload,
  Trash2,
  RefreshCw,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  HelpCircle,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Info,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { printService } from '../../services/printService';
import { localRepository } from '../../services/localRepository';
import { RestaurantSettings, Outlet } from '../../types';
import {
  ReceiptConfig,
  DEFAULT_RECEIPT_CONFIG,
  SAMPLE_PREVIEW_ORDER,
  getEffectiveReceiptConfig,
} from '../../utils/receiptConfig';
import { ReceiptDocument } from '../receipt/ReceiptDocument';

interface ReceiptDesignerProps {
  onPaperWidthChange?: (width: '58mm' | '80mm' | 'a4') => void;
}

export const ReceiptDesigner: React.FC<ReceiptDesignerProps> = ({ onPaperWidthChange }) => {
  const { restaurant, activeOutlet, settings, updateSettings, addToast } = useApp();

  // Branch Scope Selection: 'default' (Restaurant-wide default) or outletId
  const [selectedScope, setSelectedScope] = useState<string>('default');

  // Active Collapsible Accordion in Editor (A - G)
  const [openSection, setOpenSection] = useState<string>('business');

  // Active Receipt Configuration being edited
  const [config, setConfig] = useState<ReceiptConfig>(() =>
    getEffectiveReceiptConfig(settings, selectedScope === 'default' ? undefined : selectedScope)
  );

  // Initial reference to detect unsaved changes
  const [initialConfig, setInitialConfig] = useState<ReceiptConfig>(config);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Modals & States
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showScopeConfirm, setShowScopeConfirm] = useState<boolean>(false);
  const [pendingScope, setPendingScope] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTestingPrint, setIsTestingPrint] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever settings or scope changes (when no dirty changes)
  useEffect(() => {
    const effective = getEffectiveReceiptConfig(
      settings,
      selectedScope === 'default' ? undefined : selectedScope
    );
    setConfig(effective);
    setInitialConfig(effective);
    setHasUnsavedChanges(false);
  }, [settings, selectedScope]);

  // Handle configuration updates
  const updateConfigField = <K extends keyof ReceiptConfig>(field: K, value: ReceiptConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [field]: value };
      setHasUnsavedChanges(JSON.stringify(next) !== JSON.stringify(initialConfig));
      return next;
    });

    if (field === 'paperWidth' && onPaperWidthChange) {
      onPaperWidthChange(value as '58mm' | '80mm' | 'a4');
    }
  };

  // Branch scope change handler
  const handleScopeChange = (newScope: string) => {
    if (hasUnsavedChanges) {
      setPendingScope(newScope);
      setShowScopeConfirm(true);
      return;
    }
    setSelectedScope(newScope);
  };

  // Logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      addToast('Please upload a valid image file (PNG, JPEG, WebP, or SVG)', 'error');
      return;
    }

    // Validate file size (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      addToast('Logo image size must be under 2 MB for thermal printer compatibility', 'error');
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Use local repository upload with fallback to FileReader data URL
      const res = await localRepository.uploadMenuImage(file);
      updateConfigField('logoUrl', res.url);
      updateConfigField('showLogo', true);
      addToast('Receipt logo uploaded successfully', 'success');
    } catch (err: any) {
      console.error('Logo upload failed:', err);
      // Fallback to data URL
      const reader = new FileReader();
      reader.onload = () => {
        updateConfigField('logoUrl', reader.result as string);
        updateConfigField('showLogo', true);
        addToast('Receipt logo loaded from local file', 'success');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    updateConfigField('logoUrl', '');
    updateConfigField('showLogo', false);
    addToast('Receipt logo removed', 'info');
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      let updatedSettings: Partial<RestaurantSettings>;

      if (selectedScope === 'default') {
        // Save restaurant-level default
        updatedSettings = {
          receiptPaperWidth: config.paperWidth,
          receiptFooter: config.thankYouMessage,
          receiptConfig: config,
        };
      } else {
        // Save branch-specific overrides
        const existingBranchConfigs = settings?.branchReceiptConfigs || {};
        updatedSettings = {
          branchReceiptConfigs: {
            ...existingBranchConfigs,
            [selectedScope]: config,
          },
        };
      }

      await updateSettings(updatedSettings);
      setInitialConfig(config);
      setHasUnsavedChanges(false);
      addToast(
        selectedScope === 'default'
          ? 'Restaurant default receipt design saved successfully'
          : `Branch receipt customization saved for ${
              restaurant?.outlets?.find((o) => o.id === selectedScope)?.name || 'branch'
            }`,
        'success'
      );
    } catch (err: any) {
      addToast(err?.message || 'Failed to save receipt configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard unsaved changes
  const handleDiscard = () => {
    setConfig(initialConfig);
    setHasUnsavedChanges(false);
    addToast('Unsaved changes discarded', 'info');
  };

  // Reset to default
  const handleConfirmReset = async () => {
    setShowResetConfirm(false);
    const standardDefault = { ...DEFAULT_RECEIPT_CONFIG };
    setConfig(standardDefault);

    try {
      if (selectedScope === 'default') {
        await updateSettings({
          receiptPaperWidth: standardDefault.paperWidth,
          receiptFooter: standardDefault.thankYouMessage,
          receiptConfig: standardDefault,
        });
      } else {
        const existingBranchConfigs = { ...(settings?.branchReceiptConfigs || {}) };
        delete existingBranchConfigs[selectedScope];
        await updateSettings({
          branchReceiptConfigs: existingBranchConfigs,
        });
      }
      setInitialConfig(standardDefault);
      setHasUnsavedChanges(false);
      addToast('Receipt template reset to RestoHub standard layout', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to reset receipt configuration', 'error');
    }
  };

  // Test Print: send the preview sample order formatted with current design to printer
  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    try {
      const activeOutletForPrint =
        selectedScope === 'default'
          ? activeOutlet
          : restaurant?.outlets?.find((o) => o.id === selectedScope) || activeOutlet;

      const res = await printService.printReceipt(
        SAMPLE_PREVIEW_ORDER,
        settings,
        restaurant,
        activeOutletForPrint,
        {
          customConfig: config,
        }
      );

      if (res.success) {
        addToast(`Test receipt dispatched to ${res.printerName} (${config.paperWidth})`, 'success');
      } else {
        addToast(`Test print: ${res.error || res.message}`, 'warning');
      }
    } catch (err: any) {
      addToast(`Test print error: ${err?.message || 'Failed to dispatch print job'}`, 'error');
    } finally {
      setIsTestingPrint(false);
    }
  };

  // Character counter for footer paragraph
  const footerCharLimit = 300;
  const currentFooterLength = config.footerParagraph?.length || 0;

  // Selected target branch for preview & business details
  const targetBranch: Outlet | undefined =
    selectedScope === 'default'
      ? activeOutlet || restaurant?.outlets?.[0]
      : restaurant?.outlets?.find((o) => o.id === selectedScope) || activeOutlet || restaurant?.outlets?.[0];

  const displayName =
    config.customDisplayName?.trim() ||
    restaurant?.name ||
    'RestoHub Restaurant';

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      {/* SCOPE SELECTION & ACTION BAR */}
      <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Receipt Configuration Scope
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedScope}
                onChange={(e) => handleScopeChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="default">★ Restaurant Default (Applies to all branches)</option>
                {restaurant?.outlets?.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    Branch Override: {outlet.name} ({outlet.code})
                  </option>
                ))}
              </select>
              {selectedScope !== 'default' && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Branch-Specific Override
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              Discard Changes
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-bold text-xs transition-colors flex items-center gap-1.5"
            title="Reset to default RestoHub receipt layout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
              hasUnsavedChanges
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Design'}</span>
          </button>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: DESIGNER CONTROLS & LIVE REAL-TIME PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN: CONFIGURATION SECTIONS (A - G)
            ======================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* SECTION A: BUSINESS IDENTITY */}
          <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'business' ? '' : 'business')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    A. Business Identity
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Restaurant display name, logo upload, branch, address, contact, and tax IDs
                  </p>
                </div>
              </div>
              {openSection === 'business' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openSection === 'business' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                {/* Custom Receipt Display Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Receipt Display Name
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Legal Name: {restaurant?.legalName || restaurant?.name}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={config.customDisplayName || ''}
                    onChange={(e) => updateConfigField('customDisplayName', e.target.value)}
                    placeholder={`e.g. ${restaurant?.name || 'Spice Garden'}`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Custom name printed on receipt without altering your official legal entity name.
                  </p>
                </div>

                {/* Logo Upload & Controls */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Receipt Logo</span>
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showLogo}
                        onChange={(e) => updateConfigField('showLogo', e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Print Logo
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-4">
                    {config.logoUrl || restaurant?.logoUrl ? (
                      <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1 relative overflow-hidden shrink-0">
                        <img
                          src={config.logoUrl || restaurant?.logoUrl}
                          alt="Receipt Logo"
                          className="max-h-full max-w-full object-contain grayscale"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px]">No Logo</span>
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                        >
                          {isUploadingLogo ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          <span>{config.logoUrl ? 'Replace Logo' : 'Upload Logo'}</span>
                        </button>

                        {config.logoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Recommended: Monochrome / high-contrast PNG or JPEG. Max file size: 2 MB.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </div>
                  </div>
                </div>

                {/* Business Fields Visibility Grid */}
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Information Visibility Toggles
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        key: 'showRestaurantName',
                        label: 'Restaurant Name',
                        value: displayName,
                      },
                      {
                        key: 'showBranchName',
                        label: 'Branch Name',
                        value: targetBranch?.name || 'Not set',
                      },
                      {
                        key: 'showAddress',
                        label: 'Outlet Address',
                        value: targetBranch?.address || 'Not set',
                      },
                      {
                        key: 'showPhone',
                        label: 'Phone Number',
                        value: targetBranch?.phone || restaurant?.primaryPhone || 'Not set',
                      },
                      {
                        key: 'showEmail',
                        label: 'Email Address',
                        value: targetBranch?.email || restaurant?.businessEmail || 'Not set',
                      },
                      {
                        key: 'showGstin',
                        label: 'GSTIN',
                        value: targetBranch?.gstin || restaurant?.gstin || 'Not set',
                      },
                      {
                        key: 'showFssai',
                        label: 'FSSAI License',
                        value: targetBranch?.fssaiLicense || restaurant?.fssaiLicense || 'Not set',
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer select-none hover:border-blue-400 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(config[item.key as keyof ReceiptConfig])}
                          onChange={(e) =>
                            updateConfigField(item.key as keyof ReceiptConfig, e.target.checked as any)
                          }
                          className="w-4 h-4 mt-0.5 rounded text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                        />
                        <div className="overflow-hidden">
                          <span className="font-bold text-slate-900 dark:text-white block text-xs">
                            {item.label}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {item.value}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION B: RECEIPT HEADER */}
          <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'header' ? '' : 'header')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    B. Receipt Header
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Header title, subtitle, welcome message, and text alignments
                  </p>
                </div>
              </div>
              {openSection === 'header' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openSection === 'header' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Header Title / Badge
                    </label>
                    <input
                      type="text"
                      value={config.headerTitle || ''}
                      onChange={(e) => updateConfigField('headerTitle', e.target.value)}
                      placeholder="e.g. TAX INVOICE"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={config.subtitle || ''}
                      onChange={(e) => updateConfigField('subtitle', e.target.value)}
                      placeholder="e.g. Fresh Food, Made with Care"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Welcome Message (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.welcomeMessage || ''}
                    onChange={(e) => updateConfigField('welcomeMessage', e.target.value)}
                    placeholder="e.g. Welcome to RestoHub Experience"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Alignment Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Header Text Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'left', label: 'Left', icon: AlignLeft },
                        { id: 'center', label: 'Center', icon: AlignCenter },
                        { id: 'right', label: 'Right', icon: AlignRight },
                      ].map((align) => {
                        const Icon = align.icon;
                        const active = config.headerAlignment === align.id;
                        return (
                          <button
                            key={align.id}
                            type="button"
                            onClick={() => updateConfigField('headerAlignment', align.id as any)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{align.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Logo Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'left', label: 'Left', icon: AlignLeft },
                        { id: 'center', label: 'Center', icon: AlignCenter },
                        { id: 'right', label: 'Right', icon: AlignRight },
                      ].map((align) => {
                        const Icon = align.icon;
                        const active = config.logoAlignment === align.id;
                        return (
                          <button
                            key={align.id}
                            type="button"
                            onClick={() => updateConfigField('logoAlignment', align.id as any)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                              active
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{align.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION C: INVOICE INFORMATION */}
          <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'invoice' ? '' : 'invoice')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    C. Invoice Information
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Invoice number, order details, date, time, table, waiter and customer details
                  </p>
                </div>
              </div>
              {openSection === 'invoice' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openSection === 'invoice' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { key: 'showInvoiceNumber', label: 'Invoice Number' },
                    { key: 'showOrderNumber', label: 'Order Number' },
                    { key: 'showOrderDate', label: 'Order Date' },
                    { key: 'showOrderTime', label: 'Order Time' },
                    { key: 'showOrderType', label: 'Order Type' },
                    { key: 'showTableNumber', label: 'Table Number (Dine-in)' },
                    { key: 'showWaiterName', label: 'Server / Captain Name' },
                    { key: 'showCashierName', label: 'Cashier Station' },
                    { key: 'showCustomerName', label: 'Customer Name' },
                    { key: 'showCustomerPhone', label: 'Customer Phone' },
                  ].map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer select-none hover:border-blue-400 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(config[field.key as keyof ReceiptConfig])}
                        onChange={(e) =>
                          updateConfigField(field.key as keyof ReceiptConfig, e.target.checked as any)
                        }
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {field.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION D: ITEM & PRICE DISPLAY */}
          <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'items' ? '' : 'items')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    D. Item & Price Display
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Item rates, quantities, line totals, modifiers, variants, notes and subtotals
                  </p>
                </div>
              </div>
              {openSection === 'items' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openSection === 'items' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { key: 'showItemQuantity', label: 'Item Quantity' },
                    { key: 'showUnitPrice', label: 'Unit Rate' },
                    { key: 'showLineTotal', label: 'Item Line Total' },
                    { key: 'showVariant', label: 'Portion / Variant Size' },
                    { key: 'showModifiers', label: 'Item Modifiers / Add-ons' },
                    { key: 'showItemNotes', label: 'Special Instructions / Notes' },
                    { key: 'showDiscountDetails', label: 'Discount Breakdown' },
                    { key: 'showSubtotal', label: 'Subtotal' },
                    { key: 'showRoundingAdjustment', label: 'Rounding Adjustment' },
                    { key: 'showGrandTotal', label: 'Grand Total' },
                  ].map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer select-none hover:border-blue-400 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(config[field.key as keyof ReceiptConfig])}
                        onChange={(e) =>
                          updateConfigField(field.key as keyof ReceiptConfig, e.target.checked as any)
                        }
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {field.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION E: TAX & PAYMENT DETAILS */}
          <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'taxes' ? '' : 'taxes')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    E. Tax & Payment Details
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    CGST, SGST, IGST, payment method, payment status, amount paid and balance
                  </p>
                </div>
              </div>
              {openSection === 'taxes' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openSection === 'taxes' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { key: 'showTaxBreakdown', label: 'Tax Section Group' },
                    { key: 'showCgst', label: 'Central GST (CGST)' },
                    { key: 'showSgst', label: 'State GST (SGST)' },
                    { key: 'showIgst', label: 'Integrated GST (IGST)' },
                    { key: 'showPaymentMethod', label: 'Payment Method (UPI/Card)' },
                    { key: 'showPaymentStatus', label: 'Payment Status (Paid/Pending)' },
                    { key: 'showAmountPaid', label: 'Amount Paid' },
                    { key: 'showBalanceDue', label: 'Balance Due' },
                    { key: 'showChangeReturned', label: 'Change Returned' },
                    { key: 'showPaymentReference', label: 'Transaction Reference ID' },
                  ].map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer select-none hover:border-blue-400 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(config[field.key as keyof ReceiptConfig])}
                        onChange={(e) =>
                          updateConfigField(field.key as keyof ReceiptConfig, e.target.checked as any)
                        }
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {field.label}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * CGST and SGST apply to intra-state sales. IGST applies to inter-state transactions.
                </p>
              </div>
            )}
          </div>

          {/* SECTION F: FOOTER & THANK-YOU MESSAGE */}
          <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'footer' ? '' : 'footer')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    F. Footer & Thank-You Message
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Custom thank-you message, multiline paragraph, website, social handles and disclaimers
                  </p>
                </div>
              </div>
              {openSection === 'footer' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openSection === 'footer' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showFooter}
                      onChange={(e) => updateConfigField('showFooter', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                    />
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      Enable Footer Section
                    </span>
                  </label>
                </div>

                {config.showFooter && (
                  <div className="space-y-4 pt-1">
                    {/* Thank You Message */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Primary Thank-You Message
                      </label>
                      <input
                        type="text"
                        value={config.thankYouMessage || ''}
                        onChange={(e) => updateConfigField('thankYouMessage', e.target.value)}
                        placeholder="e.g. Thank you for visiting Spice Garden!"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Multiline Footer Paragraph */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          Additional Custom Footer Paragraph (Multiline)
                        </label>
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            currentFooterLength > footerCharLimit ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {currentFooterLength} / {footerCharLimit} chars
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={config.footerParagraph || ''}
                        onChange={(e) => updateConfigField('footerParagraph', e.target.value)}
                        maxLength={footerCharLimit}
                        placeholder="e.g. We appreciate your visit. We hope you enjoyed your meal and look forward to serving you again."
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none leading-relaxed"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Line breaks are preserved and wrapped for 58 mm and 80 mm thermal rolls.
                      </p>
                    </div>

                    {/* Website */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Website URL</span>
                        <input
                          type="checkbox"
                          checked={config.showWebsite}
                          onChange={(e) => updateConfigField('showWebsite', e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={config.website || ''}
                        onChange={(e) => updateConfigField('website', e.target.value)}
                        placeholder="e.g. www.spicegardenrestaurant.com"
                        disabled={!config.showWebsite}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                          !config.showWebsite
                            ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700'
                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                        }`}
                      />
                    </div>

                    {/* Social Media Handle */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Social Media Handle
                        </span>
                        <input
                          type="checkbox"
                          checked={config.showSocialHandle}
                          onChange={(e) => updateConfigField('showSocialHandle', e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={config.socialHandle || ''}
                        onChange={(e) => updateConfigField('socialHandle', e.target.value)}
                        placeholder="e.g. @spicegardenblr"
                        disabled={!config.showSocialHandle}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                          !config.showSocialHandle
                            ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700'
                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                        }`}
                      />
                    </div>

                    {/* Return Visit Promo Message */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Return Visit Offer / Message
                        </span>
                        <input
                          type="checkbox"
                          checked={config.showReturnVisitMessage}
                          onChange={(e) => updateConfigField('showReturnVisitMessage', e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={config.returnVisitMessage || ''}
                        onChange={(e) => updateConfigField('returnVisitMessage', e.target.value)}
                        placeholder="e.g. Show this bill on your next visit to get 10% off!"
                        disabled={!config.showReturnVisitMessage}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          !config.showReturnVisitMessage
                            ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700'
                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                        }`}
                      />
                    </div>

                    {/* Custom Disclaimer */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Custom Disclaimer / Legal Note
                        </span>
                        <input
                          type="checkbox"
                          checked={config.showCustomDisclaimer}
                          onChange={(e) => updateConfigField('showCustomDisclaimer', e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={config.customDisclaimer || ''}
                        onChange={(e) => updateConfigField('customDisclaimer', e.target.value)}
                        placeholder="e.g. * Computer generated invoice. No physical seal required."
                        disabled={!config.showCustomDisclaimer}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          !config.showCustomDisclaimer
                            ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-200 dark:border-slate-700'
                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION G: PAPER & LAYOUT */}
          <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'layout' ? '' : 'layout')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    G. Paper & Layout
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Default paper width (58 mm, 80 mm, A4) and typography scaling
                  </p>
                </div>
              </div>
              {openSection === 'layout' ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {openSection === 'layout' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Paper Format
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: '58mm', title: '58 mm', desc: '2-inch compact thermal roll' },
                    { id: '80mm', title: '80 mm', desc: '3-inch standard POS roll' },
                    { id: 'a4', title: 'A4 Page', desc: 'Full-page laser/inkjet invoice' },
                  ].map((size) => {
                    const active = config.paperWidth === size.id;
                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => updateConfigField('paperWidth', size.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-black text-xs block">{size.title}</span>
                        <span
                          className={`text-[10px] block mt-0.5 ${
                            active ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {size.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: SINGLE LIVE RECEIPT PREVIEW (H)
            ======================================================== */}
        <div className="lg:col-span-5 sticky top-4 space-y-3">
          <div className="bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
            {/* Preview Header & Format Switcher */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    H. Live Preview
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Real-time WYSIWYG preview • Sample data only
                  </p>
                </div>
              </div>

              {/* Format Segmented Buttons */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-[10px]">
                <button
                  type="button"
                  onClick={() => updateConfigField('paperWidth', '58mm')}
                  className={`px-2 py-1 rounded transition-all ${
                    config.paperWidth === '58mm'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  58 mm
                </button>
                <button
                  type="button"
                  onClick={() => updateConfigField('paperWidth', '80mm')}
                  className={`px-2 py-1 rounded transition-all ${
                    config.paperWidth === '80mm'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  80 mm
                </button>
                <button
                  type="button"
                  onClick={() => updateConfigField('paperWidth', 'a4')}
                  className={`px-2 py-1 rounded transition-all ${
                    config.paperWidth === 'a4'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  A4
                </button>
              </div>
            </div>

            {/* Preview Canvas: Exactly ONE Preview Component */}
            <div className="receipt-preview-viewport overflow-y-auto max-h-[580px] p-4 bg-slate-900/95 dark:bg-[#080d17] rounded-xl flex justify-center items-start shadow-inner border border-slate-800/80">
              <ReceiptDocument
                order={SAMPLE_PREVIEW_ORDER}
                receiptConfig={config}
                restaurant={restaurant}
                outlet={targetBranch}
                settings={settings}
                paperWidth={config.paperWidth}
                isPreviewMode={true}
              />
            </div>

            {/* Test Print from Designer */}
            <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500">
                Target: {settings?.receiptPrinterName || 'Cashier Printer'}
              </span>
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isTestingPrint}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isTestingPrint ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{isTestingPrint ? 'Sending Print Job...' : 'Print Sample'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Reset Receipt Design?
                </h4>
                <p className="text-[11px] text-slate-500">
                  Restore standard RestoHub receipt layout
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This will reset the receipt configuration for{' '}
              <strong>
                {selectedScope === 'default'
                  ? 'all branches (default)'
                  : targetBranch?.name || 'this branch'}
              </strong>{' '}
              back to the original RestoHub defaults. Your actual restaurant profile and branch
              business records will not be deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNSAVED CHANGES SCOPE CHANGE CONFIRMATION */}
      {showScopeConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Unsaved Changes
                </h4>
                <p className="text-[11px] text-slate-500">
                  You have unsaved changes in this receipt design.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Switching the configuration scope will discard your unsaved modifications. Would you
              like to stay and save your changes first, or discard them?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowScopeConfirm(false);
                  setPendingScope(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Stay & Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasUnsavedChanges(false);
                  setShowScopeConfirm(false);
                  if (pendingScope) setSelectedScope(pendingScope);
                  setPendingScope(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Discard Edits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
