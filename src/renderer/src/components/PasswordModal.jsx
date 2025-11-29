import React, { useState } from 'react'
import { X } from 'lucide-react'

function PasswordModal({ isOpen, onClose, onSubmit }) {
    const [password, setPassword] = useState('')

    if (!isOpen) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(password)
        setPassword('')
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Admin Access</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="item-form">
                    <div className="form-group">
                        <label>Enter Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary danger" style={{ backgroundColor: '#dc3545' }}>Confirm Reset</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default PasswordModal
