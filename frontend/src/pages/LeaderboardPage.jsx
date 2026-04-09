import { useState, useEffect, useCallback } from 'react';
import { Trophy, MapPin, Users, Globe, Activity, Map, Route } from 'lucide-react';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;

export default function LeaderboardPage() {
    const [tab, setTab] = useState('global');
    const [sortBy, setSortBy] = useState('distance');
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userClanId, setUserClanId] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Load user info once on mount
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUserClanId(storedUser.clanId || null);
        setCurrentUserId(storedUser.id || storedUser._id);
    }, []);

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            let endpoint = '';
            if (tab === 'clan') {
                if (!userClanId) {
                    setRankings([]);
                    setLoading(false);
                    return;
                }
                endpoint = `${API_BASE}/clans/${userClanId}/leaderboard`;
            } else {
                endpoint = `${API_BASE}/leaderboard/${tab}?tab=${sortBy}`;
            }

            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (tab === 'clan') {
                const sorted = data
                    .map(u => ({
                        user: u,
                        score: sortBy === 'area' ? (u.totalArea || 0)
                            : sortBy === 'distance' ? (u.totalDistance || 0)
                            : (u.totalLoops || 0),
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map((item, index) => ({ ...item, rank: index + 1 }));
                setRankings(sorted);
            } else {
                setRankings(data.rankings || []);
            }
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
            setRankings([]);
        } finally {
            setLoading(false);
        }
    }, [tab, sortBy, userClanId]);

    // Fetch whenever tab, sortBy, or userClanId changes
    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    const getRankStyle = (rank) => {
        if (rank === 1) return 'bg-amber-400 text-amber-900 shadow-[0_0_15px_rgba(251,191,36,0.5)] border border-amber-300';
        if (rank === 2) return 'bg-slate-300 text-slate-800 shadow-[0_0_15px_rgba(203,213,225,0.4)] border border-slate-200';
        if (rank === 3) return 'bg-orange-400 text-orange-950 shadow-[0_0_15px_rgba(251,146,60,0.4)] border border-orange-300';
        return 'glass-card border border-brand-border text-brand-ink';
    };

    return (
        <div className="min-h-[100dvh] bg-[#f8fafc] font-body text-brand-ink pb-20">
            {/* Header Hero Section */}
            <div className="pt-12 pb-6 px-6 bg-gradient-to-br from-brand-ink via-slate-800 to-brand-teal text-white rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="relative z-10 flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-heading font-bold tracking-tight">Leaderboards</h1>
                        <p className="text-white/70 text-sm mt-1">Conquer the streets.</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <Trophy className="text-amber-400" fill="currentColor" size={24} />
                    </div>
                </div>

                {/* Primary Tabs */}
                <div className="flex bg-black/20 p-1.5 rounded-full backdrop-blur-md border border-white/10">
                    {[
                        { id: 'global', icon: Globe, label: 'Global' },
                        { id: 'local', icon: MapPin, label: 'Local' },
                        { id: 'clan', icon: Users, label: 'My Clan' }
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                                tab === t.id ? 'bg-white text-brand-ink shadow-sm scale-100' : 'text-white/60 hover:text-white scale-95 hover:scale-100'
                            }`}>
                            <t.icon size={14} />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-5 mt-6">
                {/* Secondary Filters */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        { id: 'distance', icon: Route, label: 'Total Distance', unit: 'km' },
                        { id: 'area', icon: Map, label: 'Territory Claimed', unit: 'm²' },
                        { id: 'loops', icon: Activity, label: 'Completed Loops', unit: 'loops' }
                    ].map(s => (
                        <button key={s.id} onClick={() => setSortBy(s.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                                sortBy === s.id
                                ? 'bg-brand-teal/10 border-brand-teal text-brand-teal shadow-sm'
                                : 'bg-white border-brand-border text-brand-muted hover:bg-slate-50'
                            }`}>
                            <s.icon size={14} />
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* No clan state */}
                {tab === 'clan' && !userClanId && (
                    <div className="mt-12 text-center">
                        <div className="w-20 h-20 bg-brand-surface2 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-border">
                            <Users size={32} className="text-brand-muted" />
                        </div>
                        <h3 className="text-lg font-bold">No Clan Found</h3>
                        <p className="text-sm text-brand-muted mt-2 max-w-[250px] mx-auto">Join a clan to compete on the internal team leaderboard!</p>
                    </div>
                )}

                {/* Leaderboard List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rankings.map((r, i) => {
                            const isMe = r.user._id === currentUserId;
                            const initials = (r.user.name || 'Runner').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

                            return (
                                <div key={r.user._id || i}
                                    className={`relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                                        isMe ? 'bg-white border-2 border-brand-teal shadow-sm z-10' : 'bg-white border border-brand-border shadow-sm'
                                    }`}>

                                    {/* Rank Number */}
                                    <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${getRankStyle(r.rank)}`}>
                                        {r.rank}
                                    </div>

                                    {/* Avatar */}
                                    <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center text-white font-bold text-sm shadow-sm relative">
                                        {initials}
                                        {isMe && <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-teal rounded-full border-2 border-white"></div>}
                                    </div>

                                    {/* Name & Stats */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-[15px] truncate flex items-center gap-2">
                                            {r.user.name}
                                            {isMe && <span className="text-[10px] bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full uppercase tracking-wide">You</span>}
                                        </h3>
                                        <p className="text-[12px] text-brand-muted truncate">
                                            {r.user.city ? `${r.user.city} · ` : ''}
                                            {r.user.league?.name || 'Bronze'} League
                                        </p>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right">
                                        <div className="font-mono text-lg font-bold text-brand-teal">
                                            {sortBy === 'distance' ? r.score?.toFixed(1) || '0' : r.score || '0'}
                                        </div>
                                        <div className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">
                                            {sortBy === 'distance' ? 'km' : sortBy === 'area' ? 'm²' : 'loops'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {rankings.length === 0 && !(tab === 'clan' && !userClanId) && !loading && (
                            <div className="text-center py-10 text-brand-muted text-sm">
                                No runners found in this category yet.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};