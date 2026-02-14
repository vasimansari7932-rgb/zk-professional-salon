document.addEventListener('DOMContentLoaded', () => {
    const serviceModal = document.getElementById('serviceModal');
    const addServiceBtn = document.getElementById('addServiceBtn');
    const cancelServiceBtn = document.getElementById('cancelServiceBtn');
    const serviceForm = document.getElementById('serviceForm');

    if (addServiceBtn) addServiceBtn.addEventListener('click', () => serviceModal.style.display = 'flex');
    if (cancelServiceBtn) cancelServiceBtn.addEventListener('click', () => serviceModal.style.display = 'none');

    if (serviceForm) {
        serviceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('serviceName').value,
                price: parseFloat(document.getElementById('servicePrice').value),
                duration: parseInt(document.getElementById('serviceDuration').value),
                isActive: true
            };

            await fetch(getApiUrl('/api/services'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            serviceModal.style.display = 'none';
            serviceForm.reset();
            loadServices();
        });
    }

    loadServices();
});

async function loadServices() {
    const table = document.getElementById('servicesTable');
    if (!table) return;

    try {
        const response = await fetch(getApiUrl('/api/services'));
        const services = await response.json();

        table.innerHTML = '';
        services.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.name}</td>
                <td>$${s.price}</td>
                <td>${s.duration} min</td>
                <td><span class="status-badge status-${s.isActive ? 'completed' : 'noshow'}">${s.isActive ? 'Active' : 'Disabled'}</span></td>
                <td>
                    <button onclick="toggleService('${s.id}', ${!s.isActive})" class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;">
                        ${s.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="deleteService('${s.id}')" class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; color: #ff5252; border-color: #ff5252; margin-left: 0.5rem;">
                        Delete
                    </button>
                </td>
            `;
            table.appendChild(tr);
        });
    } catch (e) { }
}

async function toggleService(id, newState) {
    await fetch(getApiUrl(`/api/services/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newState })
    });
    loadServices();
}

async function deleteService(id) {
    if (confirm('Delete this service?')) {
        toggleService(id, false);
    }
}
