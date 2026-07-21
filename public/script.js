// --- Navigation Helper ---
function showSection(sectionId) {
    // Hide all view sections
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show the requested section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

// --- Registration Modal Toggle ---
function toggleModal(show) {
    const modal = document.getElementById('reg-modal');
    modal.style.display = show ? 'flex' : 'none';
}

// --- Login Handler ---
function handleLogin() {
    const name = document.getElementById('login-name').value.trim();
    const studentNo = document.getElementById('login-student-no').value.trim();
    const password = document.getElementById('login-password').value.trim();

    // Basic Validation Check
    if (!name || !studentNo || !password) {
        alert('Please fill out all login fields.');
        return;
    }

    // Direct transition to the Dashboard for testing
    showSection('dashboard-section');
    
    // Hide navbar links once logged in
    document.querySelector('.nav-links').classList.add('hidden');
}

// --- Registration Handler ---
function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const studentNo = document.getElementById('reg-student-no').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    // Basic Validation Check
    if (!name || !studentNo || !password) {
        alert('Please complete all fields to register.');
        return;
    }

    alert('Registration successful! You can now log in.');
    
    // Clear registration fields
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-student-no').value = '';
    document.getElementById('reg-password').value = '';

    // Close the modal and switch to login view
    toggleModal(false);
    showSection('login-section');
}