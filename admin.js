// Supabase Configuration
const SUPABASE_URL = 'https://vqfvjmneqiqpmigxafvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t6z4napC6vTcO71enz0o_Q_AcVtolAl';

const supabaseClient = (typeof supabase !== 'undefined')
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const bookingsTableBody = document.getElementById('bookings-table-body');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const toast = document.getElementById('toast');

// Check Session on Load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    }
});

// Handle Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Hardcoded credentials for demo purposes
    if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('adminLoggedIn', 'true');
        loginError.style.display = 'none';
        showDashboard();
        showToast('Welcome, Admin!', false);
    } else {
        loginError.style.display = 'block';
    }
});

// Handle Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    location.reload();
});

async function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    await fetchAllBookings();
}

async function fetchAllBookings() {
    if (!supabaseClient) {
        showToast('Database not connected!', true);
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('bookings')
            .select('*')
            .order('booking_date', { ascending: false })
            .order('slot_id', { ascending: true });

        if (error) throw error;

        renderBookings(data);

    } catch (err) {
        console.error('Error fetching bookings:', err);
        showToast('Failed to load bookings', true);
    }
}

function renderBookings(bookings) {
    bookingsTableBody.innerHTML = '';

    if (bookings.length === 0) {
        document.getElementById('no-bookings').style.display = 'block';
        return;
    }

    document.getElementById('no-bookings').style.display = 'none';

    bookings.forEach(booking => {
        const row = document.createElement('tr');
        const date = new Date(booking.booking_date).toLocaleDateString();
        const slotName = formatSlotName(booking.slot_id);

        row.innerHTML = `
            <td>${date}</td>
            <td style="font-weight: 600; color: var(--primary-color);">${slotName}</td>
            <td>${booking.full_name}</td>
            <td>${booking.place}</td>
            <td><a href="tel:${booking.mobile}" style="color: var(--text-light); text-decoration: none;">${booking.mobile}</a></td>
        `;
        bookingsTableBody.appendChild(row);
    });
}

function formatSlotName(id) {
    const parts = id.split('-');
    const sectionNum = parts[1];
    const slotNum = parts[3];

    const times = {
        '1': '12pm-1pm',
        '2': '1pm-2pm',
        '3': '2pm-3pm',
        '4': '3pm-4pm',
        '5': '4pm-5pm'
    };

    return `Sec ${sectionNum} (${times[sectionNum]}) - Slot ${slotNum}`;
}

// Toast Notification
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71';
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
