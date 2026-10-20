import { Order, KOTTicket, Restaurant, Outlet, RestaurantSettings } from '../types';
import { formatPaise } from './currency';

/**
 * Formats ESC/POS raw bytes and aligned text for thermal receipt and KOT printers
 */

// Helper to pad or justify strings across fixed column widths
export function justifyText(left: string, right: string, width: number): string {
  const total = left.length + right.length;
  if (total >= width) {
    return left.slice(0, width - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(width - total) + right;
}

export function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const leftPad = Math.floor((width - text.length) / 2);
  return ' '.repeat(leftPad) + text;
}

export function dividerLine(width: number, char: string = '-'): string {
  return char.repeat(width);
}

export function wrapText(text: string, maxWidth: number): string[] {
  if (text.length <= maxWidth) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + (current ? ' ' : '') + word).length <= maxWidth) {
      current += (current ? ' ' : '') + word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

import { ReceiptConfig, getEffectiveReceiptConfig } from './receiptConfig';

export function alignText(text: string, width: number, align: 'left' | 'center' | 'right' = 'center'): string {
  if (text.length >= width) return text.slice(0, width);
  if (align === 'left') {
    return text.padEnd(width, ' ');
  } else if (align === 'right') {
    return text.padStart(width, ' ');
  }
  return centerText(text, width);
}

/**
 * Generate formatted text receipt using saved receipt configuration
 */
export function generateReceiptText(
  order: Order,
  settings?: RestaurantSettings | null,
  restaurant?: Restaurant | null,
  outlet?: Outlet | null,
  paperWidth: '58mm' | '80mm' | 'a4' = '80mm',
  customConfig?: ReceiptConfig | null
): string {
  const config = customConfig || getEffectiveReceiptConfig(settings, outlet?.id);
  const width = paperWidth === '58mm' ? 32 : 48;
  const lines: string[] = [];

  const rawOrderNum = order.orderNumber.replace(/[^0-9]/g, '') || order.orderNumber;
  const invoiceNumber = `${settings?.invoicePrefix || 'INV-'}${rawOrderNum}`;
  const displayOrderNumber = order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`;

  const paidAmount = order.paidAmountPaise !== undefined
    ? order.paidAmountPaise
    : (order.paymentStatus === 'paid' ? order.totalPaise : 0);
  const balanceDue = Math.max(0, order.totalPaise - paidAmount);

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

  const headerAlign = config.headerAlignment || 'center';

  // 1. Business Identity & Header
  const displayName = (config.customDisplayName?.trim() || restaurant?.name || 'RESTOHUB RESTAURANT').toUpperCase();
  if (config.showRestaurantName) {
    lines.push(alignText(displayName, width, headerAlign));
  }

  if (config.headerTitle) {
    lines.push(alignText(`*** ${config.headerTitle.toUpperCase()} ***`, width, headerAlign));
  }

  if (config.subtitle) {
    const subLines = wrapText(config.subtitle, width);
    subLines.forEach((l) => lines.push(alignText(l, width, headerAlign)));
  }

  if (config.welcomeMessage) {
    const welLines = wrapText(config.welcomeMessage, width);
    welLines.forEach((l) => lines.push(alignText(l, width, headerAlign)));
  }

  if (config.showBranchName && outlet?.name) {
    lines.push(alignText(outlet.name, width, headerAlign));
  }

  if (config.showAddress && outlet?.address) {
    const addrLines = wrapText(outlet.address, width);
    addrLines.forEach((l) => lines.push(alignText(l, width, headerAlign)));
  }

  const phone = outlet?.phone || restaurant?.primaryPhone || settings?.primaryPhone;
  if (config.showPhone && phone) {
    lines.push(alignText(`Tel: ${phone}`, width, headerAlign));
  }

  const email = outlet?.email || restaurant?.businessEmail;
  if (config.showEmail && email) {
    lines.push(alignText(`Email: ${email}`, width, headerAlign));
  }

  const gstin = outlet?.gstin || restaurant?.gstin || settings?.gstin;
  if (config.showGstin && gstin) {
    lines.push(alignText(`GSTIN: ${gstin}`, width, headerAlign));
  }

  const fssai = outlet?.fssaiLicense || restaurant?.fssaiLicense || settings?.fssaiLicense;
  if (config.showFssai && fssai) {
    lines.push(alignText(`FSSAI Lic: ${fssai}`, width, headerAlign));
  }

  lines.push(dividerLine(width, '='));

  // 2. Order & Invoice Info
  if (config.showInvoiceNumber && config.showOrderDate) {
    lines.push(justifyText(`INVOICE: ${invoiceNumber}`, formattedDate, width));
  } else if (config.showInvoiceNumber) {
    lines.push(`INVOICE: ${invoiceNumber}`);
  } else if (config.showOrderDate) {
    lines.push(`DATE: ${formattedDate}`);
  }

  if (config.showOrderNumber && config.showOrderTime) {
    lines.push(justifyText(`ORDER: ${displayOrderNumber}`, formattedTime, width));
  } else if (config.showOrderNumber) {
    lines.push(`ORDER: ${displayOrderNumber}`);
  } else if (config.showOrderTime) {
    lines.push(`TIME: ${formattedTime}`);
  }

  const channel = config.showTableNumber && order.tableName
    ? `TABLE: ${order.tableName}`
    : config.showOrderType
    ? order.orderType.replace('_', ' ').toUpperCase()
    : '';

  if (channel || config.showOrderType) {
    const rightType = config.showOrderType ? order.orderType.toUpperCase() : '';
    lines.push(justifyText(channel, rightType, width));
  }

  if (order.guestCount > 0 && order.orderType === 'dine_in') {
    const serverStr = config.showWaiterName && order.waiterName ? `Server: ${order.waiterName}` : '';
    lines.push(justifyText(`Guests: ${order.guestCount}`, serverStr, width));
  } else if (config.showWaiterName && order.waiterName) {
    lines.push(`Server: ${order.waiterName}`);
  }

  if (config.showCashierName) {
    lines.push(`Cashier: Counter 1`);
  }

  if ((config.showCustomerName || config.showCustomerPhone) && (order.customerName || order.customerPhone)) {
    const custName = config.showCustomerName && order.customerName ? `Cust: ${order.customerName}` : '';
    const custPhone = config.showCustomerPhone && order.customerPhone ? order.customerPhone : '';
    lines.push(justifyText(custName, custPhone, width));
  }

  lines.push(dividerLine(width, '-'));

  const cur = 'Rs.';

  // 3. Item Table
  if (width === 32) {
    // 58 mm layout
    const showQty = config.showItemQuantity;
    const showPrice = config.showUnitPrice;
    const showTotal = config.showLineTotal;

    const colHeaderRight = `${showQty ? 'QT ' : ''}${showPrice ? ' RATE ' : ''}${showTotal ? ' TOTAL' : ''}`.trim();
    lines.push(justifyText('ITEM', colHeaderRight, width));
    lines.push(dividerLine(width, '-'));

    order.items.forEach((item) => {
      const parts: string[] = [];
      if (showQty) parts.push(item.quantity.toString().padStart(2));
      if (showPrice) parts.push(formatPaise(item.unitPricePaise, cur).padStart(6));
      if (showTotal) parts.push(formatPaise(item.subtotalPaise, cur).padStart(7));
      const rightCol = parts.join(' ');

      const itemMaxLen = Math.max(10, width - rightCol.length - 1);
      const nameLines = wrapText(item.menuItem.name, itemMaxLen);
      lines.push(justifyText(nameLines[0], rightCol, width));
      for (let i = 1; i < nameLines.length; i++) {
        lines.push(nameLines[i]);
      }
      if (config.showVariant && item.variant) {
        lines.push(` (${item.variant.name})`);
      }
      if (config.showModifiers && item.selectedModifiers && item.selectedModifiers.length > 0) {
        lines.push(` +${item.selectedModifiers.map((m) => m.optionName).join(',')}`);
      }
      if (config.showItemNotes && item.notes) {
        lines.push(` Note: ${item.notes}`);
      }
    });
  } else {
    // 80 mm layout
    const showQty = config.showItemQuantity;
    const showPrice = config.showUnitPrice;
    const showTotal = config.showLineTotal;

    const colHeaderRight = `${showQty ? 'QTY   ' : ''}${showPrice ? '  PRICE   ' : ''}${showTotal ? '  TOTAL' : ''}`.trim();
    lines.push(justifyText('ITEM', colHeaderRight, width));
    lines.push(dividerLine(width, '-'));

    order.items.forEach((item) => {
      const parts: string[] = [];
      if (showQty) parts.push(item.quantity.toString().padStart(4));
      if (showPrice) parts.push(formatPaise(item.unitPricePaise, cur).padStart(9));
      if (showTotal) parts.push(formatPaise(item.subtotalPaise, cur).padStart(10));
      const rightCol = parts.join(' ');

      const itemMaxLen = Math.max(16, width - rightCol.length - 1);
      const nameLines = wrapText(item.menuItem.name, itemMaxLen);
      lines.push(justifyText(nameLines[0], rightCol, width));
      for (let i = 1; i < nameLines.length; i++) {
        lines.push(nameLines[i]);
      }
      if (config.showVariant && item.variant) {
        lines.push(`  Option: ${item.variant.name}`);
      }
      if (config.showModifiers && item.selectedModifiers && item.selectedModifiers.length > 0) {
        lines.push(`  + ${item.selectedModifiers.map((m) => m.optionName).join(', ')}`);
      }
      if (config.showItemNotes && item.notes) {
        lines.push(`  Note: ${item.notes}`);
      }
    });
  }

  lines.push(dividerLine(width, '-'));

  // 4. Financial Calculations
  if (config.showSubtotal) {
    lines.push(justifyText('Subtotal:', formatPaise(order.subtotalPaise, cur), width));
  }
  if (config.showDiscountDetails && order.discountPaise > 0) {
    const discLabel = order.discountDescription ? `Discount (${order.discountDescription}):` : 'Discount:';
    lines.push(justifyText(discLabel, `-${formatPaise(order.discountPaise, cur)}`, width));
  }
  if (config.showTaxBreakdown) {
    if (config.showCgst) {
      lines.push(justifyText(`CGST (${settings?.cgstPct ?? 2.5}%):`, formatPaise(order.cgstPaise, cur), width));
    }
    if (config.showSgst) {
      lines.push(justifyText(`SGST (${settings?.sgstPct ?? 2.5}%):`, formatPaise(order.sgstPaise, cur), width));
    }
    if (config.showIgst) {
      lines.push(justifyText('IGST (0.0%):', 'Rs.0', width));
    }
  }
  if (config.showRoundingAdjustment && order.roundingPaise !== 0) {
    const sign = order.roundingPaise > 0 ? '+' : '';
    lines.push(justifyText('Round Off:', `${sign}${formatPaise(order.roundingPaise, cur)}`, width));
  }

  if (config.showGrandTotal) {
    lines.push(dividerLine(width, '='));
    lines.push(justifyText('GRAND TOTAL:', formatPaise(order.totalPaise, cur), width));
    lines.push(dividerLine(width, '='));
  }

  // 5. Payment Details
  if (config.showPaymentMethod || config.showPaymentStatus) {
    const pMethod = config.showPaymentMethod ? `PAYMENT: ${order.paymentMethod?.toUpperCase() || 'CASH'}` : '';
    const pStatus = config.showPaymentStatus ? order.paymentStatus.toUpperCase() : '';
    lines.push(justifyText(pMethod, pStatus, width));
  }
  if (config.showAmountPaid) {
    lines.push(justifyText('Amount Paid:', formatPaise(paidAmount, cur), width));
  }
  if (config.showBalanceDue && balanceDue > 0) {
    lines.push(justifyText('BALANCE DUE:', formatPaise(balanceDue, cur), width));
  }
  if (config.showPaymentReference && order.paymentReference) {
    lines.push(justifyText('Payment Ref:', order.paymentReference, width));
  }

  // 6. Custom Footer & Thank-you
  if (config.showFooter) {
    lines.push(dividerLine(width, '-'));

    if (config.thankYouMessage) {
      const thankLines = wrapText(config.thankYouMessage, width);
      thankLines.forEach((l) => lines.push(centerText(l, width)));
    }

    if (config.footerParagraph) {
      // Split by newline and wrap each paragraph
      const paragraphs = config.footerParagraph.split('\n');
      paragraphs.forEach((p) => {
        if (p.trim()) {
          const pLines = wrapText(p.trim(), width);
          pLines.forEach((l) => lines.push(centerText(l, width)));
        }
      });
    }

    if (config.showReturnVisitMessage && config.returnVisitMessage) {
      const rvLines = wrapText(config.returnVisitMessage, width);
      rvLines.forEach((l) => lines.push(centerText(l, width)));
    }

    if (config.showWebsite && config.website) {
      lines.push(centerText(`Web: ${config.website}`, width));
    }

    if (config.showSocialHandle && config.socialHandle) {
      lines.push(centerText(`Follow: ${config.socialHandle}`, width));
    }

    if (config.showCustomDisclaimer && config.customDisclaimer) {
      const discLines = wrapText(config.customDisclaimer, width);
      discLines.forEach((l) => lines.push(centerText(l, width)));
    }

    lines.push(centerText('Powered by RestoHub Operating System', width));
  }

  lines.push('\n\n\n'); // Feed lines for tear
  return lines.join('\n');
}

/**
 * Generate formatted KOT ticket text
 */
export function generateKotText(
  ticket: KOTTicket,
  settings?: RestaurantSettings | null,
  restaurant?: Restaurant | null,
  paperWidth: '58mm' | '80mm' = '80mm'
): string {
  const width = paperWidth === '58mm' ? 32 : 48;
  const lines: string[] = [];

  const formattedDate = new Date(ticket.createdAt).toLocaleDateString('en-IN');
  const formattedTime = new Date(ticket.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  lines.push(centerText((restaurant?.name || 'RESTOHUB').toUpperCase(), width));
  lines.push(centerText('*** KITCHEN ORDER TICKET ***', width));
  lines.push(centerText(`STATION: ${ticket.stationName.toUpperCase()}`, width));
  lines.push(dividerLine(width, '='));

  const typeBadge = ticket.ticketType === 'incremental' ? '[ADD-ON TICKET]' : '[NEW ORDER]';
  lines.push(justifyText(`TICKET: ${ticket.kotNumber}`, typeBadge, width));
  lines.push(justifyText(`TABLE: ${ticket.tableNumber}`, `ORDER: ${ticket.orderNumber}`, width));
  lines.push(justifyText(formattedDate, formattedTime, width));

  lines.push(dividerLine(width, '-'));
  lines.push(justifyText('QTY', 'ITEM DETAILS', width));
  lines.push(dividerLine(width, '-'));

  ticket.items.forEach((item) => {
    const qtyPrefix = `${item.quantity}x  `;
    const maxItemWidth = Math.max(12, width - qtyPrefix.length);
    const nameLines = wrapText(item.menuItem.name.toUpperCase(), maxItemWidth);
    lines.push(`${qtyPrefix}${nameLines[0]}`);
    for (let i = 1; i < nameLines.length; i++) {
      lines.push(`    ${nameLines[i]}`);
    }
    if (item.variant) {
      lines.push(`    Portion: ${item.variant.name}`);
    }
    if (item.selectedModifiers && item.selectedModifiers.length > 0) {
      lines.push(`    + ${item.selectedModifiers.map((m) => m.optionName).join(', ')}`);
    }
    if (item.notes) {
      const noteLines = wrapText(`NOTE: ${item.notes.toUpperCase()}`, width - 4);
      noteLines.forEach((nl) => lines.push(`    *** ${nl} ***`));
    }
  });

  lines.push(dividerLine(width, '='));
  lines.push(centerText('-- END OF KITCHEN TICKET --', width));
  lines.push('\n\n\n');

  return lines.join('\n');
}

/**
 * Generate ESC/POS Binary Buffer (Uint8Array)
 * Standard ESC/POS commands:
 * ESC @ (Init)
 * ESC a (Align)
 * ESC ! (Font style/size)
 * GS V (Cut)
 * ESC p (Cash drawer kick)
 */
export function generateEscPosBuffer(plainText: string, cutPaper: boolean = true, kickDrawer: boolean = false): Uint8Array {
  const bytes: number[] = [];

  // ESC @: Initialize printer
  bytes.push(0x1b, 0x40);

  // Optional kick drawer before receipt
  if (kickDrawer) {
    bytes.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
  }

  // Convert string to bytes (ASCII / CP437 standard POS codepage)
  for (let i = 0; i < plainText.length; i++) {
    const code = plainText.charCodeAt(i);
    if (code === 8377) {
      // Indian Rupee sign '₹' fallback to 'Rs.'
      bytes.push(0x52, 0x73, 0x2e);
    } else if (code === 10) {
      // Line feed LF
      bytes.push(0x0a);
    } else if (code <= 127) {
      bytes.push(code);
    } else {
      bytes.push(0x20); // space fallback for unknown unicode
    }
  }

  // Feed 4 lines
  bytes.push(0x1b, 0x64, 0x04);

  // GS V 66 0: Partial cut with paper feed
  if (cutPaper) {
    bytes.push(0x1d, 0x56, 0x42, 0x00);
  }

  return new Uint8Array(bytes);
}

/**
 * Convert Uint8Array to base64 string for JSON transfer
 */
export function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}
