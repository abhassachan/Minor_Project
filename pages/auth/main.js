/* ================================
   TERRITORY RUN — Auth main.js
   ================================ */

// ── API BASE URL ─────────────────────────────────────
// ── API BASE URL ─────────────────────────────────────
const API_BASE = 'https://minor-project-4e55.onrender.com/api';

// ── 1. TAB SWITCHING ─────────────────────────────────
function switchTab(tab) {
    const signinForm = document.getElementById('form-signin');
    const signupForm = document.getElementById('form-signup');
    const signinTab = document.getElementById('tab-signin');
    const signupTab = document.getElementById('tab-signup');

    if (tab === 'signin') {
        signinForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        signinTab.classList.add('active');
        signupTab.classList.remove('active');
    } else {
        signupForm.classList.remove('hidden');
        signinForm.classList.add('hidden');
        signupTab.classList.add('active');
        signinTab.classList.remove('active');
    }
}

// Check URL param — if ?tab=signup, open signup tab on load
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'signup') switchTab('signup');
});


// ── 2. PASSWORD TOGGLE ───────────────────────────────
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('.material-symbols-outlined');
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility';
    }
}


// ── 3. USERNAME CHARACTER COUNT ──────────────────────
const usernameInput = document.getElementById('signup-username');
const usernameCount = document.getElementById('username-count');

if (usernameInput) {
    usernameInput.addEventListener('input', () => {
        const len = usernameInput.value.length;
        usernameCount.textContent = `${len}/20`;
        // Remove spaces as user types
        usernameInput.value = usernameInput.value.replace(/\s/g, '');
    });
}


// ── 4. PASSWORD STRENGTH ─────────────────────────────
const signupPassword = document.getElementById('signup-password');
const strengthLabel = document.getElementById('strength-label');
const bars = [
    document.getElementById('bar-1'),
    document.getElementById('bar-2'),
    document.getElementById('bar-3'),
    document.getElementById('bar-4'),
];

function getStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
}

const strengthConfig = [
    { label: '', color: 'bg-ink/10' },
    { label: 'Weak', color: 'bg-red-400' },
    { label: 'Fair', color: 'bg-yellow-400' },
    { label: 'Good', color: 'bg-blue-400' },
    { label: 'Strong', color: 'bg-teal-400' },
];

if (signupPassword) {
    signupPassword.addEventListener('input', () => {
        const val = signupPassword.value;
        const strength = val.length === 0 ? 0 : getStrength(val);
        const config = strengthConfig[strength];

        bars.forEach((bar, i) => {
            bar.className = 'strength-bar h-1 flex-1 rounded-full transition-all duration-300 ';
            bar.className += i < strength ? config.color : 'bg-ink/10';
        });

        strengthLabel.textContent = val.length > 0 ? config.label : '';
        strengthLabel.className = `text-[11px] mt-1 ${strength <= 1 ? 'text-red-400' :
            strength === 2 ? 'text-yellow-500' :
                strength === 3 ? 'text-blue-400' : 'text-teal-500'
            }`;
    });
}


// ── 5. HELPERS ───────────────────────────────────────
function showError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
}

function clearError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
}

function setInputError(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.classList.add('error');
}

function clearInputError(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.classList.remove('error');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// ── 6. SIGN IN VALIDATION ────────────────────────────
document.getElementById('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;

    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    // Clear previous errors
    clearError('signin-email-error'); clearInputError('signin-email');
    clearError('signin-password-error'); clearInputError('signin-password');

    if (!email) {
        showError('signin-email-error', 'Email is required');
        setInputError('signin-email');
        valid = false;
    } else if (!isValidEmail(email)) {
        showError('signin-email-error', 'Enter a valid email address');
        setInputError('signin-email');
        valid = false;
    }

    if (!password) {
        showError('signin-password-error', 'Password is required');
        setInputError('signin-password');
        valid = false;
    }

    if (!valid) return;

    // ✅ Validation passed — call login API
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            showError('signin-email-error', data.error || 'Login failed');
            setInputError('signin-email');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        // Save token & user to localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to dashboard
        window.location.href = '../dashboard/dashboard.html';
    } catch (err) {
        showError('signin-email-error', 'Cannot connect to server. Is the backend running?');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});


// ── 7. SIGN UP VALIDATION ────────────────────────────
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;

    const name = document.getElementById('signup-name').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    // Clear previous errors
    ['signup-name-error', 'signup-username-error', 'signup-email-error',
        'signup-password-error', 'signup-confirm-error'].forEach(clearError);
    ['signup-name', 'signup-username', 'signup-email',
        'signup-password', 'signup-confirm'].forEach(clearInputError);

    if (!name) {
        showError('signup-name-error', 'Full name is required');
        setInputError('signup-name');
        valid = false;
    }

    if (!username) {
        showError('signup-username-error', 'Username is required');
        setInputError('signup-username');
        valid = false;
    } else if (username.length < 3) {
        showError('signup-username-error', 'Username must be at least 3 characters');
        setInputError('signup-username');
        valid = false;
    } else if (/\s/.test(username)) {
        showError('signup-username-error', 'Username cannot contain spaces');
        setInputError('signup-username');
        valid = false;
    }

    if (!email) {
        showError('signup-email-error', 'Email is required');
        setInputError('signup-email');
        valid = false;
    } else if (!isValidEmail(email)) {
        showError('signup-email-error', 'Enter a valid email address');
        setInputError('signup-email');
        valid = false;
    }

    if (!password) {
        showError('signup-password-error', 'Password is required');
        setInputError('signup-password');
        valid = false;
    } else if (password.length < 8) {
        showError('signup-password-error', 'Password must be at least 8 characters');
        setInputError('signup-password');
        valid = false;
    }

    if (!confirm) {
        showError('signup-confirm-error', 'Please confirm your password');
        setInputError('signup-confirm');
        valid = false;
    } else if (password !== confirm) {
        showError('signup-confirm-error', 'Passwords do not match');
        setInputError('signup-confirm');
        valid = false;
    }

    if (!valid) return;

    // ✅ Validation passed — call register API
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            showError('signup-email-error', data.error || 'Registration failed');
            setInputError('signup-email');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        // Save token & user to localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to dashboard
        window.location.href = '../dashboard/dashboard.html';
    } catch (err) {
        showError('signup-email-error', 'Cannot connect to server. Is the backend running?');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});
