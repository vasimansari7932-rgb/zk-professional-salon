// Shared Admin Logic
document.addEventListener('DOMContentLoaded', () => {
    // Session Check
    const user = JSON.parse(localStorage.getItem('salonUser'));
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Set Name
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) adminNameEl.textContent = user.name;

    // Direct role check for sidebar visibility
    if (user.role !== 'admin') {
        const adminOnlyLinks = document.querySelectorAll('a[href="employees.html"], a[href="services.html"], a[href="dashboard.html"], a[href="products.html"]');
        adminOnlyLinks.forEach(link => link.style.display = 'none');
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('salonUser');
            window.location.href = 'index.html';
        });
    }

    // Load Dashboard Stats if on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        loadDashboardStats();
    }
});

// Helper for local date string (YYYY-MM-DD)
function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadDashboardStats() {
    try {
        const response = await fetch(getApiUrl('/api/bookings'));
        const bookings = await response.json();

        const todayStr = getLocalDateString();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const todayBookings = bookings.filter(b => String(b.date).trim() === todayStr);
        const upcoming = bookings.filter(b => b.status === 'upcoming');
        const completed = bookings.filter(b => b.status === 'completed');

        // Calculate Revenue
        let revenueToday = 0;
        let revenueMonth = 0;

        console.log("ADMIN DEBUG: Today's String ->", todayStr);

        bookings.forEach(b => {
            if (b.status === 'completed') {
                const amount = Number(b.price) || 0;

                // Today check
                if (String(b.date).trim() === todayStr) {
                    revenueToday += amount;
                }

                // Month check
                const bDate = new Date(b.date);
                if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
                    revenueMonth += amount;
                }
            }
        });

        // Update DOM
        updateStat('statTodayRevenue', `₹${revenueToday.toLocaleString('en-IN')}`);
        updateStat('statMonthRevenue', `₹${revenueMonth.toLocaleString('en-IN')}`);
        updateStat('statTodayBookings', todayBookings.length);
        updateStat('statUpcoming', upcoming.length);
        updateStat('statCompleted', completed.length);

        // Populate Recent Table (last 5)
        const recentTable = document.getElementById('recentBookingsTable');
        if (recentTable) {
            recentTable.innerHTML = '';
            const recent = bookings.slice(-5).reverse();

            if (recent.length === 0) {
                recentTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No bookings found.</td></tr>';
                return;
            }

            recent.forEach(b => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="font-weight: 600;">${b.customerName}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${b.mobile}</div>
                    </td>
                    <td>${b.serviceName || b.serviceId}</td>
                    <td>
                        <div>${b.date}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${b.time}</div>
                    </td>
                    <td>${b.barberName || b.barberId}</td>
                    <td><span class="status-badge status-${b.status}">${b.status}</span></td>
                `;
                recentTable.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Dashboard error:", e);
    }
}

function updateStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
