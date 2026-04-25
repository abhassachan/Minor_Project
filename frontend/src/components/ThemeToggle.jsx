import { useTheme } from '../ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                isDark
                    ? 'bg-dark-surface2 text-amber-400 hover:bg-dark-border'
                    : 'bg-brand-surface2 text-brand-ink hover:bg-brand-border'
            } ${className}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
        >
            <div className="relative w-5 h-5">
                <Sun
                    size={20}
                    className={`absolute inset-0 transition-all duration-300 ${
                        isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
                    }`}
                />
                <Moon
                    size={20}
                    className={`absolute inset-0 transition-all duration-300 ${
                        isDark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                    }`}
                />
            </div>
        </button>
    );
}
