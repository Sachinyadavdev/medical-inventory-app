import React, { useState, useEffect, useRef } from 'react'
import InventoryTable from './components/InventoryTable'
import ItemForm from './components/ItemForm'
import Dashboard from './components/Dashboard'
import PasswordModal from './components/PasswordModal'
import Login from './components/Login'

import SalesDashboard from './components/SalesDashboard'

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [currentView, setCurrentView] = useState('inventory') // 'inventory' or 'sales'
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [activeFilter, setActiveFilter] = useState('all')

    const [pendingAction, setPendingAction] = useState(null) // 'reset' or 'restore'

    // Auto-logout logic
    const logoutTimerRef = useRef(null)
    const IDLE_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds

    const resetLogoutTimer = () => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
        if (isAuthenticated) {
            logoutTimerRef.current = setTimeout(() => {
                setIsAuthenticated(false)
                alert("Session expired due to inactivity.")
            }, IDLE_TIMEOUT)
        }
    }

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'mousemove']
        const handleActivity = () => resetLogoutTimer()

        if (isAuthenticated) {
            events.forEach(event => window.addEventListener(event, handleActivity))
            resetLogoutTimer() // Start timer
        }

        return () => {
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
            events.forEach(event => window.removeEventListener(event, handleActivity))
        }
    }, [isAuthenticated])

    const handleLogin = async () => {
        setIsAuthenticated(true)
        try {
            const stats = await window.electron.ipcRenderer.invoke('get-dashboard-stats')
            if (stats.expired > 0) {
                // Small delay to ensure the UI renders first, or just alert immediately
                setTimeout(() => {
                    alert(`⚠️ Attention: You have ${stats.expired} expired item(s) in your inventory!`)
                }, 500)
            }
        } catch (error) {
            console.error("Failed to check expired items on login:", error)
        }
    }

    const handleLogout = () => {
        setIsAuthenticated(false)
    }

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />
    }

    const handleAdd = () => {
        setEditingItem(null)
        setIsModalOpen(true)
    }

    const handleEdit = (item) => {
        setEditingItem(item)
        setIsModalOpen(true)
    }

    const handleSave = async (item) => {
        if (item.id) {
            await window.electron.ipcRenderer.invoke('update-item', item)
        } else {
            await window.electron.ipcRenderer.invoke('add-item', item)
        }
        setIsModalOpen(false)
        setRefreshTrigger(prev => prev + 1)
    }

    const handleManualRefresh = () => {
        setActiveFilter('all')
        setRefreshTrigger(prev => prev + 1)
    }

    const handleBackupClick = () => {
        setPendingAction('backup')
        setIsPasswordModalOpen(true)
    }

    const handleResetClick = () => {
        setPendingAction('reset')
        setIsPasswordModalOpen(true)
    }

    const handleRestoreClick = () => {
        setPendingAction('restore')
        setIsPasswordModalOpen(true)
    }

    const handlePasswordSubmit = async (password) => {
        setIsPasswordModalOpen(false)
        if (password === "Sachin@123") {
            if (pendingAction === 'reset') {
                if (confirm("Are you sure? This will delete ALL data permanently.")) {
                    try {
                        const result = await window.electron.ipcRenderer.invoke('reset-data')
                        if (result.success) {
                            alert("Data reset successfully!")
                            window.location.reload()
                        } else {
                            alert("Error from backend: " + result.error)
                        }
                    } catch (error) {
                        alert("System Error: " + error.message)
                    }
                }
            } else if (pendingAction === 'restore') {
                try {
                    const result = await window.electron.ipcRenderer.invoke('restore-data')
                    if (result.success) {
                        alert("Database restored successfully! The app will now restart.")
                    } else if (result.error) {
                        alert("Restore failed: " + result.error)
                    }
                } catch (error) {
                    alert("System Error: " + error.message)
                }
            } else if (pendingAction === 'backup') {
                try {
                    const result = await window.electron.ipcRenderer.invoke('backup-data')
                    if (result.success) {
                        alert("Backup created successfully!")
                    } else if (result.error) {
                        alert("Backup failed: " + result.error)
                    }
                } catch (error) {
                    alert("System Error: " + error.message)
                }
            }
        } else {
            alert("Incorrect password!")
        }
        setPendingAction(null)
    }

    return (
        <div className="container">
            <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h1>Medical Inventory</h1>
                    <nav style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setCurrentView('inventory')}
                            className={`btn ${currentView === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            Inventory
                        </button>
                        <button
                            onClick={() => setCurrentView('sales')}
                            className={`btn ${currentView === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            Sales & Profit
                        </button>
                    </nav>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleBackupClick} className="btn btn-secondary">Backup</button>
                    <button onClick={handleRestoreClick} className="btn btn-secondary">Restore</button>
                    <button onClick={handleResetClick} className="btn btn-secondary" style={{ backgroundColor: '#dc3545', color: 'white' }}>Reset Data</button>
                    <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
                </div>
            </header>
            <main>
                {currentView === 'inventory' ? (
                    <>
                        <Dashboard key={`dash-${refreshTrigger}`} onFilter={setActiveFilter} />
                        <div style={{ marginTop: '2rem' }}>
                            {activeFilter !== 'all' && (
                                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                        Filter: {
                                            activeFilter === 'expired' ? 'Expired Items' :
                                                activeFilter === 'expiring_soon' ? 'Expiring Soon' :
                                                    activeFilter === 'out_of_stock' ? 'Out of Stock' : ''
                                        }
                                    </span>
                                    <button onClick={() => setActiveFilter('all')} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                                        Clear Filter
                                    </button>
                                </div>
                            )}
                            <InventoryTable
                                onEdit={handleEdit}
                                onAdd={handleAdd}
                                key={`table-${refreshTrigger}`}
                                filterType={activeFilter}
                                onRefresh={handleManualRefresh}
                            />
                        </div>
                    </>
                ) : (
                    <SalesDashboard />
                )}
            </main>
            {isModalOpen && (
                <ItemForm
                    item={editingItem}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
            <PasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSubmit={handlePasswordSubmit}
            />
            <footer style={{ textAlign: 'center', padding: '12px', marginTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.05)', color: 'var(--secondary-color)', fontSize: '0.8rem' }}>
                <p style={{ margin: 0 }}>
                    &copy; {new Date().getFullYear()} Medical Inventory. Developed by <a href="https://digitalmeedia.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '500', transition: 'opacity 0.2s' }}>Digital Meedia</a>.
                </p>
            </footer>
        </div>
    )
}

export default App
