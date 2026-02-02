const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const logger = require('../utils/logger');

class PrinterService {
  constructor() {
    this.printers = new Map();
    this.printerNames = {
      'kiosk-1': process.env.PRINTER_KIOSK_1 || 'kiosk1-printer',
      'kiosk-2': process.env.PRINTER_KIOSK_2 || 'kiosk2-printer',
    };
  }

  // Initialize printer for specific device
  async initializePrinter(deviceId) {
    try {
      const printerName = this.printerNames[deviceId];
      if (!printerName) {
        throw new Error(`No printer configured for device: ${deviceId}`);
      }

      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: `printer:${printerName}`,
        characterSet: 'PC858_EURO',
        removeSpecialCharacters: false,
        lineCharacter: '=',
        options: {
          timeout: 5000,
        },
      });

      this.printers.set(deviceId, printer);
      logger.info(`Printer initialized for ${deviceId}: ${printerName}`);

      return { success: true, deviceId, printerName };
    } catch (error) {
      logger.error(`Failed to initialize printer for ${deviceId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Get or initialize printer
  async getPrinter(deviceId) {
    if (!this.printers.has(deviceId)) {
      await this.initializePrinter(deviceId);
    }
    return this.printers.get(deviceId);
  }

  // Print order receipt
  async printReceipt(deviceId, order) {
    try {
      const printer = await this.getPrinter(deviceId);
      if (!printer) {
        throw new Error(`Printer not available for device: ${deviceId}`);
      }

      printer.clear();

      // Header
      printer.alignCenter();
      printer.setTextSize(1, 1);
      printer.bold(true);
      printer.println('PIZZA AU FEU DE BOIS');
      printer.bold(false);
      printer.println('');

      // Order number (large and prominent)
      printer.setTextSize(2, 2);
      printer.bold(true);
      printer.println(`N° ${order.order_number}`);
      printer.bold(false);
      printer.setTextSize(0, 0);
      printer.println('');

      // Date and time
      printer.alignLeft();
      const orderDate = new Date(order.created_at);
      printer.println(`Date: ${orderDate.toLocaleDateString('fr-FR')}`);
      printer.println(`Heure: ${orderDate.toLocaleTimeString('fr-FR')}`);
      printer.println(`Caisse: ${deviceId}`);
      printer.drawLine();

      // Items
      printer.println('');
      printer.bold(true);
      printer.println('ARTICLES');
      printer.bold(false);
      printer.drawLine();

      const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');

      for (const item of items) {
        printer.tableCustom([
          { text: `${item.quantity}x`, align: 'LEFT', width: 0.1 },
          { text: item.name, align: 'LEFT', width: 0.6 },
          {
            text: `${parseFloat(item.subtotal).toFixed(2)}€`,
            align: 'RIGHT',
            width: 0.3,
          },
        ]);
      }

      printer.drawLine();

      // Total
      printer.println('');
      printer.setTextSize(1, 1);
      printer.bold(true);
      printer.tableCustom([
        { text: 'TOTAL', align: 'LEFT', width: 0.7 },
        {
          text: `${parseFloat(order.total_amount).toFixed(2)}€`,
          align: 'RIGHT',
          width: 0.3,
        },
      ]);
      printer.bold(false);
      printer.setTextSize(0, 0);

      // Footer
      printer.println('');
      printer.drawLine();
      printer.alignCenter();
      printer.println('Merci de votre visite!');
      printer.println('A bientot!');
      printer.println('');

      // Cut paper
      printer.cut();

      // Execute print
      await printer.execute();

      logger.info(`Receipt printed for order ${order.order_number} on ${deviceId}`);

      return { success: true, deviceId, orderNumber: order.order_number };
    } catch (error) {
      logger.error(`Print failed for ${deviceId}:`, error);
      throw error;
    }
  }

  // Test print
  async printTest(deviceId) {
    try {
      const printer = await this.getPrinter(deviceId);
      if (!printer) {
        throw new Error(`Printer not available for device: ${deviceId}`);
      }

      printer.clear();
      printer.alignCenter();
      printer.bold(true);
      printer.println("TEST D'IMPRESSION");
      printer.bold(false);
      printer.println('');
      printer.println(`Device: ${deviceId}`);
      printer.println(`Date: ${new Date().toLocaleString('fr-FR')}`);
      printer.println('');
      printer.println('Imprimante fonctionne correctement!');
      printer.println('');
      printer.cut();

      await printer.execute();

      logger.info(`Test print successful on ${deviceId}`);
      return { success: true, deviceId };
    } catch (error) {
      logger.error(`Test print failed for ${deviceId}:`, error);
      throw error;
    }
  }

  // Check printer status via CUPS
  async checkPrinterStatus(printerName) {
    try {
      const { stdout } = await execAsync(`lpstat -p ${printerName}`);
      const isIdle = stdout.includes('idle');
      const isPrinting = stdout.includes('printing');
      const isDisabled = stdout.includes('disabled');

      return {
        printerName,
        isIdle,
        isPrinting,
        isDisabled,
        status: isIdle ? 'ready' : isPrinting ? 'printing' : 'error',
        raw: stdout,
      };
    } catch (error) {
      return {
        printerName,
        status: 'error',
        error: error.message,
      };
    }
  }

  // List available CUPS printers
  async listPrinters() {
    try {
      const { stdout } = await execAsync('lpstat -p');
      const printers = stdout
        .split('\n')
        .filter((line) => line.startsWith('printer'))
        .map((line) => {
          const match = line.match(/printer (\S+)/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      return printers;
    } catch (error) {
      logger.error('Failed to list printers:', error);
      return [];
    }
  }
}

module.exports = new PrinterService();
