/* ================================
   TERRITORY RUN — Landing main.js
   ================================ */

// ── 1. SCROLL REVEAL ─────────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }),
  { threshold: 0.1 }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


// ── 2. STAT COUNTERS ─────────────────────────────────
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el       = entry.target;
      const endValue = parseFloat(el.getAttribute('data-target'));
      const suffix   = el.getAttribute('data-suffix') || '';
      const duration = 2000;
      const startTime = performance.now();

      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        el.innerText = (progress * endValue).toFixed(suffix ? 1 : 0) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.innerText = endValue + suffix;
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  },
  { threshold: 0.1 }
);
document.querySelectorAll('.stat-counter').forEach(el => counterObserver.observe(el));


// ── 3. CUSTOM CURSOR ─────────────────────────────────
const cursor   = document.getElementById('cursor-main');
const follower = document.getElementById('cursor-follower');
let mouseX = 0, mouseY = 0, followerX = 0, followerY = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursor.style.left = mouseX + 'px';
  cursor.style.top  = mouseY + 'px';
});

(function animateFollower() {
  followerX += (mouseX - followerX) * 0.15;
  followerY += (mouseY - followerY) * 0.15;
  follower.style.left = followerX + 'px';
  follower.style.top  = followerY + 'px';
  requestAnimationFrame(animateFollower);
})();


// ── 4. MAGNETIC ELEMENTS ─────────────────────────────
document.querySelectorAll('.magnetic-element').forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width  / 2;
    const y = e.clientY - rect.top  - rect.height / 2;
    el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    cursor.style.transform = 'translate(-50%, -50%) scale(2)';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'translate(0, 0)';
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
  });
});


// ── 5. HERO PARTICLES ────────────────────────────────
const canvas = document.getElementById('hero-particles');
const ctx    = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width  = canvas.parentElement.offsetWidth;
  canvas.height = canvas.parentElement.offsetHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.size   = Math.random() * 3 + 1;
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 2 - 1;
    this.opacity = 1;
  }
  update() { this.x += this.speedX; this.y += this.speedY; this.opacity -= 0.02; }
  draw()   {
    ctx.fillStyle = `rgba(45, 206, 137, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

document.querySelector('section').addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  particles.push(new Particle(e.clientX - rect.left, e.clientY - rect.top));
});

(function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.opacity > 0);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
})();
