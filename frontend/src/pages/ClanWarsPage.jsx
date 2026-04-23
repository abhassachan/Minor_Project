import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Search, Clock, Trophy, Shield, Users, ChevronLeft, Send, CheckCircle, XCircle, Loader2, Flame, Target, Footprints } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function ClanWarsPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [clanData, setClanData] = useState(null);
    const [war, setWar] = useState(null);
    const [history, setHistory] = useState([]);
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [duration, setDuration] = useState(24);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tab, setTab] = useState('war'); // 'war' | 'history'
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/auth'); return; }
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(u);
        if (!u.clanId) { setLoading(false); return; }
        fetchAll(u.clanId);
    }, [navigate]);

    const fetchAll = async (clanId) => {
        setLoading(true);
        try {
            const [clanRes, warRes, histRes] = await Promise.all([
                fetch(`${API}/clans/${clanId}`),
                fetch(`${API}/clanwars/active`, { headers: headers() }),
                fetch(`${API}/clanwars/history`, { headers: headers() }),
            ]);
            if (clanRes.ok) setClanData(await clanRes.json());
            const warData = await warRes.json();
            setWar(warData.war || null);
            const histData = await histRes.json();
            setHistory(histData.wars || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // Countdown timer for active wars
    useEffect(() => {
        if (!war || war.status !== 'active') return;
        const tick = () => {
            const diff = new Date(war.endsAt) - new Date();
            if (diff <= 0) { setCountdown('WAR ENDED'); fetchAll(user?.clanId); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(`${h}h ${m}m ${s}s`);
        };
        tick();
        const iv = setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, [war]);

    // Auto-refresh scores every 30s for active wars
    useEffect(() => {
        if (!war || war.status !== 'active') return;
        const iv = setInterval(() => fetchAll(user?.clanId), 30000);
        return () => clearInterval(iv);
    }, [war, user]);

    const searchClans = async () => {
        if (!searchQ.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`${API}/clanwars/search/clans?q=${encodeURIComponent(searchQ)}`, { headers: headers() });
            const data = await res.json();
            setSearchResults(data.clans || []);
        } catch (e) { console.error(e); }
        setSearching(false);
    };

    const doAction = async (url, method = 'POST', body = null) => {
        setError(''); setSuccess(''); setActionLoading(true);
        try {
            const opts = { method, headers: headers() };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch(url, opts);
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Something went wrong'); setActionLoading(false); return; }
            setSuccess(data.message || 'Done!');
            fetchAll(user?.clanId);
        } catch (e) { setError('Network error'); }
        setActionLoading(false);
    };

    const isLeader = clanData?.creator?._id === user?._id;
    const iAmChallenger = war?.challengerClan?._id === user?.clanId;
    const iAmDefender = war?.defenderClan?._id === user?.clanId;
    const myClanName = iAmChallenger ? war?.challengerClan?.name : war?.defenderClan?.name;
    const enemyClanName = iAmChallenger ? war?.defenderClan?.name : war?.challengerClan?.name;
    const myScores = war?.liveScores ? (iAmChallenger ? war.liveScores.challenger : war.liveScores.defender) : (iAmChallenger ? war?.scores?.challenger : war?.scores?.defender);
    const enemyScores = war?.liveScores ? (iAmChallenger ? war.liveScores.defender : war.liveScores.challenger) : (iAmChallenger ? war?.scores?.defender : war?.scores?.challenger);

    if (loading) return (
        <div className="min-h-screen bg-[#f8fafc] flex justify-center pt-20">
            <Loader2 className="animate-spin text-brand-teal" size={32} />
        </div>
    );

    if (!user?.clanId) return (
        <div className="min-h-[100dvh] bg-[#f8fafc] font-body text-brand-ink p-6 flex flex-col items-center justify-center text-center">
            <Swords size={48} className="text-brand-muted mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">Join a Clan First</h1>
            <p className="text-brand-muted text-sm mb-6">You need to be in a clan to participate in Clan Wars.</p>
            <button onClick={() => navigate('/clans')} className="bg-brand-teal text-white font-bold py-3 px-8 rounded-2xl">Go to Clans</button>
        </div>
    );

    // ── SCORE BAR COMPONENT ──
    const ScoreBar = ({ my, enemy }) => {
        const total = (my || 0) + (enemy || 0);
        const myPct = total > 0 ? Math.round((my / total) * 100) : 50;
        return (
            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700" style={{ width: `${myPct}%` }} />
                <div className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700" style={{ width: `${100 - myPct}%` }} />
            </div>
        );
    };

    return (
        <div className="min-h-[100dvh] bg-[#f8fafc] font-body text-brand-ink pb-24">
            {/* Header */}
            <div className="pt-10 pb-6 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-b-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-40 h-40 bg-red-500/15 rounded-full blur-[60px]" />
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-orange-500/15 rounded-full blur-[60px]" />
                <div className="relative z-10">
                    <button onClick={() => navigate('/clans')} className="flex items-center gap-1 text-white/60 text-xs mb-4 hover:text-white/90 transition-colors">
                        <ChevronLeft size={14} /> Back to Clan
                    </button>
                    <div className="flex items-center gap-3 mb-1">
                        <Swords size={28} className="text-red-400" />
                        <h1 className="text-3xl font-heading font-black tracking-wide">Clan Wars</h1>
                    </div>
                    <p className="text-white/50 text-xs ml-1">Battle rival clans for supremacy</p>
                </div>
                {/* Tabs */}
                <div className="relative z-10 flex gap-2 mt-5">
                    {['war', 'history'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${tab === t ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}>
                            {t === 'war' ? '⚔️ Active' : '📜 History'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-5 mt-5 space-y-5">
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center border border-red-200">{error}</div>}
                {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm font-bold text-center border border-green-200">{success}</div>}

                {tab === 'war' && (
                    <>
                        {/* ── ACTIVE WAR DASHBOARD ── */}
                        {war?.status === 'active' && (
                            <div className="space-y-4">
                                {/* VS Header */}
                                <div className="bg-white rounded-2xl shadow-md border border-brand-border p-5 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-red-500/5" />
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-center flex-1">
                                                <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest mb-1">Your Clan</div>
                                                <div className="font-heading text-xl font-black">{myClanName}</div>
                                                <div className="font-mono text-3xl font-black text-emerald-600 mt-1">{myScores?.total || 0}</div>
                                            </div>
                                            <div className="px-3">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center shadow-lg">
                                                    <Swords size={20} className="text-white" />
                                                </div>
                                            </div>
                                            <div className="text-center flex-1">
                                                <div className="text-[10px] text-red-500 uppercase font-bold tracking-widest mb-1">Enemy</div>
                                                <div className="font-heading text-xl font-black">{enemyClanName}</div>
                                                <div className="font-mono text-3xl font-black text-red-500 mt-1">{enemyScores?.total || 0}</div>
                                            </div>
                                        </div>
                                        <ScoreBar my={myScores?.total || 0} enemy={enemyScores?.total || 0} />
                                        <div className="flex items-center justify-center gap-2 mt-3 text-brand-muted">
                                            <Clock size={14} />
                                            <span className="font-mono text-sm font-bold">{countdown}</span>
                                            <span className="text-xs">remaining</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stat Breakdown */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { icon: Footprints, label: 'Distance', my: `${myScores?.distance || 0}km`, enemy: `${enemyScores?.distance || 0}km`, color: 'text-blue-500' },
                                        { icon: Target, label: 'Territories', my: myScores?.territories || 0, enemy: enemyScores?.territories || 0, color: 'text-purple-500' },
                                        { icon: Users, label: 'Active', my: myScores?.participants || 0, enemy: enemyScores?.participants || 0, color: 'text-amber-500' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-white p-3 rounded-xl border border-brand-border shadow-sm text-center">
                                            <s.icon size={16} className={`${s.color} mx-auto mb-1`} />
                                            <div className="text-[9px] text-brand-muted uppercase font-bold tracking-wider">{s.label}</div>
                                            <div className="text-sm font-bold text-emerald-600 mt-1">{s.my}</div>
                                            <div className="text-xs text-red-400">{s.enemy}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="text-center text-[10px] text-brand-muted">Scores auto-refresh every 30 seconds</div>
                            </div>
                        )}

                        {/* ── PROPOSED: waiting for leader approval ── */}
                        {war?.status === 'proposed' && (
                            <div className="bg-white rounded-2xl shadow-md border border-amber-200 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock size={18} className="text-amber-500" />
                                    <span className="font-bold text-sm">Awaiting Leader Approval</span>
                                </div>
                                <p className="text-sm text-brand-muted mb-2">
                                    <strong>{war.proposedBy?.name}</strong> proposed a war against <strong>{enemyClanName}</strong>.
                                </p>
                                {isLeader && (
                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">War Duration</label>
                                            <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                                                className="w-full mt-1 p-3 bg-[#f8fafc] rounded-xl border-none text-sm font-bold">
                                                <option value={6}>6 Hours</option>
                                                <option value={12}>12 Hours</option>
                                                <option value={24}>24 Hours</option>
                                                <option value={48}>48 Hours</option>
                                                <option value={72}>3 Days</option>
                                                <option value={168}>7 Days</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button disabled={actionLoading} onClick={() => doAction(`${API}/clanwars/${war._id}/approve`, 'POST', { duration })}
                                                className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                                                <CheckCircle size={16} /> Approve & Send
                                            </button>
                                            <button disabled={actionLoading} onClick={() => doAction(`${API}/clanwars/${war._id}/cancel`)}
                                                className="flex-1 bg-slate-100 text-brand-ink font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {!isLeader && <p className="text-xs text-amber-600 mt-2">Your clan leader needs to approve this challenge.</p>}
                            </div>
                        )}

                        {/* ── PENDING: waiting for defender to accept ── */}
                        {war?.status === 'pending' && iAmChallenger && (
                            <div className="bg-white rounded-2xl shadow-md border border-blue-200 p-5 text-center">
                                <Loader2 size={24} className="text-blue-500 animate-spin mx-auto mb-3" />
                                <p className="font-bold text-sm mb-1">Challenge Sent!</p>
                                <p className="text-sm text-brand-muted">Waiting for <strong>{enemyClanName}</strong> to accept…</p>
                                <p className="text-xs text-brand-muted mt-2">Duration: {war.duration}h</p>
                                {(isLeader || war.proposedBy?._id === user?._id) && (
                                    <button disabled={actionLoading} onClick={() => doAction(`${API}/clanwars/${war._id}/cancel`)}
                                        className="mt-4 text-red-500 text-xs font-bold hover:text-red-600">Cancel Challenge</button>
                                )}
                            </div>
                        )}

                        {/* ── PENDING: I'm the defender, accept/decline ── */}
                        {war?.status === 'pending' && iAmDefender && (
                            <div className="bg-white rounded-2xl shadow-md border border-red-200 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Swords size={18} className="text-red-500" />
                                    <span className="font-bold text-sm text-red-600">Incoming War Challenge!</span>
                                </div>
                                <p className="text-sm text-brand-muted mb-1"><strong>{war.challengerClan?.name}</strong> challenges you to a <strong>{war.duration}h</strong> war!</p>
                                <p className="text-xs text-brand-muted mb-4">Members: {war.challengerClan?.members?.length || '?'}</p>
                                {isLeader ? (
                                    <div className="flex gap-2">
                                        <button disabled={actionLoading} onClick={() => doAction(`${API}/clanwars/${war._id}/accept`)}
                                            className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                                            <Swords size={16} /> Accept War
                                        </button>
                                        <button disabled={actionLoading} onClick={() => doAction(`${API}/clanwars/${war._id}/decline`)}
                                            className="flex-1 bg-slate-100 text-brand-ink font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">
                                            Decline
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-amber-600">Your clan leader must accept or decline this challenge.</p>
                                )}
                            </div>
                        )}

                        {/* ── NO WAR: search & challenge ── */}
                        {!war && (
                            <div className="space-y-5">
                                <div className="bg-white rounded-2xl shadow-md border border-brand-border p-5 relative overflow-hidden">
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-400 rounded-full blur-[40px] opacity-15" />
                                    <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
                                        <Search size={20} className="text-red-400" /> Find a Rival
                                    </h2>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" placeholder="Search clan name…" value={searchQ}
                                            onChange={e => setSearchQ(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && searchClans()}
                                            className="flex-1 bg-[#f8fafc] p-3 rounded-xl text-sm border-none focus:ring-2 focus:ring-red-300 transition-all" />
                                        <button onClick={searchClans} disabled={searching}
                                            className="bg-slate-900 text-white px-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">
                                            {searching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                                        </button>
                                    </div>

                                    {/* Duration picker */}
                                    <div className="mb-4">
                                        <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">War Duration</label>
                                        <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                                            className="w-full mt-1 p-3 bg-[#f8fafc] rounded-xl border-none text-sm font-bold">
                                            <option value={6}>6 Hours</option>
                                            <option value={12}>12 Hours</option>
                                            <option value={24}>24 Hours (default)</option>
                                            <option value={48}>48 Hours</option>
                                            <option value={72}>3 Days</option>
                                            <option value={168}>7 Days</option>
                                        </select>
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="space-y-2">
                                            {searchResults.map(c => (
                                                <div key={c._id} className="flex items-center justify-between bg-[#f8fafc] p-3 rounded-xl">
                                                    <div>
                                                        <div className="font-bold text-sm">{c.name}</div>
                                                        <div className="text-[10px] text-brand-muted">{c.memberCount} members</div>
                                                    </div>
                                                    <button disabled={actionLoading}
                                                        onClick={() => doAction(`${API}/clanwars/propose`, 'POST', { targetClanId: c._id, duration })}
                                                        className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1">
                                                        <Swords size={12} /> Challenge
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.length === 0 && searchQ && !searching && (
                                        <p className="text-sm text-brand-muted text-center py-3">No clans found</p>
                                    )}
                                </div>

                                {/* Scoring info */}
                                <div className="bg-slate-900 text-white rounded-2xl p-5">
                                    <h3 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
                                        <Flame size={16} className="text-amber-400" /> How Wars Work
                                    </h3>
                                    <div className="space-y-2 text-xs text-white/70">
                                        <p>• Any member can propose a war — leader must approve</p>
                                        <p>• Leader picks the duration before sending</p>
                                        <p>• Only <strong className="text-white">1 active war</strong> per clan at a time</p>
                                        <p className="pt-2 border-t border-white/10 font-bold text-white/90">Scoring:</p>
                                        <p><span className="text-emerald-400">+10 pts</span> per km run</p>
                                        <p><span className="text-purple-400">+50 pts</span> per territory captured</p>
                                        <p><span className="text-amber-400">+25 pts</span> per active member</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── HISTORY TAB ── */}
                {tab === 'history' && (
                    <div className="space-y-3">
                        {history.length === 0 && (
                            <div className="text-center py-12">
                                <Trophy size={40} className="text-brand-muted mx-auto mb-3 opacity-30" />
                                <p className="text-brand-muted text-sm">No past wars yet</p>
                            </div>
                        )}
                        {history.map(w => {
                            const won = w.winner?._id === user?.clanId || w.winner === user?.clanId;
                            const isCh = w.challengerClan?._id === user?.clanId;
                            const opponent = isCh ? w.defenderClan?.name : w.challengerClan?.name;
                            const myTotal = isCh ? w.scores?.challenger?.total : w.scores?.defender?.total;
                            const enemyTotal = isCh ? w.scores?.defender?.total : w.scores?.challenger?.total;
                            return (
                                <div key={w._id} className={`bg-white p-4 rounded-xl border shadow-sm ${w.status === 'completed' ? (won ? 'border-emerald-200' : 'border-red-200') : 'border-brand-border'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-sm flex items-center gap-2">
                                                vs {opponent}
                                                {w.status === 'completed' && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${won ? 'bg-emerald-100 text-emerald-600' : w.winner ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                                                        {won ? 'Victory' : w.winner ? 'Defeat' : 'Draw'}
                                                    </span>
                                                )}
                                                {w.status === 'declined' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase">Declined</span>}
                                                {w.status === 'cancelled' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase">Cancelled</span>}
                                            </div>
                                            {w.status === 'completed' && (
                                                <div className="text-xs text-brand-muted mt-1 font-mono">{myTotal || 0} — {enemyTotal || 0}</div>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-brand-muted">{new Date(w.updatedAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
