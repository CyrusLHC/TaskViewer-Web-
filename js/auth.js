// Auth functions
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            localStorage.setItem('userId', userCredential.user.uid);
            window.location.href = 'PickCalendar.html';
        })
        .catch((error) => {
            alert("Login failed: " + error.message);
        });
}

function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Save user to database
            database.ref('users/' + userCredential.user.uid).set({
                email: email,
                created: Date.now()
            });
            localStorage.setItem('userId', userCredential.user.uid);
            window.location.href = 'PickCalendar.html';
        })
        .catch((error) => {
            alert("Registration failed: " + error.message);
        });
}

function signOut() {
    auth.signOut()
        .then(() => {
            localStorage.removeItem('userId');
            localStorage.removeItem('currentCalendar');
            localStorage.removeItem('currentTask');
            window.location.href = 'splash.html';
        })
        .catch((error) => {
            alert("Failed to sign out: " + error.message);
        });
}

// Check auth state on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        localStorage.setItem('userId', user.uid);
    } else {
        localStorage.removeItem('userId');
    }
});