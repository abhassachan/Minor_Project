import { useState, useEffect } from 'react';
import { User, Activity, Map, Trophy, Settings, Medal, LogOut, Hexagon, X, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
    const [user, setUser] = useState({});
    const [showSettings, setShowSettings] = useState(false);
    const [editName, setEditName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);

        // Fetch fresh data from backend
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                const res = await fetch(`${API_BASE}/profile`, {
                    // Try Authorization header first, fallback to x-auth-token based on existing code
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'x-auth-token': token
                    }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setUser(data.user);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch latest profile:', err);
            }
        };
        
        fetchProfile();
    }, [API_BASE]);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
    };

    const handleOpenSettings = () => {
        setEditName(user.name || '');
        setEditUsername(user.username || '');
        setShowSettings(true);
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ name: editName, username: editUsername })
            });
            const data = await res.json();
            
            if (res.ok) {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
                setShowSettings(false);
            } else {
                alert(data.error || 'Failed to update profile');
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Something went wrong.');
        }
        setIsSaving(false);
    };

    const initials = (user.name || 'Runner').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="min-h-[100dvh] bg-[#f8fafc] dark:bg-dark-bg font-body text-brand-ink dark:text-dark-text pb-24 transition-colors duration-300">
            {/* Header & Avatar */}
            <div className="bg-gradient-to-br from-brand-ink via-slate-800 to-brand-teal text-white pt-16 pb-12 px-6 rounded-b-[2.5rem] relative shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <h1 className="text-3xl font-heading font-black">Profile</h1>
                    <button 
                        onClick={handleOpenSettings}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-sm"
                    >
                        <Settings size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-orange to-amber-500 flex items-center justify-center text-3xl font-black shadow-lg border-2 border-white/20">
                        {initials}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{user.name}</h2>
                        <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                            @{user.username || 'runner'} • <span className="uppercase text-[10px] tracking-widest font-bold bg-brand-teal/30 px-2 py-0.5 rounded text-brand-teal-light">{user.league?.name || 'Bronze'} League</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-5 -mt-6 relative z-20 space-y-4">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm dark:shadow-black/20 border border-brand-border dark:border-dark-border flex items-center gap-3 transition-colors duration-300">
                        <div className="w-10 h-10 bg-brand-teal/10 rounded-xl flex items-center justify-center text-brand-teal">
                            <Activity size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] text-brand-muted dark:text-dark-muted uppercase font-bold tracking-wider">Distance</div>
                            <div className="font-mono font-bold text-lg">{user.totalDistance?.toFixed(1) || '0.0'} <span className="text-[10px]">km</span></div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm dark:shadow-black/20 border border-brand-border dark:border-dark-border flex items-center gap-3 transition-colors duration-300">
                        <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange">
                            <Map size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] text-brand-muted dark:text-dark-muted uppercase font-bold tracking-wider">Territory</div>
                            <div className="font-mono font-bold text-lg">{user.totalArea || 0} <span className="text-[10px]">m²</span></div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm dark:shadow-black/20 border border-brand-border dark:border-dark-border flex items-center gap-3 transition-colors duration-300">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] text-brand-muted dark:text-dark-muted uppercase font-bold tracking-wider">Missions</div>
                            <div className="font-mono font-bold text-lg">{user.totalLoops || 0} <span className="text-[10px]">won</span></div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl shadow-sm dark:shadow-black/20 border border-brand-border dark:border-dark-border flex items-center gap-3 transition-colors duration-300">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                            <Hexagon size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] text-brand-muted dark:text-dark-muted uppercase font-bold tracking-wider">Level XP</div>
                            <div className="font-mono font-bold text-lg">{user.weeklyXP || 0}</div>
                        </div>
                    </div>
                </div>

                {/* FitCoins Section */}
                <div className="bg-gradient-to-r from-brand-teal to-brand-teal-dark text-white p-5 rounded-[2rem] shadow-lg mt-4 flex items-center justify-between transition-transform duration-300 hover:scale-[1.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Trophy size={24} className="text-amber-300" />
                        </div>
                        <div>
                            <h3 className="font-heading font-black text-xl">FitCoins</h3>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Rewards Balance</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-mono text-3xl font-black">{user.fitCoins || 0}</div>
                        <p className="text-[10px] text-white/60 font-bold tracking-widest mt-1">REDEEM SOON</p>
                    </div>
                </div>

                {/* Achievements Section */}
                <div className="bg-white dark:bg-dark-surface p-5 rounded-[2rem] shadow-sm dark:shadow-black/20 border border-brand-border dark:border-dark-border mt-4 transition-colors duration-300">
                    <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                        <Medal size={20} className="text-amber-400" /> Trophy Cabinet
                    </h3>
                    
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {user.achievements && user.achievements.length > 0 ? (
                            user.achievements.map((ach, i) => (
                                <div key={i} className="min-w-[80px] flex flex-col items-center gap-2 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 border-4 border-amber-100 flex items-center justify-center shadow-inner">
                                        <Trophy className="text-white" size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold text-brand-ink dark:text-dark-text uppercase leading-tight">{ach.replace('_', ' ')}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-brand-muted dark:text-dark-muted text-center w-full py-4 bg-brand-surface2 dark:bg-dark-surface2 rounded-xl">
                                No achievements yet. Start running!
                            </div>
                        )}
                    </div>
                </div>

                {/* Account Actions */}
                <div className="pt-4">
                    <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
                        <LogOut size={18} /> Sign Out
                    </button>
                    <div className="text-center mt-6 py-4">
                         <p className="text-[10px] font-bold text-brand-muted dark:text-dark-muted uppercase tracking-widest">Territory Run v1.0.0</p>
                    </div>
                </div>

            </div>

            {/* Settings Modal Overlay */}
            {showSettings && (
                <div className="fixed inset-0 bg-brand-ink/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-dark-surface rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-brand-border dark:border-dark-border flex justify-between items-center bg-brand-surface dark:bg-dark-surface2">
                            <h3 className="font-heading font-bold text-lg text-brand-ink dark:text-dark-text">Edit Profile</h3>
                            <button onClick={() => setShowSettings(false)} className="text-brand-muted dark:text-dark-muted hover:text-brand-ink dark:hover:text-dark-text transition p-1 bg-white dark:bg-dark-surface rounded-full shadow-sm border border-brand-border dark:border-dark-border">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-muted dark:text-dark-muted uppercase tracking-wider mb-1">Display Name</label>
                                <input 
                                    type="text" 
                                    value={editName} 
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-brand-surface2 dark:bg-dark-surface2 border border-brand-border dark:border-dark-border rounded-xl px-4 py-3 text-sm text-brand-ink dark:text-dark-text focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-muted dark:text-dark-muted uppercase tracking-wider mb-1">Username</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted dark:text-dark-muted">@</span>
                                    <input 
                                        type="text" 
                                        value={editUsername} 
                                        onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        className="w-full bg-brand-surface2 dark:bg-dark-surface2 border border-brand-border dark:border-dark-border rounded-xl pl-9 pr-4 py-3 text-sm text-brand-ink dark:text-dark-text focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 bg-brand-surface dark:bg-dark-surface2 border-t border-brand-border dark:border-dark-border">
                            <button 
                                onClick={handleSaveSettings}
                                disabled={isSaving || !editName.trim() || !editUsername.trim()}
                                className="w-full bg-brand-teal hover:bg-brand-teal-light text-white font-bold py-3 rounded-xl shadow-md shadow-brand-teal/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}