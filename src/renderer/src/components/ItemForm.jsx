import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

function ItemForm({ item, onClose, onSave }) {
    const [formData, setFormData] = useState({
        item_name: '',
        batch_no: '',
        expiry_date: '',
        mrp: '',
        purchase_price: '',
        net_price: '',
        stock_quantity: ''
    })

    useEffect(() => {
        if (item) {
            setFormData(item)
        }
    }, [item])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        await onSave(formData)
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{item ? 'Edit Item' : 'Add New Item'}</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="item-form">
                    <div className="form-group">
                        <label>Item Name</label>
                        <input name="item_name" value={formData.item_name} onChange={handleChange} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Batch No</label>
                            <input name="batch_no" value={formData.batch_no} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Expiry Date</label>
                            <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>MRP</label>
                            <input type="number" step="0.01" name="mrp" value={formData.mrp} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Purchase Price</label>
                            <input type="number" step="0.01" name="purchase_price" value={formData.purchase_price} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Net Price</label>
                            <input type="number" step="0.01" name="net_price" value={formData.net_price} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Stock Quantity</label>
                            <input type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ItemForm
