import React from 'react';

interface BrandLogoProps {
  className?: string;
  isDark?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  isDark = false,
  onClick,
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${className}`}
      role="banner"
    >
      {/* Refined Burnt Orange Geometric Mark */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-[#E87524] text-white flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform duration-200 shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized Modern R & Utensil Contour */}
          <path d="M6 3h6.5a4.5 4.5 0 0 1 3.8 6.9L19 19.5a1 1 0 0 1-1.6 1.2l-3.3-4.7H9.5V20a1 1 0 0 1-2 0V4a1 1 0 0 1 1-1h6.5a2.5 2.5 0 0 0 0-5H8v5h4.5a2.5 2.5 0 0 0 0-5z" opacity="0.1" />
          <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h5.75a4.75 4.75 0 0 1 3.36 8.11L18.7 19.2a1 1 0 0 1-1.62 1.17l-3.23-4.87H9.5V20a1 1 0 1 1-2 0V3.5zm3.5 8.37h3.75a2.75 2.75 0 0 0 0-5.5H9.5v5.5z" />
          <circle cx="17.5" cy="5.5" r="1.5" className="fill-orange-200" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-black tracking-tight font-sans leading-none ${
            textSizes[size]
          } ${isDark ? 'text-white' : 'text-[#171A18]'}`}
        >
          Resto<span className="text-[#E87524]">Hub</span>
        </span>
      </div>
    </div>
  );
};
