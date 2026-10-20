import { Order, KOTTicket, Restaurant, Outlet, RestaurantSettings, PrintResult, PrinterConnectionType } from '../types';
import { generateReceiptText, generateKotText, generateEscPosBuffer, bufferToBase64 } from '../utils/escposGenerator';

class PrintService {
  private activeSerialPort: any = null;

  /**
   * Print a customer sales receipt directly to the configured receipt printer
   */
  async printReceipt(
    order: Order,
    settings: RestaurantSettings | null | undefined,
    restaurant: Restaurant | null | undefined,
    outlet: Outlet | null | undefined,
    options?: { copies?: number; isReprint?: boolean; customConfig?: import('../utils/receiptConfig').ReceiptConfig }
  ): Promise<PrintResult> {
    const customConfig = options?.customConfig;
    const paperWidth = customConfig?.paperWidth || settings?.receiptPaperWidth || '80mm';
    const printerName = settings?.receiptPrinterName || 'Cashier Receipt Printer';
    const connectionType: PrinterConnectionType = settings?.receiptConnectionType || 'local_agent';
    const copies = options?.copies || settings?.receiptCopies || settings?.printCopies || 1;
    const endpoint = settings?.receiptEndpoint || 'http://127.0.0.1:9100/print';
    const isReprint = Boolean(options?.isReprint);

    const jobId = `job-rec-${Date.now()}`;
    const plainText = generateReceiptText(order, settings, restaurant, outlet, paperWidth, customConfig);
    const escposBytes = generateEscPosBuffer(plainText, true, true);

    try {
      const result = await this.dispatchToPrinter({
        jobId,
        type: 'receipt',
        printerName,
        connectionType,
        endpoint,
        paperWidth,
        copies,
        plainText,
        escposBytes,
        orderId: order.id,
        orderNumber: order.orderNumber,
        isReprint,
      });
      return result;
    } catch (err: any) {
      console.error('Direct receipt printing failed:', err);
      return {
        success: false,
        jobId,
        printerName,
        connectionType,
        isSilent: false,
        message: `Failed to print receipt on ${printerName}`,
        error: err.message || 'Printer communication error',
      };
    }
  }

  /**
   * Print a kitchen order ticket (KOT) directly to the configured KOT printer
   */
  async printKOT(
    ticket: KOTTicket,
    settings: RestaurantSettings | null | undefined,
    restaurant: Restaurant | null | undefined,
    options?: { isReprint?: boolean }
  ): Promise<PrintResult> {
    const printerName = settings?.kotPrinterName || 'Kitchen KOT Printer';
    const connectionType: PrinterConnectionType = settings?.kotConnectionType || 'local_agent';
    const paperWidth = settings?.kotPaperWidth || '80mm';
    const copies = settings?.kotCopies || 1;
    const endpoint = settings?.kotEndpoint || 'http://127.0.0.1:9100/print';
    const isReprint = Boolean(options?.isReprint);

    const jobId = `job-kot-${Date.now()}`;
    const plainText = generateKotText(ticket, settings, restaurant, paperWidth);
    const escposBytes = generateEscPosBuffer(plainText, true, false);

    try {
      const result = await this.dispatchToPrinter({
        jobId,
        type: 'kot',
        printerName,
        connectionType,
        endpoint,
        paperWidth,
        copies,
        plainText,
        escposBytes,
        orderId: ticket.orderId,
        orderNumber: ticket.orderNumber,
        isReprint,
      });
      return result;
    } catch (err: any) {
      console.error('Direct KOT printing failed:', err);
      return {
        success: false,
        jobId,
        printerName,
        connectionType,
        isSilent: false,
        message: `Failed to print KOT on ${printerName}`,
        error: err.message || 'KOT printer communication error',
      };
    }
  }

  /**
   * Print hardware diagnostics test receipt
   */
  async printTest(
    printerName: string,
    paperWidth: '58mm' | '80mm' | 'a4',
    connectionType: PrinterConnectionType,
    endpoint: string = 'http://127.0.0.1:9100/print'
  ): Promise<PrintResult> {
    const jobId = `job-test-${Date.now()}`;
    const lines = [
      '================================',
      '      RESTOHUB PRINTER TEST     ',
      '================================',
      `Printer : ${printerName}`,
      `Format  : ${paperWidth.toUpperCase()}`,
      `Connect : ${connectionType.toUpperCase()}`,
      `Date    : ${new Date().toLocaleString('en-IN')}`,
      '--------------------------------',
      '12345678901234567890123456789012',
      'ABCDEFGHIJKLmnopqrstuvwxyz!@#$%^',
      '--------------------------------',
      'STATUS  : HARDWARE COMMUNICATION OK',
      '================================',
      '\n\n\n',
    ];
    const plainText = lines.join('\n');
    const escposBytes = generateEscPosBuffer(plainText, true, true);

    return this.dispatchToPrinter({
      jobId,
      type: 'test',
      printerName,
      connectionType,
      endpoint,
      paperWidth,
      copies: 1,
      plainText,
      escposBytes,
    });
  }

  /**
   * Health check for configured printer endpoint
   */
  async checkPrinterStatus(
    connectionType: PrinterConnectionType,
    endpoint: string = 'http://127.0.0.1:9100/print'
  ): Promise<{ online: boolean; message: string; details?: any }> {
    if (connectionType === 'browser') {
      return { online: true, message: 'Browser system print engine available' };
    }

    if (connectionType === 'web_serial') {
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        return { online: true, message: 'Web Serial hardware API available on this browser' };
      }
      return { online: false, message: 'Web Serial not supported on this browser (use Chrome or Edge)' };
    }

    if (connectionType === 'local_agent' || connectionType === 'network_escpos') {
      try {
        const pingUrl = endpoint.replace('/print', '/status');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(pingUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          return { online: true, message: 'Local print service is online and ready', details: data };
        }
        return {
          online: false,
          message: `Local print agent not responding at ${endpoint}. Please start the RestoHub print agent.`,
        };
      } catch (err: any) {
        return {
          online: false,
          message: `Unable to connect to print agent at ${endpoint}`,
        };
      }
    }

    return { online: false, message: 'Unknown printer connection type' };
  }

  /**
   * Internal routing to the selected hardware channel
   */
  private async dispatchToPrinter(params: {
    jobId: string;
    type: 'receipt' | 'kot' | 'test';
    printerName: string;
    connectionType: PrinterConnectionType;
    endpoint: string;
    paperWidth: '58mm' | '80mm' | 'a4';
    copies: number;
    plainText: string;
    escposBytes: Uint8Array;
    orderId?: string;
    orderNumber?: string;
    isReprint?: boolean;
  }): Promise<PrintResult> {
    const {
      jobId,
      type,
      printerName,
      connectionType,
      endpoint,
      paperWidth,
      copies,
      plainText,
      escposBytes,
    } = params;

    // 1. LOCAL ESC/POS PRINT AGENT (Silent, headless printing via local bridge)
    if (connectionType === 'local_agent' || connectionType === 'network_escpos') {
      const payload = {
        jobId,
        type,
        printerName,
        paperWidth,
        copies,
        plainText,
        escposBase64: bufferToBase64(escposBytes),
        timestamp: new Date().toISOString(),
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Print service responded with HTTP status ${response.status}`);
        }

        return {
          success: true,
          jobId,
          printerName,
          connectionType,
          isSilent: true,
          message: `Print request accepted by ${printerName} (${paperWidth})`,
        };
      } catch (fetchErr: any) {
        // If local agent isn't running or endpoint is unreachable
        const errMsg = fetchErr.name === 'AbortError'
          ? `Print agent timed out at ${endpoint}`
          : `Print service unreachable at ${endpoint}. Verify the RestoHub printer agent service is running on this machine.`;

        console.warn(`Local print service error (${endpoint}):`, fetchErr);

        return {
          success: false,
          jobId,
          printerName,
          connectionType,
          isSilent: false,
          message: `Could not send to ${printerName}`,
          error: errMsg,
        };
      }
    }

    // 2. DIRECT WEB SERIAL (Direct USB thermal printer in Chrome/Edge without any background service!)
    if (connectionType === 'web_serial') {
      if (typeof navigator === 'undefined' || !('serial' in navigator)) {
        return {
          success: false,
          jobId,
          printerName,
          connectionType,
          isSilent: false,
          message: 'Web Serial is not supported on this browser',
          error: 'Please use Chrome, Edge, or Opera to access USB serial printers directly.',
        };
      }

      try {
        let port = this.activeSerialPort;
        if (!port) {
          port = await (navigator as any).serial.requestPort();
          await port.open({ baudRate: 9600 });
          this.activeSerialPort = port;
        }

        const writer = port.writable.getWriter();
        await writer.write(escposBytes);
        writer.releaseLock();

        return {
          success: true,
          jobId,
          printerName,
          connectionType,
          isSilent: true,
          message: `Sent directly to USB thermal printer (${paperWidth}) via Web Serial`,
        };
      } catch (serialErr: any) {
        return {
          success: false,
          jobId,
          printerName,
          connectionType,
          isSilent: false,
          message: `Web Serial communication failed`,
          error: serialErr.message || 'Could not communicate with serial device',
        };
      }
    }

    // 3. BROWSER SYSTEM PRINT FALLBACK (Used only when connectionType === 'browser')
    if (connectionType === 'browser') {
      this.executeOffscreenBrowserPrint(plainText, paperWidth);
      return {
        success: true,
        jobId,
        printerName: 'Browser System Printer',
        connectionType: 'browser',
        isSilent: false,
        message: `Print job dispatched to system print dialog (${paperWidth})`,
      };
    }

    return {
      success: false,
      jobId,
      printerName,
      connectionType,
      isSilent: false,
      message: 'Unsupported connection type',
      error: `Unsupported connection type: ${connectionType}`,
    };
  }

  /**
   * Offscreen printing fallback without displaying any in-app modal
   */
  private executeOffscreenBrowserPrint(text: string, paperWidth: '58mm' | '80mm' | 'a4') {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    const widthMm = paperWidth === '58mm' ? '58mm' : paperWidth === '80mm' ? '80mm' : '210mm';
    const fontPx = paperWidth === '58mm' ? '11px' : '12px';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RestoHub Print</title>
          <style>
            @page {
              size: ${paperWidth === 'a4' ? 'A4 portrait' : `${widthMm} auto`};
              margin: ${paperWidth === 'a4' ? '10mm' : '0mm'};
            }
            body {
              font-family: monospace, Courier, monospace;
              font-size: ${fontPx};
              line-height: 1.25;
              margin: 0;
              padding: ${paperWidth === '58mm' ? '2mm' : '4mm'};
              color: #000;
              background: #fff;
              width: ${widthMm};
              white-space: pre-wrap;
              word-break: break-word;
            }
          </style>
        </head>
        <body>${escapeHtml(text)}</body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    }, 250);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const printService = new PrintService();
