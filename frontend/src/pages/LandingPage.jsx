import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);

    // ── Scroll Reveal ──
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }),
            { threshold: 0.1 }
        );
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    // ── Stat Counters ──
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    const endValue = parseFloat(el.getAttribute('data-target'));
                    const suffix = el.getAttribute('data-suffix') || '';
                    const duration = 2000;
                    const startTime = performance.now();
                    function tick(now) {
                        const progress = Math.min((now - startTime) / duration, 1);
                        el.innerText = (progress * endValue).toFixed(suffix ? 1 : 0) + suffix;
                        if (progress < 1) requestAnimationFrame(tick);
                        else el.innerText = endValue + suffix;
                    }
                    requestAnimationFrame(tick);
                    observer.unobserve(el);
                });
            },
            { threshold: 0.1 }
        );
        document.querySelectorAll('.stat-counter').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    // ── Hero Particles ──
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animId;

        function resize() {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        class Particle {
            constructor(x, y) {
                this.x = x; this.y = y;
                this.size = Math.random() * 3 + 1;
                this.speedX = Math.random() * 2 - 1;
                this.speedY = Math.random() * 2 - 1;
                this.opacity = 1;
            }
            update() { this.x += this.speedX; this.y += this.speedY; this.opacity -= 0.02; }
            draw() {
                ctx.fillStyle = `rgba(45, 206, 137, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const section = canvas.closest('section');
        const handleMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            particles.push(new Particle(e.clientX - rect.left, e.clientY - rect.top));
        };
        section?.addEventListener('mousemove', handleMove);

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles = particles.filter(p => p.opacity > 0);
            particles.forEach(p => { p.update(); p.draw(); });
            animId = requestAnimationFrame(animate);
        }
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            section?.removeEventListener('mousemove', handleMove);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <div className="bg-brand-offwhite dark:bg-dark-bg text-brand-ink dark:text-dark-text font-body antialiased overflow-x-hidden transition-colors duration-300">
            {/* NAVBAR */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-nav h-20 flex items-center">
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-1 text-2xl font-heading tracking-tight">
                        <span className="text-brand-ink dark:text-dark-text">TERRITORY</span>
                        <span className="text-brand-teal">RUN</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-wider">
                        <a className="hover:text-brand-teal transition-colors" href="#how-it-works">How it Works</a>
                        <a className="hover:text-brand-teal transition-colors" href="#map">Leaderboard</a>
                        <a className="hover:text-brand-teal transition-colors" href="#rivals">About</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link to="/auth"
                            className="bg-brand-teal text-white px-6 py-2.5 rounded-full font-bold text-sm tracking-wide hover:opacity-90 transition-all flex items-center gap-2">
                            OPEN APP <span className="text-lg">→</span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 px-6 overflow-hidden relative">
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }} />
                <div className="container mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div className="z-10 animate-fade-up">
                        <h1 className="hero-heading text-7xl md:text-8xl lg:text-9xl font-heading text-brand-ink dark:text-dark-text mb-6">
                            RUN.<br />CAPTURE.<br />DOMINATE.
                        </h1>
                        <p className="text-xl text-brand-muted dark:text-dark-muted max-w-md mb-10 leading-relaxed">
                            The city is a board game. Claim map zones by running through them and become the local legend. No downloads, just running.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <Link to="/auth"
                                className="bg-brand-teal text-white px-8 py-4 rounded-full font-bold text-lg text-center hover:scale-105 transition-transform">
                                Start Running — It&#39;s Free
                            </Link>
                            <a className="bg-white dark:bg-dark-surface border border-brand-ink/10 dark:border-dark-border text-brand-ink dark:text-dark-text px-8 py-4 rounded-full font-bold text-lg text-center hover:bg-brand-ink hover:text-white dark:hover:bg-dark-surface2 transition-all"
                                href="#how-it-works">
                                See how it works
                            </a>
                        </div>
                        <p className="text-sm font-mono text-brand-muted dark:text-dark-muted flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse"></span>
                            No download needed. PWA powered.
                        </p>
                    </div>

                    {/* Hero Map Visual */}
                    <div className="relative w-full aspect-square max-w-[600px] mx-auto tactical-map rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                        <svg className="w-full h-full" viewBox="0 0 400 400">
                            <g className="map-grid-line">
                                <path d="M0,20 L400,20 M0,40 L400,40 M0,60 L400,60 M0,80 L400,80 M0,100 L400,100 M0,120 L400,120 M0,140 L400,140 M0,160 L400,160 M0,180 L400,180 M0,200 L400,200 M0,220 L400,220 M0,240 L400,240 M0,260 L400,260 M0,280 L400,280 M0,300 L400,300 M0,320 L400,320 M0,340 L400,340 M0,360 L400,360 M0,380 L400,380" />
                                <path d="M20,0 L20,400 M40,0 L40,400 M60,0 L60,400 M80,0 L80,400 M100,0 L100,400 M120,0 L120,400 M140,0 L140,400 M160,0 L160,400 M180,0 L180,400 M200,0 L200,400 M220,0 L220,400 M240,0 L240,400 M260,0 L260,400 M280,0 L280,400 M300,0 L300,400 M320,0 L320,400 M340,0 L340,400 M360,0 L360,400 M380,0 L380,400" />
                            </g>
                            <path className="neon-pulse" d="M80,80 L160,80 L160,160 L80,160 Z" fill="#2dce89" fillOpacity="0.4" stroke="#2dce89" strokeWidth="1" style={{ color: '#2dce89' }} />
                            <path d="M220,40 L340,40 L340,120 L220,120 Z" fill="#9f7aea" fillOpacity="0.3" stroke="#9f7aea" strokeWidth="1" />
                            <path className="neon-pulse" d="M180,200 L320,200 L320,340 L180,340 Z" fill="#f6ad55" fillOpacity="0.4" stroke="#f6ad55" strokeWidth="1" style={{ color: '#f6ad55', animationDelay: '1s' }} />
                            <path d="M40,240 L140,240 L140,360 L40,360 Z" fill="#f56565" fillOpacity="0.3" stroke="#f56565" strokeWidth="1" />
                        </svg>
                    </div>
                </div>
            </section>

            {/* STATS BAR */}
            <section className="bg-brand-ink py-12 px-6">
                <div className="container mx-auto">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-white text-center">
                        <div>
                            <p className="text-3xl md:text-4xl font-mono font-bold text-brand-teal mb-1 stat-counter" data-target="12400">0</p>
                            <p className="text-xs uppercase tracking-widest text-brand-muted font-bold">Runners</p>
                        </div>
                        <div>
                            <p className="text-3xl md:text-4xl font-mono font-bold text-brand-teal mb-1 stat-counter" data-target="3.2" data-suffix="M">0</p>
                            <p className="text-xs uppercase tracking-widest text-brand-muted font-bold">Territories</p>
                        </div>
                        <div>
                            <p className="text-3xl md:text-4xl font-mono font-bold text-brand-teal mb-1 stat-counter" data-target="180">0</p>
                            <p className="text-xs uppercase tracking-widest text-brand-muted font-bold">Cities</p>
                        </div>
                        <div>
                            <p className="text-3xl md:text-4xl font-mono font-bold text-brand-teal mb-1">0</p>
                            <p className="text-xs uppercase tracking-widest text-brand-muted font-bold">App Downloads</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="py-24 px-6 bg-white dark:bg-dark-surface transition-colors duration-300" id="how-it-works">
                <div className="container mx-auto">
                    <div className="text-center mb-20 reveal">
                        <h2 className="text-5xl md:text-6xl font-heading mb-4">HOW IT WORKS</h2>
                        <div className="w-20 h-1.5 bg-brand-teal mx-auto"></div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12 relative">
                        <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-brand-ink/10 dark:bg-dark-border -z-0"></div>
                        {[
                            { emoji: '🏃', title: 'Run Your Route', desc: 'Open the web app and start your run. Our GPS tracks your path across the city grid in real-time.', color: 'teal' },
                            { emoji: '🚩', title: 'Claim Territory', desc: 'Complete loops or cover new ground to claim zones. The more you run, the larger your empire grows.', color: 'ink' },
                            { emoji: '👑', title: 'Dominate the Map', desc: 'Compete with local runners, defend your zones, and rise through the ranks to become the territory king.', color: 'teal' },
                        ].map((step, i) => (
                            <div key={i} className="relative bg-brand-offwhite dark:bg-dark-surface2 p-8 rounded-2xl border border-brand-ink/5 dark:border-dark-border reveal z-10 transition-colors duration-300" style={{ transitionDelay: `${(i + 1) * 0.1}s` }}>
                                <div className={`w-16 h-16 bg-brand-${step.color} text-white rounded-full flex items-center justify-center text-3xl mb-6 shadow-lg shadow-brand-${step.color}/20`}>
                                    {step.emoji}
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                                <p className="text-brand-muted dark:text-dark-muted">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* MAP PREVIEW */}
            <section className="py-24 px-6 bg-brand-ink" id="map">
                <div className="container mx-auto">
                    <div className="text-center mb-16 reveal">
                        <h2 className="text-5xl md:text-6xl font-heading text-white mb-4">YOUR BATTLEFIELD</h2>
                        <div className="w-20 h-1.5 bg-brand-teal mx-auto mb-6"></div>
                        <p className="text-brand-muted max-w-lg mx-auto">
                            Every street is a battleground. Run through zones to claim them. Defend your territory from rival runners.
                        </p>
                    </div>
                    <div className="max-w-4xl mx-auto tactical-map rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-8 reveal">
                        <div className="grid grid-cols-6 gap-2">
                            {Array.from({ length: 24 }, (_, i) => {
                                const colors = ['bg-brand-teal/30', 'bg-purple-500/30', 'bg-brand-orange/30', 'bg-red-500/30', 'bg-transparent'];
                                return <div key={i} className={`aspect-square rounded-lg border border-white/5 ${colors[i % 5]} ${i % 3 === 0 ? 'neon-pulse' : ''}`} />;
                            })}
                        </div>
                        <div className="mt-8 flex justify-between items-center text-white/60 text-sm">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-brand-teal/50"></span> Your Territory</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-purple-500/50"></span> Rival Territory</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-white/10"></span> Unclaimed</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* RIVALS */}
            <section className="py-24 px-6 bg-white dark:bg-dark-surface transition-colors duration-300" id="rivals">
                <div className="container mx-auto text-center">
                    <div className="mb-16 reveal">
                        <h2 className="text-5xl md:text-6xl font-heading mb-4">OUTRUN THE COMPETITION</h2>
                        <div className="w-20 h-1.5 bg-brand-teal mx-auto mb-6"></div>
                        <p className="text-brand-muted dark:text-dark-muted max-w-lg mx-auto">
                            See who dominates your neighborhood. Challenge rivals and climb the leaderboard.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
                        {[
                            { name: 'Shadow_Runner', xp: '24,500 XP', rank: '#1', color: 'brand-teal' },
                            { name: 'Urban_Wolf', xp: '18,200 XP', rank: '#2', color: 'brand-orange' },
                            { name: 'Night_Stride', xp: '15,800 XP', rank: '#3', color: 'purple-500' },
                        ].map((r, i) => (
                            <div key={i} className="bg-brand-offwhite dark:bg-dark-surface2 p-6 rounded-2xl border border-brand-ink/5 dark:border-dark-border reveal transition-colors duration-300" style={{ transitionDelay: `${(i + 1) * 0.1}s` }}>
                                <div className={`w-14 h-14 rounded-full bg-${r.color} mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl`}>{r.rank}</div>
                                <h3 className="font-bold text-lg mb-1">{r.name}</h3>
                                <p className="text-brand-muted dark:text-dark-muted text-sm">{r.xp}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 bg-brand-ink text-center">
                <div className="container mx-auto reveal">
                    <h2 className="text-5xl md:text-7xl font-heading text-white mb-6">READY TO CONQUER?</h2>
                    <p className="text-brand-muted max-w-md mx-auto mb-10 text-lg">
                        Join thousands of runners claiming their cities. No app download needed.
                    </p>
                    <Link to="/auth"
                        className="inline-block bg-brand-teal text-white px-10 py-5 rounded-full font-bold text-xl hover:scale-105 transition-transform">
                        Start Your Empire →
                    </Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-brand-ink border-t border-white/5 py-8 px-6">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-1 text-xl font-heading">
                        <span className="text-white">TERRITORY</span>
                        <span className="text-brand-teal">RUN</span>
                    </div>
                    <p className="text-brand-muted text-sm">© 2025 Territory Run. All rights reserved.</p>
                    <div className="flex gap-6 text-brand-muted text-sm">
                        <a className="hover:text-white transition-colors" href="#">Privacy</a>
                        <a className="hover:text-white transition-colors" href="#">Terms</a>
                        <a className="hover:text-white transition-colors" href="#">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
