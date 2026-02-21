document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Close mobile menu on link click
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
    });
  });

  // Header Scroll Effect
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // ============================================
  // 2-STEP BOOKING WIZARD LOGIC
  // ============================================

  let barbers = [];

  // Fetch Barbers from API
  async function fetchBarbers() {
    try {
      const response = await fetch(getApiUrl('/api/barbers'));
      barbers = await response.json();
    } catch (e) {
      console.error("Failed to fetch barbers:", e);
      // Fallback
      barbers = [
        { id: 'vasim', name: 'Vasim', initials: 'V' },
        { id: 'shahid', name: 'Shahid', initials: 'S' },
        { id: 'parvej', name: 'Parvej', initials: 'P' }
      ];
    }
  }
  fetchBarbers();

  // State
  let currentStep = 1;
  let selectedDate = '';
  let selectedTime = '';
  let selectedBarber = '';

  // DOM Elements
  const modal = document.getElementById('bookingModal');
  const openBtns = document.querySelectorAll('.js-open-booking');
  const closeBtn = document.querySelector('.close-modal');
  const dateInput = document.getElementById('date');
  const openWizardBtn = document.getElementById('openWizardBtn');
  const triggerSection = document.getElementById('triggerSection');
  const appointmentForm = document.getElementById('appointmentForm');
  const selectionSummary = document.getElementById('selectionSummary');
  const summaryTime = document.getElementById('summaryTime');
  const summaryBarber = document.getElementById('summaryBarber');

  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const mainFields = document.getElementById('mainFormFields');

  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const confirmBookingBtn = document.getElementById('confirmBookingBtn');

  const timeSlotsContainer = document.getElementById('timeSlotsContainer');
  const barbersContainer = document.getElementById('barbersContainer');
  const toast = document.getElementById('toast');

  // Initialize date picker min
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;

    dateInput.addEventListener('change', (e) => {
      selectedDate = e.target.value;
      resetSelections();
      if (selectedDate) {
        triggerSection.style.display = 'block';
        // Reset summary
        selectionSummary.style.display = 'none';
      } else {
        triggerSection.style.display = 'none';
      }
    });
  }

  // Wizard Trigger
  if (openWizardBtn) {
    openWizardBtn.addEventListener('click', () => {
      if (!selectedDate) {
        showToast('Please select a date first');
        return;
      }
      showStep(1);
    });
  }

  // Step Navigation
  async function showStep(step) {
    currentStep = step;

    // Update Progress Indicator
    document.querySelectorAll('.progress-step').forEach(el => {
      const elStep = parseInt(el.dataset.step);
      el.classList.remove('active', 'completed');
      if (elStep === step) el.classList.add('active');
      if (elStep < step) el.classList.add('completed');
    });

    // Hide main fields when in wizard
    mainFields.style.display = 'none';

    if (step === 1) {
      step1.style.display = 'block';
      step2.style.display = 'none';
      backBtn.style.display = 'block'; // Acts as close/cancel if on step 1
      backBtn.textContent = 'Cancel';
      nextBtn.style.display = 'block';
      confirmBookingBtn.style.display = 'none';
      await generateTimeSlots(selectedDate);
      updateNavigation();
    } else if (step === 2) {
      step1.style.display = 'none';
      step2.style.display = 'block';
      backBtn.style.display = 'block';
      backBtn.textContent = 'Back';
      nextBtn.style.display = 'none';
      confirmBookingBtn.style.display = 'block';
      await generateBarberOptions(selectedDate, selectedTime);
      updateNavigation();
    }
  }

  function exitWizard() {
    step1.style.display = 'none';
    step2.style.display = 'none';
    mainFields.style.display = 'block';
    backBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    confirmBookingBtn.style.display = 'none';

    // If selections are complete, show summary and the "Confirm" button should be elsewhere?
    // Actually, the user wants the confirm button in the wizard step 2.
    // If they exit without confirming, we show what was selected so far.
    if (selectedTime && selectedBarber) {
      selectionSummary.style.display = 'block';
      summaryTime.textContent = formatTimeDisplay(selectedTime);
      const barber = barbers.find(b => b.id === selectedBarber);
      summaryBarber.textContent = barber ? barber.name : '';
      confirmBookingBtn.style.display = 'block';
      confirmBookingBtn.disabled = false;
    } else {
      confirmBookingBtn.style.display = 'none';
    }
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (currentStep === 1) {
        exitWizard();
      } else {
        showStep(1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (selectedTime) {
        showStep(2);
      }
    });
  }

  function updateNavigation() {
    if (currentStep === 1) {
      nextBtn.disabled = !selectedTime;
    } else if (currentStep === 2) {
      confirmBookingBtn.disabled = !selectedBarber;
    }
  }

  function resetSelections() {
    selectedTime = '';
    selectedBarber = '';
    selectionSummary.style.display = 'none';
    confirmBookingBtn.disabled = true;
    updateNavigation();
  }

  // Time Slots Generation
  async function generateTimeSlots(date) {
    timeSlotsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--accent-gold);">Loading slots...</div>';

    const startHour = 9;
    const endHour = 22;

    const allBookings = await getBookedSlots();
    const bookedForDate = allBookings.filter(b => b.date === date);

    timeSlotsContainer.innerHTML = '';
    for (let hour = startHour; hour <= endHour; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const bookedBarberIds = bookedForDate.filter(b => b.time === timeString).map(b => b.barberId);
      const availableCount = 3 - bookedBarberIds.length;

      const card = document.createElement('div');
      card.className = `time-slot-card ${availableCount === 0 ? 'disabled' : ''} ${selectedTime === timeString ? 'selected' : ''}`;

      let availabilityHTML = '';
      for (let i = 1; i <= 3; i++) {
        const status = i <= availableCount ? (availableCount === 1 ? 'warning' : 'active') : '';
        availabilityHTML += `<span class="dot ${status}"></span>`;
      }

      card.innerHTML = `
                <div class="selection-check"><i data-lucide="check"></i></div>
                <div class="time-text">${formatTimeDisplay(timeString)}</div>
                <div class="availability-dots">${availabilityHTML}</div>
                <div class="availability-badge ${availableCount === 1 ? 'availability-warning' : (availableCount === 0 ? 'availability-booked' : 'availability-full')}">
                    ${availableCount === 0 ? 'Fully Booked' : availableCount + ' slots available'}
                </div>
            `;

      if (availableCount > 0) {
        card.addEventListener('click', () => {
          document.querySelectorAll('.time-slot-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedTime = timeString;
          selectedBarber = ''; // Reset barber on time change
          updateNavigation();
          lucide.createIcons();
        });
      }

      timeSlotsContainer.appendChild(card);
    }
    lucide.createIcons();
  }

  // Barber Generation
  async function generateBarberOptions(date, time) {
    barbersContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--accent-gold);">Checking barbers...</div>';

    const allBookings = await getBookedSlots();
    const bookedBarberIdsAtTime = allBookings.filter(b => b.date === date && b.time === time).map(b => b.barberId);

    barbersContainer.innerHTML = '';
    barbers.forEach(barber => {
      const isBooked = bookedBarberIdsAtTime.includes(barber.id);
      const card = document.createElement('div');
      card.className = `barber-card ${isBooked ? 'booked' : ''} ${selectedBarber === barber.id ? 'selected' : ''}`;

      card.innerHTML = `
                <div class="selection-check"><i data-lucide="check"></i></div>
                <div class="barber-avatar">${barber.initials}</div>
                <div class="barber-name">${barber.name}</div>
                <div class="barber-status">${isBooked ? 'Already Booked' : 'Available'}</div>
            `;

      if (!isBooked) {
        card.addEventListener('click', () => {
          document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedBarber = barber.id;
          updateNavigation();
          lucide.createIcons();
        });
      }

      barbersContainer.appendChild(card);
    });
    lucide.createIcons();
  }

  // Form Submission
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!selectedDate || !selectedTime || !selectedBarber) {
        showToast('Please complete all selections');
        return;
      }

      const barber = barbers.find(b => b.id === selectedBarber);
      const serviceName = document.getElementById('service').options[document.getElementById('service').selectedIndex].text;

      const bookingData = {
        customerName: document.getElementById('fullName').value,
        mobile: document.getElementById('mobile').value,
        serviceId: document.getElementById('service').value,
        serviceName: serviceName,
        date: selectedDate,
        time: selectedTime,
        barberId: selectedBarber,
        barberName: barber ? barber.name : selectedBarber
      };

      console.log("Submitting booking:", bookingData);
      const success = await saveBooking(bookingData);

      if (success) {
        showToast('Booking successful! Redirecting to WhatsApp... ✅');
        appointmentForm.reset();
        closeModal();
        resetSelections();
      } else {
        showToast('Sorry, this slot was just taken. Please try another.');
      }
    });
  }

  // Modal Controls
  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
      // Default to main fields
      currentStep = 0;
      exitWizard();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  // Helpers
  function formatTimeDisplay(time) {
    const hour = parseInt(time.split(':')[0]);
    const period = hour >= 12 ? 'PM' : 'AM';
    let displayHour = hour % 12;
    displayHour = displayHour ? displayHour : 12;
    return `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
  }

  async function getBookedSlots() {
    try {
      const response = await fetch(getApiUrl('/api/bookings'));
      return await response.json();
    } catch (e) {
      return [];
    }
  }

  async function saveBooking(bookingData) {
    try {
      const response = await fetch(getApiUrl('/api/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  function showToast(message) {
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }
  // ============================================
  // PREMIUM PRODUCTS — Auto-sync from API
  // Fetches /api/products/active and renders
  // the first 3 products on the homepage.
  // ============================================
  async function loadHomepageProducts() {
    const grid = document.getElementById('home-products-grid');
    if (!grid) return;

    try {
      const res = await fetch(getApiUrl('/api/products/active'));
      if (!res.ok) throw new Error('API error');
      const allProducts = await res.json();
      const products = allProducts.slice(0, 3); // First 3 only

      if (products.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-secondary);padding:2rem;">No products available yet.</div>`;
        return;
      }

      grid.innerHTML = products.map(p => {
        const waText = encodeURIComponent(
          `Hello ZK Professional Salon 👋\n\nI want to buy this product:\n\n🛍️ Product Name: ${p.name}\n💰 Price: ₹${p.price}\n📍 Delivery Location: Ahmedabad\n🚚 COD Available\n\nPlease confirm availability.`
        );
        const waLink = `https://wa.me/919265301656?text=${waText}`;
        const imgSrc = p.image.startsWith('http') ? p.image : getApiUrl(p.image);

        return `
          <div class="glass-card product-card">
            <img src="${imgSrc}" alt="${p.name}" class="product-image"
                 onerror="this.src='https://placehold.co/400x300/1a1a2e/d4af37?text=Product'">
            <div>
              <h3>${p.name}</h3>
              <p class="product-price">₹${p.price}</p>
              <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:1rem;">${p.description}</p>
              <a href="${waLink}" class="btn-secondary"
                 style="width:100%;display:inline-block;text-align:center;" target="_blank">
                Buy Now <i data-lucide="message-circle" style="width:16px;height:16px;vertical-align:middle;"></i>
              </a>
            </div>
          </div>`;
      }).join('');

      lucide.createIcons();

    } catch (e) {
      console.error('Failed to load products:', e);
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-secondary);padding:2rem;">Could not load products. Please refresh.</div>`;
    }
  }

  loadHomepageProducts();
});
