// Initialize Supabase Client
// ⚠️ REPLACE WITH YOUR ACTUAL SUPABASE URL AND KEY ⚠️
const SUPABASE_URL = 'https://vqfvjmneqiqpmigxafvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t6z4napC6vTcO71enz0o_Q_AcVtolAl';

// Use a fallback to prevent crashing if keys aren't set yet
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

// Current Date for reset logic
const today = new Date().toISOString().split('T')[0];
dateDisplay.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// App State
const totalSections = 5;
const slotsPerSection = 5;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkConfiguration();
    generateSlots();
    fetchBookedSlots();
});

function checkConfiguration() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || !supabaseClient) {
        console.warn('Supabase not configured. Please update script.js with your keys.');
        showToast('System Maintenance: Database not connected', true);
    }
}

// 1. Generate Slots UI
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

// 2. Fetch Booked Slots from Supabase
async function fetchBookedSlots() {
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('bookings')
            .select('slot_id')
            .eq('booking_date', today);

        if (error) throw error;

        // Mark booked slots as disabled
        data.forEach(booking => {
            const btn = document.getElementById(booking.slot_id);
            if (btn) {
                btn.classList.add('disabled');
                btn.disabled = true;
                btn.onclick = null; // Remove click handler
            }
        });

    } catch (err) {
        console.error('Error fetching slots:', err);
    }
}

// 3. Open Booking Modal
function openBookingModal(slotId) {
    if (!supabaseClient) {
        alert('Please configure Supabase details in script.js first!');
        return;
    }
    slotIdInput.value = slotId;
    modalTitle.textContent = `Book ${formatSlotName(slotId)}`;
    modal.classList.remove('hidden');
}

// Helper to format slot name friendly
function formatSlotName(id) {
    const parts = id.split('-');
    return `Section ${parts[1]} - Slot ${parts[3]}`;
}

// 4. Handle Form Submission
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

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
            if (error.code === '23505') { // Unique constraint violation code
                alert('Sorry! This slot was just booked by someone else.');
                fetchBookedSlots(); // Refresh UI
            } else {
                throw error;
            }
        } else {
            // Success
            showToast(`Booking Confirmed for ${fullName}!`);

            // Update UI immediately without refresh
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

// Modal Logic
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

// Toast Notification
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71';
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
