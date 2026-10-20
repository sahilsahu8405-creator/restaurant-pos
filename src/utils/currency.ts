// Exact Paise-based Monetary Arithmetic Utilities
// 1 INR = 100 Paise. All money in RestoHub is stored as integer paise.

export function formatPaise(paise: number, currencySymbol: string = '₹'): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;
  
  // Format rupees with Indian Numbering System (e.g. 4,28,560)
  const rupeeString = rupees.toLocaleString('en-IN');
  
  if (remainingPaise === 0) {
    return `${isNegative ? '-' : ''}${currencySymbol}${rupeeString}`;
  }
  
  const paddedPaise = remainingPaise.toString().padStart(2, '0');
  return `${isNegative ? '-' : ''}${currencySymbol}${rupeeString}.${paddedPaise}`;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export interface BillCalculation {
  subtotalPaise: number;
  discountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalTaxPaise: number;
  roundingPaise: number;
  totalPaise: number;
}

/**
 * Calculates authoritative subtotal, discount, CGST, SGST, and final rounded total.
 * Standard Indian restaurant tax: 2.5% CGST + 2.5% SGST = 5.0% GST on food.
 */
export function calculateBill(
  subtotalPaise: number,
  discountPaise: number = 0,
  cgstPct: number = 2.5,
  sgstPct: number = 2.5
): BillCalculation {
  const safeDiscount = Math.min(Math.max(0, discountPaise), subtotalPaise);
  const taxablePaise = subtotalPaise - safeDiscount;

  // Exact integer calculation: (taxable * pct) / 100
  const cgstPaise = Math.round((taxablePaise * cgstPct) / 100);
  const sgstPaise = Math.round((taxablePaise * sgstPct) / 100);
  const totalTaxPaise = cgstPaise + sgstPaise;

  const rawTotalPaise = taxablePaise + totalTaxPaise;
  
  // Optional paise rounding to nearest rupee (50 paise boundary)
  const remainder = rawTotalPaise % 100;
  let roundingPaise = 0;
  if (remainder >= 50) {
    roundingPaise = 100 - remainder;
  } else if (remainder > 0) {
    roundingPaise = -remainder;
  }

  const totalPaise = rawTotalPaise + roundingPaise;

  return {
    subtotalPaise,
    discountPaise: safeDiscount,
    cgstPaise,
    sgstPaise,
    totalTaxPaise,
    roundingPaise,
    totalPaise,
  };
}
