import React, { useState } from 'react'
import { Lock, User } from 'lucide-react'

function Login({ onLogin }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (username === 'admin' && password === 'Sachin@123') {
            onLogin()
        } else {
            setError('Invalid username or password')
        }
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)'
        }}>
            <div className="modal-content" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ color: 'var(--primary-color)', margin: 0 }}>Medical Inventory</h1>
                    <p style={{ color: 'var(--secondary-color)', marginTop: '10px' }}>Please sign in to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="item-form">
                    <div className="form-group">
                        <label>Username</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-color)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                                required
                            />
                        </div>
                    </div>

                    {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '10px' }}>
                        Sign In
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                    &copy; {new Date().getFullYear()} <a href="https://digitalmeedia.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>Digital Meedia</a>
                </div>
            </div>
        </div>
    )
}

export default Login
