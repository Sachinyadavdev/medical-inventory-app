import React, { useState, useEffect } from 'react'
import { Plus, Search, X } from 'lucide-react'

function AddSaleForm({ onClose, onSaleAdded }) {
    const [inventory, setInventory] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedItem, setSelectedItem] = useState(null)
    const [quantity, setQuantity] = useState(1)
    const [salePrice, setSalePrice] = useState(0)

    useEffect(() => {
        loadInventory()
    }, [])

    const loadInventory = async () => {
        const items = await window.electron.ipcRenderer.invoke('get-inventory')
        setInventory(items)
    }

    const filteredItems = inventory.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.batch_no && item.batch_no.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handleItemSelect = (item) => {
        setSelectedItem(item)
        setSalePrice(item.mrp) // Default to MRP
        setQuantity(1)
        setSearchTerm('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!selectedItem) return

        if (quantity > selectedItem.stock_quantity) {
            alert(`Insufficient stock! Only ${selectedItem.stock_quantity} available.`)
            return
        }

        const saleData = {
            item_id: selectedItem.id,
            item_name: selectedItem.item_name,
            quantity: Number(quantity),
            sale_price: Number(salePrice),
            purchase_price: selectedItem.purchase_price
        }

        try {
            await window.electron.ipcRenderer.invoke('add-sale', saleData)
            alert('Sale recorded successfully!')
            onSaleAdded()
            onClose()
        } catch (error) {
            alert('Failed to record sale: ' + error.message)
        }
    }

    const profit = selectedItem ? (salePrice - selectedItem.purchase_price) * quantity : 0

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Record New Sale</h2>
                    <button onClick={onClose} className="btn-icon"><X size={24} /></button>
                </div>

                {!selectedItem ? (
                    <div className="item-selection">
                        <div className="search-box" style={{ marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Search item to sell..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                                autoFocus
                            />
                        </div>
                        <div className="item-list" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            {filteredItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemSelect(item)}
                                    className="item-row"
                                    style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                                >
                                    <div>
                                        <strong>{item.item_name}</strong>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Batch: {item.batch_no} | Exp: {item.expiry_date}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold' }}>Stock: {item.stock_quantity}</div>
                                        <div style={{ fontSize: '0.8rem' }}>MRP: {item.mrp}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="sale-form">
                        <div className="selected-item-summary" style={{ background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '1rem' }}>
                            <h3>{selectedItem.item_name}</h3>
                            <p>Stock Available: <strong>{selectedItem.stock_quantity}</strong></p>
                            <p>Purchase Price: {selectedItem.purchase_price}</p>
                            <button type="button" onClick={() => setSelectedItem(null)} className="btn btn-secondary" style={{ fontSize: '0.8rem', marginTop: '5px' }}>Change Item</button>
                        </div>

                        <div className="form-group">
                            <label>Quantity</label>
                            <input
                                type="number"
                                min="1"
                                max={selectedItem.stock_quantity}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>Sale Price (Per Unit)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={salePrice}
                                onChange={(e) => setSalePrice(e.target.value)}
                                required
                            />
                        </div>

                        <div className="sale-summary" style={{ marginTop: '1rem', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Total Amount:</span>
                                <strong>{(quantity * salePrice).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: profit >= 0 ? 'var(--success-color, green)' : 'var(--danger-color, red)' }}>
                                <span>Estimated Profit:</span>
                                <strong>{profit.toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary">Confirm Sale</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

export default AddSaleForm
