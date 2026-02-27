// ===== API CLIENT =====
// Frontend helper for communicating with the Express backend

const API_BASE = '/api/auth';

/**
 * Make an authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }

    return data;
}

/**
 * Sign up a new user
 */
async function signUpUser(fullName, email, password) {
    const data = await apiRequest('/signup', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password })
    });
    // Store token and user info
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
}

/**
 * Sign in an existing user
 */
async function signInUser(email, password) {
    const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    // Store token and user info
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
}

/**
 * Get the current logged-in user from localStorage, or null.
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated (has a token)
 */
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

/**
 * Sign out — clear local storage and redirect to auth page
 */
function signOutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'auth.html';
}

/**
 * Auth guard: redirect to auth.html if not logged in.
 * Call this at the top of protected pages.
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'auth.html';
        return null;
    }
    return getCurrentUser();
}

/**
 * Redirect guard for auth page: if already logged in, go to dashboard.
 */
function redirectIfLoggedIn() {
    if (isAuthenticated()) {
        window.location.href = 'index.html';
    }
}

/**
 * Get user display name
 */
function getUserDisplayName(user) {
    if (!user) return 'Researcher';
    return user.fullName || user.email?.split('@')[0] || 'Researcher';
}
