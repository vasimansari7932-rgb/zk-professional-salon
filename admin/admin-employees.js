document.addEventListener('DOMContentLoaded', () => {
    const empModal = document.getElementById('empModal');
    const addEmpBtn = document.getElementById('addEmpBtn');
    const cancelEmpBtn = document.getElementById('cancelEmpBtn');
    const empForm = document.getElementById('empForm');

    // Add Employee Button Click
    if (addEmpBtn) {
        addEmpBtn.addEventListener('click', () => {
            document.getElementById('empId').value = '';
            document.getElementById('empForm').reset();
            document.querySelector('.modal-header h2').textContent = 'Add New Employee';
            document.getElementById('empPassword').required = true;
            document.getElementById('pwHint').style.display = 'none';
            document.getElementById('formError').style.display = 'none';
            empModal.style.display = 'flex';
        });
    }

    if (cancelEmpBtn) {
        cancelEmpBtn.addEventListener('click', () => empModal.style.display = 'none');
    }

    if (empForm) {
        empForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('empId').value;
            const name = document.getElementById('empName').value.trim();
            const email = document.getElementById('empEmail').value.trim();
            const password = document.getElementById('empPassword').value;
            const confirmPassword = document.getElementById('empConfirmPassword').value;
            const mobile = document.getElementById('empMobile').value.trim();
            const role = document.getElementById('empRole').value;
            const errorEl = document.getElementById('formError');

            // Validation
            errorEl.style.display = 'none';

            // Password logic for NEW employee
            if (!id && !password) {
                showError("Password is required for new employees.");
                return;
            }

            // Password logic for existing employee
            if (password || confirmPassword) {
                if (password.length < 6) {
                    showError("Password must be at least 6 characters long.");
                    return;
                }
                if (password !== confirmPassword) {
                    showError("Passwords do not match.");
                    return;
                }
            }

            const data = {
                name,
                email,
                mobile,
                role,
                isActive: true
            };

            // Only send password if it's provided (for updates) or mandatory (for new)
            if (password) {
                data.password = password;
            }

            try {
                const saveBtn = document.getElementById('saveEmpBtn');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';

                const url = id ? getApiUrl(`/api/employees/${id}`) : getApiUrl('/api/employees');
                const method = id ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    empModal.style.display = 'none';
                    empForm.reset();
                    loadEmployees();
                    showToast(id ? 'Employee updated successfully!' : 'Employee added successfully!');
                } else {
                    const err = await response.json();
                    showError(err.detail || "Error saving employee.");
                }
            } catch (error) {
                console.error("Save error:", error);
                showError("Connection error. Please try again.");
            } finally {
                const saveBtn = document.getElementById('saveEmpBtn');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Employee';
            }
        });
    }

    loadEmployees();
});

let allEmployees = [];

async function loadEmployees() {
    const table = document.getElementById('employeeTable');
    if (!table) return;

    try {
        const response = await fetch(getApiUrl('/api/employees'));
        allEmployees = await response.json();

        table.innerHTML = '';
        allEmployees.forEach(emp => {
            if (emp.id === 'admin-id') return;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${emp.name}</div>
                </td>
                <td>${emp.email}</td>
                <td>${emp.mobile}</td>
                <td><span style="text-transform: capitalize;">${emp.role}</span></td>
                <td><span class="status-badge status-${emp.isActive ? 'completed' : 'noshow'}">${emp.isActive ? 'Active' : 'Disabled'}</span></td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="openEditModal('${emp.id}')" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;">
                            Edit
                        </button>
                        <button onclick="toggleEmployee('${emp.id}', ${!emp.isActive})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">
                            ${emp.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onclick="deleteEmployee('${emp.id}')" class="btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; color: #ff4d4f; border-color: rgba(255, 77, 79, 0.3);">
                            Delete
                        </button>
                    </div>
                </td>
            `;
            table.appendChild(tr);
        });
    } catch (e) {
        console.error("Load error:", e);
    }
}

function openEditModal(id) {
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('empId').value = emp.id;
    document.getElementById('empName').value = emp.name;
    document.getElementById('empEmail').value = emp.email;
    document.getElementById('empMobile').value = emp.mobile;
    document.getElementById('empRole').value = emp.role;

    // Setup for edit mode
    document.getElementById('empPassword').value = '';
    document.getElementById('empConfirmPassword').value = '';
    document.getElementById('empPassword').required = false;
    document.getElementById('pwHint').style.display = 'block';

    document.querySelector('.modal-header h2').textContent = 'Edit Employee';
    document.getElementById('formError').style.display = 'none';

    document.getElementById('empModal').style.display = 'flex';
}

async function toggleEmployee(id, newState) {
    try {
        await fetch(getApiUrl(`/api/employees/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: newState })
        });
        loadEmployees();
        showToast(`Employee ${newState ? 'enabled' : 'disabled'} successfully`);
    } catch (e) {
        console.error("Toggle error:", e);
    }
}

async function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee permanently? This action cannot be undone.')) {
        try {
            const response = await fetch(getApiUrl(`/api/employees/${id}`), {
                method: 'DELETE'
            });
            if (response.ok) {
                loadEmployees();
                showToast('Employee deleted successfully');
            } else {
                alert('Failed to delete employee.');
            }
        } catch (e) {
            console.error("Delete error:", e);
        }
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

function showError(msg) {
    const errorEl = document.getElementById('formError');
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
