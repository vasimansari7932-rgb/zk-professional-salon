document.addEventListener('DOMContentLoaded', () => {
    const barberFilter = document.getElementById('barberFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (barberFilter) {
        barberFilter.addEventListener('change', loadBookings);
        populateBarberFilter();
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', loadBookings);
    }

    loadBookings();
});

async function populateBarberFilter() {
    const filter = document.getElementById('barberFilter');
    try {
        const response = await fetch(getApiUrl('/api/barbers'));
        const barbers = await response.json();
        barbers.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.name;
            filter.appendChild(opt);
        });
    } catch (e) { }
}

async function loadBookings() {
    const table = document.getElementById('bookingsTable');
    if (!table) return;

    const bFilter = document.getElementById('barberFilter').value;
    const sFilter = document.getElementById('statusFilter').value;

    try {
        const response = await fetch(getApiUrl('/api/bookings'));
        let bookings = await response.json();

        // Filtering
        if (bFilter !== 'all') bookings = bookings.filter(b => b.barberId === bFilter);
        if (sFilter !== 'all') bookings = bookings.filter(b => b.status === sFilter);

        table.innerHTML = '';
        if (bookings.length === 0) {
            table.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No bookings found.</td></tr>';
            return;
        }

        bookings.reverse().forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${b.customerName}</td>
                <td>${b.mobile}</td>
                <td>${b.serviceName || b.serviceId}</td>
                <td>${b.date} at ${b.time}</td>
                <td>${b.barberName || b.barberId}</td>
                <td>
                    <input type="number" id="price-${b.id}" 
                           value="${b.price || 0}" 
                           class="form-control" 
                           style="width: 80px; padding: 4px;"
                           onchange="updatePrice('${b.id}', this.value)">
                </td>
                <td><span class="status-badge status-${b.status}">${b.status}</span></td>
                <td>
                    ${b.status === 'upcoming' ? `
                        <button onclick="updateBookingStatus('${b.id}', 'completed')" class="btn-primary" style="padding: 4px 8px; font-size: 0.8rem; background: #4caf50; border-color: #4caf50;">
                            Done
                        </button>
                        <button onclick="updateBookingStatus('${b.id}', 'noshow')" class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; border-color: #f44336; color: #f44336;">
                            No Show
                        </button>
                    ` : '<span style="color: var(--text-secondary); font-size: 0.8rem;">-</span>'}
                </td>
            `;
            table.appendChild(tr);
        });
    } catch (e) {
        console.error("Load error:", e);
    }
}

async function updateBookingStatus(id, newStatus) {
    const priceInput = document.getElementById(`price-${id}`);
    const price = priceInput ? parseFloat(priceInput.value) : 0;

    try {
        await fetch(getApiUrl(`/api/bookings/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                price: newStatus === 'completed' ? priceData : 0
            })
        });
        loadBookings();
    } catch (e) { }
}

async function updatePrice(id, newPrice) {
    try {
        await fetch(getApiUrl(`/api/bookings/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: parseFloat(newPrice) })
        });
        console.log(`Price updated for ${id}: ₹${newPrice}`);
    } catch (e) {
        console.error("Price update error:", e);
    }
}
