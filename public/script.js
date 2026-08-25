// ==========================================
// 1. CONFIGURATION & STATE MANAGEMENT
// ==========================================

const API_BASE_URL = "http://localhost:8080/api";

const ENDPOINTS = {
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    POSTS: `${API_BASE_URL}/posts`,
    PROFILE: `${API_BASE_URL}/users/profile`,
    DASHBOARD: `${API_BASE_URL}/dashboard/summary`
};

let currentFeedPosts = [];

// Application startup
window.addEventListener('DOMContentLoaded', () => {
    initGlobalDropdownListener();
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
});

// Helper to retrieve stored auth token
function getAuthToken() {
    return localStorage.getItem('jwtToken');
}

// Helper to check if user is currently authenticated
function isAuthenticated() {
    const token = getAuthToken();
    return !!token && token.trim() !== '';
}

// User state helpers
function getCurrentUserId() {
    const id = localStorage.getItem('userId');
    return id ? parseInt(id, 10) : null;
}

function getCurrentUserRole() {
    return localStorage.getItem('userRole') || 'ROLE_USER';
}

function isCurrentUserAdmin() {
    const role = getCurrentUserRole();
    return role === 'ROLE_ADMIN' || role === 'ADMIN';
}

// Helper to generate auth headers
function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// In-App Toast Notification System (replaces native browser popups)
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `inapp-toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${escapeHTML(message)}</span>
        <button type="button" class="toast-close-btn" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => removeToast(toast));
    }

    container.appendChild(toast);

    setTimeout(() => {
        removeToast(toast);
    }, 4000);
}

function removeToast(toast) {
    if (!toast || toast.classList.contains('fade-out')) return;
    toast.classList.add('fade-out');
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 250);
}

// Helper to change route programmatically
function navigateTo(route) {
    if (window.location.hash === route) {
        handleRouteChange();
    } else {
        window.location.hash = route;
    }
}

// ==========================================
// 2. SPA CLIENT-SIDE ROUTER & ACCESS GUARDS
// ==========================================

function handleRouteChange() {
    closeAllPostMenus();
    const rawHash = window.location.hash.trim().toLowerCase();
    const loggedIn = isAuthenticated();

    // Default route assignment
    let route = rawHash;
    if (!route || route === '#' || route === '#/') {
        route = loggedIn ? '#/feed' : '#/login';
    }

    // Strict Route Guards
    if (!loggedIn) {
        // If not logged in, ONLY '#/login' and '#/signup' are accessible.
        // Any other URL (e.g., #/feed, #/dashboard, #/create-post, #/users, etc.)
        // is strictly blocked and bounced to #/login (startup page).
        if (route !== '#/login' && route !== '#/signup') {
            window.location.hash = '#/login';
            showAuthAlert('Please sign in or create an account to access that page.', 'error');
            return;
        }
    } else {
        // If already logged in, redirect away from landing/auth pages to feed
        if (route === '#/login' || route === '#/signup') {
            window.location.hash = '#/feed';
            return;
        }
    }

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });

    // Update Navigation UI and highlight active links
    updateNavUI(route);

    // Route view rendering
    switch (route) {
        case '#/login':
            renderAuthSection('signin');
            break;

        case '#/signup':
            renderAuthSection('signup');
            break;

        case '#/feed':
            const feedSection = document.getElementById('feed-section');
            if (feedSection) feedSection.style.display = 'block';
            fetchPosts();
            break;

        case '#/create-post':
            const createSection = document.getElementById('create-post-section');
            if (createSection) createSection.style.display = 'block';
            break;

        case '#/dashboard':
            const dashSection = document.getElementById('dashboard-section');
            if (dashSection) dashSection.style.display = 'block';
            fetchDashboardSummary();
            break;

        default:
            // Fallback for unknown URLs
            window.location.hash = loggedIn ? '#/feed' : '#/login';
            break;
    }
}

function updateNavUI(currentRoute) {
    const loggedIn = isAuthenticated();

    const feedLink = document.getElementById('nav-feed-link');
    const createLink = document.getElementById('nav-create-link');
    const dashLink = document.getElementById('nav-dashboard-link');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const loginLink = document.getElementById('nav-login-link');
    const signupLink = document.getElementById('nav-signup-link');
    const brandLink = document.getElementById('nav-brand-link');

    if (brandLink) {
        brandLink.href = loggedIn ? '#/feed' : '#/login';
    }

    if (loggedIn) {
        if (feedLink) feedLink.style.display = 'inline-block';
        if (createLink) createLink.style.display = 'inline-block';
        if (dashLink) dashLink.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';
    } else {
        if (feedLink) feedLink.style.display = 'none';
        if (createLink) createLink.style.display = 'none';
        if (dashLink) dashLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginLink) loginLink.style.display = 'inline-block';
        if (signupLink) signupLink.style.display = 'inline-block';
    }

    // Update active highlight classes
    // Update active highlight classes
    document.querySelectorAll('.header-controls .nav-btn').forEach(btn => btn.classList.remove('active'));
    if (currentRoute === '#/feed' && feedLink) feedLink.classList.add('active');
    if (currentRoute === '#/create-post' && createLink) createLink.classList.add('active');
    if (currentRoute === '#/dashboard' && dashLink) dashLink.classList.add('active');
    if (currentRoute === '#/login' && loginLink) loginLink.classList.add('active');
    if (currentRoute === '#/signup' && signupLink) signupLink.classList.add('active');
}

// ==========================================
// 3. AUTHENTICATION VIEW & TAB LOGIC
// ==========================================

function renderAuthSection(mode) {
    const authSection = document.getElementById('auth-section');
    if (authSection) authSection.style.display = 'block';

    const signinBtn = document.getElementById('tab-signin-btn');
    const signupBtn = document.getElementById('tab-signup-btn');
    const signinContainer = document.getElementById('signin-form-container');
    const signupContainer = document.getElementById('signup-form-container');

    if (mode === 'signin') {
        if (signinBtn) signinBtn.classList.add('active');
        if (signupBtn) signupBtn.classList.remove('active');
        if (signinContainer) signinContainer.style.display = 'block';
        if (signupContainer) signupContainer.style.display = 'none';
    } else {
        if (signupBtn) signupBtn.classList.add('active');
        if (signinBtn) signinBtn.classList.remove('active');
        if (signupContainer) signupContainer.style.display = 'block';
        if (signinContainer) signinContainer.style.display = 'none';
    }
}

function showAuthAlert(message, type = 'error') {
    const alertBox = document.getElementById('auth-alert');
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `auth-alert ${type}`;
    alertBox.style.display = 'block';
}

function clearAuthAlert() {
    const alertBox = document.getElementById('auth-alert');
    if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.textContent = '';
    }
}

// ==========================================
// 4. AUTHENTICATION (SIGN UP, LOGIN, LOGOUT)
// ==========================================

async function handleRegister(event) {
    if (event) event.preventDefault();
    clearAuthAlert();

    const nameInput = document.getElementById('reg-name');
    const studentNoInput = document.getElementById('reg-student-no');
    const passwordInput = document.getElementById('reg-password');

    const name = nameInput ? nameInput.value.trim() : '';
    const studentNo = studentNoInput ? studentNoInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!name || !studentNo || !password) {
        showAuthAlert('Please fill out all registration fields.', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthAlert('Password must be at least 6 characters.', 'error');
        return;
    }

    const formattedEmail = studentNo.includes('@') 
        ? studentNo 
        : `${studentNo}@iskolar.pup.edu.ph`;

    const signupPayload = { 
        name: name, 
        email: formattedEmail, 
        password: password 
    };

    try {
        const response = await fetch(ENDPOINTS.SIGNUP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signupPayload)
        });

        if (response.ok || response.status === 201) {
            // Reset signup inputs
            if (nameInput) nameInput.value = '';
            if (passwordInput) passwordInput.value = '';

            // Switch URL to #/login and pre-fill student number
            navigateTo('#/login');
            const loginStudentInput = document.getElementById('login-student-no');
            if (loginStudentInput) {
                loginStudentInput.value = studentNo;
            }
            showAuthAlert('Account created successfully! Please sign in with your password.', 'success');
        } else {
            const errorData = await response.json().catch(() => ({}));
            showAuthAlert(`Registration failed: ${errorData.message || 'Email already exists or invalid details.'}`, 'error');
        }
    } catch (err) {
        console.error("Signup error:", err);
        showAuthAlert('Unable to connect to the backend server. Please make sure the server is running.', 'error');
    }
}

async function handleLogin(event) {
    if (event) event.preventDefault();
    clearAuthAlert();

    const identifierInput = document.getElementById('login-student-no');
    const passwordInput = document.getElementById('login-password');

    const identifier = identifierInput ? identifierInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!identifier || !password) {
        showAuthAlert('Please enter your student number and password.', 'error');
        return;
    }

    const formattedEmail = identifier.includes('@') 
        ? identifier 
        : `${identifier}@iskolar.pup.edu.ph`;

    const loginPayload = {
        email: formattedEmail, 
        password: password
    };

    try {
        const response = await fetch(ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginPayload)
        });

        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('jwtToken', data.token);
            }
            if (data.userId) {
                localStorage.setItem('userId', data.userId);
            }
            if (data.name) {
                localStorage.setItem('userName', data.name);
            }
            if (data.email) {
                localStorage.setItem('userEmail', data.email);
            }
            if (data.role) {
                localStorage.setItem('userRole', data.role);
            } else {
                localStorage.setItem('userRole', 'ROLE_USER');
            }

            if (passwordInput) passwordInput.value = '';
            
            // Navigate directly to Feed URL
            navigateTo('#/feed');
        } else {
            const errorData = await response.json().catch(() => ({}));
            showAuthAlert(`Sign in failed: ${errorData.message || 'Invalid student number or password.'}`, 'error');
        }
    } catch (err) {
        console.error("Login error:", err);
        showAuthAlert('Unable to connect to the backend server. Please make sure the server is running.', 'error');
    }
}

async function handleLogout() {
    const token = getAuthToken();

    if (token) {
        try {
            await fetch(ENDPOINTS.LOGOUT, {
                method: 'POST',
                headers: getAuthHeaders()
            });
        } catch (err) {
            console.warn("Server logout notification failed:", err);
        }
    }

    // Clear local storage user data
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    
    // Navigate to login URL
    navigateTo('#/login');
    showAuthAlert('You have signed out successfully.', 'success');
}

async function fetchDashboardSummary() {
    if (!isAuthenticated()) return;
    try {
        const response = await fetch(ENDPOINTS.DASHBOARD, {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            const greeting = document.getElementById('dashboard-user-greeting');
            if (greeting && data.requestedBy) {
                const roleDisplay = isCurrentUserAdmin() ? ' (Admin)' : '';
                greeting.textContent = `Logged in as: ${data.requestedBy}${roleDisplay}`;
            }
        }
    } catch (err) {
        console.warn("Dashboard summary error:", err);
    }
}

// ==========================================
// 5. HIDDEN POSTS (DELETE FOR ME)
// ==========================================

function getHiddenPostsStorageKey() {
    const userId = getCurrentUserId() || 'guest';
    return `hiddenPosts_${userId}`;
}

function getHiddenPosts() {
    try {
        const stored = localStorage.getItem(getHiddenPostsStorageKey());
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function handleHidePostForMe(postId) {
    closeAllPostMenus();
    const hidden = getHiddenPosts();
    if (!hidden.includes(postId)) {
        hidden.push(postId);
        localStorage.setItem(getHiddenPostsStorageKey(), JSON.stringify(hidden));
    }
    // Re-render feed immediately
    renderPosts(currentFeedPosts);
    showToast('Post hidden from your personal feed.', 'info');
}

// ==========================================
// 6. POST FEED & CREATION (SEPARATE VIEWS)
// ==========================================

async function fetchPosts() {
    if (!isAuthenticated()) {
        return;
    }

    try {
        const response = await fetch(ENDPOINTS.POSTS, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const posts = await response.json();
            currentFeedPosts = Array.isArray(posts) ? posts : [];
            renderPosts(currentFeedPosts);
            return;
        } else if (response.status === 401 || response.status === 403) {
            handleLogout();
        }
    } catch (err) {
        console.warn("Backend unreachable for posts:", err);
    }
}

async function handleCreatePost(event) {
    if (event) event.preventDefault();

    if (!isAuthenticated()) {
        showToast('You must be logged in to create a post.', 'error');
        navigateTo('#/login');
        return;
    }

    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');

    const title = titleInput ? titleInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';

    if (!title || !content) {
        showToast('Please provide both a title and content for your post.', 'error');
        return;
    }

    const postPayload = { title, content };

    try {
        const response = await fetch(ENDPOINTS.POSTS, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(postPayload)
        });

        if (response.ok || response.status === 201) {
            // Clear inputs
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';

            // Redirect back to Feed
            navigateTo('#/feed');
            showToast('Your chika was posted successfully!', 'success');
        } else if (response.status === 401 || response.status === 403) {
            showToast('Your session has expired. Please sign in again.', 'error');
            handleLogout();
        } else {
            const errorData = await response.json().catch(() => ({}));
            showToast(`Failed to post: ${errorData.message || 'Unauthorized or invalid data.'}`, 'error');
        }
    } catch (err) {
        console.error('Error creating post:', err);
        showToast('Unable to connect to backend server. Make sure Spring Boot is running.', 'error');
    }
}

function renderPosts(posts) {
    const container = document.getElementById('feed-container');
    if (!container) return;

    container.innerHTML = '';

    const hiddenIds = getHiddenPosts();
    const visiblePosts = (posts || []).filter(p => !hiddenIds.includes(p.id));

    if (visiblePosts.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; color: #777; padding: 2.5rem 1rem;">
                <p style="font-size: 1.1rem; margin-bottom: 10px;">No chikas to show.</p>
                <a href="#/create-post" class="primary-btn" style="text-decoration: none; display: inline-block; margin-top: 10px;">Create a Chika</a>
            </div>
        `;
        return;
    }

    const currentUserId = getCurrentUserId();
    const isAdmin = isCurrentUserAdmin();

    // Reverse so newest posts appear at the top
    visiblePosts.slice().reverse().forEach(post => {
        const isAuthor = currentUserId && post.authorId && (Number(post.authorId) === Number(currentUserId));

        const postElement = document.createElement('div');
        postElement.className = 'card post-card';
        postElement.id = `post-card-${post.id}`;
        postElement.style.marginTop = '15px';
        
        // Build Dropdown menu options
        let menuItemsHtml = '';
        if (isAuthor) {
            menuItemsHtml += `
                <button type="button" class="dropdown-item" onclick="openEditModal(${post.id})">
                    <span>✏️</span> Edit Post
                </button>
                <button type="button" class="dropdown-item danger" onclick="openDeleteModal(${post.id})">
                    <span>🗑️</span> Delete Post
                </button>
            `;
        } else if (isAdmin) {
            menuItemsHtml += `
                <button type="button" class="dropdown-item danger" onclick="openDeleteModal(${post.id})">
                    <span>🛡️</span> Delete Post (Admin)
                </button>
                <button type="button" class="dropdown-item" onclick="handleHidePostForMe(${post.id})">
                    <span>👁️</span> Delete for me
                </button>
            `;
        } else {
            menuItemsHtml += `
                <button type="button" class="dropdown-item" onclick="handleHidePostForMe(${post.id})">
                    <span>👁️</span> Delete for me
                </button>
            `;
        }

        postElement.innerHTML = `
            <div class="post-header">
                <div class="post-header-main">
                    <h4 class="post-title-text">${escapeHTML(post.title || 'Untitled')}</h4>
                    <div class="post-meta">
                        <span class="post-author">By: ${escapeHTML(post.authorName || 'Anonymous')}</span> • 
                        <span class="post-timestamp">${post.createdAt ? new Date(post.createdAt).toLocaleString() : 'Just now'}</span>
                    </div>
                </div>
                <div class="post-menu-wrapper">
                    <button type="button" class="post-menu-trigger" onclick="togglePostMenu(event, ${post.id})" title="More options" aria-label="More options">⋮</button>
                    <div id="post-menu-${post.id}" class="post-dropdown-menu" style="display: none;">
                        ${menuItemsHtml}
                    </div>
                </div>
            </div>
            <div class="post-content" style="margin-bottom: 15px; line-height: 1.5; white-space: pre-wrap;">${escapeHTML(post.content)}</div>
            <div class="post-footer" style="display: flex; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                <button type="button" class="text-btn" onclick="handleVote(${post.id}, 'UPVOTE')">👍 ${post.voteCount || post.upvotes || 0}</button>
                <button type="button" class="text-btn" onclick="handleVote(${post.id}, 'DOWNVOTE')">👎</button>
            </div>
        `;
        container.appendChild(postElement);
    });
}

function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// ==========================================
// 7. POST ACTIONS (3-DOTS DROPDOWN, EDIT, DELETE)
// ==========================================

function togglePostMenu(event, postId) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const menu = document.getElementById(`post-menu-${postId}`);
    if (!menu) return;

    const isAlreadyOpen = menu.style.display === 'block';
    closeAllPostMenus();
    if (!isAlreadyOpen) {
        menu.style.display = 'block';
    }
}

function closeAllPostMenus() {
    document.querySelectorAll('.post-dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
    });
}

function initGlobalDropdownListener() {
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.post-menu-wrapper')) {
            closeAllPostMenus();
        }
    });
}

let pendingDeletePostId = null;

// Modal Edit Post (Strict Author-Only access)
function openEditModal(postId) {
    closeAllPostMenus();
    const post = currentFeedPosts.find(p => p.id === postId);
    if (!post) {
        showToast('Post not found.', 'error');
        return;
    }

    const currentUserId = getCurrentUserId();
    if (!currentUserId || Number(post.authorId) !== Number(currentUserId)) {
        showToast('Only the user who created this post can edit it.', 'error');
        return;
    }

    const editId = document.getElementById('edit-post-id');
    const editTitle = document.getElementById('edit-post-title');
    const editContent = document.getElementById('edit-post-content');
    const modal = document.getElementById('edit-post-modal');

    if (editId) editId.value = post.id;
    if (editTitle) editTitle.value = post.title || '';
    if (editContent) editContent.value = post.content || '';
    if (modal) modal.style.display = 'flex';
}

function closeEditModal() {
    const modal = document.getElementById('edit-post-modal');
    if (modal) modal.style.display = 'none';
}

async function handleSaveEditedPost(event) {
    if (event) event.preventDefault();

    const postId = document.getElementById('edit-post-id').value;
    const title = document.getElementById('edit-post-title').value.trim();
    const content = document.getElementById('edit-post-content').value.trim();

    if (!title || !content) {
        showToast('Title and content are required.', 'error');
        return;
    }

    try {
        const response = await fetch(`${ENDPOINTS.POSTS}/${postId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title, content })
        });

        if (response.ok) {
            closeEditModal();
            fetchPosts();
            showToast('Post updated successfully!', 'success');
        } else {
            const errorData = await response.json().catch(() => ({}));
            showToast(`Failed to update post: ${errorData.message || 'Unauthorized or invalid data.'}`, 'error');
        }
    } catch (err) {
        console.error('Error updating post:', err);
        showToast('Failed to connect to backend server.', 'error');
    }
}

// Custom In-App Delete Confirmation Modal
function openDeleteModal(postId) {
    closeAllPostMenus();
    pendingDeletePostId = postId;
    const modal = document.getElementById('delete-post-modal');
    if (modal) modal.style.display = 'flex';
}

function closeDeleteModal() {
    pendingDeletePostId = null;
    const modal = document.getElementById('delete-post-modal');
    if (modal) modal.style.display = 'none';
}

// Executes permanent post deletion after user clicks "Delete" inside modal
async function executePostDeletion() {
    if (!pendingDeletePostId) return;

    const postId = pendingDeletePostId;
    closeDeleteModal();

    try {
        const response = await fetch(`${ENDPOINTS.POSTS}/${postId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok || response.status === 204) {
            fetchPosts();
            showToast('Post permanently deleted.', 'success');
        } else {
            const errorData = await response.json().catch(() => ({}));
            showToast(`Failed to delete post: ${errorData.message || 'Unauthorized.'}`, 'error');
        }
    } catch (err) {
        console.error('Error deleting post:', err);
        showToast('Failed to connect to backend server.', 'error');
    }
}

async function handleVote(postId, voteType) {
    if (!isAuthenticated()) {
        showToast('Please log in to vote.', 'error');
        navigateTo('#/login');
        return;
    }

    try {
        const response = await fetch(`${ENDPOINTS.POSTS}/${postId}/vote`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ type: voteType })
        });

        if (response.ok) {
            fetchPosts();
        }
    } catch (err) {
        console.error('Vote error:', err);
    }
}
// ==========================================
// 8. DARK MODE & BACKGROUND MANAGEMENT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('theme-toggle'); // Correct ID
  const bgContainer = document.getElementById('starry-background');
  const body = document.body;
  
  // High-contrast neon palette
  const starColors = ['#ffffff', '#00f0ff', '#ff007f', '#a855f7', '#ffea00'];

  function createStarrySky() {
    if (!bgContainer) return;
    bgContainer.innerHTML = ''; 

    // Generate Twinkling Stars
    for (let i = 0; i < 180; i++) {
      const star = document.createElement('div');
      const isSparkle = Math.random() > 0.85; 
      star.classList.add(isSparkle ? 'star-sparkle' : 'star-dot');

      const color = starColors[Math.floor(Math.random() * starColors.length)];
      const size = isSparkle ? (Math.random() * 10 + 5) : (Math.random() * 3 + 1);

      star.style.left = `${Math.random() * 100}vw`;
      star.style.top = `${Math.random() * 100}vh`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;

      if (!isSparkle) {
        star.style.backgroundColor = color;
        star.style.boxShadow = `0 0 ${size * 4}px ${color}`;
      } else {
        star.style.color = color; 
      }

      star.style.animationDelay = `${Math.random() * 5}s`;
      star.style.animationDuration = `${1.5 + Math.random() * 3}s`;
      bgContainer.appendChild(star);
    }

    // Generate Shooting Stars
    for (let i = 0; i < 15; i++) {
      const shootingStar = document.createElement('div');
      shootingStar.classList.add('shooting-star-trail');
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      
      shootingStar.style.top = `${Math.random() * -20}%`;
      shootingStar.style.left = `${20 + Math.random() * 100}%`;
      shootingStar.style.setProperty('--trail-color', color);
      shootingStar.style.animationDelay = `${Math.random() * 10}s`;
      shootingStar.style.animationDuration = `${2 + Math.random() * 2}s`;

      bgContainer.appendChild(shootingStar);
    }
  }

  createStarrySky();

  // Handle Dark Mode State & Toggle
  if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
  }
});