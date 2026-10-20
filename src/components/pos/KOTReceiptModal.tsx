import React, { useState } from 'react';
import { X, Printer, ChefHat, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KOTTicket } from '../../types';

interface KOTReceiptModalProps {
  ticket: KOTTicket | null;
  isOpen: boolean;
  onClose: () => void;
}

export const KOTReceiptModal: React.FC<KOTReceiptModalProps> = ({
  ticket,
  isOpen,
  onClose,
}) => {
  const { restaurant, settings, addToast } = useApp();
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(
    settings?.kotPaperWidth || '80mm'
  );

  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    window.print();
    addToast(`KOT ${ticket.kotNumber} sent to printer (${paperWidth})`, 'success');
  };

  return (
    <div className="receipt-modal-root fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      {/* Dynamic @page media rule matching selected KOT paper width */}
      <style>{`
        @media print {
          @page {
            size: ${paperWidth === '58mm' ? '58mm auto' : '80mm auto'};
            margin: 0mm;
          }
        }
      `}</style>

      <div className="receipt-modal-container w-full max-w-md bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="receipt-modal-header p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-amber-500" />
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Kitchen Order Ticket (KOT)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Width Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  paperWidth === '58mm'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400'
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  paperWidth === '80mm'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400'
                }`}
              >
                80 mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal KOT Container */}
        <div className="receipt-preview-canvas flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950/60 flex justify-center">
          <div
            id="printable-thermal-kot"
            className={`${
              paperWidth === '58mm'
                ? 'kot-paper-58mm w-[220px] text-[10px]'
                : 'kot-paper-80mm w-[290px] text-[12px]'
            } bg-white text-slate-900 p-4 rounded-lg shadow-md font-mono leading-tight flex flex-col items-center border border-slate-200`}
          >
            {/* KOT Header */}
            <span className="font-black text-sm tracking-wider uppercase">
              {restaurant?.name || 'RestoHub'}
            </span>
            <span className="font-bold text-xs uppercase bg-black text-white px-2 py-0.5 mt-1 rounded">
              KITCHEN ORDER TICKET
            </span>
            <span className="text-[11px] font-extrabold text-blue-600 mt-1 uppercase">
              STATION: {ticket.stationName}
            </span>

            <div className="w-full border-t border-dashed border-slate-400 my-2" />

            {/* Ticket Info */}
            <div className="w-full space-y-1 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>TICKET: {ticket.kotNumber}</span>
                <span className="uppercase text-amber-600 font-extrabold">
                  {ticket.ticketType === 'incremental' ? '[ADD-ON]' : '[NEW]'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>TABLE: {ticket.tableNumber}</span>
                <span>ORDER: {ticket.orderNumber}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</span>
                <span>
                  {new Date(ticket.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div className="w-full border-t border-dashed border-slate-400 my-2" />

            {/* Items */}
            <div className="w-full space-y-2">
              <div className="flex justify-between font-extrabold text-[11px] border-b border-slate-300 pb-1">
                <span className="w-8">QTY</span>
                <span className="flex-1">ITEM DETAILS</span>
              </div>

              {ticket.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-start">
                    <span className="w-8 font-black text-sm">{item.quantity}×</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-extrabold text-xs block">
                        {item.menuItem.name}
                      </span>
                      {item.variant && (
                        <span className="text-[10px] text-blue-600 font-bold block">
                          Portion: {item.variant.name}
                        </span>
                      )}
                      {item.notes && (
                        <span className="text-[10px] font-bold text-red-600 italic block mt-0.5">
                          NOTE: {item.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full border-t border-dashed border-slate-400 my-3" />
            <span className="text-[10px] text-center text-slate-500 font-bold">
              -- END OF KITCHEN TICKET --
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="receipt-modal-footer p-4 bg-white dark:bg-[#121824] border-t border-slate-200 dark:border-slate-800 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Kitchen KOT</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
