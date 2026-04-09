import { useState, useEffect } from 'react';
import { Users, Plus, KeyRound, Shield, Trophy, Activity, Map } from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:5000/api`;

export default function ClanPage() {
    const [user, setUser] = useState(null);
    const [clanData, setClanData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [createName, setCreateName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        if (storedUser.clanId) {
            fetchClan(storedUser.clanId);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchClan = async (clanId) => {
        try {
            const res = await fetch(`${API_BASE}/clans/${clanId}`);
            const data = await res.json();
            if (res.ok) setClanData(data);
        } catch (err) {
            console.error('Failed to fetch clan');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClan = async () => {
        if (!createName) return;
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/clans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: createName })
            });
            const data = await res.json();
            if (res.ok) {
                const updatedUser = { ...user, clanId: data.clan._id };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                fetchClan(data.clan._id);
            } else {
                setError(data.error || 'Failed to create');
            }
        } catch (e) { setError('Network error'); }
    };

    const handleJoinClan = async () => {
        if (!joinCode) return;
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/clans/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ code: joinCode.toUpperCase() })
            });
            const data = await res.json();
            if (res.ok) {
                const updatedUser = { ...user, clanId: data.clan._id };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                fetchClan(data.clan._id);
            } else {
                setError(data.error || 'Failed to join');
            }
        } catch (e) { setError('Network error'); }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#f8fafc] flex justify-center pt-20">
            <div className="w-8 h-8 border-4 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin"></div>
        </div>
    );

    // ── STATE 1: USER HAS NO CLAN ──
    if (!user?.clanId) {
        return (
            <div className="min-h-[100dvh] bg-[#f8fafc] font-body text-brand-ink p-6 pb-24">
                <div className="text-center pt-8 mb-10">
                    <div className="w-20 h-20 bg-brand-surface2 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-border">
                        <Users size={32} className="text-brand-muted" />
                    </div>
                    <h1 className="text-3xl font-heading font-bold">Join a Clan</h1>
                    <p className="text-brand-muted text-sm mt-2">Team up to dominate territories together.</p>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 font-bold text-center border border-red-200">{error}</div>}

                <div className="space-y-6">
                    {/* Create Clan Card */}
                    <div className="glass-card border-none bg-white shadow-md rounded-[2.5rem] p-6 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-teal mt-0 ml-0 rounded-full blur-[40px] opacity-20"></div>
                        <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
                            <Plus size={20} className="text-brand-teal" /> Create a Squad
                        </h2>
                        <input 
                            type="text" 
                            placeholder="Awesome Team Name" 
                            className="w-full bg-[#f8fafc] p-4 rounded-2xl text-sm border-none focus:ring-2 focus:ring-brand-teal transition-all mb-4"
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                        />
                        <button onClick={handleCreateClan} className="w-full bg-brand-teal text-white font-bold py-3.5 rounded-2xl shadow-[0_4px_15px_rgba(35,160,148,0.3)] hover:opacity-90 transition-opacity">
                            Create New Clan
                        </button>
                    </div>

                    {/* Join Clan Card */}
                    <div className="glass-card border-none bg-white shadow-md rounded-[2.5rem] p-6 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-orange mt-0 ml-0 rounded-full blur-[40px] opacity-20"></div>
                        <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
                            <KeyRound size={20} className="text-brand-orange" /> Have an Invite?
                        </h2>
                        <input 
                            type="text" 
                            placeholder="Enter 6-digit Code (e.g. A3XZ9)" 
                            className="w-full bg-[#f8fafc] p-4 rounded-2xl text-sm border-none focus:ring-2 focus:ring-brand-orange transition-all mb-4 uppercase tracking-widest"
                            value={joinCode}
                            maxLength={6}
                            onChange={(e) => setJoinCode(e.target.value)}
                        />
                        <button onClick={handleJoinClan} className="w-full bg-brand-ink text-white font-bold py-3.5 rounded-2xl hover:bg-slate-800 transition-colors">
                            Join Clan
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── STATE 2: CLAN DASHBOARD ──
    const stats = clanData?.liveStats || { totalArea: 0, totalDistance: 0, totalLoops: 0 };
    return (
        <div className="min-h-[100dvh] bg-[#f8fafc] font-body text-brand-ink pb-20">
            {/* Clan Hero Header */}
            <div className="pt-12 pb-8 px-6 bg-gradient-to-br from-brand-ink to-slate-900 text-white rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/20 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-brand-teal font-bold text-xs uppercase tracking-widest">
                        <Shield size={14} /> Official Clan
                    </div>
                    <h1 className="text-4xl font-heading font-black mb-1">{clanData?.name}</h1>
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-white/60 text-sm">{clanData?.members?.length || 1} Members</p>
                        <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 flex flex-col items-end cursor-pointer" onClick={() => navigator.clipboard.writeText(clanData?.code)}>
                            <span className="text-[9px] text-white/50 uppercase font-bold tracking-widest leading-none">Invite Code</span>
                            <span className="font-mono font-bold tracking-widest text-brand-teal text-sm mt-1">{clanData?.code}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 mt-6 space-y-6">
                {/* Aggregated Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand-border">
                        <Map className="text-brand-teal mb-2" size={20} />
                        <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider mb-0.5">Total Empire</div>
                        <div className="font-mono text-xl font-bold">{stats.totalArea} <span className="text-xs">m²</span></div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand-border">
                        <Activity className="text-brand-orange mb-2" size={20} />
                        <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider mb-0.5">Total Distance</div>
                        <div className="font-mono text-xl font-bold">{stats.totalDistance.toFixed(1)} <span className="text-xs">km</span></div>
                    </div>
                </div>

                {/* Member List */}
                <div>
                    <h3 className="font-heading font-bold text-lg mb-3 flex items-center gap-2">
                        <Trophy size={18} className="text-amber-500" /> Roster
                    </h3>
                    <div className="space-y-3">
                        {clanData?.members?.map((m) => {
                            const initials = (m.name || 'Runner').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                            return (
                                <div key={m._id} className="bg-white p-3 rounded-xl border border-brand-border shadow-sm flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-brand-ink font-bold text-sm">
                                        {initials}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm">{m.name}</div>
                                        <div className="text-[10px] text-brand-muted font-mono">{m.totalDistance || 0}km · {m.totalArea || 0}m²</div>
                                    </div>
                                    {clanData.creator._id === m._id && (
                                        <div className="text-[9px] bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded uppercase font-bold">Leader</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Leave Clan Demo Button */}
                <button className="w-full mt-4 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors py-4">
                    LEAVE CLAN
                </button>
            </div>
        </div>
    );
}