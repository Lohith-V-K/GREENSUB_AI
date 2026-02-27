// ===== AUTH PAGE LOGIC =====

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    redirectIfLoggedIn();

    // --- State ---
    let isSignUp = false;

    // --- DOM Elements ---
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const nameGroup = document.getElementById('nameGroup');
    const authName = document.getElementById('authName');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const btnText = authSubmitBtn.querySelector('.btn-text');
    const btnSpinner = authSubmitBtn.querySelector('.btn-spinner');
    const toggleText = document.getElementById('toggleText');
    const toggleLink = document.getElementById('toggleLink');
    const authError = document.getElementById('authError');
    const authErrorText = document.getElementById('authErrorText');
    const authSuccess = document.getElementById('authSuccess');
    const authSuccessText = document.getElementById('authSuccessText');
    const togglePasswordBtn = document.getElementById('togglePassword');

    // --- Toggle Password Visibility ---
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = authPassword.type === 'password';
        authPassword.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.querySelector('.eye-icon').style.display = isPassword ? 'none' : 'block';
        togglePasswordBtn.querySelector('.eye-off-icon').style.display = isPassword ? 'block' : 'none';
    });

    // --- Toggle Login ↔ Signup ---
    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;
        hideMessages();

        if (isSignUp) {
            authTitle.textContent = 'Create Account';
            authSubtitle.textContent = 'Start your research journey today';
            btnText.textContent = 'Create Account';
            toggleText.textContent = 'Already have an account?';
            toggleLink.textContent = 'Sign In';
            nameGroup.classList.add('show');
            authName.setAttribute('required', '');
            authPassword.setAttribute('autocomplete', 'new-password');
        } else {
            authTitle.textContent = 'Welcome Back';
            authSubtitle.textContent = 'Sign in to your research dashboard';
            btnText.textContent = 'Sign In';
            toggleText.textContent = "Don't have an account?";
            toggleLink.textContent = 'Sign Up';
            nameGroup.classList.remove('show');
            authName.removeAttribute('required');
            authPassword.setAttribute('autocomplete', 'current-password');
        }
    });

    // --- Form Submission ---
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessages();
        setLoading(true);

        const email = authEmail.value.trim();
        const password = authPassword.value;

        try {
            if (isSignUp) {
                // --- SIGN UP ---
                const fullName = authName.value.trim();
                if (!fullName) {
                    showError('Please enter your full name.');
                    setLoading(false);
                    return;
                }
                await signUpUser(fullName, email, password);
                // signUpUser stores token & redirects isn't needed — we redirect manually
                window.location.href = 'index.html';
            } else {
                // --- SIGN IN ---
                await signInUser(email, password);
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Auth error:', error);
            showError(error.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    });

    // --- Helpers ---
    function setLoading(loading) {
        authSubmitBtn.disabled = loading;
        btnText.style.opacity = loading ? '0' : '1';
        btnSpinner.style.display = loading ? 'block' : 'none';
    }

    function showError(message) {
        authError.style.display = 'flex';
        authErrorText.textContent = message;
        authSuccess.style.display = 'none';
    }

    function showSuccess(message) {
        authSuccess.style.display = 'flex';
        authSuccessText.textContent = message;
        authError.style.display = 'none';
    }

    function hideMessages() {
        authError.style.display = 'none';
        authSuccess.style.display = 'none';
    }
});
