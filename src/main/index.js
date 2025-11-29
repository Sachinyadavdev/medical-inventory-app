import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { initDatabase, getInventory, addItem, updateItem, deleteItem, getDashboardStats, getDbPath, importItems, clearInventory } from './database'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  initDatabase()

  ipcMain.handle('reset-data', () => {
    console.log('Main Process: reset-data called')
    try {
      clearInventory()
      console.log('Main Process: Inventory cleared')
      return { success: true }
    } catch (err) {
      console.error('Main Process: Reset failed', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-inventory', () => {
    return getInventory()
  })

  ipcMain.handle('add-item', (event, item) => {
    return addItem(item)
  })

  ipcMain.handle('update-item', (event, item) => {
    return updateItem(item)
  })

  ipcMain.handle('delete-item', (event, id) => {
    return deleteItem(id)
  })

  ipcMain.handle('get-dashboard-stats', () => {
    return getDashboardStats()
  })

  ipcMain.handle('export-data', async (event, format) => {
    const { dialog } = require('electron')
    const fs = require('fs')
    const path = require('path')
    const XLSX = require('xlsx')
    const { jsPDF } = require('jspdf')

    const inventory = getInventory()
    
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Inventory',
      defaultPath: `inventory.${format}`,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    })

    if (!filePath) return { success: false }

    try {
      if (format === 'csv' || format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(inventory)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
        
        if (format === 'xlsx') {
          XLSX.writeFile(wb, filePath)
        } else {
          const csv = XLSX.utils.sheet_to_csv(ws)
          fs.writeFileSync(filePath, csv)
        }
      } else if (format === 'pdf') {
        const doc = new jsPDF()
        let y = 10
        doc.text("Medical Inventory Report", 10, y)
        y += 10
        inventory.forEach((item, i) => {
          if (y > 280) { doc.addPage(); y = 10; }
          const line = `${item.item_name} - Batch: ${item.batch_no} - Exp: ${item.expiry_date} - Stock: ${item.stock_quantity}`
          doc.text(line, 10, y)
          y += 10
        })
        doc.save(filePath)
      }
      return { success: true }
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('backup-data', async () => {
    const { dialog } = require('electron')
    const fs = require('fs')
    
    const dbPath = getDbPath()
    
    const { filePath } = await dialog.showSaveDialog({
      title: 'Backup Database',
      defaultPath: 'inventory_backup.db',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })

    if (!filePath) return { success: false }

    try {
      fs.copyFileSync(dbPath, filePath)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('restore-data', async () => {
    const { dialog, app } = require('electron')
    const fs = require('fs')
    
    const dbPath = getDbPath()

    const { filePaths } = await dialog.showOpenDialog({
      title: 'Restore Database',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    })

    if (filePaths.length === 0) return { success: false }

    try {
      // Close DB connection would be ideal here, but better-sqlite3 handles file locking reasonably well if we are careful.
      // Ideally we should restart the app.
      fs.copyFileSync(filePaths[0], dbPath)
      app.relaunch()
      app.exit(0)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('import-data', async () => {
    const { dialog } = require('electron')
    const XLSX = require('xlsx')

    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Inventory',
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile']
    })

    if (filePaths.length === 0) return { success: false }

    try {
      const workbook = XLSX.readFile(filePaths[0])
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(sheet, { raw: true })

      const formatDate = (val) => {
        console.log('Processing date value:', val, 'Type:', typeof val)
        if (!val) return ''
        
        // Handle Excel Serial Date (Number) using XLSX.SSF
        if (typeof val === 'number') {
          try {
            const dateInfo = XLSX.SSF.parse_date_code(val)
            // dateInfo returns { y: 2000, m: 9, d: 1, ... }
            const { y, m, d } = dateInfo
            const formatted = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            console.log('Parsed number to:', formatted)
            return formatted
          } catch (e) {
             console.error('Error parsing date code:', e)
             // Fallback to old method if SSF fails
             const date = new Date(Math.round((val - 25569) * 86400 * 1000) + 12 * 60 * 60 * 1000)
             return date.toISOString().split('T')[0]
          }
        }

        // Handle String Date
        if (typeof val === 'string') {
            const trimmed = val.trim()
            
            // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
            const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)
            if (ddmmyyyy) {
                const day = parseInt(ddmmyyyy[1], 10)
                const month = parseInt(ddmmyyyy[2], 10)
                const year = parseInt(ddmmyyyy[3], 10)
                const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                console.log('Parsed string (DD/MM/YYYY) to:', formatted)
                return formatted
            }
            
            // Try YYYY-MM-DD (ISO)
            const yyyymmdd = trimmed.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/)
            if (yyyymmdd) {
                 const formatted = trimmed.replace(/\//g, '-').replace(/\./g, '-')
                 console.log('Parsed string (ISO) to:', formatted)
                 return formatted
            }
        }
        
        return val // Return original if we can't parse it
      }

      // Validate and map data
      const items = data.map(row => ({
        item_name: row['Item Name'] || row['item_name'],
        batch_no: row['Batch No'] || row['batch_no'],
        expiry_date: formatDate(row['Expiry Date'] || row['expiry_date']),
        mrp: row['MRP'] || row['mrp'] || 0,
        purchase_price: row['Purchase Price'] || row['purchase_price'] || 0,
        net_price: row['Net Price'] || row['net_price'] || 0,
        stock_quantity: row['Stock Quantity'] || row['stock_quantity'] || 0
      }))

      importItems(items)
      return { success: true, count: items.length }
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('download-sample', async () => {
    const { dialog } = require('electron')
    const XLSX = require('xlsx')

    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Sample Import File',
      defaultPath: 'inventory_sample.xlsx',
      filters: [{ name: 'Excel File', extensions: ['xlsx'] }]
    })

    if (!filePath) return { success: false }

    try {
      const sampleData = [
        {
          'Item Name': 'Paracetamol',
          'Batch No': 'B123',
          'Expiry Date': '2025-12-31',
          'MRP': 50.00,
          'Purchase Price': 40.00,
          'Net Price': 45.00,
          'Stock Quantity': 100
        }
      ]

      const ws = XLSX.utils.json_to_sheet(sampleData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sample')
      XLSX.writeFile(wb, filePath)
      
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })



  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
