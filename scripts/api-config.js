// Centralized API Configuration
const API_CONFIG = {
    // 1. If running on your own computer (localhost), use the local server
    // 2. If running on Netlify, use your Render.com URL
    BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? ''
        : 'https://zk-salon-api.onrender.com', // Replace with your actual Render URL
};

function getApiUrl(endpoint) {
    if (!API_CONFIG.BASE_URL && window.location.hostname !== 'localhost') {
        console.error("❌ API_CONFIG: BASE_URL is missing. Please set your backend URL in api-config.js");
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_CONFIG.BASE_URL}${cleanEndpoint}`;
}
