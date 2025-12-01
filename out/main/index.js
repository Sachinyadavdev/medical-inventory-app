"use strict";
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const dbPath = path.join(electron.app.getPath("userData"), "inventory.db");
const db = new Database(dbPath);
function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      batch_no TEXT,
      expiry_date TEXT,
      mrp REAL,
      purchase_price REAL,
      net_price REAL,
      stock_quantity INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      sale_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      profit REAL NOT NULL,
      sale_date TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.exec(schema);
}
function getInventory() {
  const stmt = db.prepare("SELECT * FROM inventory ORDER BY created_at DESC");
  return stmt.all();
}
function addItem(item) {
  const stmt = db.prepare(`
    INSERT INTO inventory (item_name, batch_no, expiry_date, mrp, purchase_price, net_price, stock_quantity)
    VALUES (@item_name, @batch_no, @expiry_date, @mrp, @purchase_price, @net_price, @stock_quantity)
  `);
  return stmt.run(item);
}
function updateItem(item) {
  const stmt = db.prepare(`
    UPDATE inventory
    SET item_name = @item_name,
        batch_no = @batch_no,
        expiry_date = @expiry_date,
        mrp = @mrp,
        purchase_price = @purchase_price,
        net_price = @net_price,
        stock_quantity = @stock_quantity
    WHERE id = @id
  `);
  return stmt.run(item);
}
function deleteItem(id) {
  const stmt = db.prepare("DELETE FROM inventory WHERE id = ?");
  return stmt.run(id);
}
function getDashboardStats() {
  const total = db.prepare("SELECT COUNT(*) as count FROM inventory").get().count;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const nextThreeMonths = /* @__PURE__ */ new Date();
  nextThreeMonths.setMonth(nextThreeMonths.getMonth() + 3);
  const nextThreeMonthsStr = nextThreeMonths.toISOString().split("T")[0];
  const expired = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE expiry_date < ?").get(today).count;
  const expiringSoon = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE expiry_date >= ? AND expiry_date <= ?").get(today, nextThreeMonthsStr).count;
  const outOfStock = db.prepare("SELECT COUNT(*) as count FROM inventory WHERE CAST(COALESCE(stock_quantity, 0) AS INTEGER) = 0").get().count;
  return { total, expired, expiringSoon, outOfStock };
}
function addSale(sale) {
  console.log("Database: addSale called with", sale);
  const total_amount = sale.quantity * sale.sale_price;
  const profit = (sale.sale_price - sale.purchase_price) * sale.quantity;
  const sale_date = (/* @__PURE__ */ new Date()).toISOString();
  const insertSale = db.prepare(`
    INSERT INTO sales (item_id, item_name, quantity, sale_price, total_amount, profit, sale_date)
    VALUES (@item_id, @item_name, @quantity, @sale_price, @total_amount, @profit, @sale_date)
  `);
  const updateStock = db.prepare(`
    UPDATE inventory 
    SET stock_quantity = stock_quantity - @quantity 
    WHERE id = @item_id
  `);
  const transaction = db.transaction(() => {
    const info = insertSale.run({ ...sale, total_amount, profit, sale_date });
    console.log("Database: Sale inserted, changes:", info.changes);
    const stockInfo = updateStock.run({ quantity: sale.quantity, item_id: sale.item_id });
    console.log("Database: Stock updated, changes:", stockInfo.changes);
  });
  return transaction();
}
function getSales(filter = "all") {
  console.log("Database: getSales called");
  let query = "SELECT * FROM sales ORDER BY sale_date DESC";
  const results = db.prepare(query).all();
  console.log(`Database: getSales returned ${results.length} records`);
  return results;
}
function getSalesStats() {
  console.log("Database: getSalesStats called");
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1).toISOString().split("T")[0];
  new Date((/* @__PURE__ */ new Date()).getFullYear(), 0, 1).toISOString().split("T")[0];
  const daily = db.prepare("SELECT SUM(profit) as profit, SUM(total_amount) as revenue FROM sales WHERE date(sale_date, 'localtime') = date('now', 'localtime')").get();
  const monthly = db.prepare("SELECT SUM(profit) as profit, SUM(total_amount) as revenue FROM sales WHERE date(sale_date, 'localtime') >= date(?, 'start of month')").get(today);
  const yearly = db.prepare("SELECT SUM(profit) as profit, SUM(total_amount) as revenue FROM sales WHERE date(sale_date, 'localtime') >= date(?, 'start of year')").get(today);
  console.log("Database: Stats calculated", { daily, monthly, yearly });
  return {
    daily: daily || { profit: 0, revenue: 0 },
    monthly: monthly || { profit: 0, revenue: 0 },
    yearly: yearly || { profit: 0, revenue: 0 }
  };
}
function importItems(items) {
  const insert = db.prepare(`
    INSERT INTO inventory (item_name, batch_no, expiry_date, mrp, purchase_price, net_price, stock_quantity)
    VALUES (@item_name, @batch_no, @expiry_date, @mrp, @purchase_price, @net_price, @stock_quantity)
  `);
  const insertMany = db.transaction((items2) => {
    for (const item of items2) insert.run(item);
  });
  insertMany(items);
}
function clearInventory() {
  console.log("Database: clearInventory called - Deleting Inventory AND Sales");
  const deleteInventory = db.prepare("DELETE FROM inventory");
  const deleteSales = db.prepare("DELETE FROM sales");
  const resetSeqInventory = db.prepare("DELETE FROM sqlite_sequence WHERE name='inventory'");
  const resetSeqSales = db.prepare("DELETE FROM sqlite_sequence WHERE name='sales'");
  const transaction = db.transaction(() => {
    const invInfo = deleteInventory.run();
    console.log("Database: Inventory deleted, changes:", invInfo.changes);
    const salesInfo = deleteSales.run();
    console.log("Database: Sales deleted, changes:", salesInfo.changes);
    resetSeqInventory.run();
    resetSeqSales.run();
  });
  return transaction();
}
function getDbPath() {
  return dbPath;
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  initDatabase();
  electron.ipcMain.handle("reset-data", () => {
    console.log("Main Process: reset-data called");
    try {
      clearInventory();
      console.log("Main Process: Inventory cleared");
      return { success: true };
    } catch (err) {
      console.error("Main Process: Reset failed", err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("get-inventory", () => {
    return getInventory();
  });
  electron.ipcMain.handle("add-item", (event, item) => {
    return addItem(item);
  });
  electron.ipcMain.handle("update-item", (event, item) => {
    return updateItem(item);
  });
  electron.ipcMain.handle("delete-item", (event, id) => {
    return deleteItem(id);
  });
  electron.ipcMain.handle("get-dashboard-stats", () => {
    return getDashboardStats();
  });
  electron.ipcMain.handle("add-sale", (event, sale) => {
    return addSale(sale);
  });
  electron.ipcMain.handle("get-sales", () => {
    return getSales();
  });
  electron.ipcMain.handle("get-sales-stats", () => {
    return getSalesStats();
  });
  electron.ipcMain.handle("export-data", async (event, format) => {
    const { dialog } = require("electron");
    const fs = require("fs");
    require("path");
    const XLSX = require("xlsx");
    const { jsPDF } = require("jspdf");
    const inventory = getInventory();
    const { filePath } = await dialog.showSaveDialog({
      title: "Export Inventory",
      defaultPath: `inventory.${format}`,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });
    if (!filePath) return { success: false };
    try {
      if (format === "csv" || format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(inventory);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        if (format === "xlsx") {
          XLSX.writeFile(wb, filePath);
        } else {
          const csv = XLSX.utils.sheet_to_csv(ws);
          fs.writeFileSync(filePath, csv);
        }
      } else if (format === "pdf") {
        const doc = new jsPDF();
        let y = 10;
        doc.text("Medical Inventory Report", 10, y);
        y += 10;
        inventory.forEach((item, i) => {
          if (y > 280) {
            doc.addPage();
            y = 10;
          }
          const line = `${item.item_name} - Batch: ${item.batch_no} - Exp: ${item.expiry_date} - Stock: ${item.stock_quantity}`;
          doc.text(line, 10, y);
          y += 10;
        });
        doc.save(filePath);
      }
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("backup-data", async () => {
    const { dialog } = require("electron");
    const fs = require("fs");
    const dbPath2 = getDbPath();
    const { filePath } = await dialog.showSaveDialog({
      title: "Backup Database",
      defaultPath: "inventory_backup.db",
      filters: [{ name: "SQLite Database", extensions: ["db"] }]
    });
    if (!filePath) return { success: false };
    try {
      fs.copyFileSync(dbPath2, filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("restore-data", async () => {
    const { dialog, app: app2 } = require("electron");
    const fs = require("fs");
    const dbPath2 = getDbPath();
    const { filePaths } = await dialog.showOpenDialog({
      title: "Restore Database",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"]
    });
    if (filePaths.length === 0) return { success: false };
    try {
      fs.copyFileSync(filePaths[0], dbPath2);
      app2.relaunch();
      app2.exit(0);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("import-data", async () => {
    const { dialog } = require("electron");
    const XLSX = require("xlsx");
    const { filePaths } = await dialog.showOpenDialog({
      title: "Import Inventory",
      filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
      properties: ["openFile"]
    });
    if (filePaths.length === 0) return { success: false };
    try {
      const workbook = XLSX.readFile(filePaths[0]);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { raw: true });
      const formatDate = (val) => {
        console.log("Processing date value:", val, "Type:", typeof val);
        if (!val) return "";
        if (typeof val === "number") {
          try {
            const dateInfo = XLSX.SSF.parse_date_code(val);
            const { y, m, d } = dateInfo;
            const formatted = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            console.log("Parsed number to:", formatted);
            return formatted;
          } catch (e) {
            console.error("Error parsing date code:", e);
            const date = new Date(Math.round((val - 25569) * 86400 * 1e3) + 12 * 60 * 60 * 1e3);
            return date.toISOString().split("T")[0];
          }
        }
        if (typeof val === "string") {
          const trimmed = val.trim();
          const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
          if (ddmmyyyy) {
            const day = parseInt(ddmmyyyy[1], 10);
            const month = parseInt(ddmmyyyy[2], 10);
            const year = parseInt(ddmmyyyy[3], 10);
            const formatted = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            console.log("Parsed string (DD/MM/YYYY) to:", formatted);
            return formatted;
          }
          const yyyymmdd = trimmed.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
          if (yyyymmdd) {
            const formatted = trimmed.replace(/\//g, "-").replace(/\./g, "-");
            console.log("Parsed string (ISO) to:", formatted);
            return formatted;
          }
        }
        return val;
      };
      const items = data.map((row) => ({
        item_name: row["Item Name"] || row["item_name"],
        batch_no: row["Batch No"] || row["batch_no"],
        expiry_date: formatDate(row["Expiry Date"] || row["expiry_date"]),
        mrp: row["MRP"] || row["mrp"] || 0,
        purchase_price: row["Purchase Price"] || row["purchase_price"] || 0,
        net_price: row["Net Price"] || row["net_price"] || 0,
        stock_quantity: row["Stock Quantity"] || row["stock_quantity"] || 0
      }));
      importItems(items);
      return { success: true, count: items.length };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });
  electron.ipcMain.handle("download-sample", async () => {
    const { dialog } = require("electron");
    const XLSX = require("xlsx");
    const { filePath } = await dialog.showSaveDialog({
      title: "Save Sample Import File",
      defaultPath: "inventory_sample.xlsx",
      filters: [{ name: "Excel File", extensions: ["xlsx"] }]
    });
    if (!filePath) return { success: false };
    try {
      const sampleData = [
        {
          "Item Name": "Paracetamol",
          "Batch No": "B123",
          "Expiry Date": "2025-12-31",
          "MRP": 50,
          "Purchase Price": 40,
          "Net Price": 45,
          "Stock Quantity": 100
        }
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sample");
      XLSX.writeFile(wb, filePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
