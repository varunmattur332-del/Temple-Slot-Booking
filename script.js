// Initialize Supabase Client
const SUPABASE_URL = 'https://vqfvjmneqiqpmigxafvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t6z4napC6vTcO71enz0o_Q_AcVtolAl';

const supabaseClient = (typeof supabase !== 'undefined')
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// DOM Elements
const slotsContainer = document.getElementById('slots-container');
const modal = document.getElementById('booking-modal');
const closeModal = document.querySelector('.close-btn');
const bookingForm = document.getElementById('booking-form');
const slotIdInput = document.getElementById('slot-id-input');
const modalTitle = document.getElementById('modal-title');
const toast = document.getElementById('toast');
const dateDisplay = document.getElementById('current-date');

// Display current date
dateDisplay.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// App State
const totalSections = 5;
const slotsPerSection = 5;

// -------------------------------------------------------
// Time Utility
// -------------------------------------------------------
function getCurrentHour() {
    return new Date().getHours(); // 0 = midnight, 6 = 6 AM
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

// Returns true if current time is between 12 AM (0:00) and 6 AM (6:00)
function isBlackoutTime() {
    const hour = getCurrentHour();
    return hour >= 0 && hour < 6;
}

// -------------------------------------------------------
// Initialize App
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    checkConfiguration();

    if (isBlackoutTime()) {
        showBlackoutBanner();
    } else {
        generateSlots();
        fetchBookedSlots();
        scheduleNextDayCheck();
    }
});

// Show a full-page banner during blackout hours (12 AM – 6 AM)
function showBlackoutBanner() {
    const container = document.getElementById('slots-container');
    container.innerHTML = `
        <div class="blackout-banner">
            <div class="blackout-icon">🌙</div>
            <h2>Booking Closed</h2>
            <p>Slot booking is not available between <strong>12:00 AM</strong> and <strong>6:00 AM</strong>.</p>
            <p>Bookings open every morning at <strong>6:00 AM</strong>. Please come back soon!</p>
        </div>
    `;
}

// Schedule a check at 6 AM to auto-refresh the page and open bookings
function scheduleNextDayCheck() {
    const now = new Date();
    const msUntilMidnight = new Date(
        now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0
    ) - now;

    // At midnight: reload the page to trigger blackout banner
    setTimeout(() => {
        location.reload();
    }, msUntilMidnight);
}

function checkConfiguration() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || !supabaseClient) {
        console.warn('Supabase not configured. Please update script.js with your keys.');
        showToast('System Maintenance: Database not connected', true);
    }
}

// -------------------------------------------------------
// 1. Generate Slots UI
// -------------------------------------------------------
function generateSlots() {
    for (let i = 1; i <= totalSections; i++) {
        const sectionEl = document.getElementById(`section-${i}`);
        if (!sectionEl) continue;

        for (let j = 1; j <= slotsPerSection; j++) {
            const slotId = `sec-${i}-slot-${j}`;
            const btn = document.createElement('button');
            btn.className = 'slot-btn';
            btn.id = slotId;
            btn.textContent = `Slot ${j}`;
            btn.onclick = () => openBookingModal(slotId);
            sectionEl.appendChild(btn);
        }
    }
}

// -------------------------------------------------------
// 2. Fetch Booked Slots from Supabase (today only)
// -------------------------------------------------------
async function fetchBookedSlots() {
    if (!supabaseClient) return;

    const today = getToday();

    try {
        const { data, error } = await supabaseClient
            .from('bookings')
            .select('slot_id')
            .eq('booking_date', today);

        if (error) throw error;

        data.forEach(booking => {
            const btn = document.getElementById(booking.slot_id);
            if (btn) {
                btn.classList.add('disabled');
                btn.disabled = true;
                btn.onclick = null;
            }
        });

    } catch (err) {
        console.error('Error fetching slots:', err);
    }
}

// -------------------------------------------------------
// 3. Open Booking Modal
// -------------------------------------------------------
function openBookingModal(slotId) {
    if (isBlackoutTime()) {
        showToast('Bookings are closed between 12 AM and 6 AM.', true);
        return;
    }
    if (!supabaseClient) {
        alert('Please configure Supabase details in script.js first!');
        return;
    }
    slotIdInput.value = slotId;
    modalTitle.textContent = `Book ${formatSlotName(slotId)}`;
    modal.classList.remove('hidden');
}

// Helper to format slot name
function formatSlotName(id) {
    const parts = id.split('-');
    return `Section ${parts[1]} - Slot ${parts[3]}`;
}

// -------------------------------------------------------
// 4. Handle Form Submission
// -------------------------------------------------------
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isBlackoutTime()) {
        showToast('Bookings are closed between 12 AM and 6 AM.', true);
        return;
    }

    const today = getToday();
    const slotId = slotIdInput.value;
    const fullName = document.getElementById('fullname').value;
    const place = document.getElementById('place').value;
    const mobile = document.getElementById('mobile').value;

    const bookingData = {
        slot_id: slotId,
        booking_date: today,
        full_name: fullName,
        place: place,
        mobile: mobile
    };

    const submitBtn = bookingForm.querySelector('.submit-btn');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Booking...';
    submitBtn.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from('bookings')
            .insert([bookingData]);

        if (error) {
            if (error.code === '23505') {
                alert('Sorry! This slot was just booked by someone else.');
                fetchBookedSlots();
            } else {
                throw error;
            }
        } else {
            showToast(`Booking Confirmed for ${fullName}!`);

            const btn = document.getElementById(slotId);
            if (btn) {
                btn.classList.add('disabled');
                btn.disabled = true;
                btn.onclick = null;
            }

            closeModalAndReset();
        }

    } catch (err) {
        console.error('Booking failed:', err);
        alert('Booking failed. Please try again.');
    } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
});

// -------------------------------------------------------
// Modal Logic
// -------------------------------------------------------
closeModal.addEventListener('click', closeModalAndReset);
window.onclick = (event) => {
    if (event.target == modal) {
        closeModalAndReset();
    }
};

function closeModalAndReset() {
    modal.classList.add('hidden');
    bookingForm.reset();
}

// -------------------------------------------------------
// Toast Notification
// -------------------------------------------------------
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71';
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
