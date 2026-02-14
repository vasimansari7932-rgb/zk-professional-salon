document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(getApiUrl('/api/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                // Save user session
                localStorage.setItem('salonUser', JSON.stringify(result.user));

                // Redirect based on role
                if (result.user.role === 'admin') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'employee-dashboard.html';
                }
            } else {
                loginError.style.display = 'block';
                loginError.textContent = result.message || 'Invalid email or password.';
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.style.display = 'block';
            loginError.textContent = 'Connection error. Please check if api.py is running.';
        }
    });
});
