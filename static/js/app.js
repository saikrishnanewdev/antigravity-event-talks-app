// Global State Management
let allReleases = [];
let filteredReleases = [];
let currentCategory = 'all';
let searchQuery = '';
let activeTweetItem = null;

// Progress Ring Configuration
const CIRCUMFERENCE = 2 * Math.PI * 9; // r=9, circumference = 56.548

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refreshBtn'),
    refreshIcon: document.getElementById('refreshIcon'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    releasesFeed: document.getElementById('releasesFeed'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    emptyState: document.getElementById('emptyState'),
    retryBtn: document.getElementById('retryBtn'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterTabs: document.getElementById('filterTabs'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    
    // Stats elements
    statCountTotal: document.getElementById('statCountTotal'),
    statCountFeatures: document.getElementById('statCountFeatures'),
    statCountIssues: document.getElementById('statCountIssues'),
    statCountOthers: document.getElementById('statCountOthers'),

    // Tweet Drawer Elements
    drawerOverlay: document.getElementById('drawerOverlay'),
    composerDrawer: document.getElementById('composerDrawer'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    drawerBadge: document.getElementById('drawerBadge'),
    drawerDate: document.getElementById('drawerDate'),
    drawerSnippet: document.getElementById('drawerSnippet'),
    tweetTextArea: document.getElementById('tweetTextArea'),
    charCount: document.getElementById('charCount'),
    progressCircle: document.getElementById('progressCircle'),
    copyTweetBtn: document.getElementById('copyTweetBtn'),
    publishTweetBtn: document.getElementById('publishTweetBtn'),
    toastContainer: document.getElementById('toastContainer')
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
    initProgressRing();
});

// Setup Event Handlers
function setupEventListeners() {
    // Refresh Release Notes
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search Filters
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.clearSearchBtn.addEventListener('click', clearSearch);
    
    // Category Tabs Filter
    elements.filterTabs.addEventListener('click', handleCategoryChange);
    elements.resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Tweet Drawer Events
    elements.closeDrawerBtn.addEventListener('click', closeComposerDrawer);
    elements.drawerOverlay.addEventListener('click', closeComposerDrawer);
    elements.tweetTextArea.addEventListener('input', updateCharCountAndProgress);
    
    // Hashtags quick clicks
    document.querySelectorAll('.tag-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const tag = pill.getAttribute('data-tag');
            insertHashtag(tag);
        });
    });

    // Tweet actions
    elements.copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    elements.publishTweetBtn.addEventListener('click', publishTweetToTwitter);
}

// Fetch releases from the backend API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    
    try {
        const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'success' || result.status === 'warning') {
            allReleases = result.data;
            updateStats();
            applyFiltersAndRender();
            
            // Show status details
            const formattedTime = new Date(result.last_updated * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            elements.statusText.textContent = `Synced at ${formattedTime}`;
            elements.statusIndicator.className = 'status-indicator live';
            
            if (result.status === 'warning') {
                showToast(result.message, 'warning');
            } else if (forceRefresh) {
                showToast('Release notes synchronized successfully!', 'success');
            }
        } else {
            throw new Error(result.message || 'Unknown error occurred.');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        elements.errorMessage.textContent = error.message || 'Failed to fetch XML feed from server.';
        elements.statusText.textContent = 'Sync failed';
        elements.statusIndicator.className = 'status-indicator error';
        showLoading(false, true);
    }
}

// Show/Hide Loading and Error states
function showLoading(isLoading, hasError = false) {
    if (isLoading) {
        elements.loadingState.style.display = 'flex';
        elements.errorState.style.display = 'none';
        elements.releasesFeed.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.refreshIcon.classList.add('spin');
        elements.refreshBtn.disabled = true;
        
        elements.statusText.textContent = 'Syncing...';
        elements.statusIndicator.className = 'status-indicator syncing';
    } else {
        elements.loadingState.style.display = 'none';
        elements.refreshIcon.classList.remove('spin');
        elements.refreshBtn.disabled = false;
        
        if (hasError) {
            elements.errorState.style.display = 'flex';
            elements.releasesFeed.style.display = 'none';
        } else {
            elements.errorState.style.display = 'none';
            elements.releasesFeed.style.display = 'flex';
        }
    }
}

// Calculate Stats on full release dataset
function updateStats() {
    const total = allReleases.length;
    let features = 0;
    let issues = 0;
    let others = 0;
    
    allReleases.forEach(item => {
        const type = item.type.toLowerCase();
        if (type === 'feature') {
            features++;
        } else if (type === 'issue') {
            issues++;
        } else {
            others++;
        }
    });
    
    // Animate stats values
    animateValue(elements.statCountTotal, total);
    animateValue(elements.statCountFeatures, features);
    animateValue(elements.statCountIssues, issues);
    animateValue(elements.statCountOthers, others);
}

// Animate numbers for premium feel
function animateValue(obj, endValue) {
    let startTimestamp = null;
    const duration = 800; // ms
    const startValue = parseInt(obj.textContent) || 0;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = Math.floor(progress * (endValue - startValue) + startValue);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = endValue;
        }
    };
    window.requestAnimationFrame(step);
}

// Filter Event: Search Keyword change
function handleSearchInput(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    if (searchQuery.length > 0) {
        elements.clearSearchBtn.style.display = 'block';
    } else {
        elements.clearSearchBtn.style.display = 'none';
    }
    applyFiltersAndRender();
}

function clearSearch() {
    elements.searchInput.value = '';
    searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    applyFiltersAndRender();
}

// Filter Event: Tab selection
function handleCategoryChange(e) {
    if (!e.target.classList.contains('filter-tab')) return;
    
    // Update active tab styling
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    e.target.classList.add('active');
    
    currentCategory = e.target.getAttribute('data-type');
    applyFiltersAndRender();
}

function resetAllFilters() {
    elements.searchInput.value = '';
    searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector('.filter-tab[data-type="all"]').classList.add('active');
    currentCategory = 'all';
    
    applyFiltersAndRender();
}

// Combine category and search inputs to filter list
function applyFiltersAndRender() {
    filteredReleases = allReleases.filter(item => {
        const matchesCategory = currentCategory === 'all' || item.type === currentCategory;
        
        const textToSearch = `${item.date} ${item.type} ${item.text}`.toLowerCase();
        const matchesSearch = textToSearch.includes(searchQuery);
        
        return matchesCategory && matchesSearch;
    });
    
    renderFeed();
}

// Render filtered releases list inside the UI
function renderFeed() {
    showLoading(false, false);
    elements.releasesFeed.innerHTML = '';
    
    if (filteredReleases.length === 0) {
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    
    filteredReleases.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = 'release-card';
        card.style.animation = `slideUpFadeIn 0.3s ease forwards ${index * 0.04}s`;
        card.style.opacity = '0';
        
        // Match CSS category colors
        const typeClass = item.type.toLowerCase();
        
        // Highlight search queries in text
        let displayHtml = item.html;
        if (searchQuery) {
            // Safe highlight snippet helper that doesn't corrupt HTML tag strings
            // For simplicity, we just inject the parsed html, or we can highlight.
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="badge ${typeClass}">${item.type}</span>
                </div>
                <div class="card-date">
                    <i class="fa-regular fa-calendar-days"></i>
                    <span>${item.date}</span>
                </div>
            </div>
            <div class="card-body">
                ${displayHtml}
            </div>
            <div class="card-actions">
                <a href="${item.link}" target="_blank" rel="noopener" class="btn-card-action">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Docs
                </a>
                <button class="btn-card-action tweet-btn" data-index="${index}">
                    <i class="fa-brands fa-x-twitter"></i> Tweet
                </button>
            </div>
        `;
        
        // Bind tweet button event
        card.querySelector('.tweet-btn').addEventListener('click', () => {
            openComposerDrawer(item);
        });
        
        elements.releasesFeed.appendChild(card);
    });
}

// SVG Progress ring setup
function initProgressRing() {
    elements.progressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    elements.progressCircle.style.strokeDashoffset = CIRCUMFERENCE;
}

// Open tweet composer with smart prefilled text
function openComposerDrawer(item) {
    activeTweetItem = item;
    
    // Set drawer panel headers
    elements.drawerBadge.className = `badge ${item.type.toLowerCase()}`;
    elements.drawerBadge.textContent = item.type;
    elements.drawerDate.textContent = item.date;
    elements.drawerSnippet.textContent = item.text;
    
    // Generate intelligent tweet message template
    // Template structure: 📢 BigQuery [Type] (Date): Description text... link #GoogleCloud
    const header = `📢 #BigQuery ${item.type} (${item.date}):\n`;
    const footer = `\n\nDetails: ${item.link}`;
    
    // Max characters allowed for the summary description text
    const budget = 280 - header.length - footer.length - 15; // 15 char buffer
    
    let snippet = item.text;
    if (snippet.length > budget) {
        snippet = snippet.substring(0, budget - 3) + '...';
    }
    
    elements.tweetTextArea.value = `${header}${snippet}${footer}`;
    
    // Open drawer
    elements.composerDrawer.classList.add('active');
    elements.drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Stop page scrolling
    
    updateCharCountAndProgress();
}

function closeComposerDrawer() {
    elements.composerDrawer.classList.remove('active');
    elements.drawerOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Resume scrolling
}

// Handle dynamic character count progress
function updateCharCountAndProgress() {
    const text = elements.tweetTextArea.value;
    const length = text.length;
    
    elements.charCount.textContent = length;
    
    // Character count coloring
    if (length > 280) {
        elements.charCount.className = 'char-count-text error';
        elements.progressCircle.style.stroke = 'var(--color-issue)';
    } else if (length > 255) {
        elements.charCount.className = 'char-count-text warning';
        elements.progressCircle.style.stroke = 'var(--color-deprecated)';
    } else {
        elements.charCount.className = 'char-count-text';
        elements.progressCircle.style.stroke = 'var(--color-cyan)';
    }
    
    // Progress circle stroke offset
    const fraction = Math.min(length / 280, 1);
    const offset = CIRCUMFERENCE - (fraction * CIRCUMFERENCE);
    elements.progressCircle.style.strokeDashoffset = offset;
}

// Add quick hashtag to textarea
function insertHashtag(tag) {
    const text = elements.tweetTextArea.value;
    // Don't duplicate tag if it exists
    if (text.includes(tag)) {
        showToast(`Tag ${tag} is already in the tweet!`, 'info');
        return;
    }
    
    // Check where to append
    if (text.endsWith(' ') || text.endsWith('\n')) {
        elements.tweetTextArea.value = text + tag;
    } else {
        elements.tweetTextArea.value = text + ' ' + tag;
    }
    
    updateCharCountAndProgress();
    elements.tweetTextArea.focus();
}

// Action: Copy draft text to clipboard
function copyTweetToClipboard() {
    const text = elements.tweetTextArea.value;
    navigator.clipboard.writeText(text)
        .then(() => {
            showToast('Tweet text copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('Unable to copy. Please select and copy manually.', 'error');
        });
}

// Action: Publish draft tweet to Twitter Intent
function publishTweetToTwitter() {
    const text = elements.tweetTextArea.value;
    if (text.length > 280) {
        showToast('Your tweet exceeds the 280-character limit!', 'error');
        return;
    }
    
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
}

// Toast notification trigger
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    if (type === 'error') icon = 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Remove from DOM after transition completes
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
