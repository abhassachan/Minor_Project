import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AuthPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
    const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    // Password strength
    const getStrength = (pw) => {
        let s = 0;
        if (pw.length >= 8) s++;
        if (/[A-Z]/.test(pw)) s++;
        if (/[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        return s;
    };
    const strength = getStrength(form.password);
    const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength] || '';
    const strengthColor = ['', '#f56565', '#f6ad55', '#2dce89', '#2dce89'][strength] || '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (tab === 'signup') {
                if (form.password !== form.confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }
                if (form.password.length < 8) {
                    setError('Password must be at least 8 characters');
                    setLoading(false);
                    return;
                }
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: form.name, username: form.username, email: form.email, password: form.password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Registration failed');
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/dashboard');
            } else {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: form.email, password: form.password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Login failed');
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/dashboard');
            }
        } catch (err) {
            if (err.message === 'Failed to fetch') {
                setError('Cannot connect to server. Is the backend running?');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-offwhite dark:bg-dark-bg flex items-center justify-center px-4 py-8 font-body transition-colors duration-300">
            <div className="w-full max-w-md">
                {/* Logo + Theme Toggle */}
                <div className="text-center mb-8 relative">
                    <div className="absolute right-0 top-0">
                        <ThemeToggle />
                    </div>
                    <Link to="/" className="inline-flex items-center gap-1 text-3xl font-heading tracking-tight">
                        <span className="text-brand-ink dark:text-dark-text">TERRITORY</span>
                        <span className="text-brand-teal">RUN</span>
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-black/40 border border-brand-ink/5 dark:border-dark-border p-8 sm:p-10 transition-colors duration-300">
                    {/* Tabs */}
                    <div className="flex bg-brand-offwhite dark:bg-dark-bg rounded-full p-1 mb-8">
                        <button
                            onClick={() => { setTab('signin'); setError(''); }}
                            className={`flex-1 py-3 rounded-full text-sm font-bold transition-all ${tab === 'signin' ? 'bg-white dark:bg-dark-surface2 shadow-sm text-brand-ink dark:text-dark-text' : 'text-brand-muted dark:text-dark-muted'}`}>
                            Sign In
                        </button>
                        <button
                            onClick={() => { setTab('signup'); setError(''); }}
                            className={`flex-1 py-3 rounded-full text-sm font-bold transition-all ${tab === 'signup' ? 'bg-white dark:bg-dark-surface2 shadow-sm text-brand-ink dark:text-dark-text' : 'text-brand-muted dark:text-dark-muted'}`}>
                            Sign Up
                        </button>
                    </div>

                    {/* Header */}
                    <h1 className="text-3xl font-bold text-brand-ink dark:text-dark-text mb-1 font-body" style={{ fontStyle: 'italic' }}>
                        {tab === 'signin' ? 'Welcome back' : 'Create account'}
                    </h1>
                    <p className="text-brand-muted dark:text-dark-muted mb-8">
                        {tab === 'signin' ? 'Enter your details to reclaim your territory' : 'Join the battle for your city'}
                    </p>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 text-brand-danger text-sm">{error}</div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {tab === 'signup' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink dark:text-dark-text mb-2">Full Name</label>
                                <div className="flex items-center gap-3 border border-brand-border dark:border-dark-border rounded-xl px-4 py-3 auth-input-focus transition-all bg-white dark:bg-dark-surface2">
                                    <span className="text-brand-muted dark:text-dark-muted">👤</span>
                                    <input type="text" placeholder="Your full name" required
                                        className="flex-1 outline-none bg-transparent text-brand-ink dark:text-dark-text placeholder-brand-muted dark:placeholder-dark-muted"
                                        value={form.name} onChange={e => update('name', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {tab === 'signup' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink dark:text-dark-text mb-2">Username</label>
                                <div className="flex items-center gap-3 border border-brand-border dark:border-dark-border rounded-xl px-4 py-3 auth-input-focus transition-all bg-white dark:bg-dark-surface2">
                                    <span className="text-brand-muted dark:text-dark-muted">@</span>
                                    <input type="text" placeholder="Choose a username" required
                                        className="flex-1 outline-none bg-transparent text-brand-ink dark:text-dark-text placeholder-brand-muted dark:placeholder-dark-muted"
                                        value={form.username} onChange={e => update('username', e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink dark:text-dark-text mb-2">Email Address</label>
                            <div className="flex items-center gap-3 border border-brand-border dark:border-dark-border rounded-xl px-4 py-3 auth-input-focus transition-all bg-white dark:bg-dark-surface2">
                                <span className="text-brand-muted dark:text-dark-muted">✉️</span>
                                <input type="email" placeholder="you@example.com" required
                                    className="flex-1 outline-none bg-transparent text-brand-ink dark:text-dark-text placeholder-brand-muted dark:placeholder-dark-muted"
                                    value={form.email} onChange={e => update('email', e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink dark:text-dark-text">Password</label>
                                {tab === 'signin' && <span className="text-xs text-brand-teal font-medium cursor-pointer">Forgot?</span>}
                            </div>
                            <div className="flex items-center gap-3 border border-brand-border dark:border-dark-border rounded-xl px-4 py-3 auth-input-focus transition-all bg-white dark:bg-dark-surface2">
                                <span className="text-brand-muted dark:text-dark-muted">🔒</span>
                                <input type={showPw ? 'text' : 'password'} placeholder="••••••••" required
                                    className="flex-1 outline-none bg-transparent text-brand-ink dark:text-dark-text placeholder-brand-muted dark:placeholder-dark-muted"
                                    value={form.password} onChange={e => update('password', e.target.value)} />
                                <button type="button" onClick={() => setShowPw(!showPw)} className="text-brand-muted dark:text-dark-muted hover:text-brand-ink dark:hover:text-dark-text">
                                    {showPw ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {/* Strength meter */}
                            {tab === 'signup' && form.password.length > 0 && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: i <= strength ? strengthColor : 'var(--color-brand-border)' }} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-brand-muted dark:text-dark-muted">Password strength: <span style={{ color: strengthColor }}>{strengthLabel}</span></p>
                                </div>
                            )}
                        </div>

                        {tab === 'signup' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink dark:text-dark-text mb-2">Confirm Password</label>
                                <div className="flex items-center gap-3 border border-brand-border dark:border-dark-border rounded-xl px-4 py-3 auth-input-focus transition-all bg-white dark:bg-dark-surface2">
                                    <span className="text-brand-muted dark:text-dark-muted">🔒</span>
                                    <input type="password" placeholder="••••••••" required
                                        className="flex-1 outline-none bg-transparent text-brand-ink dark:text-dark-text placeholder-brand-muted dark:placeholder-dark-muted"
                                        value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            className="w-full bg-brand-ink dark:bg-brand-teal text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50">
                            {loading ? 'Please wait...' : (tab === 'signin' ? 'Sign In to Dashboard' : 'Create Account')}
                        </button>
                    </form>

                    {/* Switch */}
                    <p className="text-center mt-6 text-sm text-brand-muted dark:text-dark-muted">
                        {tab === 'signin' ? (
                            <>New here? <button onClick={() => setTab('signup')} className="text-brand-teal font-medium">Create an account →</button></>
                        ) : (
                            <>Already have an account? <button onClick={() => setTab('signin')} className="text-brand-teal font-medium">Sign in →</button></>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
