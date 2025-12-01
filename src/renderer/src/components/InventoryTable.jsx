import React, { useState, useEffect } from 'react'
import { Edit, Trash2, Plus } from 'lucide-react'
import PasswordModal from './PasswordModal'

function InventoryTable({ onEdit, onAdd, filterType, onRefresh }) {
    const [inventory, setInventory] = useState([])
    const [search, setSearch] = useState('')
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState(null) // 'import', 'sample', 'export-csv', 'export-pdf'

    useEffect(() => {
        loadInventory()
    }, [])

    const loadInventory = async () => {
        try {
            const data = await window.electron.ipcRenderer.invoke('get-inventory')
            setInventory(data)
        } catch (error) {
            console.error("Failed to load inventory:", error)
        }
    }

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this item?')) {
            await window.electron.ipcRenderer.invoke('delete-item', id)
            loadInventory()
        }
    }

    const handleActionClick = (action) => {
        setPendingAction(action)
        setIsPasswordModalOpen(true)
    }

    const handlePasswordSubmit = async (password) => {
        setIsPasswordModalOpen(false)
        if (password === "Sachin@123") {
            if (pendingAction === 'import') {
                const result = await window.electron.ipcRenderer.invoke('import-data')
                if (result.success) {
                    alert(`Successfully imported ${result.count} items!`)
                    loadInventory()
                } else if (result.error) {
                    alert(`Import failed: ${result.error}`)
                }
            } else if (pendingAction === 'sample') {
                const result = await window.electron.ipcRenderer.invoke('download-sample')
                if (result.success) {
                    alert('Sample file saved successfully!')
                } else if (result.error) {
                    alert(`Failed to save sample: ${result.error}`)
                }
            } else if (pendingAction === 'export-csv') {
                await window.electron.ipcRenderer.invoke('export-data', 'csv')
            } else if (pendingAction === 'export-pdf') {
                await window.electron.ipcRenderer.invoke('export-data', 'pdf')
            }
        } else {
            alert("Incorrect password!")
        }
        setPendingAction(null)
    }

    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) ||
            (item.batch_no && item.batch_no.toLowerCase().includes(search.toLowerCase()))

        if (!matchesSearch) return false

        const today = new Date().toISOString().split('T')[0]
        const nextThreeMonths = new Date()
        nextThreeMonths.setMonth(nextThreeMonths.getMonth() + 3)
        const nextThreeMonthsStr = nextThreeMonths.toISOString().split('T')[0]

        if (filterType === 'expired') {
            return item.expiry_date < today
        } else if (filterType === 'expiring_soon') {
            return item.expiry_date >= today && item.expiry_date <= nextThreeMonthsStr
        } else if (filterType === 'out_of_stock') {
            const stock = Number(item.stock_quantity || 0)
            return stock === 0
        }

        return true
    })

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage)

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    return (
        <div className="inventory-container">
            <div className="header-actions">
                <input
                    type="text"
                    placeholder="Search items..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="search-input"
                />
                <button onClick={onAdd} className="btn btn-primary">
                    <Plus size={16} /> Add Item
                </button>
                <button onClick={() => handleActionClick('import')} className="btn btn-secondary">
                    Import Excel
                </button>
                <button onClick={() => handleActionClick('sample')} className="btn btn-secondary">
                    Download Sample
                </button>
                <button onClick={() => handleActionClick('export-csv')} className="btn btn-secondary">
                    Export CSV
                </button>
                <button onClick={() => handleActionClick('export-pdf')} className="btn btn-secondary">
                    Export PDF
                </button>
                <button onClick={onRefresh} className="btn btn-secondary">
                    Refresh
                </button>
            </div>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Batch No</th>
                        <th>Expiry Date</th>
                        <th>Stock</th>
                        <th>MRP</th>
                        <th>Net Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {currentItems.map(item => (
                        <tr key={item.id}>
                            <td>{item.item_name}</td>
                            <td>{item.batch_no}</td>
                            <td>{item.expiry_date}</td>
                            <td>{item.stock_quantity}</td>
                            <td>{item.mrp}</td>
                            <td>{item.net_price}</td>
                            <td>
                                <button onClick={() => onEdit(item)} className="btn-icon"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(item.id)} className="btn-icon danger"><Trash2 size={16} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <div className="rows-per-page">
                    <label>Rows per page: </label>
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                <div className="page-navigation" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="btn btn-secondary"
                    >
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages || 1}</span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="btn btn-secondary"
                    >
                        Next
                    </button>
                </div>
            </div>
            <PasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSubmit={handlePasswordSubmit}
            />
        </div>
    )
}

export default InventoryTable
