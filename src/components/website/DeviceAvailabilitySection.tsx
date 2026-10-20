import React from 'react';
import { Monitor, Smartphone, Tablet, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface DeviceAvailabilityProps {
  onOpenWebApp: () => void;
  onRequestAccess?: (platform: string) => void;
}

export const DeviceAvailabilitySection: React.FC<DeviceAvailabilityProps> = ({
  onOpenWebApp,
  onRequestAccess,
}) => {
  const devices = [
    {
      platform: 'Web App',
      subtitle: 'Use in browser',
      status: 'Available Now',
      isLive: true,
      buttonText: 'Open Now',
      buttonAction: onOpenWebApp,
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      ),
    },
    {
      platform: 'Windows App',
      subtitle: 'Download for PC',
      status: 'Coming Soon',
      isLive: false,
      buttonText: 'Download',
      buttonAction: () => onRequestAccess?.('Windows App'),
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
        </svg>
      ),
    },
    {
      platform: 'Android App',
      subtitle: 'Get it on Play Store',
      status: 'Coming Soon',
      isLive: false,
      buttonText: 'Download',
      buttonAction: () => onRequestAccess?.('Android App'),
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8 12 8s-3.5902.411-5.1368.9507L4.841 5.4477a.416.416 0 00-.5677-.1521.4157.4157 0 00-.152 5676l1.9972 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3433-4.1021-2.689-7.5743-6.1185-9.4396"/>
        </svg>
      ),
    },
    {
      platform: 'iOS App',
      subtitle: 'Get it on App Store',
      status: 'Coming Soon',
      isLive: false,
      buttonText: 'Download',
      buttonAction: () => onRequestAccess?.('iOS App'),
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.66-.82 1.11-1.96.99-3.1-.96.04-2.13.64-2.82 1.45-.61.71-1.14 1.87-.99 2.98 1.07.08 2.16-.51 2.82-1.33z"/>
        </svg>
      ),
    },
  ];

  return (
    <section className="py-16 sm:py-24 px-6 sm:px-8 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-serif-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-[#171A18] tracking-tight">
            Available on All Your Devices
          </h2>
          <p className="text-sm sm:text-base text-[#686A64]">
            Use RestoHub in your browser or install on your preferred device.
          </p>
        </div>

        {/* 4 Device Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {devices.map((device, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-6 sm:p-7 border flex flex-col justify-between space-y-6 transition-all duration-200 ${
                device.isLive
                  ? 'bg-white border-[#E87524]/60 shadow-md shadow-orange-600/10'
                  : 'bg-white/80 border-[#E3DDD2] shadow-2xs hover:shadow-xs'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    device.isLive
                      ? 'bg-orange-50 text-[#E87524]'
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
                    device.isLive
                      ? 'bg-[#E87524] hover:bg-[#CC5E15] text-white shadow-xs'
                      : 'border border-[#E3DDD2] hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{device.buttonText}</span>
                  {device.isLive && <ArrowUpRight className="w-3.5 h-3.5" />}
                </button>

                {!device.isLive && (
                  <div className="text-[10px] text-center text-slate-400 font-medium">
                    Coming Soon
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
