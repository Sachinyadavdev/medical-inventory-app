import React, { useState, useEffect } from 'react'
import { Package, AlertTriangle, AlertOctagon } from 'lucide-react'

function Dashboard({ onFilter }) {
    const [stats, setStats] = useState({ total: 0, expired: 0, expiringSoon: 0, lowStock: 0, outOfStock: 0 })

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            const data = await window.electron.ipcRenderer.invoke('get-dashboard-stats')
            if (data) {
                setStats(data)
            }
        } catch (error) {
            console.error("Failed to load stats:", error)
        }
    }

    if (!stats) return null

    return (
        <div className="dashboard-grid">
            <div className="stat-card" onClick={() => onFilter('all')} style={{ cursor: 'pointer' }}>
                <div className="icon-wrapper primary">
                    <Package size={24} />
                </div>
                <div className="stat-info">
                    <h3>Total Items</h3>
                    <p className="stat-value">{stats.total || 0}</p>
                </div>
            </div>
            <div className="stat-card" onClick={() => onFilter('expiring_soon')} style={{ cursor: 'pointer' }}>
                <div className="icon-wrapper warning">
                    <AlertTriangle size={24} />
                </div>
                <div className="stat-info">
                    <h3>Expiring Soon</h3>
                    <p className="stat-value">{stats.expiringSoon || 0}</p>
                </div>
            </div>
            <div className="stat-card" onClick={() => onFilter('expired')} style={{ cursor: 'pointer' }}>
                <div className="icon-wrapper danger">
                    <AlertOctagon size={24} />
                </div>
                <div className="stat-info">
                    <h3>Expired</h3>
                    <p className="stat-value">{stats.expired || 0}</p>
                </div>
            </div>

            <div className="stat-card" onClick={() => onFilter('out_of_stock')} style={{ cursor: 'pointer' }}>
                <div className="icon-wrapper danger">
                    <AlertOctagon size={24} />
                </div>
                <div className="stat-info">
                    <h3>Out of Stock</h3>
                    <p className="stat-value">{stats.outOfStock || 0}</p>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
