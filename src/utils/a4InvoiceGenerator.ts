import { Order, Outlet, Restaurant, RestaurantSettings } from '../types';
import { formatPaise } from './currency';
import { ReceiptConfig, getEffectiveReceiptConfig } from './receiptConfig';

// Helper to convert number to words (Indian numbering system: Lakhs, Crores)
function numberToWordsIndian(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = Math.floor(num)) === 0) return 'Zero';

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  }

  return inWords(num).trim() + ' Rupees Only';
}

/**
 * Generates an executive, print-perfect A4 Restaurant Tax Invoice HTML
 */
export function generateA4InvoiceHtml(
  order: Order,
  settings?: RestaurantSettings | null,
  restaurant?: Restaurant | null,
  outlet?: Outlet | null,
  customConfig?: ReceiptConfig | null
): string {
  const config = customConfig || getEffectiveReceiptConfig(settings, outlet?.id);

  // Business Information
  const displayName = config.customDisplayName?.trim() || restaurant?.name || 'RESTOHUB RESTAURANT';
  const logoUrl = config.showLogo && (config.logoUrl?.trim() || restaurant?.logoUrl);
  const branchName = outlet?.name || 'Main Branch';
  const address = outlet?.address || restaurant?.legalName || '';
  const phone = outlet?.phone || restaurant?.primaryPhone || settings?.primaryPhone || '';
  const email = outlet?.email || restaurant?.businessEmail || '';
  const gstin = outlet?.gstin || restaurant?.gstin || settings?.gstin || '';
  const fssai = outlet?.fssaiLicense || restaurant?.fssaiLicense || settings?.fssaiLicense || '';

  // Invoice numbers
  const rawOrderNum = order.orderNumber.replace(/[^0-9]/g, '') || order.orderNumber;
  const invoiceNumber = `${settings?.invoicePrefix || 'INV-'}${rawOrderNum}`;
  const displayOrderNumber = order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`;

  // Date and Time
  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const invoiceTime = new Date(order.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Amounts
  const paidAmountPaise = order.paidAmountPaise !== undefined
    ? order.paidAmountPaise
    : (order.paymentStatus === 'paid' ? order.totalPaise : 0);
  const balanceDuePaise = Math.max(0, order.totalPaise - paidAmountPaise);
  const totalRupees = Math.round(order.totalPaise / 100);
  const amountInWords = numberToWordsIndian(totalRupees);

  // Items rows HTML
  const itemsHtml = order.items.map((item, index) => {
    const ratePaise = item.variant
      ? item.variant.pricePaise
      : item.menuItem.basePricePaise;
    const rateFormatted = formatPaise(ratePaise);
    const amountFormatted = formatPaise(item.subtotalPaise);
    const hsn = (item.menuItem as any).hsnCode || '996331';
    const taxRate = (item.menuItem.cgstPct || 2.5) + (item.menuItem.sgstPct || 2.5);

    return `
      <tr>
        <td style="text-align: center; color: #6b7280; font-size: 11px;">${index + 1}</td>
        <td>
          <div style="font-weight: 700; color: #111827; font-size: 13px;">${item.menuItem.name}</div>
          ${item.variant ? `<div style="font-size: 11px; color: #4b5563; font-style: italic;">Option: ${item.variant.name}</div>` : ''}
          ${item.notes ? `<div style="font-size: 10px; color: #b45309;">Note: ${item.notes}</div>` : ''}
        </td>
        <td style="text-align: center; color: #4b5563; font-size: 11px; font-family: monospace;">${hsn}</td>
        <td style="text-align: right; color: #374151; font-size: 12px; font-family: monospace;">${rateFormatted}</td>
        <td style="text-align: center; font-weight: 700; color: #111827; font-size: 13px;">${item.quantity}</td>
        <td style="text-align: center; color: #4b5563; font-size: 11px;">${taxRate}%</td>
        <td style="text-align: right; font-weight: 700; color: #111827; font-size: 13px; font-family: monospace;">${amountFormatted}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Tax Invoice - ${invoiceNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: #ffffff;
            }
            .no-print {
              display: none !important;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1f2937;
            background: #ffffff;
            margin: 0;
            padding: 15px;
            font-size: 12px;
            line-height: 1.4;
          }
          .invoice-card {
            width: 100%;
            max-width: 185mm;
            margin: 0 auto;
            background: #ffffff;
          }
          /* Header */
          .header-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 14px;
            border-bottom: 2px solid #111827;
            margin-bottom: 14px;
          }
          .restaurant-info {
            max-width: 60%;
          }
          .restaurant-title {
            font-size: 24px;
            font-weight: 900;
            color: #111827;
            letter-spacing: -0.5px;
            text-transform: uppercase;
            margin: 0 0 4px 0;
          }
          .branch-name {
            font-size: 13px;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 4px;
          }
          .address-line {
            font-size: 11px;
            color: #4b5563;
            margin-bottom: 2px;
            line-height: 1.35;
          }
          .tax-badges {
            margin-top: 6px;
            font-size: 11px;
            color: #111827;
            font-weight: 600;
          }
          .badge-box {
            display: inline-block;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
            margin-right: 6px;
            margin-top: 2px;
          }
          /* Invoice Meta Box */
          .meta-box {
            text-align: right;
            min-width: 180px;
          }
          .tax-invoice-tag {
            display: inline-block;
            background: #111827;
            color: #ffffff;
            font-weight: 900;
            font-size: 13px;
            text-transform: uppercase;
            padding: 5px 12px;
            border-radius: 6px;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          .meta-row {
            font-size: 11px;
            color: #4b5563;
            margin-bottom: 3px;
          }
          .meta-row strong {
            color: #111827;
            font-weight: 700;
          }
          /* Table Information Sub-header */
          .order-details-bar {
            display: flex;
            justify-content: space-between;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 14px;
            font-size: 11px;
          }
          .order-details-bar span strong {
            color: #111827;
            font-size: 12px;
          }
          /* Items Table */
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          table.items-table th {
            background: #f3f4f6;
            color: #111827;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            border-top: 1.5px solid #111827;
            border-bottom: 1.5px solid #111827;
          }
          table.items-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: middle;
          }
          /* Summary Footer Section */
          .summary-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-top: 10px;
          }
          .summary-left {
            flex: 1;
            padding-right: 15px;
          }
          .amount-words-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 10px;
          }
          .amount-words-title {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .amount-words-text {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
          }
          .tax-breakdown-table {
            width: 100%;
            font-size: 10px;
            border-collapse: collapse;
            margin-top: 6px;
          }
          .tax-breakdown-table th {
            text-align: left;
            padding: 3px 6px;
            background: #f1f5f9;
            color: #475569;
          }
          .tax-breakdown-table td {
            padding: 3px 6px;
            border-bottom: 1px solid #e2e8f0;
          }
          /* Summary Right - Totals */
          .summary-right {
            width: 240px;
          }
          .calc-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .calc-table td {
            padding: 4px 0;
            color: #4b5563;
          }
          .calc-table td.val {
            text-align: right;
            font-weight: 600;
            color: #111827;
            font-family: monospace;
          }
          .grand-total-row {
            background: #111827;
            color: #ffffff;
            border-radius: 6px;
            padding: 10px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
          }
          .grand-total-label {
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .grand-total-val {
            font-size: 20px;
            font-weight: 900;
            font-family: monospace;
          }
          /* Payment details */
          .payment-badge-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-top: 1px dashed #d1d5db;
            margin-top: 6px;
            font-size: 11px;
          }
          .paid-tag {
            background: #dcfce7;
            color: #15803d;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            font-size: 10px;
          }
          /* Sign & Legal */
          .legal-footer {
            margin-top: 25px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 10px;
            color: #6b7280;
          }
          .legal-notes {
            max-width: 65%;
            line-height: 1.4;
          }
          .signature-box {
            text-align: right;
            min-width: 150px;
          }
          .sig-line {
            width: 140px;
            border-top: 1px solid #9ca3af;
            margin-bottom: 4px;
            margin-left: auto;
          }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <!-- 1. Header & Identity -->
          <div class="header-grid">
            <div class="restaurant-info">
              ${logoUrl ? `<img src="${logoUrl}" alt="${displayName}" style="max-height: 48px; max-width: 180px; margin-bottom: 6px; object-contain;" />` : ''}
              <h1 class="restaurant-title">${displayName}</h1>
              ${branchName ? `<div class="branch-name">${branchName}</div>` : ''}
              ${address ? `<div class="address-line">${address}</div>` : ''}
              ${phone ? `<div class="address-line">Phone: <strong>${phone}</strong></div>` : ''}
              ${email ? `<div class="address-line">Email: ${email}</div>` : ''}
              <div class="tax-badges">
                ${gstin ? `<span class="badge-box">GSTIN: <strong>${gstin}</strong></span>` : ''}
                ${fssai ? `<span class="badge-box">FSSAI Lic: <strong>${fssai}</strong></span>` : ''}
              </div>
            </div>

            <div class="meta-box">
              <div class="tax-invoice-tag">${config.headerTitle || 'TAX INVOICE'}</div>
              <div class="meta-row">Invoice No: <strong>${invoiceNumber}</strong></div>
              <div class="meta-row">Order ID: <strong>${displayOrderNumber}</strong></div>
              <div class="meta-row">Date: <strong>${invoiceDate}</strong></div>
              <div class="meta-row">Time: <strong>${invoiceTime}</strong></div>
              <div class="meta-row">Order Type: <strong style="text-transform: uppercase;">${order.orderType.replace('_', ' ')}</strong></div>
            </div>
          </div>

          <!-- 2. Dining / Table Information Bar -->
          <div class="order-details-bar">
            <span>Table: <strong>${order.tableName || 'Takeaway Desk'}</strong></span>
            <span>Guests: <strong>${order.guestCount || 1} Person(s)</strong></span>
            <span>Server / Waiter: <strong>${order.waiterName || 'Staff'}</strong></span>
            <span>Cashier: <strong>Cashier Desk</strong></span>
          </div>

          <!-- 3. Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="text-align: left;">Item Description</th>
                <th style="width: 75px; text-align: center;">HSN/SAC</th>
                <th style="width: 75px; text-align: right;">Rate</th>
                <th style="width: 50px; text-align: center;">Qty</th>
                <th style="width: 60px; text-align: center;">Tax %</th>
                <th style="width: 85px; text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- 4. Summary & Calculations -->
          <div class="summary-section">
            <div class="summary-left">
              <div class="amount-words-box">
                <div class="amount-words-title">Amount Chargeable (in words)</div>
                <div class="amount-words-text">${amountInWords}</div>
              </div>

              <!-- GST Breakdown -->
              <table class="tax-breakdown-table">
                <thead>
                  <tr>
                    <th>Tax Type</th>
                    <th style="text-align: right;">Rate %</th>
                    <th style="text-align: right;">Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CGST (Central Tax)</td>
                    <td style="text-align: right;">2.5%</td>
                    <td style="text-align: right; font-family: monospace;">${formatPaise(order.cgstPaise)}</td>
                  </tr>
                  <tr>
                    <td>SGST (State Tax)</td>
                    <td style="text-align: right;">2.5%</td>
                    <td style="text-align: right; font-family: monospace;">${formatPaise(order.sgstPaise)}</td>
                  </tr>
                </tbody>
              </table>

              <div style="margin-top: 10px; font-size: 11px; color: #4b5563;">
                ${config.thankYouMessage || 'Thank you for dining with us! We look forward to serving you again.'}
              </div>
            </div>

            <div class="summary-right">
              <table class="calc-table">
                <tr>
                  <td>Subtotal:</td>
                  <td class="val">${formatPaise(order.subtotalPaise)}</td>
                </tr>
                ${order.discountPaise > 0 ? `
                  <tr>
                    <td style="color: #059669;">Discount:</td>
                    <td class="val" style="color: #059669;">-${formatPaise(order.discountPaise)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td>CGST (2.5%):</td>
                  <td class="val">${formatPaise(order.cgstPaise)}</td>
                </tr>
                <tr>
                  <td>SGST (2.5%):</td>
                  <td class="val">${formatPaise(order.sgstPaise)}</td>
                </tr>
                ${order.roundingPaise !== 0 ? `
                  <tr>
                    <td>Round Off:</td>
                    <td class="val">${order.roundingPaise > 0 ? '+' : ''}${formatPaise(order.roundingPaise)}</td>
                  </tr>
                ` : ''}
              </table>

              <!-- Prominent Grand Total -->
              <div class="grand-total-row">
                <span class="grand-total-label">Grand Total</span>
                <span class="grand-total-val">${formatPaise(order.totalPaise)}</span>
              </div>

              <!-- Settlement Details -->
              <div class="payment-badge-row">
                <span>Payment Mode: <strong>${(order.paymentMethod || 'CASH').toUpperCase()}</strong></span>
                <span class="paid-tag">${order.paymentStatus === 'paid' ? 'PAID' : 'DUE'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #4b5563; margin-top: 3px;">
                <span>Amount Paid:</span>
                <span style="font-family: monospace; font-weight: 700; color: #111827;">${formatPaise(paidAmountPaise)}</span>
              </div>
              ${balanceDuePaise > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #b45309; font-weight: 700; margin-top: 3px;">
                  <span>Balance Due:</span>
                  <span style="font-family: monospace;">${formatPaise(balanceDuePaise)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- 5. Legal Disclaimer & Authorization -->
          <div class="legal-footer">
            <div class="legal-notes">
              <div>* This is a computer generated tax invoice and does not require a physical signature.</div>
              <div>* All food and beverage taxes are subject to local state and central government regulations.</div>
              <div style="margin-top: 4px; font-weight: 600; color: #374151;">Powered by RestoHub Restaurant Operating System</div>
            </div>
            <div class="signature-box">
              <div class="sig-line"></div>
              <div>For <strong>${displayName}</strong></div>
              <div style="color: #9ca3af; font-size: 9px;">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
