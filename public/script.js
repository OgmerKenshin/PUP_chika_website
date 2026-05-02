// Toggle the Register Pop-up
function toggleModal(show) {
    const modal = document.getElementById('reg-modal');
    modal.style.display = show ? 'block' : 'none';
}

// Logic for Login
function handleLogin() {
    const name = document.getElementById('login-name').value;
    const sno = document.getElementById('login-student-no').value;
    const pass = document.getElementById('login-password').value;

    if (name && sno && pass) {
        // Hide login and show blank page
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    } else {
        alert("Please fill up all fields to enter.");
    }
}

// Logic for Register Pop-up
function handleRegister() {
    const name = document.getElementById('reg-name').value;
    const sno = document.getElementById('reg-student-no').value;
    const pass = document.getElementById('reg-password').value;

    if (name && sno && pass) {
        alert("Registration Successful! (Locally simulated)");
        toggleModal(false);
    } else {
        alert("Please complete the registration form.");
    }
}