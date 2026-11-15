// Rumah Bara: the page keeps Bali's clock. Live sunset, three lights, a dinner-time dial, open-now, menu tabs, WhatsApp booking.
(() => {
  const WA = '6281200000000'; // placeholder number for the concept
  const LAT = -8.69, LON = 115.165, TZ = 8; // Seminyak, WITA (UTC+8)
  const OPEN = 17 * 60, CLOSE = 23 * 60;    // 17:00 to 23:00, every day
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const baliNow = () => { const d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + TZ * 60) * 60000); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (mins) => { mins = ((Math.round(mins) % 1440) + 1440) % 1440; return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`; };
  const span = (mins) => { const h = Math.floor(mins / 60), m = Math.round(mins % 60); return h ? `${h} h ${m} min` : `${m} min`; };

  // Sunset in minutes after local midnight (NOAA sunrise/sunset approximation, about ±2 min).
  function sunsetMinutes(date) {
    const rad = Math.PI / 180;
    const N = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
    const lngHour = LON / 15, t = N + ((18 - lngHour) / 24);
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634; L = ((L % 360) + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad; RA = ((RA % 360) + 360) % 360;
    RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
    const sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(LAT * rad)) / (cosDec * Math.cos(LAT * rad));
    const T = (Math.acos(cosH) / rad) / 15 + RA - 0.06571 * t - 6.622;
    return ((((T - lngHour) % 24 + 24) % 24 + TZ) % 24) * 60;
  }
  const seatFor = (sunset) => Math.floor((sunset - 30) / 15) * 15;

  const today = baliNow();
  const sunsetToday = sunsetMinutes(today);
  const nowMin = today.getHours() * 60 + today.getMinutes();

  // ---------- The three lights ----------
  const livePhase = (m) => (m >= sunsetToday + 25 || m < 6 * 60) ? 'night' : (m >= sunsetToday - 75 ? 'golden' : 'day');
  let preview = 'live';
  try { const q = new URLSearchParams(location.search).get('light'); if (['day', 'golden', 'night'].includes(q)) preview = q; } catch (e) {}

  const label = document.querySelector('[data-clock-label]');
  const count = document.querySelector('[data-clock-count]');
  function paintClock(phase) {
    document.querySelectorAll('[data-sunset="today"]').forEach((t) => { t.textContent = hm(sunsetToday); t.dateTime = hm(sunsetToday); });
    const m = baliNow(); const n = m.getHours() * 60 + m.getMinutes();
    if (preview !== 'live') {
      label.textContent = 'Sunset in Seminyak tonight';
      count.textContent = { day: 'Afternoon light. Book the sunset seating.', golden: 'The sun is on the sea. The grill is lit.', night: 'Lanterns lit. Tables until eleven.' }[phase];
      return;
    }
    if (n < sunsetToday) {
      label.textContent = 'Sunset in Seminyak tonight';
      count.textContent = n >= sunsetToday - 75 ? `In ${span(sunsetToday - n)}. The grill is being lit.` : `In ${span(sunsetToday - n)}. Sunset seating from ${hm(seatFor(sunsetToday))}.`;
    } else {
      label.textContent = 'The sun set over Seminyak at';
      count.textContent = n < CLOSE ? 'The lanterns are lit. Tables until eleven.' : 'Kitchen closed. Tomorrow’s sunset comes a minute later or earlier.';
    }
  }
  function applyPhase() {
    const m = baliNow();
    const phase = preview === 'live' ? livePhase(m.getHours() * 60 + m.getMinutes()) : preview;
    root.dataset.phase = phase;
    paintClock(phase);
    document.querySelectorAll('[data-preview]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preview === preview)));
  }
  document.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => { preview = b.dataset.preview; applyPhase(); }));
  applyPhase();
  setInterval(applyPhase, 30000);

  // ---------- The evening schedule ----------
  document.querySelectorAll('.night time[data-rel]').forEach((t) => {
    const v = Math.floor((sunsetToday + Number(t.dataset.rel)) / 5) * 5; t.textContent = hm(v); t.dateTime = hm(v);
  });
  // The pinned evening: whichever panel sits mid-screen sets the picture.
  const stage = document.querySelector('.stage');
  const panels = [...document.querySelectorAll('.night li')];
  if (stage && panels.length) {
    const show = (li) => { panels.forEach((p) => p.classList.toggle('is-on', p === li)); stage.dataset.on = li.dataset.at; };
    show(panels[0]);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) show(e.target); }), { rootMargin: '-45% 0px -45% 0px' });
      panels.forEach((p) => io.observe(p));
    }
  }

  // The menu: the plate shows the dish under the pointer, or the one in focus.
  const plates = [...document.querySelectorAll('.plate > img')];
  const dishes = [...document.querySelectorAll('.dishes li[data-show]')];
  const plateFor = (li) => {
    plates.forEach((im) => im.classList.toggle('is-on', im.dataset.dish === li.dataset.show));
    dishes.forEach((d) => d.classList.toggle('is-on', d === li));
  };
  dishes.forEach((li) => ['pointerenter', 'focus', 'click'].forEach((ev) => li.addEventListener(ev, () => plateFor(li))));

  // ---------- Open now ----------
  const open = document.querySelector('[data-open]');
  if (open) {
    const isOpen = nowMin >= OPEN && nowMin < CLOSE;
    open.classList.toggle('is-open', isOpen);
    open.textContent = isOpen ? `Open now, until ${hm(CLOSE)}` : (nowMin < OPEN ? `Closed now, opens today at ${hm(OPEN)}` : `Closed now, opens tomorrow at ${hm(OPEN)}`);
  }

  // ---------- Menu tabs (every panel shows without script) ----------
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab) => tabs.forEach((t) => {
    const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { select(t); const first = document.querySelector(`#${t.getAttribute('aria-controls')} li[data-show]`); if (first) plateFor(first); });
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; select(n); n.focus();
    });
  });
  if (tabs.length) select(tabs[0]);

  // ---------- Booking: the dinner-time dial relights the preview ----------
  const form = document.getElementById('book-form');
  const book = document.getElementById('book');
  const other = document.getElementById('day-other');
  const range = document.getElementById('time');
  const out = document.getElementById('time-out');
  const note = document.getElementById('time-note');
  const sunmark = document.querySelector('[data-sunmark]');
  const gOut = document.getElementById('guests');
  const send = document.getElementById('book-send');
  const minus = document.querySelector('[data-step="-1"]'), plus = document.querySelector('[data-step="1"]');
  let guests = 2;
  other.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const dayValue = () => form.querySelector('input[name="day"]:checked').value;
  const chosenDate = () => {
    const v = dayValue();
    if (v === 'other') return other.value ? new Date(`${other.value}T12:00:00`) : null;
    return addDays(today, Number(v));
  };
  const fmtDay = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const min = Number(range.min), max = Number(range.max);

  function describe(t, sunset) {
    const seat = seatFor(sunset);
    if (t < seat) return 'Golden hour, the sea still bright';
    if (t <= sunset + 10) return 'Sunset seating, the sun goes down at your table';
    if (t <= sunset + 45) return 'Blue hour, the lanterns coming on';
    return 'After dark, the grill at its hottest';
  }

  function update(fromDay) {
    const d = chosenDate() || today;
    const sunset = sunsetMinutes(d);
    if (fromDay) range.value = String(seatFor(sunset));
    const t = Number(range.value);
    other.hidden = dayValue() !== 'other';
    out.textContent = hm(t);
    note.textContent = describe(t, sunset);
    range.setAttribute('aria-valuetext', `${hm(t)}, ${describe(t, sunset)}`);
    sunmark.style.setProperty('--sun-at', `${((sunset - min) / (max - min)) * 100}%`);
    sunmark.textContent = `Sunset ${hm(sunset)}`;
    const k = Math.min(1, Math.max(0, (t - (sunset - 20)) / 75));
    book.style.setProperty('--k', k.toFixed(3));

    minus.disabled = guests <= 1; plus.disabled = guests >= 12; gOut.textContent = guests;
    const ready = !!chosenDate();
    const msg = `Hello Rumah Bara, I’d like a table for ${guests} on ${ready ? fmtDay(d) : '[date]'} at ${hm(t)}. Name: `;
    send.href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
    send.setAttribute('aria-disabled', String(!ready));
  }
  form.addEventListener('change', (e) => update(e.target.name === 'day' || e.target.name === 'date'));
  range.addEventListener('input', () => update(false));
  [minus, plus].forEach((b) => b.addEventListener('click', () => { guests = Math.min(12, Math.max(1, guests + Number(b.dataset.step))); update(false); }));
  send.addEventListener('click', (e) => {
    if (send.getAttribute('aria-disabled') === 'true') { e.preventDefault(); document.getElementById('book-help').textContent = 'Pick a date first, then send.'; other.focus(); }
  });
  update(true);

  // ---------- Phone dock: hidden while the hero or the booking form is on screen ----------
  const dock = document.querySelector('.dock');
  if (dock && 'IntersectionObserver' in window) {
    const seen = new Map();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => seen.set(e.target, e.isIntersecting));
      dock.classList.toggle('is-hidden', [...seen.values()].some(Boolean));
    }, { threshold: 0.15 });
    [document.querySelector('.hero__base'), book].forEach((el) => el && io.observe(el));
  }
  if (reduce) root.classList.add('reduce');
})();
