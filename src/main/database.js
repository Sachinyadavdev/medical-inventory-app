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
  const outOfStock = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE CAST(COALESCE(stock_quantity, 0) AS INTEGER) = 0').get().count

  return { total, expired, expiringSoon, outOfStock }
}

// --- Sales Module Functions ---

export function addSale(sale) {
  console.log('Database: addSale called with', sale)
  // sale object: { item_id, item_name, quantity, sale_price, purchase_price }
  // Calculate derived values
  const total_amount = sale.quantity * sale.sale_price
  const profit = (sale.sale_price - sale.purchase_price) * sale.quantity
  const sale_date = new Date().toISOString()

  const insertSale = db.prepare(`
    INSERT INTO sales (item_id, item_name, quantity, sale_price, total_amount, profit, sale_date)
    VALUES (@item_id, @item_name, @quantity, @sale_price, @total_amount, @profit, @sale_date)
  `)

  const updateStock = db.prepare(`
    UPDATE inventory 
    SET stock_quantity = stock_quantity - @quantity 
    WHERE id = @item_id
  `)

  const transaction = db.transaction(() => {
    const info = insertSale.run({ ...sale, total_amount, profit, sale_date })
    console.log('Database: Sale inserted, changes:', info.changes)
    const stockInfo = updateStock.run({ quantity: sale.quantity, item_id: sale.item_id })
    console.log('Database: Stock updated, changes:', stockInfo.changes)
  })

  return transaction()
}

export function getSales(filter = 'all') {
  console.log('Database: getSales called')
  let query = 'SELECT * FROM sales ORDER BY sale_date DESC'
  // We can add date filtering logic here later if needed
  const results = db.prepare(query).all()
  console.log(`Database: getSales returned ${results.length} records`)
  return results
}

export function getSalesStats() {
  console.log('Database: getSalesStats called')
  const today = new Date().toISOString().split('T')[0]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]

  // Use 'localtime' modifier to match user's local day
  const daily = db.prepare("SELECT SUM(profit) as profit, SUM(total_amount) as revenue FROM sales WHERE date(sale_date, 'localtime') = date('now', 'localtime')").get()
  const monthly = db.prepare("SELECT SUM(profit) as profit, SUM(total_amount) as revenue FROM sales WHERE date(sale_date, 'localtime') >= date(?, 'start of month')").get(today)
  const yearly = db.prepare("SELECT SUM(profit) as profit, SUM(total_amount) as revenue FROM sales WHERE date(sale_date, 'localtime') >= date(?, 'start of year')").get(today)

  console.log('Database: Stats calculated', { daily, monthly, yearly })

  return {
    daily: daily || { profit: 0, revenue: 0 },
    monthly: monthly || { profit: 0, revenue: 0 },
    yearly: yearly || { profit: 0, revenue: 0 }
  }
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
  console.log('Database: clearInventory called - Deleting Inventory AND Sales')
  const deleteInventory = db.prepare('DELETE FROM inventory')
  const deleteSales = db.prepare('DELETE FROM sales')
  const resetSeqInventory = db.prepare("DELETE FROM sqlite_sequence WHERE name='inventory'")
  const resetSeqSales = db.prepare("DELETE FROM sqlite_sequence WHERE name='sales'")
  
  const transaction = db.transaction(() => {
    const invInfo = deleteInventory.run()
    console.log('Database: Inventory deleted, changes:', invInfo.changes)
    const salesInfo = deleteSales.run()
    console.log('Database: Sales deleted, changes:', salesInfo.changes)
    resetSeqInventory.run()
    resetSeqSales.run()
  })
  
  return transaction()
}

export function getDbPath() {
  return dbPath
}

export default db
