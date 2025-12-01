const Database = require('better-sqlite3');
const path = require('path');

const dbPath = 'C:\\Users\\MYPC\\AppData\\Roaming\\medical-inventory-app\\inventory.db';
console.log('Checking database at:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name));

  const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get();
  console.log('Sales Count:', salesCount.count);

  if (salesCount.count > 0) {
    const sales = db.prepare('SELECT * FROM sales ORDER BY id DESC LIMIT 5').all();
    console.log('Recent Sales:', sales);
  } else {
    console.log('No sales found.');
  }

  const inventoryCount = db.prepare('SELECT COUNT(*) as count FROM inventory').get();
  console.log('Inventory Count:', inventoryCount.count);

} catch (err) {
  console.error('Error accessing database:', err);
}
