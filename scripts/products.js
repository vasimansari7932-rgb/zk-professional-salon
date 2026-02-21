document.addEventListener('DOMContentLoaded', () => {
    loadFrontendProducts();
});

async function loadFrontendProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    try {
        const response = await fetch(getApiUrl('/api/products/active'));
        const data = await response.json();
        const products = Array.isArray(data) ? data : [];

        if (products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                    <i data-lucide="package-search" style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--text-secondary);"></i>
                    <p style="color: var(--text-secondary); font-size: 1.1rem;">Our premium products will be arriving soon.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        grid.innerHTML = '';
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'glass-card product-card';

            // Generate WhatsApp Link
            const waNumber = "919265301656";
            const message = encodeURIComponent(`Hello ZK Professional Salon 👋\n\nI want to buy this product:\n\n🛒 Product Name: ${p.name}\n💰 Price: ₹${p.price}\n📍 Delivery Location: Ahmedabad\n🚚 COD Available\n\nPlease confirm availability.`);
            const waLink = `https://wa.me/${waNumber}?text=${message}`;

            card.innerHTML = `
                <img src="${p.image}" alt="${p.name} - Premium Salon Product Ahmedabad" class="product-image" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x300?text=Product'">
                <div>
                    <h3>${p.name}</h3>
                    <p class="product-price">₹${p.price.toLocaleString('en-IN')}</p>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">${p.description}</p>
                    <a href="${waLink}"
                        class="btn-secondary" style="width: 100%; display: inline-block; text-align: center;"
                        target="_blank">Buy Now <i data-lucide="message-circle"
                            style="width: 16px; height: 16px; vertical-align: middle;"></i></a>
                </div>
            `;
            grid.appendChild(card);
        });
        lucide.createIcons();

    } catch (e) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Failed to load products. Please try again later.</p>';
        console.error("Frontend product load error:", e);
    }
}
