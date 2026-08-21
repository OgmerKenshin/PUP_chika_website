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

window.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    checkAuthStatus();
});

// Helper to retrieve stored auth token
function getAuthToken() {
    return localStorage.getItem('jwtToken');
}

// Helper to generate auth headers
function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// ==========================================
// 2. SPA NAVIGATION & MODAL CONTROLS
// ==========================================

function showSection(sectionId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

function toggleModal(show) {
    const modal = document.getElementById('reg-modal');
    modal.style.display = show ? 'flex' : 'none';
}

function checkAuthStatus() {
    const token = getAuthToken();
    const loginNavBtn = document.getElementById('nav-login-btn');
    
    if (token && loginNavBtn) {
        loginNavBtn.textContent = 'Dashboard';
        loginNavBtn.onclick = () => showSection('dashboard-section');
    }
}

// ==========================================
// 3. AUTHENTICATION (JWT BASED)
// ==========================================

// Matches SignupRequest DTO
async function handleRegister() {
    const accountName = document.getElementById('reg-name').value.trim();
    const studentNo = document.getElementById('reg-student-no').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!accountName || !studentNo || !password) {
        alert('Please fill out all fields.');
        return;
    }

    // Append domain if backend requires email format validation
    const formattedEmail = studentNo.includes('@') 
        ? studentNo 
        : `${studentNo}@iskolar.pup.edu.ph`;

    const signupPayload = { 
        name: accountName, 
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
            alert('Registration Successful! Please sign in.');
            toggleModal(false);
            showSection('login-section');
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(`Registration failed: ${errorData.message || 'Invalid details'}`);
        }
    } catch (err) {
        console.error("Signup error:", err);
    }
}

// Matches LoginRequest DTO
async function handleLogin() {
    const identifierInput = document.getElementById('login-student-no').value.trim();
    const password = document.getElementById('login-password').value.trim();

    // Ensure email formatting matches what was stored during signup
    const formattedEmail = identifierInput.includes('@') 
        ? identifierInput 
        : `${identifierInput}@iskolar.pup.edu.ph`;

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
            alert('Login successful!');
            showSection('dashboard-section');
            checkAuthStatus(); // Update navbar button
        } else {
            alert('Login failed: Invalid credentials.');
        }
    } catch (err) {
        console.error("Login error:", err);
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

    // Clear local storage and reset
    localStorage.removeItem('jwtToken');
    location.reload();
}

// ==========================================
// 4. POST FEED & VOTING
// ==========================================

async function fetchPosts() {
    try {
        const response = await fetch(ENDPOINTS.POSTS);
        if (response.ok) {
            const posts = await response.json();
            renderPosts(posts);
            return;
        }
    } catch (err) {
        console.warn("Backend unreachable:", err);
    }
}

// Matches PostCreateRequest DTO
async function handleCreatePost(event) {
    // Prevent default form submission reload if called inside a form
    if (event) event.preventDefault();

    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');

    const title = titleInput ? titleInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';

    // 1. Validation check
    if (!title || !content) {
        alert('Please provide both a title and content for your post.');
        return;
    }

    // 2. Authentication check
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        alert('You must be logged in to create a post.');
        showSection('login-section');
        return;
    }

    const postPayload = { title, content };

    try {
        const response = await fetch(ENDPOINTS.POSTS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(postPayload)
        });

        if (response.ok || response.status === 201) {
            alert('Post published successfully!');

            // Clear input fields
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';

            // Reload feed/posts
            fetchPosts();
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(`Failed to post: ${errorData.message || 'Unauthorized or invalid data.'}`);
        }
    } catch (err) {
        console.error('Error creating post:', err);
        alert('Unable to connect to backend server. Make sure Spring Boot is running.');
    }
}

function renderPosts(posts) {
    const container = document.getElementById('feed-container');
    if (!container) return;

    container.innerHTML = '';

    if (!posts || posts.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; margin-top: 20px;">No chikas yet. Be the first to post!</p>';
        return;
    }

    // Reverse so newest posts appear at the top
    posts.slice().reverse().forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'card post-card';
        postElement.style.marginTop = '15px';
        
        postElement.innerHTML = `
            <div class="post-header">
                <h4 style="margin: 0; color: #333;">${escapeHTML(post.title || 'Untitled')}</h4>
                <div style="font-size: 0.85em; color: #777; margin-bottom: 10px;">
                    <span class="post-author">By: ${escapeHTML(post.authorName || post.author || 'Anonymous')}</span> • 
                    <span class="post-timestamp">${post.createdAt || post.timestamp || 'Just now'}</span>
                </div>
            </div>
            <div class="post-content" style="margin-bottom: 15px;">
                ${escapeHTML(post.content)}
            </div>
            <div class="post-footer" style="display: flex; gap: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                <button class="text-btn" onclick="handleVote(${post.id}, 'UPVOTE')">👍 ${post.upvotes || 0}</button>
                <button class="text-btn" onclick="handleVote(${post.id}, 'DOWNVOTE')">👎 ${post.downvotes || 0}</button>
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

// Placeholder for the voting buttons in renderPosts
async function handleVote(postId, voteType) {
    const token = getAuthToken();
    if (!token) {
        alert("Please log in to vote.");
        return;
    }
    console.log(`Voting ${voteType} on post ${postId}... (Implement backend connection here)`);
    // Example: fetch(\`${ENDPOINTS.POSTS}/${postId}/vote\`, { method: 'POST', body: JSON.stringify({type: voteType}) ... })
}

const toggleBtn = document.getElementById('dark-mode-toggle');
const body = document.body;

// 1. Check if the user already chose dark mode previously
if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
}

// 2. Listen for the toggle click
toggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    
    // 3. Save their preference
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});