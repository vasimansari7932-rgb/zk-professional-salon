let products = [];

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

async function loadProducts() {
    try {
        const response = await fetch(getApiUrl('/api/products'));
        const data = await response.json();
        products = Array.isArray(data) ? data : [];
        renderProducts();
    } catch (e) {
        console.error("Load products error:", e);
        products = [];
        renderProducts();
    }
}

function renderProducts() {
    const list = document.getElementById('productList');
    if (!list) return;

    list.innerHTML = '';
    if (products.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No products found.</td></tr>';
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${p.image}" class="product-thumbnail" onerror="this.src='https://via.placeholder.com/50'"></td>
            <td><strong>${p.name}</strong></td>
            <td>₹${p.price.toLocaleString('en-IN')}</td>
            <td>
                <span class="status-badge status-${p.isActive ? 'active' : 'inactive'}">
                    ${p.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${p.createdAt || '-'}</td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="openEditModal('${p.id}')" class="btn-primary" style="padding: 4px 8px; font-size: 0.8rem;">Edit</button>
                    <button onclick="toggleStatus('${p.id}', ${!p.isActive})" class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;">
                        ${p.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="confirmDelete('${p.id}')" class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; border-color: #f44336; color: #f44336;">Delete</button>
                </div>
            </td>
        `;
        list.appendChild(tr);
    });
}

function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('placeholder');

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
    } else if (!preview.src || preview.src.includes('undefined')) {
        preview.style.display = 'none';
        placeholder.style.display = 'block';
    }
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productId').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('placeholder').style.display = 'block';
    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';
}

function openEditModal(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productDesc').value = p.description;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productStatus').value = p.isActive.toString();

    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('placeholder');
    preview.src = p.image;
    preview.style.display = 'block';
    placeholder.style.display = 'none';

    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const id = document.getElementById('productId').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDesc').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('isActive', document.getElementById('productStatus').value);

    const imageInput = document.getElementById('productImage');
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    } else if (!id) {
        alert("Please upload a product image.");
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Product';
        return;
    }

    try {
        const url = id ? getApiUrl(`/api/products/${id}`) : getApiUrl('/api/products');
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            body: formData
        });

        if (response.ok) {
            closeModal();
            loadProducts();
            showToast(id ? 'Product updated successfully!' : 'Product added successfully!');
        } else {
            alert("Error saving product. Please try again.");
        }
    } catch (err) {
        console.error("Save product error:", err);
        alert("Failed to save product.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Product';
    }
});

async function toggleStatus(id, newStatus) {
    try {
        const formData = new FormData();
        formData.append('isActive', newStatus);

        await fetch(`/api/products/${id}`, {
            method: 'PUT',
            body: formData
        });
        loadProducts();
    } catch (e) {
        console.error("Toggle status error:", e);
    }
}

async function confirmDelete(id) {
    if (confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
        try {
            const response = await fetch(getApiUrl(`/api/products/${id}`), {
                method: 'DELETE'
            });
            if (response.ok) {
                loadProducts();
                showToast('Product deleted successfully');
            }
        } catch (e) {
            console.error("Delete product error:", e);
        }
    }
}

function showToast(msg) {
    // Check if toast element exists in parent or here
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
