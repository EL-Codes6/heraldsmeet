(function(){
      "use strict";

      // ---------- 🌌 3D SCENE – HYPERSPACE PARTICLES + KNOT ----------
      function initThree() {
        const container = document.getElementById('three-canvas');
        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x03050a); // deep cosmic

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0.8, 12);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100vw';
        renderer.domElement.style.height = '100vh';
        renderer.domElement.style.zIndex = '0';
        renderer.domElement.style.pointerEvents = 'none';

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404c63);
        scene.add(ambientLight);
        const mainLight = new THREE.PointLight(0xaaccff, 1.2);
        mainLight.position.set(3, 5, 10);
        scene.add(mainLight);
        const backLight = new THREE.PointLight(0x4466aa, 0.8);
        backLight.position.set(-5, 0, -8);
        scene.add(backLight);

        // ✦ CENTERPIECE: GLOWING TORUS KNOT (wireframe + neon)
        const knotGeo = new THREE.TorusKnotGeometry(1.4, 0.4, 128, 16);
        const knotMat = new THREE.MeshStandardMaterial({
          color: 0x3d8cff,
          emissive: 0x002855,
          roughness: 0.3,
          metalness: 0.8,
          wireframe: true,
          transparent: true,
          opacity: 0.35
        });
        const knot = new THREE.Mesh(knotGeo, knotMat);
        knot.castShadow = true;
        knot.receiveShadow = false;
        scene.add(knot);

        // inner solid knot for depth
        const innerKnotMat = new THREE.MeshBasicMaterial({
          color: 0x004c9e,
          wireframe: false,
          transparent: true,
          opacity: 0.08
        });
        const innerKnot = new THREE.Mesh(knotGeo, innerKnotMat);
        knot.add(innerKnot);

        // floating particles (stars)
        const particlesGeo = new THREE.BufferGeometry();
        const particlesCount = 1800;
        const posArray = new Float32Array(particlesCount * 3);
        const colorArray = new Float32Array(particlesCount * 3);
        for(let i = 0; i < particlesCount * 3; i += 3) {
          // spherical distribution
          const radius = 12 + Math.random() * 20;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos((Math.random() * 2) - 1);
          posArray[i] = radius * Math.sin(phi) * Math.cos(theta);
          posArray[i+1] = radius * Math.sin(phi) * Math.sin(theta);
          posArray[i+2] = radius * Math.cos(phi);

          // colors: blue/cyan/white
          const color = new THREE.Color().setHSL(0.58 + Math.random() * 0.2, 0.7, 0.5 + Math.random() * 0.3);
          colorArray[i] = color.r;
          colorArray[i+1] = color.g;
          colorArray[i+2] = color.b;
        }
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        const particlesMat = new THREE.PointsMaterial({
          size: 0.2,
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true
        });
        const particles = new THREE.Points(particlesGeo, particlesMat);
        scene.add(particles);

        // subtle floating spheres (orbs)
        const orbGroup = new THREE.Group();
        for (let i = 0; i < 30; i++) {
          const size = 0.08 + Math.random() * 0.15;
          const sphereGeo = new THREE.SphereGeometry(size, 16, 16);
          const sphereMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.6, 0.9, 0.5),
            emissive: new THREE.Color().setHSL(0.6, 0.6, 0.1),
            roughness: 0.2,
            metalness: 0.7
          });
          const sphere = new THREE.Mesh(sphereGeo, sphereMat);
          sphere.position.x = (Math.random() - 0.5) * 25;
          sphere.position.y = (Math.random() - 0.5) * 15;
          sphere.position.z = (Math.random() - 0.5) * 25 - 10;
          orbGroup.add(sphere);
        }
        scene.add(orbGroup);

        // Animation loop
        function animate() {
          requestAnimationFrame(animate);
          // rotate main knot
          knot.rotation.x += 0.0008;
          knot.rotation.y += 0.0012;
          knot.rotation.z += 0.0005;
          // rotate particles opposite
          particles.rotation.y -= 0.00015;
          particles.rotation.x += 0.0001;
          // orbs slowly float
          orbGroup.children.forEach((orb, idx) => {
            orb.position.x += Math.sin(Date.now() * 0.0005 + idx) * 0.001;
            orb.position.y += Math.cos(Date.now() * 0.0004 + idx) * 0.001;
          });
          renderer.render(scene, camera);
        }
        animate();

        // resize handler
        window.addEventListener('resize', () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        });
      }

      // ---------- 📅 APPOINTMENT SYSTEM (STORAGE: localStorage) ----------
      const STORAGE_KEY = 'healdsmeet_bookings_v1';

      // Predefined time slots (30min granularity, but we show hours)
      const TIME_SLOTS = [
        "09:00", "10:00", "11:00", "12:00", "13:00", 
        "14:00", "15:00", "16:00", "17:00", "18:00"
      ];

      // Global state
      let appointments = [];
      let selectedDate = new Date().toISOString().split('T')[0];
      let selectedTime = null;

      // DOM elements
      const datePicker = document.getElementById('datePicker');
      const slotsContainer = document.getElementById('slotsContainer');
      const appointmentsDiv = document.getElementById('appointmentsList');
      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const phoneInput = document.getElementById('phone');
      const bookBtn = document.getElementById('bookBtn');

      // ----- load / save localStorage -----
      function loadAppointments() {
        const stored = localStorage.getItem(STORAGE_KEY); 
        if (stored) {
          try { appointments = JSON.parse(stored); } catch(e){ appointments = []; }
        } else {
          // ✦ sample booking to show design
          const today = new Date().toISOString().split(' ')[0];
          appointments = [{
            id: 'sample_' + Date.now(),
            date: today,
            time: '10:00',
            name: 'Alex Rivera',
            email: 'alex@creativestudio.com',
            phone: '+1 415 555 0198'
          }];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
        }
      }
      function saveAppointments() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
      }

      // ----- utility: get booked times for a date -----
      function getBookedTimesForDate(date) {
        return appointments.filter(app => app.date === date).map(app => app.time);
      }

      // ----- render time slots based on selected date -----
      function renderSlots() {
        const booked = getBookedTimesForDate(selectedDate);
        let html = '';
        TIME_SLOTS.forEach(time => {
          const isBooked = booked.includes(time);
          const isSelected = (selectedTime === time && !isBooked);
          const disabledClass = isBooked ? 'disabled-slot' : '';
          const selectedClass = isSelected ? 'selected-slot' : '';
          html += `<button class="slot-btn ${disabledClass} ${selectedClass}" data-time="${time}">
                    <i class="fas fa-clock"></i> ${time}
                  </button>`;
        });
        slotsContainer.innerHTML = html;

        // attach click listeners to slots (except disabled)
        document.querySelectorAll('.slot-btn:not(.disabled-slot)').forEach(btn => {
          btn.addEventListener('click', (e) => {
            // remove previous selected
            document.querySelectorAll('.slot-btn.selected-slot').forEach(b => b.classList.remove('selected-slot'));
            btn.classList.add('selected-slot');
            selectedTime = btn.dataset.time;
          });
        });
      }

      // ----- render appointments list -----
      function renderAppointments() {
        if (!appointmentsDiv) return;
        if (appointments.length === 0) {
          appointmentsDiv.innerHTML = `<div class="empty-state">
                                          <i class="fas fa-crystal-ball" style="font-size: 2rem; opacity: 0.5;"></i>
                                          <p style="margin-top: 1rem;">no appointments scheduled</p>
                                        </div>`;
          return;
        }
        // sort by date (upcoming first)
        const sorted = [...appointments].sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
        let itemsHtml = '';
        sorted.forEach(app => {
          itemsHtml += `
            <div class="appointment-item" data-id="${app.id}">
              <div class="appointment-info">
                <h4><i class="fas fa-user-circle"></i> ${escapeHtml(app.name)}</h4>
                <p>
                  <i class="fas fa-calendar-day"></i> ${formatDate(app.date)} · 
                  <i class="fas fa-clock"></i> ${app.time}
                  <span style="margin-left: 6px;"><i class="fas fa-envelope"></i> ${escapeHtml(app.email)}</span>
                </p>
              </div>
              <button class="cancel-btn" data-id="${app.id}"><i class="fas fa-xmark"></i> cancel</button>
            </div>`;
        });
        appointmentsDiv.innerHTML = itemsHtml;

        // attach cancel listeners
        document.querySelectorAll('.cancel-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            cancelAppointment(id);
          });
        });
      }

      // escape for innerHTML
      function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function formatDate(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      // ----- cancel appointment -----
      function cancelAppointment(id) {
        appointments = appointments.filter(a => a.id !== id);
        saveAppointments();
        renderAppointments();
        // if selected date is still same, refresh slots (booking may free)
        if (selectedDate) renderSlots();
        showToast('✓ Appointment cancelled', 'info');
      }

      // ----- book appointment -----
      function bookAppointment() {
        if (!selectedTime) {
          showToast('⏳ Please select a time slot', 'error');
          return;
        }
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        if (!name || !email) {
          showToast('✱ Name and email are required', 'error');
          return;
        }
        // basic email validation
        if (!email.includes('@') || !email.includes('.')) {
          showToast('✱ Please enter a valid email', 'error');
          return;
        }

        // check if slot still free (avoid double booking from multiple tabs)
        const booked = getBookedTimesForDate(selectedDate);
        if (booked.includes(selectedTime)) {
          showToast('❌ Slot just got booked! Choose another.', 'error');
          renderSlots(); // refresh
          selectedTime = null;
          return;
        }

        const newApp = {
          id: 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          date: selectedDate,
          time: selectedTime,
          name: name,
          email: email,
          phone: phoneInput.value.trim() || '—'
        };

        appointments.push(newApp);
        saveAppointments();

        // clear form and selected time
        nameInput.value = '';
        emailInput.value = '';
        phoneInput.value = '';
        selectedTime = null;
        // remove selected class from slots
        document.querySelectorAll('.slot-btn.selected-slot').forEach(b => b.classList.remove('selected-slot'));

        renderSlots();
        renderAppointments();
        showToast(`✨ Booked ${newApp.time} successfully!`, 'success');
      }

      // ----- toast system -----
      function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-circle-check' : type==='error' ? 'fa-circle-exclamation' : 'fa-bell'}"></i> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3500);
      }

      // ----- 3D TILT effect on booking card (UX magic) -----
      function initTilt() {
        const card = document.getElementById('bookingCard');
        if (!card) return;
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateY = ((x - centerX) / centerX) * 8;  // max 8deg
          const rotateX = ((centerY - y) / centerY) * 8;
          card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg)`;
        });
      }

      // ----- event listeners -----
      function bindEvents() {
        // date picker change
        datePicker.addEventListener('change', (e) => {
          selectedDate = e.target.value;
          selectedTime = null; // reset selected time
          renderSlots();
        });

        // book button
        bookBtn.addEventListener('click', bookAppointment);

        // allow enter key on inputs? not needed.
      }

      // ----- INITIALIZE EVERYTHING -----
      function init() {
        initThree();
        loadAppointments();
        // set today's date in datepicker
        const today = new Date().toISOString().split('T')[0];
        datePicker.value = today;
        selectedDate = today;
        renderSlots();
        renderAppointments();
        bindEvents();
        initTilt();
      }

      init();
    })();
