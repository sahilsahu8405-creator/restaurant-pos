import React, { useState } from 'react';
import { ArrowUpRight, Download, CheckCircle2, X, Terminal, Monitor, Sparkles, ExternalLink } from 'lucide-react';

interface DeviceAvailabilityProps {
  onOpenWebApp: () => void;
  onRequestAccess?: (platform: string) => void;
}

export const DeviceAvailabilitySection: React.FC<DeviceAvailabilityProps> = ({
  onOpenWebApp,
  onRequestAccess,
}) => {
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);

  const handleDownloadWindows = () => {
    // Initiate direct download from official GitHub release CDN asset
    const downloadUrl = 'https://github.com/sahilsahu8405-creator/restaurant-pos/releases/download/v1.0.0/RestoHub-POS-Windows-x64.zip';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'RestoHub-POS-Windows-x64.zip');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDownloadModalOpen(true);
  };

  const handleDownloadFastLauncher = () => {
    // Instant 1-click lightweight launcher (under 2 KB) for Windows PCs
    const link = document.createElement('a');
    link.href = '/downloads/RestoHub-POS-Silent-Print.bat';
    link.setAttribute('download', 'RestoHub-POS-Counter-Launcher.bat');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAndroid = () => {
    // Initiate browser file download for the compiled Android APK
    const link = document.createElement('a');
    link.href = '/downloads/RestoHub-POS.apk';
    link.setAttribute('download', 'RestoHub-POS.apk');
    link.setAttribute('type', 'application/vnd.android.package-archive');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsAndroidModalOpen(true);
  };

  const devices = [
    {
      platform: 'Web App',
      subtitle: 'Use in Chrome, Edge, Safari',
      status: 'Available Now',
      isLive: true,
      buttonText: 'Open Web App',
      buttonAction: onOpenWebApp,
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      ),
    },
    {
      platform: 'Windows Desktop Software',
      subtitle: 'Native App for PC & Billing Counter',
      status: 'Available Now',
      isLive: true,
      isHighlighted: true,
      buttonText: 'Download for PC',
      buttonAction: () => setIsDownloadModalOpen(true),
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
        </svg>
      ),
    },
    {
      platform: 'Android App',
      subtitle: 'Waiters, Tablets & Handheld POS',
      status: 'Available Now',
      isLive: true,
      isHighlighted: false,
      buttonText: 'Download APK',
      buttonAction: () => setIsAndroidModalOpen(true),
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8 12 8s-3.5902.411-5.1368.9507L4.841 5.4477a.416.416 0 00-.5677-.1521.4157.4157 0 00-.152 5676l1.9972 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3433-4.1021-2.689-7.5743-6.1185-9.4396"/>
        </svg>
      ),
    },
    {
      platform: 'iOS & iPad App',
      subtitle: 'Apple iPads & iPhones',
      status: 'Coming Soon',
      isLive: false,
      buttonText: 'Request Access',
      buttonAction: () => onRequestAccess?.('iOS App'),
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.66-.82 1.11-1.96.99-3.1-.96.04-2.13.64-2.82 1.45-.61.71-1.14 1.87-.99 2.98 1.07.08 2.16-.51 2.82-1.33z"/>
        </svg>
      ),
    },
  ];

  return (
    <section className="py-16 sm:py-24 px-6 sm:px-8 bg-[#FAF7F2] relative">
      <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100/80 text-[#E87524]">
            <Sparkles className="w-3.5 h-3.5" />
            Hardware & Platform Support
          </div>
          <h2 className="font-serif-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-[#171A18] tracking-tight">
            Available on All Your Devices
          </h2>
          <p className="text-sm sm:text-base text-[#686A64]">
            Use RestoHub directly in your browser or download our native Windows software for counter billing and silent thermal printing.
          </p>
        </div>

        {/* 4 Device Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {devices.map((device, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-6 sm:p-7 border flex flex-col justify-between space-y-6 transition-all duration-200 relative ${
                device.isHighlighted
                  ? 'bg-white border-[#E87524] shadow-lg shadow-orange-500/10 ring-2 ring-[#E87524]/20'
                  : device.isLive
                  ? 'bg-white border-[#E3DDD2] shadow-sm hover:shadow-md'
                  : 'bg-white/80 border-[#E3DDD2] shadow-2xs hover:shadow-xs'
              }`}
            >
              {device.isHighlighted && (
                <div className="absolute -top-3 right-6 bg-[#E87524] text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  Cashier Choice
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    device.isHighlighted
                      ? 'bg-orange-50 text-[#E87524]'
                      : device.isLive
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {device.icon}
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    device.isLive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {device.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#171A18]">
                    {device.platform}
                  </h3>
                  <p className="text-xs text-[#686A64] mt-0.5">
                    {device.subtitle}
                  </p>
                </div>
              </div>

              {/* Action Button & Sub-label */}
              <div className="space-y-1.5 pt-2">
                <button
                  onClick={device.buttonAction}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    device.isHighlighted
                      ? 'bg-[#E87524] hover:bg-[#CC5E15] text-white shadow-sm'
                      : device.isLive
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      : 'border border-[#E3DDD2] hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {device.isHighlighted ? <Download className="w-3.5 h-3.5" /> : null}
                  <span>{device.buttonText}</span>
                  {device.isLive && !device.isHighlighted && <ArrowUpRight className="w-3.5 h-3.5" />}
                </button>

                {!device.isLive && (
                  <div className="text-[10px] text-center text-slate-400 font-medium">
                    Coming Soon
                  </div>
                )}
                {device.isHighlighted && (
                  <div className="text-[10px] text-center text-emerald-700 font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Built-in Silent ESC/POS Printer Bridge
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Windows Software Download Modal */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 sm:p-8 bg-linear-to-b from-orange-50/70 to-white border-b border-orange-100 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E87524] text-white flex items-center justify-center shadow-md shadow-orange-600/20">
                  <Monitor className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-headline text-2xl font-bold text-[#171A18]">
                      RestoHub for Windows
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      v1.0.0
                    </span>
                  </div>
                  <p className="text-xs text-[#686A64] mt-0.5">
                    Native desktop software with integrated thermal receipt printer bridge
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Features summary badge grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Silent ESC/POS Printing (Port 9100)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cash Drawer Kick Command</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>F11 Cashier Kiosk Lockdown</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Offline Menu & Cart Cache</span>
                </div>
              </div>

              {/* 3 Step Quick Setup Guide */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick 3-Step Setup
                </div>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                    <span className="w-5 h-5 rounded-full bg-[#E87524] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <span className="font-bold text-[#171A18]">Download the archive:</span> Click the button below to download <code className="bg-white px-1.5 py-0.5 rounded border border-orange-200 text-orange-800">RestoHub-POS-Windows-x64.zip</code>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <span className="font-bold text-[#171A18]">Extract & Open:</span> Right-click the zip file &gt; <em>Extract All</em>. Double-click <strong className="text-slate-900">RestoHub POS.exe</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <span className="font-bold text-[#171A18]">Start Billing:</span> Sign in with your Restaurant ID and PIN. Hardware thermal printers and cash drawers connect automatically!
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="space-y-3 pt-2">
                {/* Option 1: Instant 1-Second Launcher (Lightning Fast) */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Option 1: Instant Fast Launcher (Recommended)
                    </span>
                    <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                      ~2 KB • Instant
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Downloads in 1 second! Instantly launches counter POS on any Windows PC with zero-preview direct silent printing enabled.
                  </p>
                  <button
                    onClick={handleDownloadFastLauncher}
                    className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Instant PC Launcher (1-Second)</span>
                  </button>
                </div>

                {/* Option 2: Full Standalone Offline Package */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Option 2: Full Standalone Offline Package
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                      416 MB Portable ZIP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Complete standalone binary package including Chromium engine and hardware print driver.
                  </p>
                  <button
                    onClick={handleDownloadWindows}
                    className="w-full py-2.5 px-5 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full 416 MB ZIP Archive</span>
                  </button>
                </div>

                <div className="text-[11px] text-center text-slate-400">
                  Compatible with Windows 10 & 11 • All Counter & Thermal Printers Supported
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Android APK Download Modal */}
      {isAndroidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-[#E3DDD2] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 sm:p-7 border-b border-[#F0EAE0] flex items-center justify-between bg-[#FAF7F2]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8 12 8s-3.5902.411-5.1368.9507L4.841 5.4477a.416.416 0 00-.5677-.1521.4157.4157 0 00-.152 5676l1.9972 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3433-4.1021-2.689-7.5743-6.1185-9.4396"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-headline text-lg sm:text-xl font-bold text-[#171A18]">
                      RestoHub for Android
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      v1.0.0 APK • 4.7 MB
                    </span>
                  </div>
                  <p className="text-xs text-[#686A64] mt-0.5">
                    Native Android app for waiter tablets, kitchen KDS, and handheld POS devices
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAndroidModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Features summary badge grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bluetooth & WiFi Thermal Printing</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real-Time Kitchen KDS Sync</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Screen Always-On Mode</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Table Order Taking & Cashier POS</span>
                </div>
              </div>

              {/* 3 Step Quick Setup Guide */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick 3-Step Tablet & Phone Setup
                </div>
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                    <span className="w-5 h-5 rounded-full bg-[#E87524] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <span className="font-bold text-[#171A18]">Download the APK:</span> Tap the download button below directly on your Android tablet or smartphone to get <code className="bg-white px-1.5 py-0.5 rounded border border-orange-200 text-orange-800">RestoHub-POS.apk</code> (4.7 MB).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <span className="font-bold text-[#171A18]">Install on Device:</span> Tap the downloaded file in your notification bar or Downloads folder. If prompted, toggle <em>Allow from this source</em>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <span className="font-bold text-[#171A18]">Open & Connect:</span> Launch RestoHub POS and sign in with your staff account. Real-time table orders and kitchen sync are active immediately!
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleDownloadAndroid}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download RestoHub Android APK (4.7 MB)</span>
                </button>
                <div className="text-[11px] text-center text-slate-400">
                  Compatible with Android 7.0+ (Nougat through Android 15) • Tablets & Handhelds
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </section>
  );
};
