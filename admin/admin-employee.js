document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('salonUser'));
    if (!user) return;

    if (window.location.pathname.includes('employee-dashboard.html')) {
        loadEmployeeBookings(user.id);
        setupManualBookingForm(user);
        loadServices();
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

async function loadServices() {
    const select = document.getElementById('custService');
    if (!select) return;
    try {
        const res = await fetch(getApiUrl('/api/services'));
        const services = await res.json();
        select.innerHTML = '<option value="">Select Service</option>';
        services.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.dataset.name = s.name;
            opt.textContent = `${s.name} - ₹${s.price}`;
            select.appendChild(opt);
        });
    } catch (e) { }
}

async function loadEmployeeBookings(employeeId) {
    const table = document.getElementById('employeeBookingsTable');
    if (!table) return;

    try {
        const response = await fetch(getApiUrl('/api/bookings'));
        const allBookings = await response.json();

        // Filter for this employee
        const myBookings = allBookings.filter(b => b.barberId === employeeId);

        // Stats Logic
        const todayStr = getLocalDateString();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let earnedToday = 0;
        let earnedMonth = 0;
        let completed = 0;
        let upcoming = 0;

        console.log("DEBUG: Today's Date String ->", todayStr);

        myBookings.forEach(b => {
            if (b.status === 'completed') {
                completed++;
                const amount = Number(b.price) || 0;

                // Today check
                if (String(b.date).trim() === todayStr) {
                    earnedToday += amount;
                    console.log(`DEBUG: Matched Today's Booking: ${b.customerName}, Price: ${amount}`);
                }

                // Month check
                const bDate = new Date(b.date);
                if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
                    earnedMonth += amount;
                }
            } else if (b.status === 'upcoming') {
                upcoming++;
            }
        });

        // Update UI Cards
        updateStat('totalToday', `₹${earnedToday.toLocaleString('en-IN')}`);
        updateStat('totalMonth', `₹${earnedMonth.toLocaleString('en-IN')}`);
        updateStat('completedCount', completed);
        updateStat('upcomingCount', upcoming);

        // Render Table
        table.innerHTML = '';
        if (myBookings.length === 0) {
            table.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No appointments found.</td></tr>';
            return;
        }

        myBookings.reverse().forEach(b => {
            const tr = document.createElement('tr');
            const isNoShow = b.status === 'noshow';
            const isCompletedWithPrice = b.status === 'completed' && parseFloat(b.price || 0) > 0;

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${b.customerName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${b.mobile}</div>
                </td>
                <td>${b.serviceName || b.serviceId}</td>
                <td>${b.time}</td>
                <td>${b.date}</td>
                <td>
                    <input type="number" id="price-${b.id}" 
                           value="${b.price || ''}" 
                           placeholder="0" 
                           class="form-control" 
                           style="width: 100px; padding: 4px 8px;"
                           onchange="updatePriceOnly('${b.id}', this.value)"
                           ${isNoShow || isCompletedWithPrice ? 'disabled' : ''}>
                </td>
                <td><span class="status-badge status-${b.status}">${b.status}</span></td>
                <td>
                    ${b.status === 'upcoming' ? `
                        <button onclick="updateStatus('${b.id}', 'completed')" class="btn-primary" style="padding: 4px 8px; font-size: 0.8rem; background: #4caf50; border-color: #4caf50;">
                            Done
                        </button>
                        <button onclick="updateStatus('${b.id}', 'noshow')" class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; border-color: #f44336; color: #f44336;">
                            No Show
                        </button>
                    ` : `<span style="color: var(--text-secondary); font-size: 0.8rem;">${isCompletedWithPrice ? 'Locked' : 'Closed'}</span>`}
                </td>
            `;
            table.appendChild(tr);
        });
    } catch (e) {
        console.error("Employee dash error:", e);
    }
}

async function updateStatus(id, newStatus) {
    const user = JSON.parse(localStorage.getItem('salonUser'));
    const priceInput = document.getElementById(`price-${id}`);
    const priceData = priceInput ? parseFloat(priceInput.value) : 0;

    if (newStatus === 'completed' && (!priceData || priceData <= 0)) {
        alert("Please enter service price (₹) before marking 'Done'");
        return;
    }

    try {
        await fetch(getApiUrl(`/api/bookings/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                price: newStatus === 'completed' ? priceData : 0
            })
        });
        loadEmployeeBookings(user.id);
    } catch (e) { }
}

async function updatePriceOnly(id, newPrice) {
    const user = JSON.parse(localStorage.getItem('salonUser'));
    try {
        await fetch(getApiUrl(`/api/bookings/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: Number(newPrice) || 0 })
        });
        loadEmployeeBookings(user.id);
    } catch (e) { }
}

function openManualBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.style.display = 'flex';
    document.getElementById('custDate').value = getLocalDateString();
    // Re-init icons inside the modal
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Close on backdrop click
    modal.onclick = function (e) {
        if (e.target === modal) closeModal();
    };
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

function setupManualBookingForm(user) {
    const form = document.getElementById('manualBookingForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceSelect = document.getElementById('custService');
        const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];

        const bookingData = {
            customerName: document.getElementById('custName').value,
            mobile: document.getElementById('custMobile').value,
            serviceId: serviceSelect.value,
            serviceName: selectedOpt.dataset.name,
            date: document.getElementById('custDate').value,
            time: document.getElementById('custTime').value,
            barberId: user.id,
            barberName: user.name,
            status: 'upcoming',
            price: 0
        };

        try {
            const res = await fetch(getApiUrl('/api/bookings'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            if (res.ok) {
                closeModal();
                form.reset();
                loadEmployeeBookings(user.id);
            }
        } catch (e) {
            alert("Error saving appointment");
        }
    });
}

function updateStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
