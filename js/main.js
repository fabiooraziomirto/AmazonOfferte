// Configuration
const CONFIG = {
    API_URL: 'https://gift-finder-api.fabmi1234.workers.dev',
    AMAZON_AFFILIATE_ID: 'fabmi123402-21',
    TELEGRAM_URL: 'https://t.me/amazondeal_me',
    // Timeout per richieste API
    API_TIMEOUT: 10000,
    // Retry automatico
    MAX_RETRIES: 3,
};

// State
const state = {
    currentCategory: 'all',
    quizAnswers: {},
    giftDatabase: null,
    requestCache: new Map(),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Fetch con timeout e retry
async function fetchWithRetry(url, options = {}, retries = CONFIG.MAX_RETRIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers,
            },
        });

        clearTimeout(timeout);

        if (!response.ok && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }

        return response;
    } catch (error) {
        clearTimeout(timeout);
        
        if (retries > 0 && error.name !== 'AbortError') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        
        throw error;
    }
}

// Cache per richieste
function getCachedData(key, ttl = 300000) { // 5 minuti default
    const cached = state.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    state.requestCache.set(key, {
        data,
        timestamp: Date.now(),
    });
}

// Sanitize input
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Genera URL Amazon sicuro
function generateAmazonUrl(query, asin = null) {
    const baseUrl = 'https://www.amazon.it';
    const tag = `tag=${encodeURIComponent(CONFIG.AMAZON_AFFILIATE_ID)}`;
    
    if (asin) {
        return `${baseUrl}/dp/${encodeURIComponent(asin)}?${tag}`;
    }
    
    const searchQuery = encodeURIComponent(sanitizeInput(query));
    return `${baseUrl}/s?k=${searchQuery}&${tag}`;
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ============================================
// AMAZON SEARCH
// ============================================

function searchAmazon() {
    const input = document.getElementById('search-input');
    const query = input.value.trim();
    
    if (!query) {
        showNotification('Inserisci un termine di ricerca', 'warning');
        input.focus();
        return;
    }

    // Sanitize e valida input
    const sanitizedQuery = sanitizeInput(query);
    
    // Track search
    trackEvent('search', { query: sanitizedQuery });

    // Apri Amazon
    const amazonUrl = generateAmazonUrl(sanitizedQuery);
    window.open(amazonUrl, '_blank', 'noopener,noreferrer');
}

function quickSearch(category) {
    const input = document.getElementById('search-input');
    input.value = category;
    searchAmazon();
}

// ============================================
// GIFT FINDER QUIZ
// ============================================

function selectOption(questionNum, value) {
    const question = document.querySelector(`[data-q="${questionNum}"]`);
    question.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });

    event.target.closest('.option-card').classList.add('selected');
    state.quizAnswers[`q${questionNum}`] = value;
    document.getElementById(`next-${questionNum}`).disabled = false;
}

function nextQuestion(currentQ) {
    document.querySelector(`[data-q="${currentQ}"]`).classList.remove('active');
    document.querySelector(`[data-q="${currentQ + 1}"]`).classList.add('active');
    updateProgressBar(currentQ + 1);
    scrollToTabSection();
}

function prevQuestion(currentQ) {
    document.querySelector(`[data-q="${currentQ}"]`).classList.remove('active');
    document.querySelector(`[data-q="${currentQ - 1}"]`).classList.add('active');
    updateProgressBar(currentQ - 1);
    scrollToTabSection();
}

function updateProgressBar(questionNum) {
    const progress = (questionNum / 4) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
}

function scrollToTabSection() {
    document.querySelector('.tab-section').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

async function showResults() {
    document.querySelector('[data-q="4"]').classList.remove('active');

    // Show loading
    const resultsGrid = document.getElementById('results-grid');
    resultsGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cerco i regali perfetti...</p></div>';
    document.getElementById('quiz-results').classList.add('show');

    try {
        const recommendations = await getRecommendations();
        displayResults(recommendations);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        resultsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Errore nel caricamento. Riprova.</p>';
    }

    document.getElementById('progress-bar').style.width = '100%';
    scrollToTabSection();
}

async function getRecommendations() {
    try {
        const response = await fetchWithRetry(`${CONFIG.API_URL}/gift-recommendations`, {
            method: 'POST',
            body: JSON.stringify(state.quizAnswers),
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.log('Using fallback recommendations:', error);
    }

    return getFallbackRecommendations();
}

function getFallbackRecommendations() {
    const interest = state.quizAnswers.q4 || 'tecnologia';
    const budget = state.quizAnswers.q3 || 'medio';

    const giftDB = {
        tecnologia: {
            economico: [
                { name: 'Power Bank 20000mAh', price: '€24,99', emoji: '🔋' },
                { name: 'Supporto Smartphone Regolabile', price: '€15,99', emoji: '📱' },
                { name: 'Cavo USB-C Multi-device', price: '€19,99', emoji: '🔌' }
            ],
            medio: [
                { name: 'Cuffie Bluetooth Wireless', price: '€49,99', emoji: '🎧' },
                { name: 'Mouse Wireless Ergonomico', price: '€39,99', emoji: '🖱️' },
                { name: 'Webcam Full HD 1080p', price: '€59,99', emoji: '📹' }
            ],
            alto: [
                { name: 'Smartwatch Fitness Pro', price: '€149,99', emoji: '⌚' },
                { name: 'Tablet 10" 128GB', price: '€199,99', emoji: '📲' },
                { name: 'Tastiera Meccanica RGB', price: '€129,99', emoji: '⌨️' }
            ],
            lusso: [
                { name: 'Laptop Ultrabook Premium', price: '€899,99', emoji: '💻' },
                { name: 'Cuffie Noise Cancelling Pro', price: '€349,99', emoji: '🎧' },
                { name: 'Smartphone Flagship', price: '€799,99', emoji: '📱' }
            ]
        },
        // ... altri database
    };

    const products = giftDB[interest]?.[budget] || giftDB.tecnologia.medio;
    
    return products.map(product => ({
        ...product,
        searchQuery: `${product.name} amazon`
    }));
}

function displayResults(recommendations) {
    const grid = document.getElementById('results-grid');
    grid.innerHTML = '';

    recommendations.forEach(product => {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        const amazonUrl = generateAmazonUrl(product.searchQuery || product.name);
        
        card.innerHTML = `
            <div class="result-image">${product.emoji}</div>
            <div class="result-info">
                <div class="result-title">${sanitizeInput(product.name)}</div>
                <div class="result-price">${sanitizeInput(product.price)}</div>
                <a href="${amazonUrl}" 
                   target="_blank" 
                   rel="noopener noreferrer nofollow"
                   class="result-btn" 
                   onclick="trackGiftClick('${sanitizeInput(product.name)}')">
                    Vedi su Amazon →
                </a>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function restartQuiz() {
    state.quizAnswers = {};
    document.getElementById('quiz-results').classList.remove('show');
    
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`next-${i}`).disabled = true;
    }
    
    document.querySelectorAll('.quiz-question').forEach(q => {
        q.classList.remove('active');
    });
    
    document.querySelector('[data-q="1"]').classList.add('active');
    document.getElementById('progress-bar').style.width = '0%';
    scrollToTabSection();
}

function trackGiftClick(productName) {
    trackEvent('gift_click', {
        product_name: productName,
        quiz_answers: state.quizAnswers
    });

    // Send to API (non-blocking)
    fetchWithRetry(`${CONFIG.API_URL}/api/track/gift-click`, {
        method: 'POST',
        body: JSON.stringify({
            product: productName,
            answers: state.quizAnswers
        })
    }).catch(err => console.log('Analytics error:', err));
}

// ============================================
// OFFERS LOADING
// ============================================

async function fetchOffers(category = 'all') {
    const cacheKey = `offers_${category}`;
    const cached = getCachedData(cacheKey);
    
    if (cached) {
        displayOffers(cached);
        updateStats(cached.length);
        return;
    }

    try {
        const params = new URLSearchParams({
            limit: 50,
            published_only: true
        });

        if (category !== 'all') {
            params.append('category', category);
        }

        const response = await fetchWithRetry(`${CONFIG.API_URL}/api/offers?${params}`);
        const offers = await response.json();

        setCachedData(cacheKey, offers);
        displayOffers(offers);
        updateStats(offers.length);
    } catch (error) {
        console.error('Error fetching offers:', error);
        showErrorState();
    }
}

function displayOffers(offers) {
    const container = document.getElementById('offers-container');

    if (offers.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <p>Nessuna offerta disponibile al momento. Controlla più tardi!</p>
            </div>
        `;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'offers-grid';

    offers.forEach(offer => {
        const card = createOfferCard(offer);
        grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

function createOfferCard(offer) {
    const card = document.createElement('div');
    card.className = 'offer-card';

    const hasDiscount = offer.original_price && offer.discounted_price;
    const discountBadge = hasDiscount ? 
        `<div class="offer-badge">-${offer.discount_percentage}%</div>` : '';

    const imageUrl = offer.image_url || 'https://via.placeholder.com/400x280/1a1f28/ff6b35?text=No+Image';

    const priceHTML = hasDiscount ? `
        <div class="offer-prices">
            <span class="price-old">€${offer.original_price.toFixed(2)}</span>
            <span class="price-new">€${offer.discounted_price.toFixed(2)}</span>
        </div>
    ` : offer.discounted_price ? `
        <div class="offer-prices">
            <span class="price-new">€${offer.discounted_price.toFixed(2)}</span>
        </div>
    ` : '';

    card.innerHTML = `
        ${discountBadge}
        <img src="${imageUrl}" 
             alt="${sanitizeInput(offer.product_name)}" 
             class="offer-image" 
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/400x280/1a1f28/ff6b35?text=No+Image'">
        <div class="offer-content">
            ${offer.category ? `<div class="offer-category">${sanitizeInput(offer.category)}</div>` : ''}
            <h3 class="offer-title">${sanitizeInput(offer.product_name)}</h3>
            ${offer.description ? `<p class="offer-description">${sanitizeInput(offer.description)}</p>` : ''}
            ${priceHTML}
            <a href="${offer.affiliate_link}" 
               target="_blank" 
               rel="noopener noreferrer nofollow"
               class="offer-cta"
               onclick="trackClick(${offer.id})">
                Vedi Offerta su Amazon →
            </a>
        </div>
    `;

    return card;
}

async function trackClick(offerId) {
    try {
        await fetchWithRetry(`${CONFIG.API_URL}/api/offers/${offerId}/click`, {
            method: 'POST'
        });
        trackEvent('offer_click', { offer_id: offerId });
    } catch (error) {
        console.error('Error tracking click:', error);
    }
}

function updateStats(count) {
    const statsEl = document.getElementById('total-offers');
    if (statsEl) {
        statsEl.textContent = count;
    }
}

function showErrorState() {
    document.getElementById('offers-container').innerHTML = `
        <div class="loading">
            <p>❌ Errore nel caricamento. <button onclick="fetchOffers('${state.currentCategory}')" style="color: var(--accent); text-decoration: underline; background: none; border: none; cursor: pointer;">Riprova</button></p>
        </div>
    `;
}

// ============================================
// FILTER FUNCTIONALITY
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.dataset.category;
            state.currentCategory = category;
            fetchOffers(category);
        });
    });

    // Search on Enter
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchAmazon();
            }
        });
    }
});

// ============================================
// NEWSLETTER
// ============================================

async function subscribeNewsletter(event) {
    event.preventDefault();
    
    const form = event.target;
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput.value.trim();
    const button = form.querySelector('button');
    
    // Disable button durante submit
    button.disabled = true;
    button.textContent = 'Invio...';
    
    try {
        const response = await fetchWithRetry(`${CONFIG.API_URL}/api/newsletter/subscribe`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            showNotification('✅ Iscrizione completata! Controlla la tua email.', 'success');
            form.reset();
            trackEvent('newsletter_subscribe', { email_domain: email.split('@')[1] });
        } else {
            throw new Error('Subscription failed');
        }
    } catch (error) {
        console.error('Newsletter error:', error);
        showNotification('❌ Errore nell\'iscrizione. Riprova più tardi.', 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Iscriviti';
    }
}

// ============================================
// NOTIFICATIONS & ANALYTICS
// ============================================

function showNotification(message, type = 'info') {
    // Crea notifica toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function trackEvent(eventName, eventData = {}) {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Console log per debug
    console.log('Event tracked:', eventName, eventData);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load offers
    fetchOffers();

    // Refresh ogni 5 minuti
    setInterval(() => {
        // Clear cache prima del refresh
        state.requestCache.clear();
        fetchOffers(state.currentCategory);
    }, 5 * 60 * 1000);

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});

// Service Worker registration (opzionale, per PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('SW registration failed:', err);
        });
    });
}

// ============================================
// WISHLIST MANAGEMENT
// ============================================

const wishlist = {
    STORAGE_KEY: 'deal_hunter_wishlist',

    // Get all items from wishlist
    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading wishlist:', e);
            return [];
        }
    },

    // Save wishlist to localStorage
    save(items) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
            this.updateCount();
        } catch (e) {
            console.error('Error saving wishlist:', e);
        }
    },

    // Add item to wishlist
    add(item) {
        const items = this.getAll();
        const exists = items.find(i => i.id === item.id);

        if (!exists) {
            items.push({
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image,
                link: item.link,
                addedAt: new Date().toISOString()
            });
            this.save(items);
            showNotification('❤️ Aggiunto alla wishlist!', 'success');
            trackEvent('wishlist_add', { product_id: item.id });
        }
    },

    // Remove item from wishlist
    remove(itemId) {
        const items = this.getAll();
        const filtered = items.filter(i => i.id !== itemId);
        this.save(filtered);
        showNotification('🗑️ Rimosso dalla wishlist', 'info');
        trackEvent('wishlist_remove', { product_id: itemId });
        this.render();
    },

    // Check if item is in wishlist
    has(itemId) {
        return this.getAll().some(i => i.id === itemId);
    },

    // Update wishlist count in header
    updateCount() {
        const count = this.getAll().length;
        const counter = document.getElementById('wishlist-count');
        if (counter) {
            counter.textContent = count;
        }
    },

    // Render wishlist modal
    render() {
        const container = document.getElementById('wishlist-items');
        const items = this.getAll();

        if (items.length === 0) {
            container.innerHTML = `
                <div class="wishlist-empty">
                    <p>😢 La tua wishlist è vuota</p>
                    <p class="wishlist-empty-sub">Inizia ad aggiungere le tue offerte preferite!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="wishlist-item">
                <img src="${item.image}" alt="${sanitizeInput(item.name)}" class="wishlist-item-image" onerror="this.src='https://via.placeholder.com/100/1a1f28/ff6b35?text=No+Image'">
                <div class="wishlist-item-info">
                    <div class="wishlist-item-title">${sanitizeInput(item.name)}</div>
                    <div class="wishlist-item-price">${item.price}</div>
                    <div class="wishlist-item-actions">
                        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="wishlist-item-btn wishlist-item-btn-view">
                            Vedi su Amazon →
                        </a>
                        <button class="wishlist-item-btn wishlist-item-btn-remove" onclick="wishlist.remove('${item.id}')">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
};

// Toggle wishlist modal
function toggleWishlistModal() {
    const modal = document.getElementById('wishlist-modal');
    if (modal) {
        const isShowing = modal.classList.contains('show');
        if (isShowing) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        } else {
            wishlist.render();
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
        }
    }
}

// Toggle wishlist item (from heart button on card)
function toggleWishlistItem(offerId, offerData) {
    if (wishlist.has(offerId)) {
        wishlist.remove(offerId);
        updateHeartButton(offerId, false);
    } else {
        wishlist.add(offerData);
        updateHeartButton(offerId, true);
    }
}

// Update heart button visual state
function updateHeartButton(offerId, isInWishlist) {
    const button = document.querySelector(`[data-wishlist-id="${offerId}"]`);
    if (button) {
        if (isInWishlist) {
            button.classList.add('active');
            button.innerHTML = '❤️';
        } else {
            button.classList.remove('active');
            button.innerHTML = '🤍';
        }
    }
}

// ============================================
// ADVANCED FILTERS
// ============================================

const filters = {
    price: 'all',
    discount: 0,
    sort: 'newest'
};

// Apply filters to offers
function applyFilters(offers) {
    let filtered = [...offers];

    // Filter by price range
    if (filters.price !== 'all') {
        filtered = filtered.filter(offer => {
            const price = offer.discounted_price || offer.original_price || 0;

            if (filters.price === '0-20') return price <= 20;
            if (filters.price === '20-50') return price > 20 && price <= 50;
            if (filters.price === '50-100') return price > 50 && price <= 100;
            if (filters.price === '100-200') return price > 100 && price <= 200;
            if (filters.price === '200+') return price > 200;

            return true;
        });
    }

    // Filter by minimum discount
    if (filters.discount > 0) {
        filtered = filtered.filter(offer => {
            return (offer.discount_percentage || 0) >= filters.discount;
        });
    }

    // Sort offers
    filtered = sortOffers(filtered, filters.sort);

    return filtered;
}

// Sort offers by criteria
function sortOffers(offers, sortBy) {
    const sorted = [...offers];

    switch(sortBy) {
        case 'newest':
            // Assume offers are already sorted by newest
            break;

        case 'discount':
            sorted.sort((a, b) => {
                const discountA = a.discount_percentage || 0;
                const discountB = b.discount_percentage || 0;
                return discountB - discountA;
            });
            break;

        case 'price-asc':
            sorted.sort((a, b) => {
                const priceA = a.discounted_price || a.original_price || 0;
                const priceB = b.discounted_price || b.original_price || 0;
                return priceA - priceB;
            });
            break;

        case 'price-desc':
            sorted.sort((a, b) => {
                const priceA = a.discounted_price || a.original_price || 0;
                const priceB = b.discounted_price || b.original_price || 0;
                return priceB - priceA;
            });
            break;
    }

    return sorted;
}

// Reset all filters
function resetFilters() {
    filters.price = 'all';
    filters.discount = 0;
    filters.sort = 'newest';

    document.getElementById('price-filter').value = 'all';
    document.getElementById('discount-filter').value = '0';
    document.getElementById('sort-filter').value = 'newest';

    fetchOffers(state.currentCategory);
}

// ============================================
// ENHANCED OFFER DISPLAY
// ============================================

// Override createOfferCard to add wishlist button
const originalCreateOfferCard = createOfferCard;
function createOfferCard(offer) {
    const card = originalCreateOfferCard(offer);

    // Add wishlist heart button
    const heartBtn = document.createElement('button');
    heartBtn.className = 'wishlist-heart-btn';
    heartBtn.setAttribute('data-wishlist-id', offer.id);
    heartBtn.setAttribute('aria-label', 'Aggiungi alla wishlist');
    heartBtn.innerHTML = wishlist.has(offer.id) ? '❤️' : '🤍';
    if (wishlist.has(offer.id)) {
        heartBtn.classList.add('active');
    }

    heartBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlistItem(offer.id, {
            id: offer.id,
            name: offer.product_name,
            price: offer.discounted_price ? `€${offer.discounted_price.toFixed(2)}` : 'N/A',
            image: offer.image_url || 'https://via.placeholder.com/100',
            link: offer.affiliate_link
        });
    };

    card.insertBefore(heartBtn, card.firstChild);

    return card;
}

// Override displayOffers to apply filters
const originalDisplayOffers = displayOffers;
function displayOffers(offers) {
    const filtered = applyFilters(offers);
    originalDisplayOffers(filtered);
}

// ============================================
// INITIALIZATION WITH NEW FEATURES
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize wishlist count
    wishlist.updateCount();

    // Advanced filters event listeners
    document.getElementById('price-filter')?.addEventListener('change', (e) => {
        filters.price = e.target.value;
        fetchOffers(state.currentCategory);
        trackEvent('filter_change', { type: 'price', value: e.target.value });
    });

    document.getElementById('discount-filter')?.addEventListener('change', (e) => {
        filters.discount = parseInt(e.target.value);
        fetchOffers(state.currentCategory);
        trackEvent('filter_change', { type: 'discount', value: e.target.value });
    });

    document.getElementById('sort-filter')?.addEventListener('change', (e) => {
        filters.sort = e.target.value;
        fetchOffers(state.currentCategory);
        trackEvent('filter_change', { type: 'sort', value: e.target.value });
    });

    document.getElementById('reset-filters')?.addEventListener('click', resetFilters);

    // Close wishlist modal with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('wishlist-modal');
            if (modal && modal.classList.contains('show')) {
                toggleWishlistModal();
            }
        }
    });
});
