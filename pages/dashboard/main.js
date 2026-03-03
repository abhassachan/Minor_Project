/* ================================
   TERRITORY RUN — Dashboard main.js
   ================================ */

// ── 1. FILTER TABS ───────────────────────────────────
const filterButtons = document.querySelectorAll('.filter-btn');
const activityCards = document.querySelectorAll('.activity-card');

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // UI toggle
        filterButtons.forEach(b => {
            b.classList.remove('bg-ink', 'text-white', 'active');
            b.classList.add('text-muted');
        });
        btn.classList.remove('text-muted');
        btn.classList.add('bg-ink', 'text-white', 'active');

        // Filtering logic
        const filterType = btn.getAttribute('data-filter');

        // Refetch activity cards dynamically since they can be injected by JS now
        const allActivityCards = document.querySelectorAll('.activity-card');

        allActivityCards.forEach(card => {
            if (filterType === 'all') {
                card.style.display = 'block';
            } else {
                if (card.getAttribute('data-type') === filterType) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    });
});

// ── 2. COLLAPSED CARD EXPAND/COLLAPSE ────────────────
const patrolCardHeader = document.getElementById('patrol-card-header');
const patrolCardContent = document.getElementById('patrol-card-content');
const patrolCardChevron = document.getElementById('patrol-card-chevron');

if (patrolCardHeader) {
    let isExpanded = false;
    patrolCardHeader.addEventListener('click', () => {
        isExpanded = !isExpanded;
        if (isExpanded) {
            patrolCardContent.classList.remove('grid-rows-[0fr]');
            patrolCardContent.classList.add('grid-rows-[1fr]');
            patrolCardChevron.style.transform = 'rotate(90deg)';
        } else {
            patrolCardContent.classList.remove('grid-rows-[1fr]');
            patrolCardContent.classList.add('grid-rows-[0fr]');
            patrolCardChevron.style.transform = 'rotate(0deg)';
        }
    });
}

// ── 3. TOAST NOTIFICATION SYSTEM ─────────────────────
const toastContainer = document.getElementById('toast-container');

function showToast(message) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'bg-teal text-white px-4 py-2 rounded-full text-[12px] font-sans font-medium shadow-lg transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-auto';
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto-dismiss
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300); // match transition duration
    }, 3000);
}

// ── 4. FORTIFY ZONE BUTTON ───────────────────────────
const btnFortify = document.getElementById('btn-fortify');
if (btnFortify) {
    btnFortify.addEventListener('click', () => {
        btnFortify.textContent = '🛡 Fortified!';
        btnFortify.classList.remove('bg-surface2', 'border-border', 'hover:bg-surface3');
        btnFortify.classList.add('bg-teal', 'text-white', 'border-teal', 'hover:bg-teal-dark');

        showToast('Badrawas has been fortified! +50 Defense XP');
    });
}

// ── 5. CHALLENGE JOIN BUTTON ─────────────────────────
const joinBtns = document.querySelectorAll('.btn-join');
joinBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        btn.textContent = '✓ Joined';
        btn.classList.remove('bg-teal-light', 'text-teal-dark', 'border-teal-mid');
        btn.classList.add('bg-teal', 'text-white', 'border-teal', 'opacity-80', 'cursor-not-allowed');
        btn.disabled = true;
    });
});

// ── 6. RIVAL CHALLENGE TOOLTIP ───────────────────────
const challengeBtns = document.querySelectorAll('.btn-challenge');
challengeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const rivalName = btn.closest('.flex.items-center.justify-between').querySelector('h4').textContent;
        btn.disabled = true;

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute -top-10 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-sans px-3 py-1.5 rounded-md whitespace-nowrap shadow-md transition-opacity duration-200 z-10 pointer-events-none before:content-[""] before:absolute before:bottom-[-4px] before:left-1/2 before:-translate-x-1/2 before:border-l-[5px] before:border-r-[5px] before:border-t-[5px] before:border-l-transparent before:border-r-transparent before:border-t-ink';
        tooltip.textContent = `Challenge sent to ${rivalName}! ⚔`;

        btn.appendChild(tooltip);

        // Auto-dismiss
        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                tooltip.remove();
                btn.disabled = false;
            }, 200);
        }, 2500);
    });
});

// ── 7. NEW RUN INTEGRATION ────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('newRun') === 'true') {
        // Show toast message
        setTimeout(() => {
            showToast('Run saved! +120 XP earned 🎉');
        }, 500);

        // Read the latest run from localStorage and inject into the feed dynamically
        const savedRuns = localStorage.getItem('runs');
        if (savedRuns) {
            const runsArr = JSON.parse(savedRuns);
            if (runsArr.length > 0) {
                const latestRun = runsArr[0];

                // Remove query param from the URL visually without reloading the page
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.replaceState({ path: newUrl }, '', newUrl);

                // Find the middle panel
                const filterHeader = document.querySelector('header.flex.items-center.justify-between.mb-1');

                if (filterHeader) {
                    const newCardHtml = `
          <article class="card-base shadow-card cursor-pointer animate-fade-up activity-card mt-[18px]" data-type="run">
            <div class="p-[14px_18px] flex items-center justify-between hover:bg-surface2 transition-colors rounded-[inherit]" onclick="this.nextElementSibling.classList.toggle('grid-rows-[1fr]'); this.nextElementSibling.classList.toggle('grid-rows-[0fr]'); this.querySelector('.chevron').style.transform = this.querySelector('.chevron').style.transform === 'rotate(90deg)' ? 'rotate(0deg)' : 'rotate(90deg)';">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full orange-gradient border border-border"></div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-[14px] font-semibold">Runner_X</span>
                    <span class="text-[12px] text-muted">• ${latestRun.date.split(',')[0]} · ${latestRun.date.split(',')[1]}</span>
                  </div>
                  <p class="text-[12px] text-muted mt-0.5">Recorded Run · <span class="text-ink font-medium">${latestRun.distance.toFixed(2)} km</span></p>
                </div>
              </div>
              <div class="text-[20px] text-muted transition-transform duration-300 transform chevron">›</div>
            </div>

            <div class="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300">
              <div class="overflow-hidden">
                <div class="border-t border-border p-[14px_18px]">
                  <div class="grid grid-cols-4 gap-4 border-b border-border pb-4 mb-4">
                    <div>
                      <span class="block text-[10px] text-muted uppercase mb-1">Distance</span>
                      <div class="flex items-baseline gap-1"><span class="font-mono text-[17px]">${latestRun.distance.toFixed(2)}</span><span class="text-[10px] text-muted uppercase">km</span></div>
                    </div>
                    <div>
                      <span class="block text-[10px] text-muted uppercase mb-1">Time</span>
                      <div class="flex items-baseline gap-1"><span class="font-mono text-[17px]">${Math.floor(latestRun.duration / 60)}m ${latestRun.duration % 60}s</span></div>
                    </div>
                    <div>
                      <span class="block text-[10px] text-muted uppercase mb-1">Steps</span>
                      <div class="flex items-baseline gap-1"><span class="font-mono text-[17px]">${latestRun.steps}</span></div>
                    </div>
                    <div>
                      <span class="block text-[10px] text-muted uppercase mb-1">Calories</span>
                      <div class="flex items-baseline gap-1"><span class="font-mono text-[17px]">${latestRun.calories}</span><span class="text-[10px] text-muted uppercase">kcal</span></div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-5 h-5 bg-teal rounded-full flex items-center justify-center text-[10px] text-white">✓</div>
                    <p class="text-[13px] text-teal-dark font-medium">Run data synchronized successfully.</p>
                  </div>
                </div>
              </div>
            </div>
          </article>
          `;

                    filterHeader.insertAdjacentHTML('afterend', newCardHtml);
                }
            }
        }
    }
});
