const API_BASE = 'http://localhost:8080/api';

// --- ROUTING & VIEW CONTROLLER ---
const ROUTE_VIEWS = {
    'login': 'auth-container',
    'register': 'auth-container',
    'feed': 'app-container',
    'profile': 'app-container',
    'admin': 'app-container'
};

const CONTENT_VIEWS = ['feed', 'profile', 'admin'];

function showScreen(route) {
    // Determine main block visibility
    const targetMainContainer = ROUTE_VIEWS[route];
    if (targetMainContainer === 'auth-container') {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        
        // Toggle forms
        if (route === 'login') {
            switchAuthTab('login');
        } else {
            switchAuthTab('register');
        }
    } else {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        // Toggle inner content panels
        CONTENT_VIEWS.forEach(cv => {
            const panel = document.getElementById(`view-${cv}`);
            if (cv === route) {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
            
            // Sidebar active link indicator
            const navLink = document.getElementById(`nav-${cv}`);
            if (navLink) {
                if (cv === route) {
                    navLink.classList.add('active');
                } else {
                    navLink.classList.remove('active');
                }
            }
        });
        
        // Set page header title
        const titles = {
            'feed': 'Campus Chika',
            'profile': 'Profile Settings',
            'admin': 'Administrator Panel'
        };
        document.getElementById('page-title').textContent = titles[route] || 'Campus Chika';
        
        // Execute route-specific loading
        if (route === 'feed') {
            loadPosts();
            loadDashboardStats();
        } else if (route === 'profile') {
            loadProfile();
        } else if (route === 'admin') {
            loadAdminPanel();
        }
    }
}

function navigateTo(route) {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token && route !== 'login' && route !== 'register') {
        // Force authentication
        showToast('Authentication required. Please sign in.', 'error');
        location.hash = '#login';
        showScreen('login');
        return;
    }

    if (token && (route === 'login' || route === 'register')) {
        // Already logged in, redirect to feed
        location.hash = '#feed';
        showScreen('feed');
        return;
    }

    if (route === 'admin' && role !== 'ADMIN') {
        // Enforce admin permission layer
        showToast('Unauthorized: Admins only.', 'error');
        location.hash = '#feed';
        showScreen('feed');
        return;
    }

    location.hash = '#' + route;
    showScreen(route);
}

// Initial Routing check on load
window.addEventListener('load', () => {
    const route = location.hash.replace('#', '') || 'feed';
    
    // Hide/Show Admin Nav Item based on Role
    const role = localStorage.getItem('role');
    const adminNav = document.getElementById('nav-admin');
    if (role === 'ADMIN') {
        adminNav.classList.remove('hidden');
    } else {
        adminNav.classList.add('hidden');
    }
    
    // Render sidebar if user is logged in
    if (localStorage.getItem('token')) {
        updateSidebarDisplay();
    }
    
    navigateTo(route);
});

// Watch hash change
window.addEventListener('hashchange', () => {
    const route = location.hash.replace('#', '') || 'feed';
    navigateTo(route);
});

function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    
    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
}

// --- AUTHENTICATION ACTIONS ---
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loader = document.getElementById('login-loader');
    
    loader.classList.remove('hidden');
    
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.message || 'Failed to authenticate');
        }
        
        // Save auth details
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', data.email);
        localStorage.setItem('name', data.name);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userId', data.userId);
        
        showToast('Successfully signed in!', 'success');
        
        // Show/hide admin panel option
        const adminNav = document.getElementById('nav-admin');
        if (data.role === 'ADMIN') {
            adminNav.classList.remove('hidden');
        } else {
            adminNav.classList.add('hidden');
        }
        
        // Load user profile to hydrate sidebar
        await updateSidebarDisplay();
        
        // Navigate
        location.hash = '#feed';
        
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        loader.classList.add('hidden');
    }
}

async function handleRegister() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const loader = document.getElementById('register-loader');
    
    loader.classList.remove('hidden');
    
    try {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            if (data.errors) {
                // validation error list
                const errorMsg = Object.values(data.errors).join(', ');
                throw new Error(errorMsg);
            }
            throw new Error(data.message || 'Registration failed');
        }
        
        showToast('Registration successful! Logging in...', 'success');
        
        // Auto-login with signup token
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', data.email);
        localStorage.setItem('name', data.name);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userId', data.userId);
        
        const adminNav = document.getElementById('nav-admin');
        if (data.role === 'ADMIN') {
            adminNav.classList.remove('hidden');
        } else {
            adminNav.classList.add('hidden');
        }
        
        await updateSidebarDisplay();
        location.hash = '#feed';
        
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        loader.classList.add('hidden');
    }
}

async function handleLogout() {
    const token = localStorage.getItem('token');
    
    // Attempt backend invalidation (optional but clean)
    if (token) {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (e) {
            console.warn('Backend logout failed/ignored:', e);
        }
    }
    
    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('name');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    
    showToast('Logged out successfully.', 'success');
    location.hash = '#login';
}

// --- PROFILE & USER MANAGEMENT ---
async function loadProfile() {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${API_BASE}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Could not load profile details');
        
        const profile = await res.json();
        
        document.getElementById('profile-bio').value = profile.bio || '';
        document.getElementById('profile-location').value = profile.location || '';
        document.getElementById('profile-avatar-url').value = profile.profilePictureUrl || '';
        
        updateAvatarPreview(profile.profilePictureUrl);
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleUpdateProfile() {
    const token = localStorage.getItem('token');
    const bio = document.getElementById('profile-bio').value;
    const locationVal = document.getElementById('profile-location').value;
    const profilePictureUrl = document.getElementById('profile-avatar-url').value;
    
    try {
        const res = await fetch(`${API_BASE}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bio, location: locationVal, profilePictureUrl })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            if (data.errors) {
                throw new Error(Object.values(data.errors).join(', '));
            }
            throw new Error(data.message || 'Update failed');
        }
        
        showToast('Profile updated successfully!', 'success');
        
        // Refresh sidebar
        await updateSidebarDisplay();
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function updateAvatarPreview(url) {
    const preview = document.getElementById('profile-avatar-preview');
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    preview.src = url && url.trim() !== '' ? url : defaultAvatar;
}

function selectPresetAvatar(url) {
    document.getElementById('profile-avatar-url').value = url;
    updateAvatarPreview(url);
    showToast('Preset avatar selected. Save changes to apply.', 'success');
}

async function updateSidebarDisplay() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const name = localStorage.getItem('name');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');
    
    document.getElementById('sidebar-name').textContent = name;
    document.getElementById('sidebar-email').textContent = email;
    document.getElementById('sidebar-role-badge').textContent = role;
    
    // Set gold badge class if admin
    const badge = document.getElementById('sidebar-role-badge');
    if (role === 'ADMIN') {
        badge.style.background = 'var(--accent-gold)';
        badge.style.color = 'var(--text-dark)';
    } else {
        badge.style.background = 'var(--primary-color)';
        badge.style.color = 'white';
    }

    try {
        const res = await fetch(`${API_BASE}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const profile = await res.json();
            
            // Set Avatar
            const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
            const avatarSrc = profile.profilePictureUrl && profile.profilePictureUrl.trim() !== '' 
                ? profile.profilePictureUrl 
                : defaultAvatar;
                
            document.getElementById('sidebar-avatar').src = avatarSrc;
            document.getElementById('header-avatar').src = avatarSrc;
            
            // Set Bio
            document.getElementById('sidebar-bio-box').textContent = profile.bio && profile.bio.trim() !== '' 
                ? `"${profile.bio}"` 
                : '"No bio shared yet."';
                
            // Set Location
            document.getElementById('sidebar-location').textContent = profile.location && profile.location.trim() !== '' 
                ? profile.location 
                : 'PUP Campus';
        }
    } catch (e) {
        console.error('Failed to load profile for sidebar', e);
    }
}

// --- FEED & POSTS ---
async function loadPosts() {
    const container = document.getElementById('posts-container');
    container.innerHTML = `
        <div class="loading-state">
            <span class="spinner"></span>
            <p>Fetching the latest stories...</p>
        </div>
    `;
    
    try {
        const res = await fetch(`${API_BASE}/posts`);
        if (!res.ok) throw new Error('Could not load recent chika feed');
        
        const posts = await res.json();
        
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>🙊 No chika yet. Be the first to share your story!</p>
                </div>
            `;
            return;
        }
        
        const currentUserId = parseInt(localStorage.getItem('userId'));
        const userRole = localStorage.getItem('role');
        
        container.innerHTML = '';
        
        posts.forEach(post => {
            const date = new Date(post.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Profile image fallback
            let avatarHtml = '';
            if (post.authorProfilePictureUrl && post.authorProfilePictureUrl.trim() !== '') {
                avatarHtml = `<img src="${post.authorProfilePictureUrl}" alt="${post.authorName}" class="author-avatar">`;
            } else {
                const initial = post.authorName ? post.authorName.charAt(0) : '?';
                avatarHtml = `<div class="author-initial-avatar">${initial}</div>`;
            }
            
            // Delete button authorization check (Owner OR Admin)
            const showDelete = post.authorId === currentUserId || userRole === 'ADMIN';
            const deleteBtnHtml = showDelete ? `
                <button class="delete-post-btn" onclick="handleDeletePost(${post.id})">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    <span>Moderate</span>
                </button>
            ` : '';

            // Render post card
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <div class="post-avatar-col">
                    ${avatarHtml}
                </div>
                <div class="post-body-col">
                    <div class="post-header">
                        <div class="post-meta">
                            <span class="author-name">${escapeHtml(post.authorName)}</span>
                            <span class="author-badge ${post.authorId === 1 ? 'admin' : 'student'}">
                                ${post.authorId === 1 ? 'Admin' : 'Student'}
                            </span>
                            <span class="post-time">• ${date}</span>
                        </div>
                    </div>
                    <h4 class="post-card-title">${escapeHtml(post.title)}</h4>
                    <p class="post-content">${escapeHtml(post.content)}</p>
                    
                    <div class="post-actions">
                        <div class="vote-controls">
                            <button class="vote-btn upvote" onclick="handleVote(${post.id}, 'UPVOTE')" title="Upvote">
                                <svg class="vote-icon" viewBox="0 0 24 24"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>
                            </button>
                            <span id="vote-score-${post.id}" class="vote-score">${post.voteCount}</span>
                            <button class="vote-btn downvote" onclick="handleVote(${post.id}, 'DOWNVOTE')" title="Downvote">
                                <svg class="vote-icon" viewBox="0 0 24 24"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17L5.42 10.58 4 12l8 8 8-8z"/></svg>
                            </button>
                        </div>
                        ${deleteBtnHtml}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
        
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <p class="error-text">❌ Failed to load feed: ${err.message}</p>
            </div>
        `;
    }
}

async function handleCreatePost() {
    const token = localStorage.getItem('token');
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    
    try {
        const res = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, content })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            if (data.errors) {
                throw new Error(Object.values(data.errors).join(', '));
            }
            throw new Error(data.message || 'Could not post');
        }
        
        showToast('Your chika has been posted!', 'success');
        document.getElementById('post-title').value = '';
        document.getElementById('post-content').value = '';
        
        loadPosts();
        loadDashboardStats();
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleVote(postId, type) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please log in to vote.', 'error');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/posts/${postId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Vote failed');
        
        // Update UI
        const scoreSpan = document.getElementById(`vote-score-${postId}`);
        if (scoreSpan) {
            scoreSpan.textContent = data.voteCount;
        }
        
        // Simple visual feedback
        showToast(type === 'UPVOTE' ? 'Upvoted!' : 'Downvoted!', 'success');
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleDeletePost(postId) {
    if (!confirm('Are you sure you want to delete this Chika? This cannot be undone.')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${API_BASE}/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to delete post');
        
        showToast('Chika deleted.', 'success');
        loadPosts();
        loadDashboardStats();
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- ADMIN MANAGEMENT ACTIONS ---
async function loadAdminPanel() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('admin-user-list');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">Loading accounts...</td>
        </tr>
    `;
    
    try {
        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Unable to retrieve admin user list');
        
        const users = await res.json();
        tbody.innerHTML = '';
        
        const currentUserId = parseInt(localStorage.getItem('userId'));
        
        users.forEach(user => {
            const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
            const avatarSrc = user.profilePictureUrl && user.profilePictureUrl.trim() !== '' 
                ? user.profilePictureUrl 
                : defaultAvatar;
                
            const roleBadgeClass = user.role === 'ADMIN' ? 'author-badge admin' : 'author-badge student';
            
            // Prevent self-deletion
            const isSelf = user.id === currentUserId;
            const actionBtn = isSelf ? `
                <span class="text-muted" style="font-size:0.8rem; font-weight:600;">Active Session</span>
            ` : `
                <button class="admin-delete-btn" onclick="handleDeleteUser(${user.id})">Delete User</button>
            `;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="admin-user-cell">
                        <img src="${avatarSrc}" alt="Avatar">
                        <span>${escapeHtml(user.name)}</span>
                    </div>
                </td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="${roleBadgeClass}">${user.role}</span></td>
                <td>${escapeHtml(user.location || 'Not Specified')}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(user.bio || '')}">
                    ${escapeHtml(user.bio || '—')}
                </td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center error-text">❌ Failed: ${err.message}</td>
            </tr>
        `;
    }
}

async function handleDeleteUser(userId) {
    if (!confirm('WARNING: Deleting this user will permanently remove their profile, posts, and all votes they have cast. Proceed?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Deletion failed');
        
        showToast('User account deleted successfully.', 'success');
        loadAdminPanel();
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// --- SYSTEM STATISTICS ---
async function loadDashboardStats() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const res = await fetch(`${API_BASE}/dashboard/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const stats = await res.json();
            document.getElementById('stat-active').textContent = stats.activeSessions;
            document.getElementById('stat-total').textContent = stats.totalUsers;
        }
    } catch (e) {
        console.warn('Could not load dashboard stats:', e);
    }
}

// --- UTILITY FUNCTIONS ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}