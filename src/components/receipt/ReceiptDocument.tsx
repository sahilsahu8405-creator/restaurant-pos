import React from 'react';
import { Order, Outlet, Restaurant, RestaurantSettings } from '../../types';
import { formatPaise } from '../../utils/currency';
import { ReceiptConfig } from '../../utils/receiptConfig';

export interface ReceiptDocumentProps {
  order: Order;
  receiptConfig: ReceiptConfig;
  restaurant?: Restaurant | null;
  outlet?: Outlet | null;
  settings?: RestaurantSettings | null;
  paperWidth?: '58mm' | '80mm' | 'a4';
  isPreviewMode?: boolean;
}

export const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
  order,
  receiptConfig,
  restaurant,
  outlet,
  settings,
  paperWidth: propPaperWidth,
  isPreviewMode = false,
}) => {
  const paperWidth = propPaperWidth || receiptConfig.paperWidth || '80mm';

  // Business Information (prioritize custom receipt display name, then restaurant/outlet records)
  const displayName =
    receiptConfig.customDisplayName?.trim() ||
    restaurant?.name ||
    'RestoHub Restaurant';

  const logoUrl = receiptConfig.logoUrl?.trim() || restaurant?.logoUrl;
  const showLogo = receiptConfig.showLogo && Boolean(logoUrl);

  const branchName = outlet?.name;
  const address = outlet?.address;
  const phone = outlet?.phone || restaurant?.primaryPhone || settings?.primaryPhone;
  const email = outlet?.email || restaurant?.businessEmail;
  const gstin = outlet?.gstin || restaurant?.gstin || settings?.gstin;
  const fssai = outlet?.fssaiLicense || restaurant?.fssaiLicense || settings?.fssaiLicense;

  // Invoice identifiers
  const displayOrderNumber = order.orderNumber.startsWith('#')
    ? order.orderNumber
    : `#${order.orderNumber}`;
  const rawOrderNum = order.orderNumber.replace(/[^0-9]/g, '') || order.orderNumber;
  const invoiceNumber = `${settings?.invoicePrefix || 'INV-'}${rawOrderNum}`;

  // Accurate financial & payment calculations
  const paidAmount =
    order.paidAmountPaise !== undefined
      ? order.paidAmountPaise
      : order.paymentStatus === 'paid'
      ? order.totalPaise
      : 0;
  const balanceDue = Math.max(0, order.totalPaise - paidAmount);
  const changeReturned = paidAmount > order.totalPaise ? paidAmount - order.totalPaise : 0;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(order.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const headerAlignClass =
    receiptConfig.headerAlignment === 'left'
      ? 'text-left items-start'
      : receiptConfig.headerAlignment === 'right'
      ? 'text-right items-end'
      : 'text-center items-center';

  const logoAlignClass =
    receiptConfig.logoAlignment === 'left'
      ? 'self-start'
      : receiptConfig.logoAlignment === 'right'
      ? 'self-end'
      : 'self-center';

  if (paperWidth === 'a4') {
    /* ===================================================
       A4 FULL PAGE TAX INVOICE FORMAT
       =================================================== */
    return (
      <div
        id="printable-thermal-receipt"
        className="receipt-paper-a4 w-full max-w-[760px] bg-white text-slate-900 p-8 shadow-xl rounded-xs border border-slate-200 font-sans text-xs leading-relaxed transition-all"
      >
        {isPreviewMode && (
          <div className="mb-4 py-1.5 px-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center justify-between">
            <span className="uppercase tracking-wider">Sample Order — Preview Only</span>
            <span className="text-[10px] text-amber-600 font-normal">
              Not a real transaction • Safe for design testing
            </span>
          </div>
        )}

        {/* A4 Header Section */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div className={`space-y-1 flex flex-col ${headerAlignClass}`}>
            {showLogo && (
              <img
                src={logoUrl}
                alt={displayName}
                className={`h-12 w-auto max-w-[180px] object-contain mb-2 ${logoAlignClass}`}
              />
            )}

            {receiptConfig.showRestaurantName && (
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-950">
                {displayName}
              </h1>
            )}

            {receiptConfig.subtitle && (
              <p className="text-slate-600 font-medium text-xs">{receiptConfig.subtitle}</p>
            )}

            {receiptConfig.welcomeMessage && (
              <p className="text-slate-500 text-[11px] italic">{receiptConfig.welcomeMessage}</p>
            )}

            {receiptConfig.showBranchName && branchName && (
              <p className="font-semibold text-slate-800 text-xs">{branchName}</p>
            )}

            {receiptConfig.showAddress && address && (
              <p className="text-slate-600 max-w-sm text-[11px]">{address}</p>
            )}

            <div className="text-slate-500 text-[11px] pt-1 space-y-0.5">
              {receiptConfig.showPhone && phone && <p>Tel: {phone}</p>}
              {receiptConfig.showEmail && email && <p>Email: {email}</p>}
              {receiptConfig.showGstin && gstin && (
                <p className="font-semibold text-slate-800">GSTIN: {gstin}</p>
              )}
              {receiptConfig.showFssai && fssai && <p>FSSAI Lic: {fssai}</p>}
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-wider rounded-md border border-blue-200">
              {receiptConfig.headerTitle || 'TAX INVOICE'}
            </span>

            <div className="text-[11px] text-slate-600 pt-2 space-y-1">
              {receiptConfig.showInvoiceNumber && (
                <p>
                  <span className="text-slate-400">Invoice No:</span>{' '}
                  <span className="font-bold text-slate-900">{invoiceNumber}</span>
                </p>
              )}
              {receiptConfig.showOrderNumber && (
                <p>
                  <span className="text-slate-400">Order No:</span>{' '}
                  <span className="font-semibold text-slate-800">{displayOrderNumber}</span>
                </p>
              )}
              {(receiptConfig.showOrderDate || receiptConfig.showOrderTime) && (
                <p>
                  <span className="text-slate-400">Date & Time:</span>{' '}
                  <span>
                    {receiptConfig.showOrderDate && formattedDate}{' '}
                    {receiptConfig.showOrderTime && formattedTime}
                  </span>
                </p>
              )}
              {receiptConfig.showOrderType && (
                <p>
                  <span className="text-slate-400">Order Type:</span>{' '}
                  <span className="font-semibold uppercase">
                    {order.orderType.replace('_', ' ')}
                  </span>
                </p>
              )}
              {receiptConfig.showTableNumber && order.tableName && (
                <p>
                  <span className="text-slate-400">Table:</span>{' '}
                  <span className="font-bold text-slate-900">
                    {order.tableName} {order.guestCount ? `(${order.guestCount} Guests)` : ''}
                  </span>
                </p>
              )}
              {receiptConfig.showWaiterName && order.waiterName && (
                <p>
                  <span className="text-slate-400">Server:</span> {order.waiterName}
                </p>
              )}
              {receiptConfig.showCashierName && (
                <p>
                  <span className="text-slate-400">Cashier:</span> Cashier Desk 1
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Details */}
        {(receiptConfig.showCustomerName || receiptConfig.showCustomerPhone) &&
          (order.customerName || order.customerPhone) && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 mb-6 flex justify-between items-center text-[11px]">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                  Billed To
                </span>
                {receiptConfig.showCustomerName && order.customerName && (
                  <span className="font-bold text-slate-900 text-sm">
                    {order.customerName}
                  </span>
                )}
                {order.customerAddress && (
                  <p className="text-slate-600 mt-0.5">{order.customerAddress}</p>
                )}
              </div>
              {receiptConfig.showCustomerPhone && order.customerPhone && (
                <div className="text-right text-slate-600">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                    Contact
                  </span>
                  <span className="font-medium">{order.customerPhone}</span>
                </div>
              )}
            </div>
          )}

        {/* Items Table */}
        <div className="mb-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase border-b border-slate-200">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                {receiptConfig.showItemQuantity && (
                  <th className="py-2.5 px-3 text-center w-16">Qty</th>
                )}
                {receiptConfig.showUnitPrice && (
                  <th className="py-2.5 px-3 text-right w-24">Unit Rate</th>
                )}
                {receiptConfig.showLineTotal && (
                  <th className="py-2.5 px-3 text-right w-28">Amount</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {order.items.map((item, idx) => (
                <tr key={item.cartItemId} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 text-center text-slate-400 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-bold text-slate-900 break-words max-w-sm">
                      {item.menuItem.name}
                    </div>
                    {receiptConfig.showVariant && item.variant && (
                      <span className="text-[10px] text-blue-600 font-medium block">
                        Variant: {item.variant.name}
                      </span>
                    )}
                    {receiptConfig.showModifiers &&
                      item.selectedModifiers &&
                      item.selectedModifiers.length > 0 && (
                        <div className="text-[10px] text-slate-500">
                          Modifiers: {item.selectedModifiers.map((m) => m.optionName).join(', ')}
                        </div>
                      )}
                    {receiptConfig.showItemNotes && item.notes && (
                      <div className="text-[10px] text-slate-400 italic">
                        Note: {item.notes}
                      </div>
                    )}
                  </td>
                  {receiptConfig.showItemQuantity && (
                    <td className="py-2 px-3 text-center font-bold text-slate-800">
                      {item.quantity}
                    </td>
                  )}
                  {receiptConfig.showUnitPrice && (
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {formatPaise(item.unitPricePaise)}
                    </td>
                  )}
                  {receiptConfig.showLineTotal && (
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatPaise(item.subtotalPaise)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation & Payment Summary */}
        <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-4 mb-6">
          {/* Left: Payment Info & Terms */}
          <div className="space-y-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-1.5">
              <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                <span className="font-bold text-slate-700 uppercase">Payment Summary</span>
                {receiptConfig.showPaymentStatus && (
                  <span
                    className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                      order.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : order.paymentStatus === 'partially_paid'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {order.paymentStatus.replace('_', ' ')}
                  </span>
                )}
              </div>

              {receiptConfig.showPaymentMethod && (
                <div className="flex justify-between text-slate-600">
                  <span>Method:</span>
                  <span className="font-semibold text-slate-900 uppercase">
                    {order.paymentMethod || 'CASH'}
                  </span>
                </div>
              )}

              {receiptConfig.showPaymentReference && order.paymentReference && (
                <div className="flex justify-between text-slate-600">
                  <span>Reference:</span>
                  <span className="font-mono text-slate-800">{order.paymentReference}</span>
                </div>
              )}

              {receiptConfig.showAmountPaid && (
                <div className="flex justify-between text-slate-600">
                  <span>Paid Amount:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatPaise(paidAmount)}
                  </span>
                </div>
              )}

              {receiptConfig.showBalanceDue && balanceDue > 0 && (
                <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-slate-200">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatPaise(balanceDue)}</span>
                </div>
              )}

              {receiptConfig.showChangeReturned && changeReturned > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200">
                  <span>Change Returned:</span>
                  <span className="font-mono">{formatPaise(changeReturned)}</span>
                </div>
              )}
            </div>

            {receiptConfig.showCustomDisclaimer && receiptConfig.customDisclaimer && (
              <p className="text-[10px] text-slate-400 italic">
                {receiptConfig.customDisclaimer}
              </p>
            )}
          </div>

          {/* Right: Subtotal, Tax Breakdown, Rounding & Grand Total */}
          <div className="space-y-2 text-xs">
            {receiptConfig.showSubtotal && (
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatPaise(order.subtotalPaise)}
                </span>
              </div>
            )}

            {receiptConfig.showDiscountDetails && order.discountPaise > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>
                  Discount {order.discountDescription ? `(${order.discountDescription})` : ''}:
                </span>
                <span className="font-mono">-{formatPaise(order.discountPaise)}</span>
              </div>
            )}

            {receiptConfig.showTaxBreakdown && (
              <>
                {receiptConfig.showCgst && (
                  <div className="flex justify-between text-slate-600">
                    <span>CGST ({settings?.cgstPct ?? 2.5}%):</span>
                    <span className="font-mono">{formatPaise(order.cgstPaise)}</span>
                  </div>
                )}

                {receiptConfig.showSgst && (
                  <div className="flex justify-between text-slate-600">
                    <span>SGST ({settings?.sgstPct ?? 2.5}%):</span>
                    <span className="font-mono">{formatPaise(order.sgstPaise)}</span>
                  </div>
                )}

                {receiptConfig.showIgst && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST (0.0%):</span>
                    <span className="font-mono">₹0.00</span>
                  </div>
                )}
              </>
            )}

            {receiptConfig.showRoundingAdjustment && order.roundingPaise !== 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Rounding Adjustment:</span>
                <span className="font-mono">
                  {order.roundingPaise > 0 ? '+' : ''}
                  {formatPaise(order.roundingPaise)}
                </span>
              </div>
            )}

            {receiptConfig.showGrandTotal && (
              <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-black text-slate-950 uppercase">Grand Total:</span>
                <span className="font-mono text-lg font-black text-blue-600">
                  {formatPaise(order.totalPaise)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer & Thank You */}
        {receiptConfig.showFooter && (
          <div className="border-t border-dashed border-slate-300 pt-4 text-center space-y-1.5">
            {receiptConfig.thankYouMessage && (
              <p className="text-slate-800 font-bold text-xs">
                {receiptConfig.thankYouMessage}
              </p>
            )}

            {receiptConfig.footerParagraph && (
              <p className="text-slate-600 text-[11px] max-w-lg mx-auto whitespace-pre-line leading-relaxed">
                {receiptConfig.footerParagraph}
              </p>
            )}

            {receiptConfig.showReturnVisitMessage && receiptConfig.returnVisitMessage && (
              <p className="text-blue-700 font-semibold text-[11px]">
                {receiptConfig.returnVisitMessage}
              </p>
            )}

            <div className="flex flex-wrap justify-center items-center gap-4 text-[11px] text-slate-500 pt-1">
              {receiptConfig.showWebsite && receiptConfig.website && (
                <span>Web: {receiptConfig.website}</span>
              )}
              {receiptConfig.showSocialHandle && receiptConfig.socialHandle && (
                <span>Follow: {receiptConfig.socialHandle}</span>
              )}
            </div>

            <p className="text-slate-400 text-[10px] pt-1">
              Powered by RestoHub Operating System
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ===================================================
     58 MM & 80 MM THERMAL RECEIPT FORMAT
     =================================================== */
  const is58mm = paperWidth === '58mm';

  return (
    <div
      id="printable-thermal-receipt"
      className={`${
        is58mm
          ? 'receipt-paper-58mm w-[230px] text-[10.5px] p-3'
          : 'receipt-paper-80mm w-[320px] text-[11.5px] p-4.5'
      } bg-white text-slate-950 font-mono leading-tight shadow-xl rounded-xs border-t-2 border-slate-300 flex flex-col items-center select-text transition-all`}
    >
      {isPreviewMode && (
        <div className="w-full mb-2 py-1 px-1.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[9.5px] font-bold text-center uppercase tracking-wider">
          Sample Order — Preview Only
        </div>
      )}

      {/* Optional Restaurant Logo */}
      {showLogo && (
        <img
          src={logoUrl}
          alt={displayName}
          className={`h-8 max-h-8 w-auto object-contain mb-1.5 grayscale ${logoAlignClass}`}
        />
      )}

      {/* Header Container */}
      <div className={`w-full flex flex-col ${headerAlignClass}`}>
        {receiptConfig.showRestaurantName && (
          <span className="font-black text-[13px] tracking-wider uppercase break-words w-full">
            {displayName}
          </span>
        )}

        {receiptConfig.headerTitle && (
          <span className="text-[10px] font-bold tracking-widest text-slate-700 uppercase mt-0.5">
            *** {receiptConfig.headerTitle} ***
          </span>
        )}

        {receiptConfig.subtitle && (
          <span className="text-[10px] text-slate-600 mt-0.5 break-words w-full">
            {receiptConfig.subtitle}
          </span>
        )}

        {receiptConfig.welcomeMessage && (
          <span className="text-[9.5px] text-slate-500 italic mt-0.5 break-words w-full">
            {receiptConfig.welcomeMessage}
          </span>
        )}

        {receiptConfig.showBranchName && branchName && (
          <span className="text-[10px] font-semibold text-slate-700 mt-0.5">
            {branchName}
          </span>
        )}

        {receiptConfig.showAddress && address && (
          <span className="text-[10px] text-slate-600 mt-0.5 break-words w-full leading-snug">
            {address}
          </span>
        )}

        {receiptConfig.showPhone && phone && (
          <span className="text-[10px] text-slate-600 mt-0.5">Tel: {phone}</span>
        )}

        {receiptConfig.showEmail && email && (
          <span className="text-[9.5px] text-slate-600 mt-0.5">Email: {email}</span>
        )}

        {receiptConfig.showGstin && gstin && (
          <span className="text-[10px] text-slate-800 font-bold mt-0.5">
            GSTIN: {gstin}
          </span>
        )}

        {receiptConfig.showFssai && fssai && (
          <span className="text-[9.5px] text-slate-600 mt-0.5">
            FSSAI Lic: {fssai}
          </span>
        )}
      </div>

      <div className="w-full border-t border-dashed border-slate-400 my-2" />

      {/* Invoice & Order Meta */}
      <div className="w-full space-y-0.5 text-[10px]">
        {receiptConfig.showInvoiceNumber && (
          <div className="flex justify-between">
            <span className="font-bold">INVOICE: {invoiceNumber}</span>
            {receiptConfig.showOrderDate && <span>{formattedDate}</span>}
          </div>
        )}

        {receiptConfig.showOrderNumber && (
          <div className="flex justify-between">
            <span>ORDER: {displayOrderNumber}</span>
            {receiptConfig.showOrderTime && <span>{formattedTime}</span>}
          </div>
        )}

        <div className="flex justify-between items-center">
          {receiptConfig.showTableNumber && order.tableName ? (
            <span className="uppercase font-bold text-slate-900">
              TABLE: {order.tableName}
            </span>
          ) : receiptConfig.showOrderType ? (
            <span className="uppercase font-bold text-slate-900">
              {order.orderType.replace('_', ' ').toUpperCase()}
            </span>
          ) : (
            <span />
          )}

          {receiptConfig.showOrderType && order.tableName && (
            <span className="uppercase text-[9.5px] text-slate-600">
              {order.orderType.toUpperCase()}
            </span>
          )}
        </div>

        {order.guestCount > 0 && order.orderType === 'dine_in' && (
          <div className="flex justify-between text-slate-600 text-[9.5px]">
            <span>Guests: {order.guestCount}</span>
            {receiptConfig.showWaiterName && order.waiterName && (
              <span>Server: {order.waiterName}</span>
            )}
          </div>
        )}

        {receiptConfig.showCashierName && (
          <div className="flex justify-between text-slate-600 text-[9.5px]">
            <span>Cashier: Counter 1</span>
          </div>
        )}

        {(receiptConfig.showCustomerName || receiptConfig.showCustomerPhone) &&
          (order.customerName || order.customerPhone) && (
            <div className="flex justify-between text-slate-600 text-[9.5px] pt-0.5 border-t border-dotted border-slate-200 mt-0.5">
              {receiptConfig.showCustomerName && order.customerName && (
                <span className="font-medium truncate max-w-[140px]">
                  Cust: {order.customerName}
                </span>
              )}
              {receiptConfig.showCustomerPhone && order.customerPhone && (
                <span>{order.customerPhone}</span>
              )}
            </div>
          )}
      </div>

      <div className="w-full border-t border-dashed border-slate-400 my-2" />

      {/* Items Table */}
      <div className="w-full space-y-1.5">
        <div className="flex justify-between font-bold text-[10px] border-b border-dashed border-slate-400 pb-1">
          <span className="flex-1">ITEM</span>
          {receiptConfig.showItemQuantity && (
            <span className={is58mm ? 'w-6 text-center shrink-0' : 'w-7 text-center shrink-0'}>
              QTY
            </span>
          )}
          {receiptConfig.showUnitPrice && (
            <span className={is58mm ? 'w-12 text-right shrink-0' : 'w-14 text-right shrink-0'}>
              PRICE
            </span>
          )}
          {receiptConfig.showLineTotal && (
            <span className={is58mm ? 'w-14 text-right shrink-0' : 'w-16 text-right shrink-0'}>
              TOTAL
            </span>
          )}
        </div>

        {order.items.map((item) => (
          <div key={item.cartItemId} className="space-y-0.5 pt-0.5">
            <div className="flex items-start justify-between gap-1">
              <span className="flex-1 break-words font-semibold leading-tight text-slate-950 pr-1">
                {item.menuItem.name}
              </span>
              {receiptConfig.showItemQuantity && (
                <span
                  className={`${
                    is58mm ? 'w-6' : 'w-7'
                  } text-center shrink-0 font-medium`}
                >
                  {item.quantity}
                </span>
              )}
              {receiptConfig.showUnitPrice && (
                <span
                  className={`${
                    is58mm ? 'w-12' : 'w-14'
                  } text-right shrink-0 text-slate-600`}
                >
                  {formatPaise(item.unitPricePaise)}
                </span>
              )}
              {receiptConfig.showLineTotal && (
                <span
                  className={`${
                    is58mm ? 'w-14' : 'w-16'
                  } text-right shrink-0 font-bold text-slate-950`}
                >
                  {formatPaise(item.subtotalPaise)}
                </span>
              )}
            </div>

            {receiptConfig.showVariant && item.variant && (
              <div className="text-[9.5px] text-slate-500 pl-1 leading-none">
                Option: {item.variant.name}
              </div>
            )}
            {receiptConfig.showModifiers &&
              item.selectedModifiers &&
              item.selectedModifiers.length > 0 && (
                <div className="text-[9px] text-slate-500 pl-1 leading-none">
                  + {item.selectedModifiers.map((m) => m.optionName).join(', ')}
                </div>
              )}
            {receiptConfig.showItemNotes && item.notes && (
              <div className="text-[9px] text-slate-500 italic pl-1 leading-none">
                Note: {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="w-full border-t border-dashed border-slate-400 my-2" />

      {/* Financial Calculation */}
      <div className="w-full space-y-1 text-[10px]">
        {receiptConfig.showSubtotal && (
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-bold">{formatPaise(order.subtotalPaise)}</span>
          </div>
        )}

        {receiptConfig.showDiscountDetails && order.discountPaise > 0 && (
          <div className="flex justify-between text-emerald-700 font-bold">
            <span>
              Discount{order.discountDescription ? ` (${order.discountDescription})` : ''}:
            </span>
            <span>-{formatPaise(order.discountPaise)}</span>
          </div>
        )}

        {receiptConfig.showTaxBreakdown && (
          <>
            {receiptConfig.showCgst && (
              <div className="flex justify-between text-slate-700">
                <span>CGST ({settings?.cgstPct ?? 2.5}%):</span>
                <span>{formatPaise(order.cgstPaise)}</span>
              </div>
            )}

            {receiptConfig.showSgst && (
              <div className="flex justify-between text-slate-700">
                <span>SGST ({settings?.sgstPct ?? 2.5}%):</span>
                <span>{formatPaise(order.sgstPaise)}</span>
              </div>
            )}

            {receiptConfig.showIgst && (
              <div className="flex justify-between text-slate-700">
                <span>IGST (0.0%):</span>
                <span>₹0.00</span>
              </div>
            )}
          </>
        )}

        {receiptConfig.showRoundingAdjustment && order.roundingPaise !== 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Rounding:</span>
            <span>
              {order.roundingPaise > 0 ? '+' : ''}
              {formatPaise(order.roundingPaise)}
            </span>
          </div>
        )}

        {receiptConfig.showGrandTotal && (
          <>
            <div className="w-full border-t-2 border-slate-950 my-1" />
            <div className="flex justify-between font-black text-xs">
              <span>GRAND TOTAL:</span>
              <span className="text-sm">{formatPaise(order.totalPaise)}</span>
            </div>
            <div className="w-full border-t border-slate-950 my-1" />
          </>
        )}

        {/* Payment Breakdown */}
        <div className="space-y-0.5 text-[9.5px]">
          {receiptConfig.showPaymentMethod && (
            <div className="flex justify-between">
              <span className="font-bold uppercase">
                Payment: {order.paymentMethod?.toUpperCase() || 'CASH'}
              </span>
              {receiptConfig.showPaymentStatus && (
                <span
                  className={`font-black uppercase ${
                    order.paymentStatus === 'paid'
                      ? 'text-emerald-700'
                      : order.paymentStatus === 'partially_paid'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {order.paymentStatus.replace('_', ' ')}
                </span>
              )}
            </div>
          )}

          {receiptConfig.showAmountPaid && (
            <div className="flex justify-between text-slate-700">
              <span>Amount Paid:</span>
              <span className="font-bold">{formatPaise(paidAmount)}</span>
            </div>
          )}

          {receiptConfig.showBalanceDue && balanceDue > 0 && (
            <div className="flex justify-between text-rose-700 font-bold">
              <span>Balance Due:</span>
              <span>{formatPaise(balanceDue)}</span>
            </div>
          )}

          {receiptConfig.showChangeReturned && changeReturned > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Change Returned:</span>
              <span>{formatPaise(changeReturned)}</span>
            </div>
          )}

          {receiptConfig.showPaymentReference && order.paymentReference && (
            <div className="text-[9px] text-slate-500">
              Ref: {order.paymentReference}
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      {receiptConfig.showFooter && (
        <>
          <div className="w-full border-t border-dashed border-slate-400 my-2" />
          <div className="w-full text-center space-y-1">
            {receiptConfig.thankYouMessage && (
              <span className="text-[10px] text-slate-800 font-bold break-words block w-full">
                {receiptConfig.thankYouMessage}
              </span>
            )}

            {receiptConfig.footerParagraph && (
              <span className="text-[9.5px] text-slate-600 break-words block w-full whitespace-pre-line leading-relaxed">
                {receiptConfig.footerParagraph}
              </span>
            )}

            {receiptConfig.showReturnVisitMessage && receiptConfig.returnVisitMessage && (
              <span className="text-[9px] text-blue-800 font-semibold break-words block w-full">
                {receiptConfig.returnVisitMessage}
              </span>
            )}

            {(receiptConfig.showWebsite && receiptConfig.website) ||
            (receiptConfig.showSocialHandle && receiptConfig.socialHandle) ? (
              <div className="text-[9px] text-slate-500 space-y-0.5 pt-0.5">
                {receiptConfig.showWebsite && receiptConfig.website && (
                  <div className="truncate">Web: {receiptConfig.website}</div>
                )}
                {receiptConfig.showSocialHandle && receiptConfig.socialHandle && (
                  <div className="truncate">Follow: {receiptConfig.socialHandle}</div>
                )}
              </div>
            ) : null}

            {receiptConfig.showCustomDisclaimer && receiptConfig.customDisclaimer && (
              <span className="text-[8.5px] text-slate-400 italic block mt-1 leading-tight">
                {receiptConfig.customDisclaimer}
              </span>
            )}

            <span className="text-[8.5px] text-slate-400 block pt-0.5">
              Powered by RestoHub Operating System
            </span>
          </div>
        </>
      )}
    </div>
  );
};
