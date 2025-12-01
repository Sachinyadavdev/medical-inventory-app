import React, { useState, useEffect } from 'react'
import { Plus, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import AddSaleForm from './AddSaleForm'

function SalesDashboard() {
    const [stats, setStats] = useState({
        daily: { profit: 0, revenue: 0 },
        monthly: { profit: 0, revenue: 0 },
        yearly: { profit: 0, revenue: 0 }
    })
    const [recentSales, setRecentSales] = useState([])
    const [isAddSaleOpen, setIsAddSaleOpen] = useState(false)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = recentSales.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(recentSales.length / itemsPerPage)

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const statsData = await window.electron.ipcRenderer.invoke('get-sales-stats')
        const salesData = await window.electron.ipcRenderer.invoke('get-sales')
        setStats(statsData)
        setRecentSales(salesData)
    }

    return (
        <div className="sales-dashboard">
            <div className="header-actions" style={{ marginBottom: '2rem', justifyContent: 'space-between', display: 'flex' }}>
                <h2>Sales & Profit Overview</h2>
                <button onClick={() => setIsAddSaleOpen(true)} className="btn-new-sale">
                    <Plus size={14} /> New Sale
                </button>
            </div>

            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="icon-wrapper primary">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Today's Profit</h3>
                        <p className="stat-value">{stats.daily.profit?.toFixed(2) || '0.00'}</p>
                        <small>Revenue: {stats.daily.revenue?.toFixed(2) || '0.00'}</small>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-wrapper success" style={{ color: 'green', backgroundColor: 'rgba(0, 128, 0, 0.1)' }}>
                        <Calendar size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Monthly Profit</h3>
                        <p className="stat-value">{stats.monthly.profit?.toFixed(2) || '0.00'}</p>
                        <small>Revenue: {stats.monthly.revenue?.toFixed(2) || '0.00'}</small>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-wrapper warning" style={{ color: 'orange', backgroundColor: 'rgba(255, 165, 0, 0.1)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Yearly Profit</h3>
                        <p className="stat-value">{stats.yearly.profit?.toFixed(2) || '0.00'}</p>
                        <small>Revenue: {stats.yearly.revenue?.toFixed(2) || '0.00'}</small>
                    </div>
                </div>
            </div>

            <div className="recent-sales" style={{ marginTop: '2rem' }}>
                <h3>Recent Transactions</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Sale Price</th>
                            <th>Total</th>
                            <th>Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map(sale => (
                            <tr key={sale.id}>
                                <td>{new Date(sale.sale_date).toLocaleDateString()} {new Date(sale.sale_date).toLocaleTimeString()}</td>
                                <td>{sale.item_name}</td>
                                <td>{sale.quantity}</td>
                                <td>{sale.sale_price.toFixed(2)}</td>
                                <td>{sale.total_amount.toFixed(2)}</td>
                                <td style={{ color: sale.profit >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                                    {sale.profit.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {recentSales.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No sales recorded yet.</td>
                            </tr>
                        )}
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
            </div>

            {isAddSaleOpen && (
                <AddSaleForm
                    onClose={() => setIsAddSaleOpen(false)}
                    onSaleAdded={loadData}
                />
            )}
        </div>
    )
}

export default SalesDashboard
