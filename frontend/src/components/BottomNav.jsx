import { Link, useLocation } from 'react-router-dom';
import { Home, Map as MapIcon, Trophy, Users, User } from 'lucide-react';

export default function BottomNav() {
    const location = useLocation();

    // Do not show the nav bar on landing page or auth page
    if (location.pathname === '/' || location.pathname === '/auth') {
        return null;
    }

    const navItems = [
        { path: '/dashboard', label: 'Home', icon: Home },
        { path: '/map', label: 'Map', icon: MapIcon },
        { path: '/leaderboard', label: 'Ranks', icon: Trophy },
        { path: '/clans', label: 'Clan', icon: Users },
        { path: '/profile', label: 'Profile', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 w-full glass-nav border-t border-brand-border/50 z-50 px-4 py-2 pb-safe supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[max(8px,env(safe-area-inset-bottom))]">
            <div className="max-w-md mx-auto flex justify-between items-center relative">
                {navItems.map(({ path, label, icon: Icon }) => {
                    const isActive = location.pathname.startsWith(path);
                    
                    return (
                        <Link 
                            key={path} 
                            to={path} 
                            className="relative flex flex-col items-center justify-center w-14 h-12 transition-all duration-300"
                        >
                            {/* Active background glow pill */}
                            {isActive && (
                                <div className="absolute inset-x-0 w-12 h-8 bg-brand-teal/15 rounded-full mx-auto" />
                            )}
                            
                            <Icon 
                                size={22} 
                                strokeWidth={isActive ? 2.5 : 2}
                                className={`relative z-10 transition-colors duration-300 ${
                                    isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-ink'
                                }`} 
                            />
                            
                            <span className={`text-[10px] mt-1 font-medium transition-colors duration-300 ${
                                isActive ? 'text-brand-teal' : 'text-brand-muted'
                            }`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
