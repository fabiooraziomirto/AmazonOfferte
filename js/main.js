// Configuration
const CONFIG = {
    API_URL: '/api',
    AMAZON_AFFILIATE_ID: 'fabmi123402-21', // Inserisci il tuo Amazon Associates ID
    TELEGRAM_URL: 'https://t.me/amazondeal_me' // Inserisci il link al tuo canale Telegram
};

// State
const state = {
    currentCategory: 'all',
    quizAnswers: {},
    giftDatabase: null
};

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
    // Remove active from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active to selected tab
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ============================================
// AMAZON SEARCH
// ============================================

function searchAmazon() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        alert('Inserisci un termine di ricerca');
        return;
    }

    const amazonUrl = `https://www.amazon.it/s?k=${encodeURIComponent(query)}&tag=${CONFIG.AMAZON_AFFILIATE_ID}`;
    window.open(amazonUrl, '_blank');
}

function quickSearch(category) {
    document.getElementById('search-input').value = category;
    searchAmazon();
}

// Search on Enter key
document.addEventListener('DOMContentLoaded', () => {
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
// GIFT FINDER QUIZ
// ============================================

function selectOption(questionNum, value) {
    // Remove selection from all options in this question
    const question = document.querySelector(`[data-q="${questionNum}"]`);
    question.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selection to clicked option
    event.target.closest('.option-card').classList.add('selected');

    // Save answer
    state.quizAnswers[`q${questionNum}`] = value;

    // Enable next button
    document.getElementById(`next-${questionNum}`).disabled = false;
}

function nextQuestion(currentQ) {
    // Hide current question
    document.querySelector(`[data-q="${currentQ}"]`).classList.remove('active');

    // Show next question
    const nextQ = currentQ + 1;
    document.querySelector(`[data-q="${nextQ}"]`).classList.add('active');

    // Update progress bar
    updateProgressBar(nextQ);

    // Scroll to top
    document.querySelector('.tab-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prevQuestion(currentQ) {
    // Hide current question
    document.querySelector(`[data-q="${currentQ}"]`).classList.remove('active');

    // Show previous question
    const prevQ = currentQ - 1;
    document.querySelector(`[data-q="${prevQ}"]`).classList.add('active');

    // Update progress bar
    updateProgressBar(prevQ);

    // Scroll to top
    document.querySelector('.tab-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateProgressBar(questionNum) {
    const progress = (questionNum / 4) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
}

async function showResults() {
    // Hide last question
    document.querySelector('[data-q="4"]').classList.remove('active');

    // Get recommendations from API or use fallback
    const recommendations = await getRecommendations();

    // Display results
    displayResults(recommendations);

    // Show results container
    document.getElementById('quiz-results').classList.add('show');

    // Progress bar to 100%
    document.getElementById('progress-bar').style.width = '100%';

    // Scroll to results
    setTimeout(() => {
        document.querySelector('.tab-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

async function getRecommendations() {
    try {
        // Try to get from API
        const response = await fetch(`${CONFIG.API_URL}/gift-recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state.quizAnswers)
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.log('Using fallback recommendations');
    }

    // Fallback: use local database
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
        sport: {
            economico: [
                { name: 'Borraccia Termica 750ml', price: '€19,99', emoji: '💧' },
                { name: 'Tappetino Yoga Premium', price: '€24,99', emoji: '🧘' },
                { name: 'Fascia Elastica Fitness', price: '€15,99', emoji: '💪' }
            ],
            medio: [
                { name: 'Orologio GPS Running', price: '€79,99', emoji: '⌚' },
                { name: 'Set Manubri Regolabili', price: '€89,99', emoji: '🏋️' },
                { name: 'Zaino Trekking 40L', price: '€69,99', emoji: '🎒' }
            ],
            alto: [
                { name: 'Cyclette Smart Pieghevole', price: '€249,99', emoji: '🚴' },
                { name: 'Smartwatch Sport Premium', price: '€199,99', emoji: '⌚' },
                { name: 'Action Camera 4K Pro', price: '€179,99', emoji: '📹' }
            ],
            lusso: [
                { name: 'Bicicletta Elettrica', price: '€1299,99', emoji: '🚲' },
                { name: 'Tapis Roulant Professionale', price: '€899,99', emoji: '🏃' },
                { name: 'Home Gym Completa', price: '€1499,99', emoji: '💪' }
            ]
        },
        moda: {
            economico: [
                { name: 'Sciarpa Cashmere', price: '€29,99', emoji: '🧣' },
                { name: 'Orologio Minimal Design', price: '€24,99', emoji: '⌚' },
                { name: 'Set Gioielli Eleganti', price: '€19,99', emoji: '💍' }
            ],
            medio: [
                { name: 'Borsa Pelle Tracolla', price: '€89,99', emoji: '👜' },
                { name: 'Occhiali da Sole Polarizzati', price: '€59,99', emoji: '🕶️' },
                { name: 'Portafoglio Pelle Genuina', price: '€49,99', emoji: '👛' }
            ],
            alto: [
                { name: 'Zaino Fashion Premium', price: '€159,99', emoji: '🎒' },
                { name: 'Orologio Automatico', price: '€249,99', emoji: '⌚' },
                { name: 'Cintura Pelle Designer', price: '€129,99', emoji: '⭕' }
            ],
            lusso: [
                { name: 'Borsetta Designer Limited', price: '€499,99', emoji: '👜' },
                { name: 'Orologio Svizzero', price: '€899,99', emoji: '⌚' },
                { name: 'Giacca Pelle Premium', price: '€699,99', emoji: '🧥' }
            ]
        },
        cucina: {
            economico: [
                { name: 'Set Coltelli Professionali', price: '€29,99', emoji: '🔪' },
                { name: 'Bilancia Digitale Cucina', price: '€19,99', emoji: '⚖️' },
                { name: 'Libro Ricette Bestseller', price: '€24,99', emoji: '📕' }
            ],
            medio: [
                { name: 'Frullatore 1000W', price: '€69,99', emoji: '🥤' },
                { name: 'Set Pentole Antiaderenti', price: '€89,99', emoji: '🍳' },
                { name: 'Macchina Caffè Espresso', price: '€79,99', emoji: '☕' }
            ],
            alto: [
                { name: 'Robot da Cucina Pro', price: '€199,99', emoji: '🤖' },
                { name: 'Macchina Sottovuoto', price: '€149,99', emoji: '📦' },
                { name: 'Estrattore Slow Juicer', price: '€179,99', emoji: '🥤' }
            ],
            lusso: [
                { name: 'Planetaria 6L Professional', price: '€499,99', emoji: '🎂' },
                { name: 'Macchina Caffè Automatica', price: '€899,99', emoji: '☕' },
                { name: 'Forno Smart Multifunzione', price: '€699,99', emoji: '🔥' }
            ]
        },
        gaming: {
            economico: [
                { name: 'Controller Wireless Pro', price: '€29,99', emoji: '🎮' },
                { name: 'Mousepad Gaming XXL', price: '€19,99', emoji: '🖱️' },
                { name: 'Cuffie Gaming RGB', price: '€24,99', emoji: '🎧' }
            ],
            medio: [
                { name: 'Mouse Gaming 16000 DPI', price: '€59,99', emoji: '🖱️' },
                { name: 'Tastiera Meccanica RGB', price: '€89,99', emoji: '⌨️' },
                { name: 'Webcam Streaming HD', price: '€69,99', emoji: '📹' }
            ],
            alto: [
                { name: 'Sedia Gaming Ergonomica', price: '€249,99', emoji: '🪑' },
                { name: 'Monitor Gaming 27" 144Hz', price: '€299,99', emoji: '🖥️' },
                { name: 'Console Portatile Premium', price: '€199,99', emoji: '🎮' }
            ],
            lusso: [
                { name: 'PC Gaming RTX 4070', price: '€1499,99', emoji: '💻' },
                { name: 'Setup Gaming RGB Completo', price: '€999,99', emoji: '🎮' },
                { name: 'Simulator Racing Pro', price: '€1299,99', emoji: '🏎️' }
            ]
        },
        libri: {
            economico: [
                { name: 'Bestseller del Momento', price: '€14,99', emoji: '📚' },
                { name: 'Lampada Lettura LED', price: '€19,99', emoji: '💡' },
                { name: 'Set Segnalibri Premium', price: '€12,99', emoji: '🔖' }
            ],
            medio: [
                { name: 'E-Reader 6" Touchscreen', price: '€79,99', emoji: '📖' },
                { name: 'Lampada Scrivania Smart', price: '€49,99', emoji: '🕯️' },
                { name: 'Libreria Modulare Design', price: '€89,99', emoji: '📚' }
            ],
            alto: [
                { name: 'E-Reader 7" Waterproof', price: '€199,99', emoji: '📱' },
                { name: 'Poltrona Lettura Ergonomica', price: '€249,99', emoji: '🪑' },
                { name: 'Collezione Libri Classici', price: '€149,99', emoji: '📚' }
            ],
            lusso: [
                { name: 'Tablet Pro 12" + Abbonamento', price: '€699,99', emoji: '📲' },
                { name: 'Libreria Design Illuminata', price: '€899,99', emoji: '📚' },
                { name: 'Poltrona Massaggiante', price: '€1299,99', emoji: '🛋️' }
            ]
        },
        musica: {
            economico: [
                { name: 'Cuffie Bluetooth Sport', price: '€24,99', emoji: '🎧' },
                { name: 'Speaker Bluetooth Mini', price: '€19,99', emoji: '🔊' },
                { name: 'Supporto Spartiti', price: '€14,99', emoji: '🎼' }
            ],
            medio: [
                { name: 'Cuffie Studio Monitor', price: '€89,99', emoji: '🎧' },
                { name: 'Speaker Bluetooth 360°', price: '€69,99', emoji: '🔊' },
                { name: 'Microfono USB Podcast', price: '€79,99', emoji: '🎙️' }
            ],
            alto: [
                { name: 'Cuffie Wireless ANC', price: '€249,99', emoji: '🎧' },
                { name: 'Giradischi Vinili Bluetooth', price: '€199,99', emoji: '💿' },
                { name: 'Soundbar 5.1 Dolby', price: '€299,99', emoji: '🔊' }
            ],
            lusso: [
                { name: 'Home Theater 7.1', price: '€999,99', emoji: '🎵' },
                { name: 'Cuffie Audiophile HiFi', price: '€699,99', emoji: '🎧' },
                { name: 'Sistema Audio Multiroom', price: '€1299,99', emoji: '🔊' }
            ]
        },
        viaggi: {
            economico: [
                { name: 'Organizer Valigia 6pz', price: '€19,99', emoji: '🧳' },
                { name: 'Power Bank Travel', price: '€24,99', emoji: '🔋' },
                { name: 'Adattatore Universale', price: '€15,99', emoji: '🔌' }
            ],
            medio: [
                { name: 'Zaino Antifurto USB', price: '€49,99', emoji: '🎒' },
                { name: 'Borsa Viaggio 40L', price: '€39,99', emoji: '💼' },
                { name: 'Cuscino Viaggio Memory', price: '€29,99', emoji: '😴' }
            ],
            alto: [
                { name: 'Valigia Trolley 4 Ruote', price: '€149,99', emoji: '🧳' },
                { name: 'Drone 4K Pieghevole', price: '€249,99', emoji: '🚁' },
                { name: 'Action Camera Kit', price: '€179,99', emoji: '📹' }
            ],
            lusso: [
                { name: 'Set Valigie Premium 3pz', price: '€499,99', emoji: '🧳' },
                { name: 'Drone Professionale GPS', price: '€899,99', emoji: '🚁' },
                { name: 'Zaino Viaggio Smart 50L', price: '€349,99', emoji: '🎒' }
            ]
        }
    };

    const products = giftDB[interest]?.[budget] || giftDB.tecnologia.medio;
    
    // Add search query for Amazon
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
        
        const amazonUrl = `https://www.amazon.it/s?k=${encodeURIComponent(product.searchQuery || product.name)}&tag=${CONFIG.AMAZON_AFFILIATE_ID}`;
        
        card.innerHTML = `
            <div class="result-image">${product.emoji}</div>
            <div class="result-info">
                <div class="result-title">${product.name}</div>
                <div class="result-price">${product.price}</div>
                <a href="${amazonUrl}" target="_blank" class="result-btn" onclick="trackGiftClick('${product.name}')">
                    Vedi su Amazon →
                </a>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function restartQuiz() {
    // Reset state
    state.quizAnswers = {};

    // Hide results
    document.getElementById('quiz-results').classList.remove('show');

    // Reset all selections
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Disable all next buttons
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`next-${i}`).disabled = true;
    }

    // Hide all questions
    document.querySelectorAll('.quiz-question').forEach(q => {
        q.classList.remove('active');
    });

    // Show first question
    document.querySelector('[data-q="1"]').classList.add('active');

    // Reset progress bar
    document.getElementById('progress-bar').style.width = '0%';

    // Scroll to top
    document.querySelector('.tab-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function trackGiftClick(productName) {
    // Send analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'gift_click', {
            product_name: productName,
            quiz_answers: JSON.stringify(state.quizAnswers)
        });
    }

    // Send to API
    fetch(`${CONFIG.API_URL}/track/gift-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    try {
        const params = new URLSearchParams({
            limit: 50,
            published_only: true
        });

        if (category !== 'all') {
            params.append('category', category);
        }

        const response = await fetch(`${CONFIG.API_URL}/offers?${params}`);
        const offers = await response.json();

        displayOffers(offers);
        updateStats(offers.length);
    } catch (error) {
        console.error('Error fetching offers:', error);
        document.getElementById('offers-container').innerHTML = `
            <div class="loading">
                <p>Errore nel caricamento delle offerte. Riprova più tardi.</p>
            </div>
        `;
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
        <img src="${imageUrl}" alt="${offer.product_name}" class="offer-image" onerror="this.src='https://via.placeholder.com/400x280/1a1f28/ff6b35?text=No+Image'">
        <div class="offer-content">
            ${offer.category ? `<div class="offer-category">${offer.category}</div>` : ''}
            <h3 class="offer-title">${offer.product_name}</h3>
            ${offer.description ? `<p class="offer-description">${offer.description}</p>` : ''}
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
        await fetch(`${CONFIG.API_URL}/offers/${offerId}/click`, {
            method: 'POST'
        });
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
});

// ============================================
// NEWSLETTER
// ============================================

async function subscribeNewsletter(event) {
    event.preventDefault();
    
    const email = event.target.querySelector('input[type="email"]').value;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            alert('✅ Iscrizione completata! Controlla la tua email.');
            event.target.reset();
        } else {
            throw new Error('Subscription failed');
        }
    } catch (error) {
        console.error('Newsletter error:', error);
        alert('❌ Errore nell\'iscrizione. Riprova più tardi.');
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load offers
    fetchOffers();

    // Refresh every 5 minutes
    setInterval(() => fetchOffers(state.currentCategory), 5 * 60 * 1000);
});
