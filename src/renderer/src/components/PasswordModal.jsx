import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

function PasswordModal({ isOpen, onClose, onSubmit }) {
    const [password, setPassword] = useState('')
    const passwordInputRef = React.useRef(null)

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                if (passwordInputRef.current) {
                    passwordInputRef.current.focus()
                }
            }, 100)
        }
    }, [isOpen])

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
                            ref={passwordInputRef}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            required
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
