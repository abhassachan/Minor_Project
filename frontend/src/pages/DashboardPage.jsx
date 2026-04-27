import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DashboardPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [runs, setRuns] = useState([]);
    const [streak, setStreak] = useState({ current: 0, longest: 0, runDates: [] });
    const [profile, setProfile] = useState(null);
    const [filter, setFilter] = useState('all');
    const [expandedRun, setExpandedRun] = useState(null);
    const [rivals, setRivals] = useState([]);
    const [leagueData, setLeagueData] = useState(null);
    const [dynamicChallenges, setDynamicChallenges] = useState([]);

    // Load user from localStorage
    useEffect(() => {
        const token = localStorage.getItem('token');
        const stored = JSON.parse(localStorage.getItem('user') || 'null');
        if (!token) {
            navigate('/auth');
            return;
        }
        setUser(stored);

        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch stats
        fetch(`${API_BASE}/runs/stats`, { headers })
            .then(r => r.json())
            .then(data => { if (data.stats) setStats(data.stats); })
            .catch(() => { });

        // Fetch runs
        fetch(`${API_BASE}/runs`, { headers })
            .then(r => r.json())
            .then(data => { if (data.runs) setRuns(data.runs); })
            .catch(() => { });

        // Fetch streak
        fetch(`${API_BASE}/streak`, { headers })
            .then(r => r.json())
            .then(data => { if (data.current !== undefined) setStreak(data); })
            .catch(() => { });

        // Fetch profile (for achievements, league info)
        fetch(`${API_BASE}/profile`, { headers })
            .then(r => r.json())
            .then(data => { if (data.user) setProfile(data.user); })
            .catch(() => { });

        // Fetch League Leaderboard (for Rivals)
        fetch(`${API_BASE}/leaderboard`, { headers })
            .then(r => r.json())
            .then(data => { 
                if (data.rankings) {
                    setLeagueData(data);
                    // Show up to 4 closest or top rivals
                    setRivals(data.rankings.slice(0, 4));
                }
            })
            .catch(() => { });

        // Fetch Dynamic Active Challenges
        fetch(`${API_BASE}/challenges/active`, { headers })
            .then(r => r.json())
            .then(data => { if (data.challenges) setDynamicChallenges(data.challenges); })
            .catch(() => { });
    }, [navigate]);

    // Calculate level & rank from stats
    const totalXP = stats?.totalXP || 0;
    const level = Math.floor(totalXP / 1000) + 1;
    const xpInLevel = totalXP % 1000;
    const xpPercent = Math.round((xpInLevel / 1000) * 100);
    const xpNext = Math.ceil(totalXP / 1000) * 1000 || 1000;
    const ranks = ['Recruit', 'Scout', 'Patrol Runner', 'Zone Captain', 'District General', 'Territory Warlord'];
    const rank = ranks[Math.min(Math.floor(level / 3), ranks.length - 1)];
    const initials = (user?.name || 'RX').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const league = profile?.league?.name || 'Bronze';

    // Get this week's run days for streak display
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d.toISOString().split('T')[0];
    });
    const ranThisWeek = weekDays.map(d => streak.runDates?.includes(d));

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
    };

    // Make challenges dynamic based on backend
    const maxRunDistance = runs.length > 0 ? Math.max(...runs.map(r => r.distance)) : 0;

    const challenges = dynamicChallenges.map(ch => {
        let currentProgress = 0;
        switch (ch.metric) {
            case 'total_distance': currentProgress = stats?.totalDistance || 0; break;
            case 'single_run_distance': currentProgress = maxRunDistance; break;
            case 'streak': currentProgress = streak.current; break;
            case 'territories': currentProgress = stats?.totalTerritories || 0; break;
        }

        const isCompleted = profile?.completedChallenges?.includes(ch._id);
        const progressPercent = isCompleted ? 100 : Math.min(100, Math.round((currentProgress / ch.targetValue) * 100));

        return {
            title: ch.title,
            desc: ch.description,
            progress: progressPercent,
            xp: ch.xpReward,
            type: 'challenge',
            isCompleted
        };
    });

    return (
        <div className="min-h-screen bg-brand-offwhite dark:bg-dark-bg font-body text-brand-ink dark:text-dark-text transition-colors duration-300">
            {/* NAVBAR */}
            <nav className="sticky top-0 z-50 glass-nav h-16 flex items-center px-6">
                <div className="w-full flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-1 text-xl font-heading tracking-tight">
                        <span className="text-brand-teal font-black">C</span><span className="text-brand-ink dark:text-dark-text">ONQU</span><span className="text-brand-teal font-black">R</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link to="/map"
                            className="bg-brand-teal text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all">
                            ▶ START RUN
                        </Link>
                        <Link to="/profile" className="w-[34px] h-[34px] rounded-full orange-gradient border-2 border-brand-teal flex items-center justify-center text-[11px] font-bold text-white shadow-sm cursor-pointer hover:scale-110 transition-transform">
                            {initials}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* MAIN GRID */}
            <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">

                {/* ── LEFT PANEL: Profile ── */}
                <aside className="space-y-4">
                    <div className="card-base shadow-card p-5">
                        {/* Avatar */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-full orange-gradient flex items-center justify-center text-white font-bold text-lg">
                                    {initials}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-brand-teal rounded-full border-2 border-white dark:border-dark-surface flex items-center justify-center text-[8px] text-white">✓</span>
                            </div>
                            <div>
                                <h2 className="font-heading text-[21px] leading-tight">{user?.name || 'Runner'}</h2>
                                <span className="text-[11px] font-medium text-brand-muted dark:text-dark-muted uppercase tracking-wider">{rank}</span>
                            </div>
                        </div>

                        {/* Level & Defenses */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-brand-surface2 dark:bg-dark-surface2 rounded-xl p-3 text-center">
                                <span className="block text-[10px] text-brand-muted dark:text-dark-muted uppercase mb-1">Level</span>
                                <span className="font-mono text-[20px] leading-none">{level}</span>
                            </div>
                            <div className="bg-brand-surface2 dark:bg-dark-surface2 rounded-xl p-3 text-center">
                                <span className="block text-[10px] text-brand-muted dark:text-dark-muted uppercase mb-1">Territories</span>
                                <span className="font-mono text-[20px] leading-none">{stats?.totalTerritories || 0}</span>
                            </div>
                        </div>

                        {/* XP Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] font-medium text-brand-muted dark:text-dark-muted uppercase">Empire XP</span>
                                <span className="font-mono text-[11px] text-brand-muted dark:text-dark-muted">{totalXP.toLocaleString()} / {xpNext.toLocaleString()}</span>
                            </div>
                            <div className="h-[5px] w-full bg-brand-surface2 dark:bg-dark-surface2 rounded-full overflow-hidden">
                                <div className="h-full teal-gradient rounded-full transition-all duration-1000" style={{ width: `${xpPercent}%` }}></div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="border-t border-brand-border dark:border-dark-border pt-4">
                            <div className="flex justify-between text-[12px] mb-2">
                                <span className="text-brand-muted dark:text-dark-muted">Total Runs</span>
                                <span className="font-mono font-medium">{stats?.totalRuns || 0}</span>
                            </div>
                            <div className="flex justify-between text-[12px] mb-2">
                                <span className="text-brand-muted dark:text-dark-muted">Total Distance</span>
                                <span className="font-mono font-medium">{(stats?.totalDistance || 0).toFixed(1)} km</span>
                            </div>
                            <div className="flex justify-between text-[12px]">
                                <span className="text-brand-muted dark:text-dark-muted">Total Time</span>
                                <span className="font-mono font-medium">{Math.floor((stats?.totalDuration || 0) / 60)}m</span>
                            </div>
                        </div>
                    </div>

                    {/* Logout */}
                    <button onClick={handleLogout}
                        className="w-full card-base shadow-card p-3 text-center text-sm font-medium text-brand-danger hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        🚪 Sign Out
                    </button>
                </aside>

                {/* ── MIDDLE PANEL: Activity Feed ── */}
                <main className="space-y-4">
                    {/* Filters */}
                    <header className="flex items-center justify-between mb-1">
                        <h2 className="font-heading text-2xl">Activity</h2>
                        <div className="flex gap-1">
                            {['all', 'run', 'challenge'].map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${filter === f ? 'bg-brand-ink dark:bg-brand-teal text-white' : 'bg-white dark:bg-dark-surface text-brand-muted dark:text-dark-muted border border-brand-border dark:border-dark-border'}`}>
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </header>

                    {/* Run Cards from API */}
                    {runs.length === 0 && (
                        <div className="card-base shadow-card p-8 text-center">
                            <p className="text-brand-muted dark:text-dark-muted text-sm">No runs yet. Start your first run!</p>
                            <Link to="/map" className="inline-block mt-4 bg-brand-teal text-white px-6 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-all">
                                ▶ Start Run
                            </Link>
                        </div>
                    )}

                    {runs.filter(r => filter === 'all' || filter === 'run').map((run, i) => {
                        const date = new Date(run.createdAt);
                        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        const mins = Math.floor(run.duration / 60);
                        const secs = run.duration % 60;
                        const isOpen = expandedRun === i;

                        return (
                            <article key={run._id || i} className="card-base shadow-card cursor-pointer">
                                <div className="p-[14px_18px] flex items-center justify-between hover:bg-brand-surface2 dark:hover:bg-dark-surface2 transition-colors rounded-[inherit]"
                                    onClick={() => setExpandedRun(isOpen ? null : i)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full orange-gradient border border-brand-border dark:border-dark-border"></div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[14px] font-semibold">{user?.name || 'Runner'}</span>
                                                <span className="text-[12px] text-brand-muted dark:text-dark-muted">• {dateStr} · {timeStr}</span>
                                            </div>
                                            <p className="text-[12px] text-brand-muted dark:text-dark-muted mt-0.5">Recorded Run · <span className="text-brand-ink dark:text-dark-text font-medium">{run.distance.toFixed(2)} km</span></p>
                                        </div>
                                    </div>
                                    <div className={`text-[20px] text-brand-muted dark:text-dark-muted transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>›</div>
                                </div>

                                <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                    <div className="overflow-hidden">
                                        <div className="border-t border-brand-border dark:border-dark-border p-[14px_18px]">
                                            <div className="grid grid-cols-4 gap-4 border-b border-brand-border dark:border-dark-border pb-4 mb-4">
                                                <div>
                                                    <span className="block text-[10px] text-brand-muted dark:text-dark-muted uppercase mb-1">Distance</span>
                                                    <div className="flex items-baseline gap-1"><span className="font-mono text-[17px]">{run.distance.toFixed(2)}</span><span className="text-[10px] text-brand-muted dark:text-dark-muted uppercase">km</span></div>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-brand-muted dark:text-dark-muted uppercase mb-1">Time</span>
                                                    <div className="flex items-baseline gap-1"><span className="font-mono text-[17px]">{mins}m {secs}s</span></div>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-brand-muted dark:text-dark-muted uppercase mb-1">Steps</span>
                                                    <div className="flex items-baseline gap-1"><span className="font-mono text-[17px]">{run.steps?.toLocaleString()}</span></div>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-brand-muted dark:text-dark-muted uppercase mb-1">XP Earned</span>
                                                    <div className="flex items-baseline gap-1"><span className="font-mono text-[17px]">{run.xpEarned}</span><span className="text-[10px] text-brand-muted dark:text-dark-muted uppercase">xp</span></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 bg-brand-teal rounded-full flex items-center justify-center text-[10px] text-white">✓</div>
                                                <p className="text-[13px] text-brand-teal-dark font-medium">Run synced from cloud.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </main>

                {/* ── RIGHT PANEL: Challenges & Rivals ── */}
                <aside className="space-y-4">
                    {/* Challenges */}
                    <div className="card-base shadow-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading text-lg">Active Challenges</h3>
                            <span className="text-[10px] bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full font-bold">{challenges.length} ACTIVE</span>
                        </div>
                        <div className="space-y-3">
                            {challenges.filter(c => filter === 'all' || filter === 'challenge').map((ch, i) => (
                                <div key={i} className="bg-brand-surface2 dark:bg-dark-surface2 rounded-xl p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[13px] font-semibold">{ch.title}</h4>
                                            {ch.isCompleted && <span className="text-[9px] bg-brand-teal text-white px-1.5 py-0.5 rounded-full font-bold">DONE</span>}
                                        </div>
                                        <span className="text-[10px] text-brand-teal font-mono">+{ch.xp} XP</span>
                                    </div>
                                    <p className="text-[11px] text-brand-muted dark:text-dark-muted mb-2">{ch.desc}</p>
                                    <div className="h-1.5 bg-white dark:bg-dark-bg rounded-full overflow-hidden">
                                        <div className="h-full teal-gradient rounded-full" style={{ width: `${ch.progress}%` }}></div>
                                    </div>
                                    <p className="text-[10px] text-brand-muted dark:text-dark-muted mt-1 text-right">{ch.progress}% complete</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rivals */}
                    <div className="card-base shadow-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading text-lg">League Rivals</h3>
                            <span className="text-[10px] bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full font-bold">{league.toUpperCase()} TIER</span>
                        </div>
                        <div className="space-y-3">
                            {rivals.length === 0 ? (
                                <p className="text-[11px] text-brand-muted dark:text-dark-muted">No rivals found.</p>
                            ) : (
                                rivals.map((r, i) => (
                                    <div key={r._id || i} className={`flex items-center gap-3 bg-brand-surface2 dark:bg-dark-surface2 rounded-xl p-3 ${r.isYou ? 'border border-brand-teal bg-brand-teal/5 dark:bg-brand-teal/10' : ''}`}>
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${r.isYou ? 'bg-brand-teal' : 'orange-gradient'}`}>
                                            #{r.rank}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[13px] font-semibold">{r.name} {r.isYou && '(You)'}</span>
                                            </div>
                                            <p className="text-[11px] text-brand-muted dark:text-dark-muted">{r.weeklyXP || 0} XP this week</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* League Badge */}
                    <div className="card-base shadow-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-heading text-lg">League</h3>
                            <span className="text-[10px] bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full font-bold">{league.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-brand-surface2 dark:bg-dark-surface2 rounded-xl p-3">
                            <div className="text-2xl">
                                {league === 'Bronze' && '🥉'}
                                {league === 'Silver' && '🥈'}
                                {league === 'Gold' && '🥇'}
                                {league === 'Platinum' && '💎'}
                                {league === 'Diamond' && '💠'}
                                {league === 'Legend' && '🏆'}
                            </div>
                            <div>
                                <span className="text-[13px] font-semibold">{league} League</span>
                                <p className="text-[11px] text-brand-muted dark:text-dark-muted">Weekly XP: {profile?.weeklyXP || 0}</p>
                                {leagueData && (
                                    <p className="text-[11px] font-bold text-brand-teal mt-0.5">
                                        Rank #{leagueData.rankings.find(r => r.isYou)?.rank || '?'} of {leagueData.totalPlayers || 0}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Daily Streak */}
                    <div className="card-base shadow-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-heading text-lg">Daily Streak</h3>
                            <div className="flex items-center gap-1">
                                <span className="text-lg">🔥</span>
                                <span className="font-mono text-[16px] font-bold text-brand-orange">{streak.current}</span>
                            </div>
                        </div>
                        <p className="text-[11px] text-brand-muted dark:text-dark-muted mb-3">Longest: {streak.longest} days</p>
                        <div className="flex justify-between">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                <div key={i} className="text-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 ${ranThisWeek[i] ? 'bg-brand-teal text-white' : 'bg-brand-surface2 dark:bg-dark-surface2 text-brand-muted dark:text-dark-muted'}`}>
                                        {ranThisWeek[i] ? '✓' : d}
                                    </div>
                                    <span className="text-[9px] text-brand-muted dark:text-dark-muted">{d}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
