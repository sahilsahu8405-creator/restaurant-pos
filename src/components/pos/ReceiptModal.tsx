import React, { useState } from 'react';
import { X, Printer, Receipt } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { ReceiptDocument } from '../receipt/ReceiptDocument';
import { getEffectiveReceiptConfig } from '../../utils/receiptConfig';

interface ReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, isOpen, onClose }) => {
  const { restaurant, activeOutlet, settings, updateSettings, addToast } = useApp();
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm' | 'a4'>(
    (settings?.receiptPaperWidth as '58mm' | '80mm' | 'a4') || '80mm'
  );

  if (!isOpen || !order) return null;

  const effectiveConfig = getEffectiveReceiptConfig(settings, activeOutlet?.id);

  const handleSelectPaper = (width: '58mm' | '80mm' | 'a4') => {
    setPaperWidth(width);
    if (settings && settings.receiptPaperWidth !== width) {
      updateSettings({ receiptPaperWidth: width }).catch((err) => {
        console.error('Failed to persist paper width preference:', err);
      });
    }
  };

  const handlePrint = () => {
    window.print();
    addToast(`Receipt sent to printer (${paperWidth === 'a4' ? 'A4 Invoice' : paperWidth})`, 'success');
  };

  const displayOrderNumber = order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`;

  return (
    <div className="receipt-modal-root fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in select-none">
      {/* Dynamic @page media rule matching selected paper width */}
      <style>{`
        @media print {
          @page {
            size: ${paperWidth === '58mm' ? '58mm auto' : paperWidth === '80mm' ? '80mm auto' : 'A4 portrait'};
            margin: ${paperWidth === 'a4' ? '10mm' : '0mm'};
          }
        }
      `}</style>

      <div
        className={`receipt-modal-container w-full ${
          paperWidth === 'a4' ? 'max-w-4xl' : 'max-w-xl'
        } bg-white dark:bg-[#121824] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all duration-200`}
      >
        {/* Modal Header */}
        <div className="receipt-modal-header px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#121824] z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Receipt Preview
                </h2>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {displayOrderNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {paperWidth === 'a4' ? 'Standard A4 Tax Invoice' : `${paperWidth} Point of Sale Thermal Roll`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Paper Width Selector Segmented Control */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleSelectPaper('58mm')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  paperWidth === '58mm'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="58 mm (2-inch thermal receipt)"
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaper('80mm')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  paperWidth === '80mm'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="80 mm (3-inch standard thermal receipt)"
              >
                80 mm
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaper('a4')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  paperWidth === 'a4'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="A4 Full Page Tax Invoice"
              >
                A4
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close receipt preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dedicated Receipt Preview Canvas */}
        <div className="receipt-preview-canvas flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/95 dark:bg-[#080d17] flex justify-center items-start min-h-[360px] max-h-[calc(92vh-130px)]">
          <ReceiptDocument
            order={order}
            receiptConfig={effectiveConfig}
            restaurant={restaurant}
            outlet={activeOutlet}
            settings={settings}
            paperWidth={paperWidth}
            isPreviewMode={false}
          />
        </div>

        {/* Modal Footer Controls */}
        <div className="receipt-modal-footer px-5 py-3.5 bg-white dark:bg-[#121824] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between z-10">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Format:{' '}
              <strong className="text-slate-700 dark:text-slate-200">
                {paperWidth === '58mm'
                  ? '58 mm Thermal Paper'
                  : paperWidth === '80mm'
                  ? '80 mm Thermal Paper'
                  : 'A4 Full Page Invoice'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex-1 sm:flex-initial"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>
                Print Receipt ({paperWidth === 'a4' ? 'A4' : paperWidth})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
