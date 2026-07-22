// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================

// Pointing directly to your Spring Boot service running in account-service/
const ACCOUNT_SERVICE_URL = "http://localhost:8080/api";

const ENDPOINTS = {
    LOGIN: `${ACCOUNT_SERVICE_URL}/accounts/login`,
    REGISTER: `${ACCOUNT_SERVICE_URL}/accounts/register`,
    POSTS: `${ACCOUNT_SERVICE_URL}/posts`
};

let currentUser = {
    accountName: "Guest Iskolar",
    studentNo: ""
};

let localPosts = []; // Fallback feed storage for offline development

window.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
});

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

// ==========================================
// 3. AUTHENTICATION (BACKEND CONNECTED)
// ==========================================

async function handleLogin() {
    const accountName = document.getElementById('login-name').value.trim();
    const studentNo = document.getElementById('login-student-no').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!accountName || !studentNo || !password) {
        alert('Please fill out all fields.');
        return;
    }

    const loginPayload = { accountName, studentNo, password };

    try {
        const response = await fetch(ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginPayload)
        });

        if (response.ok) {
            const data = await response.json();
            currentUser.accountName = data.accountName || accountName;
            currentUser.studentNo = data.studentNo || studentNo;
            alert("Login Successful!");
            showSection('dashboard-section');
        } else {
            // Fallback for development before account-service controller is live
            currentUser.accountName = accountName;
            currentUser.studentNo = studentNo;
            showSection('dashboard-section');
        }
    } catch (err) {
        console.warn("Backend connection issue, entering offline dev mode:", err);
        currentUser.accountName = accountName;
        currentUser.studentNo = studentNo;
        showSection('dashboard-section');
    }
}

async function handleRegister() {
    const accountName = document.getElementById('reg-name').value.trim();
    const studentNo = document.getElementById('reg-student-no').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!accountName || !studentNo || !password) {
        alert('Please fill out all fields.');
        return;
    }

    const regPayload = { accountName, studentNo, password };

    try {
        const response = await fetch(ENDPOINTS.REGISTER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(regPayload)
        });

        if (response.ok) {
            alert('Registration Successful! Please log in.');
            toggleModal(false);
            showSection('login-section');
        } else {
            alert('Registration failed on backend.');
        }
    } catch (err) {
        console.warn("Backend offline. Simulating registration:", err);
        alert('Registration simulated (Offline Mode). You can now log in.');
        toggleModal(false);
        showSection('login-section');
    }
}

// ==========================================
// 4. FEED / POSTS (H2 IN-MEMORY COMPATIBLE)
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
        console.warn("Backend unreachable. Rendering local state:", err);
    }
    
    renderPosts(localPosts);
}

async function handleCreatePost() {
    const inputField = document.getElementById('post-input');
    const content = inputField.value.trim();

    if (!content) {
        alert("Please write something before posting!");
        return;
    }

    const postPayload = {
        authorName: currentUser.accountName,
        studentNo: currentUser.studentNo,
        content: content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
        const response = await fetch(ENDPOINTS.POSTS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postPayload)
        });

        if (response.ok) {
            inputField.value = '';
            fetchPosts(); // Refresh feed from H2 Database
            return;
        }
    } catch (err) {
        console.warn("Backend offline. Adding post locally:", err);
    }

    // Local fallback when running without backend server
    localPosts.unshift(postPayload);
    inputField.value = '';
    renderPosts(localPosts);
}

function renderPosts(posts) {
    const container = document.getElementById('feed-container');
    if (!container) return;

    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">No chikas yet. Be the first to post!</p>';
        return;
    }

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'card post-card';
        postElement.innerHTML = `
            <div class="post-header">
                <span class="post-author">${escapeHTML(post.authorName || 'Anonymous')}</span>
                <span class="post-timestamp">${post.timestamp || ''}</span>
            </div>
            <div class="post-content">
                ${escapeHTML(post.content)}
            </div>
        `;
        container.appendChild(postElement);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}