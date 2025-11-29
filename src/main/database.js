import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

// Ensure userData path is available (it is in main process)
const dbPath = join(app.getPath('userData'), 'inventory.db')
const db = new Database(dbPath)

export function initDatabase() {
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
  `
  db.exec(schema)
}

export function getInventory() {
  const stmt = db.prepare('SELECT * FROM inventory ORDER BY created_at DESC')
  return stmt.all()
}

export function addItem(item) {
  const stmt = db.prepare(`
    INSERT INTO inventory (item_name, batch_no, expiry_date, mrp, purchase_price, net_price, stock_quantity)
    VALUES (@item_name, @batch_no, @expiry_date, @mrp, @purchase_price, @net_price, @stock_quantity)
  `)
  return stmt.run(item)
}

export function updateItem(item) {
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
  `)
  return stmt.run(item)
}

export function deleteItem(id) {
  const stmt = db.prepare('DELETE FROM inventory WHERE id = ?')
  return stmt.run(id)
}

export function getDashboardStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM inventory').get().count
  
  const today = new Date().toISOString().split('T')[0]
  const nextThreeMonths = new Date()
  nextThreeMonths.setMonth(nextThreeMonths.getMonth() + 3)
  const nextThreeMonthsStr = nextThreeMonths.toISOString().split('T')[0]

  const expired = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE expiry_date < ?').get(today).count
  const expiringSoon = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE expiry_date >= ? AND expiry_date <= ?').get(today, nextThreeMonthsStr).count

  return { total, expired, expiringSoon }
}

export function importItems(items) {
  const insert = db.prepare(`
    INSERT INTO inventory (item_name, batch_no, expiry_date, mrp, purchase_price, net_price, stock_quantity)
    VALUES (@item_name, @batch_no, @expiry_date, @mrp, @purchase_price, @net_price, @stock_quantity)
  `)

  const insertMany = db.transaction((items) => {
    for (const item of items) insert.run(item)
  })

  insertMany(items)
}

export function clearInventory() {
  const deleteStmt = db.prepare('DELETE FROM inventory')
  const resetSeqStmt = db.prepare("DELETE FROM sqlite_sequence WHERE name='inventory'")
  
  const transaction = db.transaction(() => {
    deleteStmt.run()
    resetSeqStmt.run()
  })
  
  return transaction()
}

export function getDbPath() {
  return dbPath
}

export default db
