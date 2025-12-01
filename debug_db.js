const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Try to find the database file
const appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share");
const dbPath = path.join(appData, 'medical-inventory-app', 'inventory.db');

console.log("Looking for DB at:", dbPath);

if (!fs.existsSync(dbPath)) {
    console.error("Database file not found!");
    process.exit(1);
}

const db = new Database(dbPath);

console.log("\n--- Schema ---");
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='inventory'").get();
console.log(schema.sql);

console.log("\n--- First 5 Items ---");
const items = db.prepare("SELECT id, item_name, stock_quantity, typeof(stock_quantity) as type FROM inventory LIMIT 5").all();
console.table(items);

console.log("\n--- Stats Calculation ---");
const total = db.prepare('SELECT COUNT(*) as count FROM inventory').get().count;
const lowStockStrict = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE CAST(COALESCE(stock_quantity, 0) AS INTEGER) < 10 AND CAST(COALESCE(stock_quantity, 0) AS INTEGER) > 0').get().count;
const lowStockInclusive = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE CAST(COALESCE(stock_quantity, 0) AS INTEGER) < 10').get().count;
const outOfStock = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE CAST(COALESCE(stock_quantity, 0) AS INTEGER) = 0').get().count;

console.log({ total, lowStockStrict, lowStockInclusive, outOfStock });
