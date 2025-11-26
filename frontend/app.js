const API_BASE = 'http://192.168.43.203:5000/api';

// State
let currentUser = null;
let token = localStorage.getItem('medrec_token');
let loginType = 'user'; // 'user' or 'doctor'

// DOM Elements
const navHome = document.getElementById('nav-home');
const authButtons = document.getElementById('auth-buttons');
const userInfo = document.getElementById('user-info');
const welcomeMsg = document.getElementById('welcome-msg');
const btnLogout = document.getElementById('btn-logout');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnGetStarted = document.getElementById('btn-get-started');

const heroSection = document.getElementById('hero-section');
const dashboardSection = document.getElementById('dashboard-section');
const doctorDashboardSection = document.getElementById('doctor-dashboard-section');

const modalOverlay = document.getElementById('modal-overlay');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const closeModals = document.querySelectorAll('.close-modal');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const typeUserBtn = document.getElementById('type-user');
const typeDoctorBtn = document.getElementById('type-doctor');

const doctorList = document.getElementById('doctor-list');
const doctorSelect = document.getElementById('doctor-select');
const suggestionForm = document.getElementById('suggestion-form');
const resultsBox = document.getElementById('results-box');
const medicineList = document.getElementById('medicine-list');
const doctorRequestsList = document.getElementById('doctor-requests-list');
const doctorHistoryList = document.getElementById('doctor-history-list');
const historyList = document.getElementById('history-list');

// --- Initialization ---

function init() {
    if (token) {
        const user = JSON.parse(localStorage.getItem('medrec_user'));
        if (user) {
            currentUser = user;
            showDashboard();
        } else {
            logout();
        }
    } else {
        showHero();
    }
}

// --- UI Transitions ---
// Helper: Show Notification
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    container.appendChild(notif);
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

function setLoginType(type) {
    loginType = type;
    if (type === 'user') {
        typeUserBtn.classList.replace('btn-outline', 'btn-primary');
        typeDoctorBtn.classList.replace('btn-primary', 'btn-outline');
    } else {
        typeDoctorBtn.classList.replace('btn-outline', 'btn-primary');
        typeUserBtn.classList.replace('btn-primary', 'btn-outline');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, type: loginType })
        });
        const data = await res.json();

        if (res.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('medrec_token', token);
            localStorage.setItem('medrec_user', JSON.stringify(currentUser));
            closeAllModals();
            showDashboard();
            showNotification(`Welcome back, ${currentUser.name}`);
        } else {
            showNotification(data.error, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Login failed', 'error');
    }
}

let registerType = 'user'; // 'user' or 'doctor'
const regTypeUserBtn = document.getElementById('reg-type-user');
const regTypeDoctorBtn = document.getElementById('reg-type-doctor');
const doctorFields = document.getElementById('doctor-fields');

function setRegisterType(type) {
    registerType = type;
    if (type === 'user') {
        regTypeUserBtn.classList.replace('btn-outline', 'btn-primary');
        regTypeDoctorBtn.classList.replace('btn-primary', 'btn-outline');
        doctorFields.classList.add('hidden');
    } else {
        regTypeDoctorBtn.classList.replace('btn-outline', 'btn-primary');
        regTypeUserBtn.classList.replace('btn-primary', 'btn-outline');
        doctorFields.classList.remove('hidden');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    const payload = { name, email, password, type: registerType };
    
    if (registerType === 'doctor') {
        payload.speciality = document.getElementById('reg-speciality').value;
        payload.bio = document.getElementById('reg-bio').value;
    }

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            showNotification('Registration successful! Please login.');
            toggleModal(registerModal, false);
            toggleModal(loginModal, true);
        } else {
            showNotification(data.error, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Registration failed', 'error');
    }
}

// --- UI State Management ---

function showHero() {
    heroSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    doctorDashboardSection.classList.add('hidden');
    
    authButtons.classList.remove('hidden');
    userInfo.classList.add('hidden');
}

function showDashboard() {
    heroSection.classList.add('hidden');
    authButtons.classList.add('hidden');
    userInfo.classList.remove('hidden');
    welcomeMsg.textContent = `Welcome, ${currentUser.name}`;

    if (currentUser.role === 'doctor') {
        dashboardSection.classList.add('hidden');
        doctorDashboardSection.classList.remove('hidden');
        loadDoctorRequests();
        loadDoctorHistory();
    } else {
        doctorDashboardSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        loadDoctors();
        loadHistory();
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('medrec_token');
    localStorage.removeItem('medrec_user');
    showHero();
    showNotification('Logged out successfully');
}

// --- User Data Functions ---

async function loadDoctors() {
    try {
        const res = await fetch(`${API_BASE}/doctors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401 || res.status === 403) {
            logout();
            return;
        }

        const doctors = await res.json();
        
        if (res.ok) {
            renderDoctors(doctors);
            populateDoctorSelect(doctors);
        }
    } catch (err) {
        console.error('Error loading doctors:', err);
    }
}

function renderDoctors(doctors) {
    doctorList.innerHTML = doctors.map(doc => `
        <div class="doctor-card">
            <img src="${doc.avatar}" alt="${doc.name}">
            <h3>${doc.name}</h3>
            <p>${doc.speciality}</p>
            <button class="btn ${doc.isFollowed ? 'btn-outline' : 'btn-primary'} btn-sm" 
                    onclick="toggleFollow(${doc.id}, ${doc.isFollowed})">
                ${doc.isFollowed ? 'Unfollow' : 'Follow'}
            </button>
        </div>
    `).join('');
}

function populateDoctorSelect(doctors) {
    doctorSelect.innerHTML = '<option value="">-- Any Doctor --</option>' + 
        doctors.map(doc => `<option value="${doc.id}">${doc.name} (${doc.speciality})</option>`).join('');
}

async function toggleFollow(doctorId, isFollowed) {
    const action = isFollowed ? 'unfollow' : 'follow';
    try {
        const res = await fetch(`${API_BASE}/doctors/${doctorId}/follow`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action })
        });
        if (res.ok) {
            loadDoctors(); // Reload to update UI
            showNotification(isFollowed ? 'Unfollowed doctor' : 'Followed doctor');
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleSuggestion(e) {
    e.preventDefault();
    const symptoms = document.getElementById('symptoms').value;
    const preferredDoctorId = doctorSelect.value;

    try {
        const res = await fetch(`${API_BASE}/suggest`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ symptoms, preferredDoctorId })
        });

        if (res.status === 401 || res.status === 403) {
            logout();
            return;
        }

        const data = await res.json();
        
        if (res.ok) {
            if (data.status === 'pending') {
                resultsBox.classList.add('hidden');
                showNotification('Request sent to doctor for review.');
            } else {
                renderSuggestions(data.suggestions);
                showNotification('Suggestions loaded');
            }
        } else {
            showNotification(data.error || 'Error getting suggestions', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Error getting suggestions', 'error');
    }
}

function renderSuggestions(suggestions) {
    resultsBox.classList.remove('hidden');
    medicineList.innerHTML = suggestions.map(med => `
        <div class="medicine-item">
            <h4>
                ${med.name}
                <span class="${med.safe ? 'safe-badge' : 'unsafe-badge'}">
                    ${med.safe ? 'Safe' : 'Consult Doctor'}
                </span>
            </h4>
            <p>${med.reason}</p>
            <div class="suggested-by">Suggested by: ${med.suggestedBy}</div>
        </div>
    `).join('');
}

async function loadHistory() {
    try {
        const res = await fetch(`${API_BASE}/user/consultations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401 || res.status === 403) {
            logout();
            return;
        }

        const consultations = await res.json();
        if (res.ok) {
            renderHistory(consultations);
        }
    } catch (err) {
        console.error('Error loading history:', err);
    }
}

function renderHistory(consultations) {
    if (consultations.length === 0) {
        historyList.innerHTML = '<p>No history found.</p>';
        return;
    }

    historyList.innerHTML = consultations.map(c => `
        <div class="history-item">
            <div class="history-header">
                <strong>${new Date(c.created_at).toLocaleDateString()}</strong>
                <span class="badge ${c.status === 'completed' ? 'badge-success' : 'badge-warning'}">${c.status}</span>
            </div>
            <p><strong>Symptoms:</strong> ${c.symptoms}</p>
            ${c.doctor_name ? `<p><strong>Doctor:</strong> ${c.doctor_name}</p>` : ''}
            
            ${c.prescriptions && c.prescriptions.length > 0 ? `
                <div class="med-history-list" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <strong style="color: var(--primary-color); display: block; margin-bottom: 5px;">Prescribed Medicines:</strong>
                    <ul style="list-style: none; padding-left: 0;">
                        ${c.prescriptions.map(p => `
                            <li style="margin-bottom: 4px; font-size: 0.95rem; color: var(--text-light);">
                                ${p.name} <span style="color: var(--text-muted);">(${p.reason})</span>
                                ${!p.safe ? '<span style="color: var(--danger-color); font-size: 0.8em; margin-left: 5px;">⚠</span>' : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// --- Doctor Data Functions ---

async function loadDoctorRequests() {
    try {
        const res = await fetch(`${API_BASE}/doctor/requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const requests = await res.json();
        renderDoctorRequests(requests);
    } catch (err) {
        console.error(err);
    }
}

async function renderDoctorRequests(requests) {
    if (requests.length === 0) {
        doctorRequestsList.innerHTML = '<p>No pending requests.</p>';
        return;
    }

    // Fetch prescriptions for each request to display details
    const requestsWithMeds = await Promise.all(requests.map(async (req) => {
        const res = await fetch(`${API_BASE}/consultations/${req.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return { ...req, prescriptions: data.prescriptions };
    }));

    doctorRequestsList.innerHTML = requestsWithMeds.map(req => `
        <div class="request-card" id="req-${req.id}">
            <div class="request-header">
                <h3>Patient: ${req.user_name}</h3>
                <span class="badge">Pending</span>
            </div>
            <div class="request-symptoms">
                <strong>Symptoms:</strong> ${req.symptoms}
            </div>
            <div class="med-list-edit">
                <h4>Proposed Medicines:</h4>
                ${req.prescriptions.map(med => `
                    <div class="med-item-edit">
                        <span>${med.name} (${med.reason})</span>
                        <button class="btn btn-sm btn-outline" onclick="deleteMedicine(${req.id}, ${med.id})">Remove</button>
                    </div>
                `).join('')}
                <div class="med-item-edit" style="margin-top:10px; border:none;">
                    <input type="text" placeholder="Add Medicine Name" id="new-med-name-${req.id}">
                    <input type="text" placeholder="Reason" id="new-med-reason-${req.id}">
                    <button class="btn btn-sm btn-primary" onclick="addMedicine(${req.id})">Add</button>
                </div>
            </div>
            <div class="request-actions">
                <button class="btn btn-primary" onclick="approveRequest(${req.id})">Approve & Send</button>
            </div>
        </div>
    `).join('');
}

async function addMedicine(consultationId) {
    const nameInput = document.getElementById(`new-med-name-${consultationId}`);
    const reasonInput = document.getElementById(`new-med-reason-${consultationId}`);
    const name = nameInput.value;
    const reason = reasonInput.value;

    if (!name || !reason) return showNotification('Enter name and reason', 'error');

    try {
        const res = await fetch(`${API_BASE}/doctor/consultations/${consultationId}/modify`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                action: 'add', 
                medicine: { name, reason, safe: true } 
            })
        });
        if (res.ok) {
            loadDoctorRequests();
            showNotification('Medicine added');
        }
    } catch (err) { console.error(err); }
}

async function deleteMedicine(consultationId, medId) {
    try {
        const res = await fetch(`${API_BASE}/doctor/consultations/${consultationId}/modify`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                action: 'delete', 
                medicine: { id: medId } 
            })
        });
        if (res.ok) {
            loadDoctorRequests();
            showNotification('Medicine removed');
        }
    } catch (err) { console.error(err); }
}

async function approveRequest(consultationId) {
    try {
        const res = await fetch(`${API_BASE}/doctor/consultations/${consultationId}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadDoctorRequests();
            loadDoctorHistory();
            showNotification('Request approved and sent to patient');
        }
    } catch (err) { console.error(err); }
}

async function loadDoctorHistory() {
    try {
        const res = await fetch(`${API_BASE}/doctor/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history = await res.json();
        renderDoctorHistory(history);
    } catch (err) {
        console.error(err);
    }
}

async function renderDoctorHistory(history) {
    if (history.length === 0) {
        doctorHistoryList.innerHTML = '<p>No completed requests.</p>';
        return;
    }

    // Fetch prescriptions for each history item
    const historyWithMeds = await Promise.all(history.map(async (req) => {
        const res = await fetch(`${API_BASE}/consultations/${req.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return { ...req, prescriptions: data.prescriptions };
    }));

    doctorHistoryList.innerHTML = historyWithMeds.map(req => `
        <div class="request-card history-card">
            <div class="request-header">
                <h3>Patient: ${req.user_name}</h3>
                <span class="badge badge-success">Completed</span>
            </div>
            <div class="request-symptoms">
                <strong>Symptoms:</strong> ${req.symptoms}
            </div>
            <div class="med-list-view">
                <h4>Prescribed Medicines:</h4>
                <ul>
                ${req.prescriptions.map(med => `
                    <li>${med.name} (${med.reason})</li>
                `).join('')}
                </ul>
            </div>
            <div class="timestamp" style="margin-top: 10px; font-size: 0.85em; color: #666;">
                Completed on: ${new Date(req.created_at).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

// --- Event Listeners ---

btnLogin.addEventListener('click', () => toggleModal(loginModal, true));
btnRegister.addEventListener('click', () => toggleModal(registerModal, true));
btnGetStarted.addEventListener('click', () => toggleModal(registerModal, true));
btnLogout.addEventListener('click', logout);

typeUserBtn.addEventListener('click', () => setLoginType('user'));
typeDoctorBtn.addEventListener('click', () => setLoginType('doctor'));

regTypeUserBtn.addEventListener('click', () => setRegisterType('user'));
regTypeDoctorBtn.addEventListener('click', () => setRegisterType('doctor'));

closeModals.forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
});

switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    toggleModal(loginModal, false);
    toggleModal(registerModal, true);
});

switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    toggleModal(registerModal, false);
    toggleModal(loginModal, true);
});

loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
suggestionForm.addEventListener('submit', handleSuggestion);

// Modal Helpers
function toggleModal(modal, show) {
    if (show) {
        modalOverlay.classList.remove('hidden');
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
    if (!show && document.querySelectorAll('.modal:not(.hidden)').length === 0) {
        modalOverlay.classList.add('hidden');
    }
}

function closeAllModals() {
    modalOverlay.classList.add('hidden');
    loginModal.classList.add('hidden');
    registerModal.classList.add('hidden');
}

// Expose functions to window
window.toggleFollow = toggleFollow;
window.addMedicine = addMedicine;
window.deleteMedicine = deleteMedicine;
window.approveRequest = approveRequest;
window.showDashboard = showDashboard;
window.currentUser = currentUser; // Expose user for debugging

// Start
console.log('App initialized');
init();
