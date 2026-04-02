// ================================================================
//  CELIDER-08 Calendar — Frontend App  v4.0
//  Updated: color system, Efemérides/MUNs, mobile accordion
// ================================================================

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGfYotCId_Ip4D1wXi2wVL-jNWmmlBwSjdnbs80FyLia62xmixbiMyEIBDV1wNuI26gg/exec";
const YEAR       = 2026;
const MONTHS     = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_SHORT = ["D","L","M","M","J","V","S"];
const qs         = s => document.querySelector(s);

const TODAY      = new Date();
const THIS_YEAR  = TODAY.getFullYear();
const THIS_MONTH = TODAY.getMonth();
const THIS_DAY   = TODAY.getDate();

let EVENTS           = [];
let MODELOS          = [];
let COMISIONES       = [];
let MODELO_COMISIONES = [];
let MESAS_DIRECTIVAS = [];

const ICON = {
  edit:  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
};

// SVG icons per event type (for the chooser)
const TYPE_ICONS = {
  muns:       `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 22V12a9 9 0 0118 0v10"/><path d="M9 22V12h6v10"/></svg>`,
  actividad:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  visita:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  reunion:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
  evento:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  efemerides: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  aviso:      `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
};
const TYPE_LABELS = {
  muns: "MUNs", actividad: "Actividad", visita: "Visita",
  reunion: "Reunión", evento: "Evento", efemerides: "Efemérides", aviso: "Aviso"
};

// Normalize legacy type names from existing data
function normalizeType(rawType) {
  const t = (rawType || "evento").toLowerCase().trim();
  if (t === "feriado") return "efemerides";
  if (t === "modelo")  return "muns";
  return t;
}

const calendarArea = qs("#calendarArea");
const upcomingEl   = qs("#upcoming");
const refreshBtn   = qs("#refreshBtn");
const scrollTopBtn = qs("#scrollTopBtn");

const modal        = qs("#modal");
const modalTitle   = qs("#modalTitle");
const modalDate    = qs("#modalDate");
const modalDesc    = qs("#modalDesc");
const modalImg     = qs("#modalImg");
const modalPicsBtn = qs("#modalPicsBtn");
const modalClose   = qs("#modalClose");
const modeloModal  = qs("#modeloModal");

const hamburgerBtn = qs("#hamburgerBtn");
const menuOverlay  = qs("#menuOverlay");
const mobileMenu   = qs("#mobileMenu");
const menuClose    = qs("#menuClose");

// Mobile accordion elements
const mobileUpcomingSection = qs("#mobileUpcomingSection");
const upcomingAccordionToggle = qs("#upcomingAccordionToggle");
const upcomingAccordionBody = qs("#upcomingAccordionBody");
const accordionChevron = qs("#accordionChevron");
const mobileUpcomingEl = qs("#mobileUpcoming");
const upcomingCount = qs("#upcomingCount");

function openMenu()  {
  hamburgerBtn.classList.add("is-open");
  menuOverlay.classList.add("is-open");
  mobileMenu.classList.add("is-open");
  document.body.style.overflow = "hidden";
}
function closeMenu() {
  hamburgerBtn.classList.remove("is-open");
  menuOverlay.classList.remove("is-open");
  mobileMenu.classList.remove("is-open");
  document.body.style.overflow = "";
}

hamburgerBtn.addEventListener("click", openMenu);
menuClose.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);
qs("#refreshBtnMobile").addEventListener("click", () => { closeMenu(); setTimeout(() => location.reload(), 200); });

// Mobile accordion toggle
upcomingAccordionToggle.addEventListener("click", () => {
  const isOpen = upcomingAccordionBody.classList.contains("is-open");
  if (isOpen) {
    upcomingAccordionBody.classList.remove("is-open");
    upcomingAccordionToggle.classList.remove("is-open");
    accordionChevron.classList.remove("is-open");
    upcomingAccordionToggle.setAttribute("aria-expanded", "false");
  } else {
    upcomingAccordionBody.classList.add("is-open");
    upcomingAccordionToggle.classList.add("is-open");
    accordionChevron.classList.add("is-open");
    upcomingAccordionToggle.setAttribute("aria-expanded", "true");
  }
});

function parseDate(str) {
  if (!str || str.trim() === "") return null;
  const [y, m, d] = str.trim().split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function dateRangeLabel(ev) {
  const opts  = { day: "numeric", month: "short" };
  const start = ev._dateStart.toLocaleDateString("es-ES", opts);
  if (ev._days === 1) return ev._dateStart.toLocaleDateString("es-ES", { weekday:"short", day:"numeric", month:"short" });
  return `${start} – ${ev._dateEnd.toLocaleDateString("es-ES", opts)}`;
}

function parseBoolean(val) {
  if (typeof val === "boolean") return val;
  if (typeof val === "string")  return val.trim().toUpperCase() === "TRUE";
  return Boolean(val);
}

function processEvents(rawData) {
  return rawData.map(r => {
    const dateStart = parseDate(r.date);
    if (!dateStart) return null;
    const dateEnd = parseDate(r.date_end) || new Date(dateStart);
    const days    = Math.round((dateEnd - dateStart) / 86400000) + 1;
    const normalizedType = normalizeType(r.type);
    return {
      id: r.id || "", date: r.date || "", date_end: r.date_end || "",
      title: r.title || "", description: r.description || "",
      image: r.image || "", pictures: r.pictures || "", link: r.link || "",
      type: normalizedType,
      // Keep raw type for saving back (backward compat)
      _rawType: (r.type || "evento").toLowerCase().trim(),
      modelo_ref: r.modelo_ref || "",
      aviso: parseBoolean(r.aviso) || normalizedType === "aviso",
      _dateStart: dateStart, _dateEnd: dateEnd, _days: days
    };
  }).filter(Boolean).filter(e => e.title);
}

async function apiGet(params) {
  const url = `${APPS_SCRIPT_URL}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  return res.json();
}

async function loadAllData() {
  calendarArea.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Cargando eventos…</p></div>`;
  try {
    const data = await apiGet({ action: "getAll" });
    EVENTS            = processEvents(data.calendar      || []);
    MODELOS           = data.modelos           || [];
    COMISIONES        = data.comisiones        || [];
    MODELO_COMISIONES = data.modeloComisiones  || [];
    MESAS_DIRECTIVAS  = data.mesasDirectivas   || [];
    renderCalendar();
    renderUpcoming();
  } catch (err) {
    calendarArea.innerHTML = `<div class="error-state"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Error al cargar datos.<small>${err.message}</small></div>`;
  }
}

function buildDayMap() {
  const map = {};
  function addToMap(key, ev, position) {
    if (!map[key]) map[key] = [];
    if (!map[key].find(e => e.ev === ev)) map[key].push({ ev, position });
  }
  EVENTS.forEach(ev => {
    if (ev._days === 1) { addToMap(toKey(ev._dateStart), ev, "single"); return; }
    const cur = new Date(ev._dateStart);
    while (cur <= ev._dateEnd) {
      const key = toKey(cur);
      let pos;
      if (cur.getTime() === ev._dateStart.getTime())    pos = "start";
      else if (cur.getTime() === ev._dateEnd.getTime()) pos = "end";
      else                                               pos = "middle";
      addToMap(key, ev, pos);
      cur.setDate(cur.getDate() + 1);
    }
  });
  return map;
}

function renderCalendar() {
  calendarArea.innerHTML = "";
  const dayMap = buildDayMap();
  const isCurrentYear = YEAR === THIS_YEAR;
  const monthSections = [];

  for (let m = 0; m < 12; m++) {
    const isPast    = isCurrentYear && m < THIS_MONTH;
    const isCurrent = isCurrentYear && m === THIS_MONTH;
    const section   = document.createElement("section");
    section.className = "month-card";
    section.id = `month-${m + 1}`;
    if (isPast)    section.classList.add("is-past");
    if (isCurrent) section.classList.add("is-current");
    section.innerHTML = `<h2 class="month-title">${MONTHS[m]}</h2>`;

    const grid = document.createElement("div");
    grid.className = "month-grid";
    DAYS_SHORT.forEach(d => {
      const h = document.createElement("div");
      h.className = "day-header"; h.textContent = d;
      grid.appendChild(h);
    });

    const firstDay    = new Date(YEAR, m, 1).getDay();
    const daysInMonth = new Date(YEAR, m + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement("div"));

    for (let d = 1; d <= daysInMonth; d++) {
      const key     = `${YEAR}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const entries = dayMap[key];
      const cell    = document.createElement("button");
      cell.className = "day-cell";
      if (isCurrent && d === THIS_DAY) cell.classList.add("is-today");

      if (entries && entries.length > 0) {
        const { ev: primaryEv, position } = entries[0];
        cell.classList.add("has-event", `tag-${primaryEv.type}`, `range-${position}`);
        // Apply aviso if ANY event on this day has aviso=true or is type aviso
        if (entries.some(e => e.ev.aviso || e.ev.type === "aviso")) cell.classList.add("is-aviso");
        if (entries.length > 1) cell.classList.add("multi-event");

        cell.innerHTML = `<span>${d}</span>`;
        if (position === "start" && primaryEv._days > 1)
          cell.innerHTML += `<span class="range-badge">${primaryEv._days}d</span>`;

        if (entries.length > 1) {
          const secDots = entries.slice(1)
            .map(({ ev }) => `<span class="sec-dot sec-${ev.type}"></span>`)
            .join("");
          cell.innerHTML += `<span class="sec-dots">${secDots}</span>`;
        }

        cell.onclick = () => openDayEvents(entries);
      } else {
        cell.innerHTML = `<span>${d}</span>`;
      }
      grid.appendChild(cell);
    }
    section.appendChild(grid);
    monthSections.push({ section, isPast, isCurrent });
  }

  monthSections.filter(ms => !ms.isPast).forEach(ms => calendarArea.appendChild(ms.section));
  const past = monthSections.filter(ms => ms.isPast);
  if (past.length > 0) {
    const div = document.createElement("div");
    div.className = "past-months-divider";
    div.textContent = "Meses anteriores";
    calendarArea.appendChild(div);
    past.forEach(ms => calendarArea.appendChild(ms.section));
  }

  if (isCurrentYear) {
    requestAnimationFrame(() => {
      const cur = qs(`#month-${THIS_MONTH + 1}`);
      if (cur) {
        const h = qs(".topbar")?.offsetHeight || 62;
        window.scrollTo({ top: cur.getBoundingClientRect().top + window.scrollY - h - 14, behavior: "instant" });
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────
//  Smart day event routing
// ─────────────────────────────────────────────────────────────
function openDayEvents(entries) {
  if (entries.length === 1) { openEventModal(entries[0].ev); return; }
  openEventChooser(entries);
}

function openEventChooser(entries) {
  const chooser  = qs("#modeloChooser");
  const list     = qs("#modeloChooserList");
  const subtitle = qs("#modeloChooserSubtitle");

  const allMuns = entries.every(e => e.ev.type === "muns");
  if (subtitle) {
    subtitle.textContent = allMuns
      ? "Hay varios MUNs en este día. ¿Cuál deseas ver?"
      : "Hay varios eventos en este día. ¿Cuál deseas ver?";
  }

  list.innerHTML = "";
  entries.forEach(({ ev }) => {
    const btn = document.createElement("button");
    btn.className = `chooser-item tag-${ev.type}`;
    const icon  = TYPE_ICONS[ev.type]  || TYPE_ICONS.evento;
    const label = TYPE_LABELS[ev.type] || ev.type;
    btn.innerHTML = `
      <span class="chooser-icon tag-${ev.type}">${icon}</span>
      <span class="chooser-text">
        <strong>${ev.title}</strong>
        <small>${label} · ${dateRangeLabel(ev)}${ev._days > 1 ? ` · ${ev._days} días` : ""}</small>
      </span>`;
    btn.onclick = () => {
      chooser.classList.remove("open");
      document.body.style.overflow = "";
      openEventModal(ev);
    };
    list.appendChild(btn);
  });

  chooser.classList.add("open");
  document.body.style.overflow = "hidden";
}

qs("#modeloChooser").addEventListener("click", e => {
  if (e.target === qs("#modeloChooser")) {
    qs("#modeloChooser").classList.remove("open");
    document.body.style.overflow = "";
  }
});
qs("#modeloChooserClose").onclick = () => {
  qs("#modeloChooser").classList.remove("open");
  document.body.style.overflow = "";
};

function renderUpcoming() {
  upcomingEl.innerHTML = "";
  if (mobileUpcomingEl) mobileUpcomingEl.innerHTML = "";

  const today = new Date(); today.setHours(0,0,0,0);
  const seen = new Set();
  const upcoming = EVENTS
    .filter(ev => ev._dateEnd >= today)
    .sort((a, b) => a._dateStart - b._dateStart)
    .filter(ev => { if (seen.has(ev.id)) return false; seen.add(ev.id); return true; })
    .slice(0, 10);

  // Update mobile accordion count
  if (upcomingCount) {
    upcomingCount.textContent = upcoming.length > 0
      ? `${upcoming.length} evento${upcoming.length !== 1 ? "s" : ""} próximos`
      : "Sin eventos próximos";
  }

  if (upcoming.length === 0) {
    const emptyHtml = `<p style="opacity:.45;font-size:.88rem;font-family:var(--font-body)">No hay próximos eventos.</p>`;
    upcomingEl.innerHTML = emptyHtml;
    if (mobileUpcomingEl) mobileUpcomingEl.innerHTML = emptyHtml;
    return;
  }

  upcoming.forEach(ev => {
    // Build card for desktop sidebar
    const card = buildUpcomingCard(ev);
    upcomingEl.appendChild(card);

    // Build card for mobile accordion
    if (mobileUpcomingEl) {
      const mobileCard = buildUpcomingCard(ev);
      mobileUpcomingEl.appendChild(mobileCard);
    }
  });
}

function buildUpcomingCard(ev) {
  const card = document.createElement("div");
  card.className = `upcoming-card tag-${ev.type}`;
  if (ev.aviso || ev.type === "aviso") card.classList.add("is-aviso");
  const durHtml  = ev._days > 1 ? `<span class="duration-pill">${ev._days} días</span>` : "";
  const typeIcon = ev.type === "muns" ? `<span class="upcoming-mun-badge">MUN</span>` : "";
  card.innerHTML = `
    <div style="min-width:0;flex:1">
      <strong class="event-name">${ev.title}</strong>
      <div class="upcoming-meta">
        <span class="event-date">${dateRangeLabel(ev)}</span>
        ${durHtml}${typeIcon}
      </div>
    </div>`;
  card.onclick = () => openEventModal(ev);
  return card;
}

// ─────────────────────────────────────────────────────────────
//  Event modal router
// ─────────────────────────────────────────────────────────────
function openEventModal(ev) {
  // MUNs (formerly modelo) uses special modal
  if (ev.type === "muns") { openModeloModal(ev); return; }

  modalTitle.textContent = ev.title;
  modalDate.textContent  = ev._days > 1
    ? `${formatDateDisplay(ev.date)}  →  ${formatDateDisplay(ev.date_end)}  (${ev._days} días)`
    : formatDateDisplay(ev.date);
  modalDesc.textContent  = ev.description;

  if (ev.image) {
    modalImg.src = ev.image;
    modalImg.style.display = "block";
    modalImg.onerror = () => { modalImg.style.display = "none"; };
  } else {
    modalImg.style.display = "none";
    modalImg.src = "";
  }

  modalPicsBtn.href          = ev.pictures || "#";
  modalPicsBtn.style.display = ev.pictures ? "flex" : "none";

  const existingLink = qs("#modalLinkBtn");
  if (existingLink) existingLink.remove();
  if (ev.link) {
    const linkBtn = document.createElement("a");
    linkBtn.id        = "modalLinkBtn";
    linkBtn.className = "link-access";
    linkBtn.href      = ev.link;
    linkBtn.target    = "_blank";
    linkBtn.rel       = "noopener";
    linkBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Acceder`;
    modalPicsBtn.insertAdjacentElement("afterend", linkBtn);
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

// ─────────────────────────────────────────────────────────────
//  Modelo Distrital (MUNs) modal
// ─────────────────────────────────────────────────────────────
function openModeloModal(ev) {
  const meta = MODELOS.find(m => m.id === ev.modelo_ref) || {};
  const image   = ev.image || meta.image || "";
  const edition = meta.edition || "";

  const asignaciones  = MODELO_COMISIONES.filter(mc => mc.evento_id === ev.id);
  const totalMiembros = MESAS_DIRECTIVAS.filter(m => m.evento_id === ev.id).length;

  const card = qs("#modeloModal .modal-card");
  card.innerHTML = buildModeloModalContent(ev, { image, edition }, asignaciones, totalMiembros);

  card.querySelector(".modal-close").onclick = () => {
    modeloModal.classList.remove("open");
    document.body.style.overflow = "";
  };
  card.querySelectorAll(".com-panel-header").forEach(h => {
    h.addEventListener("click", () => {
      const panel  = h.closest(".com-panel");
      const isOpen = panel.classList.contains("open");
      card.querySelectorAll(".com-panel").forEach(p => p.classList.remove("open"));
      if (!isOpen) panel.classList.add("open");
    });
  });
  const first = card.querySelector(".com-panel");
  if (first) first.classList.add("open");

  modeloModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function buildModeloModalContent(ev, meta, asignaciones, totalMiembros) {
  const dateStr = ev.date_end && ev.date_end !== ev.date
    ? `${formatDateDisplay(ev.date)} – ${formatDateDisplay(ev.date_end)} · ${ev._days} días`
    : formatDateDisplay(ev.date);

  const statsHtml = `<div class="modelo-stats">
    <div class="modelo-stat"><span class="ms-value">${asignaciones.length}</span><span class="ms-label">Comisiones</span></div>
    <div class="modelo-stat-divider"></div>
    <div class="modelo-stat"><span class="ms-value">${totalMiembros}</span><span class="ms-label">Miembros</span></div>
    ${ev._days > 1 ? `<div class="modelo-stat-divider"></div><div class="modelo-stat"><span class="ms-value">${ev._days}</span><span class="ms-label">Días</span></div>` : ""}
  </div>`;

  const imageHtml = meta.image
    ? `<img src="${meta.image}" class="modelo-banner-img" alt="${ev.title}" loading="lazy" onerror="this.style.display='none'">`
    : "";

  const linkBtnHtml = ev.link
    ? `<a class="modelo-link-btn" href="${ev.link}" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Acceder
       </a>`
    : "";

  const comisionesHtml = buildComisionesHtml(ev, asignaciones);

  return `
    <button class="modal-close">${ICON.close}</button>
    <div class="modelo-hero">
      ${imageHtml}
      <div class="modelo-hero-body">
        <div class="modelo-hero-top">
          <span class="modelo-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 22V12a9 9 0 0118 0v10"/><path d="M9 22V12h6v10"/></svg>
            Modelo de las Naciones Unidas · MUN
          </span>
          ${meta.edition ? `<span class="modelo-edition-pill">${meta.edition}</span>` : ""}
        </div>
        <h3 class="modelo-title">${ev.title}</h3>
        <p class="modelo-date-line">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          ${dateStr}
        </p>
      </div>
    </div>
    ${statsHtml}
    <div class="modelo-scroll-body">
      ${ev.description ? `<p class="modelo-description">${ev.description}</p>` : ""}
      ${linkBtnHtml}
      <div class="comisiones-section">
        <div class="comisiones-section-header">
          <div class="csh-left">
            <span class="csh-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></span>
            Comisiones y Mesas Directivas
          </div>
        </div>
        <div class="comisiones-list">${comisionesHtml}</div>
      </div>
    </div>`;
}

function buildComisionesHtml(ev, asignaciones) {
  if (asignaciones.length === 0) {
    return `<div class="empty-comisiones">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".35"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
      <p>No hay comisiones asignadas a este modelo todavía.</p>
    </div>`;
  }
  return asignaciones.map((a, idx) => {
    const com   = COMISIONES.find(c => c.id === a.comision_id) || {};
    const mesas = MESAS_DIRECTIVAS.filter(m => m.evento_id === ev.id && m.comision_id === a.comision_id);
    const membersHtml = buildMesaDirectivaHtml(mesas);
    return `<div class="com-panel" data-index="${idx}">
      <div class="com-panel-header">
        <div class="com-number">${String(idx + 1).padStart(2, "0")}</div>
        <div class="com-header-body">
          <span class="com-name">${com.nombre || "(Comisión sin nombre)"}</span>
          ${com.topico ? `<span class="com-topic">${com.topico}</span>` : ""}
        </div>
        <div class="com-header-right">
          <span class="com-member-count">${mesas.length} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></span>
          <span class="com-chevron"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></span>
        </div>
      </div>
      <div class="com-panel-body">
        ${a.descripcion || com.descripcion ? `<p class="com-description">${a.descripcion || com.descripcion}</p>` : ""}
        ${membersHtml}
      </div>
    </div>`;
  }).join("");
}

function buildMesaDirectivaHtml(mesas) {
  if (mesas.length === 0) return `<p class="mesa-empty">Sin miembros registrados para esta comisión.</p>`;
  const roleOrder = ["Director/a","Director Adjunto/a","Evaluación y Control","Otro"];
  const sorted = [...mesas].sort((a, b) => {
    return (roleOrder.indexOf(a.role) === -1 ? 99 : roleOrder.indexOf(a.role))
         - (roleOrder.indexOf(b.role) === -1 ? 99 : roleOrder.indexOf(b.role));
  });
  return `<div class="mesa-grid">${sorted.map(m =>
    `<div class="mesa-card">
      <div class="mesa-role-badge role-${slugRole(m.role)}">${m.role}</div>
      <div class="mesa-name">${m.nombre}</div>
      ${m.escuela ? `<div class="mesa-school">${m.escuela}</div>` : ""}
    </div>`
  ).join("")}</div>`;
}

function slugRole(role) {
  return { "Director/a":"director","Director Adjunto/a":"director-adjunto","Evaluación y Control":"evaluacion-control","Otro":"otro" }[role] || "otro";
}

function formatDateDisplay(str) {
  if (!str) return "";
  const d = parseDate(str);
  if (!d) return str;
  return d.toLocaleDateString("es-ES", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
}

modalClose.onclick  = () => { modal.classList.remove("open"); document.body.style.overflow = ""; };
modal.onclick       = e => { if (e.target === modal) { modal.classList.remove("open"); document.body.style.overflow = ""; } };
modeloModal.onclick = e => { if (e.target === modeloModal) { modeloModal.classList.remove("open"); document.body.style.overflow = ""; } };
refreshBtn.onclick  = () => location.reload();


// ════════════════════════════════════════════════════════════════
//  ADMIN PANEL
// ════════════════════════════════════════════════════════════════
const adminOverlay   = qs("#adminOverlay");
const adminAuth      = qs("#adminAuth");
const adminContent   = qs("#adminContent");
const adminPassInput = qs("#adminPassInput");
const adminLoginBtn  = qs("#adminLoginBtn");
const adminAuthError = qs("#adminAuthError");
const adminClose     = qs("#adminClose");

let adminPassword      = "";
let adminAuthenticated = false;

function openAdmin() {
  adminOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
  if (!adminAuthenticated) {
    adminAuth.style.display    = "flex";
    adminContent.style.display = "none";
    adminPassInput.value       = "";
    adminAuthError.textContent = "";
    setTimeout(() => adminPassInput.focus(), 100);
  }
}

function closeAdmin() {
  adminOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

qs("#adminBtn").onclick       = openAdmin;
qs("#adminBtnMobile").onclick = () => { closeMenu(); setTimeout(openAdmin, 250); };
adminClose.onclick            = closeAdmin;
adminOverlay.onclick          = e => e.target === adminOverlay && closeAdmin();

qs(".admin-tabs").addEventListener("click", e => {
  const tab = e.target.closest(".admin-tab");
  if (!tab) return;
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".admin-tab-pane").forEach(p => p.classList.remove("active"));
  tab.classList.add("active");
  qs(`#tab-${tab.dataset.tab}`).classList.add("active");
  if (window.lucide) lucide.createIcons();
});

const ADMIN_PASSWORD = "celider08admin";

async function adminLogin() {
  const pass = adminPassInput.value.trim();
  if (!pass) { adminAuthError.textContent = "Ingresa la contraseña."; return; }

  if (pass !== ADMIN_PASSWORD) {
    adminAuthError.textContent = "⛔ Acceso denegado. Contraseña incorrecta.";
    adminPassInput.value = "";
    adminPassInput.classList.add("shake");
    setTimeout(() => adminPassInput.classList.remove("shake"), 600);
    setTimeout(() => adminPassInput.focus(), 100);
    adminContent.style.display = "none";
    adminAuth.style.display    = "flex";
    return;
  }

  adminLoginBtn.textContent = "Verificando…";
  adminLoginBtn.disabled    = true;
  adminPassInput.disabled   = true;
  adminAuthError.textContent = "";

  try {
    const res = await apiGet({ action: "getAll", password: pass });

    if (res.error === "Unauthorized" || res.error === "unauthorized" || res.status === 401) {
      adminAuthError.textContent = "⛔ Acceso denegado. Contraseña incorrecta.";
      adminPassInput.value = "";
      adminPassInput.classList.add("shake");
      setTimeout(() => adminPassInput.classList.remove("shake"), 600);
      setTimeout(() => adminPassInput.focus(), 100);
      adminContent.style.display = "none";
      adminAuth.style.display    = "flex";
    } else if (res.error) {
      adminAuthError.textContent = `Error: ${res.error}`;
    } else {
      adminPassword      = pass;
      adminAuthenticated = true;
      EVENTS            = processEvents(res.calendar      || []);
      MODELOS           = res.modelos           || [];
      COMISIONES        = res.comisiones        || [];
      MODELO_COMISIONES = res.modeloComisiones  || [];
      MESAS_DIRECTIVAS  = res.mesasDirectivas   || [];
      adminAuth.style.display    = "none";
      adminContent.style.display = "flex";
      adminContent.style.flexDirection = "column";
      adminContent.style.flex   = "1";
      adminContent.style.overflow = "hidden";
      adminContent.style.minHeight = "0";
      refreshAdminData();
    }
  } catch (e) {
    adminAuthError.textContent = "Error de conexión. Verifica la URL del Apps Script.";
  } finally {
    adminLoginBtn.textContent = "Entrar";
    adminLoginBtn.disabled    = false;
    adminPassInput.disabled   = false;
  }
}

adminLoginBtn.onclick = adminLogin;
adminPassInput.addEventListener("keydown", e => e.key === "Enter" && adminLogin());

async function adminSave(sheet, data) {
  const isNew = !data.id;
  return apiGet({ action: isNew ? "addRow" : "updateRow", sheet, data: JSON.stringify(data), password: adminPassword });
}
async function adminDelete(sheet, id) {
  return apiGet({ action: "deleteRow", sheet, id, password: adminPassword });
}
async function reloadData() {
  const data = await apiGet({ action: "getAll" });
  EVENTS            = processEvents(data.calendar      || []);
  MODELOS           = data.modelos           || [];
  COMISIONES        = data.comisiones        || [];
  MODELO_COMISIONES = data.modeloComisiones  || [];
  MESAS_DIRECTIVAS  = data.mesasDirectivas   || [];
}

function refreshAdminData() {
  renderCalendarTable(); renderModelosTable();
  renderComisionesGlobalesTable(); renderAsignacionesTable();
  renderMesasDirectivasTable(); populateAdminSelects();
  if (window.lucide) lucide.createIcons();
}

function populateAdminSelects() {
  const modeloEvents = EVENTS.filter(e => e.type === "muns");
  ["cf-modelo_ref","asf-evento_id","mdf-evento_id"].forEach(id => {
    const sel = qs(`#${id}`); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">— Seleccionar evento MUNs —</option>`;
    modeloEvents.forEach(ev => { const opt = document.createElement("option"); opt.value = ev.id; opt.textContent = `${ev.title} (${ev.date})`; sel.appendChild(opt); });
    if (cur) sel.value = cur;
  });
  ["comf-id-ref","asf-comision_id","mdf-comision_id"].forEach(id => {
    const sel = qs(`#${id}`); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">— Seleccionar comisión —</option>`;
    COMISIONES.forEach(c => { const opt = document.createElement("option"); opt.value = c.id; opt.textContent = c.nombre; sel.appendChild(opt); });
    if (cur) sel.value = cur;
  });
}

function renderCalendarTable() {
  const tbody = qs("#calendarTbody");
  tbody.innerHTML = "";
  if (EVENTS.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No hay eventos registrados.</td></tr>`;
    return;
  }
  EVENTS.sort((a,b) => a._dateStart - b._dateStart).forEach(ev => {
    const tr = document.createElement("tr");
    const typeLabel = TYPE_LABELS[ev.type] || ev.type;
    tr.innerHTML = `
      <td>${ev.date}${ev.date_end ? ` → ${ev.date_end}` : ""}</td>
      <td>${ev.title}</td>
      <td><span class="type-chip tag-${ev.type}">${typeLabel}</span></td>
      <td>
        ${ev.pictures
          ? `<a href="${ev.pictures}" target="_blank" rel="noopener" class="btn btn-sm" style="background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.3);color:#86efac;margin-bottom:4px">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M20.188 10.934a2 2 0 00-1.99-1.934H5.8a2 2 0 00-1.99 1.934L3 17a2 2 0 002 2.066h14A2 2 0 0021 17l-.812-6.066z"/><path d="M7 8l2-2.5h6L17 8"/></svg>
              Fotos
             </a>`
          : ""}
        ${ev.link
          ? `<a href="${ev.link}" target="_blank" rel="noopener" class="btn btn-sm link-chip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Acceder
             </a>`
          : `<span style="color:var(--text-light);font-size:.75rem">—</span>`}
      </td>
      <td class="action-btns">
        <button class="btn btn-sm" onclick="editCalendarEvent('${ev.id}')">${ICON.edit}</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCalendarEvent('${ev.id}')">${ICON.trash}</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

qs("#addCalendarBtn").onclick = () => {
  qs("#calendarFormTitle").textContent = "Nuevo Evento";
  clearForm(["cf-id","cf-date","cf-date_end","cf-title","cf-description","cf-image","cf-pictures","cf-link","cf-modelo_ref"]);
  qs("#cf-type").value = "actividad";
  qs("#cf-modelo-ref-field").style.display = "none";
  toggleForm("calendarForm", true);
};
qs("#cf-type").onchange = () => { qs("#cf-modelo-ref-field").style.display = qs("#cf-type").value === "muns" ? "block" : "none"; };
qs("#cancelCalendarBtn").onclick = () => toggleForm("calendarForm", false);
qs("#saveCalendarBtn").onclick = async () => {
  const typeVal = qs("#cf-type").value;
  const data = {
    id: qs("#cf-id").value, date: qs("#cf-date").value, date_end: qs("#cf-date_end").value,
    title: qs("#cf-title").value.trim(), description: qs("#cf-description").value.trim(),
    image: qs("#cf-image").value.trim(), pictures: qs("#cf-pictures").value.trim(),
    link: qs("#cf-link").value.trim(),
    // Save with the new type names; backend stores as-is
    type: typeVal,
    modelo_ref: qs("#cf-modelo_ref").value
  };
  if (!data.date || !data.title) { alert("Fecha y título son requeridos."); return; }
  qs("#saveCalendarBtn").textContent = "Guardando…";
  const res = await adminSave("calendar", data);
  if (res.ok !== false) { await reloadData(); renderCalendar(); renderUpcoming(); refreshAdminData(); toggleForm("calendarForm", false); }
  else alert("Error: " + res.error);
  qs("#saveCalendarBtn").textContent = "Guardar";
};
function editCalendarEvent(id) {
  const ev = EVENTS.find(e => e.id === id); if (!ev) return;
  qs("#calendarFormTitle").textContent = "Editar Evento";
  qs("#cf-id").value = ev.id; qs("#cf-date").value = ev.date; qs("#cf-date_end").value = ev.date_end;
  qs("#cf-title").value = ev.title; qs("#cf-description").value = ev.description;
  qs("#cf-image").value = ev.image; qs("#cf-pictures").value = ev.pictures;
  qs("#cf-link").value = ev.link || "";
  qs("#cf-type").value = ev.type; qs("#cf-modelo_ref").value = ev.modelo_ref;
  qs("#cf-modelo-ref-field").style.display = ev.type === "muns" ? "block" : "none";
  toggleForm("calendarForm", true);
}
async function deleteCalendarEvent(id) {
  if (!confirm("¿Eliminar este evento del calendario?")) return;
  const res = await adminDelete("calendar", id);
  if (res.ok !== false) { await reloadData(); renderCalendar(); renderUpcoming(); refreshAdminData(); }
  else alert("Error: " + res.error);
}

function renderModelosTable() {
  const tbody = qs("#modelosTbody"); tbody.innerHTML = "";
  if (MODELOS.length === 0) { tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No hay modelos registrados.</td></tr>`; return; }
  MODELOS.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${m.name}</td><td>${m.edition || "—"}</td><td>${m.date}${m.date_end ? ` → ${m.date_end}` : ""}</td><td class="action-btns"><button class="btn btn-sm" onclick="editModelo('${m.id}')">${ICON.edit}</button><button class="btn btn-sm btn-danger" onclick="deleteModelo('${m.id}')">${ICON.trash}</button></td>`;
    tbody.appendChild(tr);
  });
}
qs("#addModeloBtn").onclick = () => { qs("#modeloFormTitle").textContent = "Nuevo Modelo"; clearForm(["mf-id","mf-name","mf-edition","mf-date","mf-date_end","mf-description","mf-image"]); toggleForm("modeloForm", true); };
qs("#cancelModeloBtn").onclick = () => toggleForm("modeloForm", false);
qs("#saveModeloBtn").onclick = async () => {
  const data = { id: qs("#mf-id").value, name: qs("#mf-name").value.trim(), edition: qs("#mf-edition").value.trim(), date: qs("#mf-date").value, date_end: qs("#mf-date_end").value, description: qs("#mf-description").value.trim(), image: qs("#mf-image").value.trim() };
  if (!data.name || !data.date) { alert("Nombre y fecha son requeridos."); return; }
  qs("#saveModeloBtn").textContent = "Guardando…";
  const res = await adminSave("modelos", data);
  if (res.ok !== false) { await reloadData(); renderModelosTable(); populateAdminSelects(); toggleForm("modeloForm", false); }
  else alert("Error: " + res.error);
  qs("#saveModeloBtn").textContent = "Guardar";
};
function editModelo(id) {
  const m = MODELOS.find(x => x.id === id); if (!m) return;
  qs("#modeloFormTitle").textContent = "Editar Modelo";
  ["id","name","edition","date","date_end","description","image"].forEach(f => { qs(`#mf-${f}`).value = m[f] || ""; });
  toggleForm("modeloForm", true);
}
async function deleteModelo(id) {
  if (!confirm("¿Eliminar este modelo?")) return;
  await adminDelete("modelos", id); await reloadData(); renderModelosTable(); populateAdminSelects();
}

function renderComisionesGlobalesTable() {
  const tbody = qs("#comisionesTbody"); tbody.innerHTML = "";
  if (COMISIONES.length === 0) { tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No hay comisiones en el catálogo.</td></tr>`; return; }
  COMISIONES.forEach(c => {
    const usos = MODELO_COMISIONES.filter(mc => mc.comision_id === c.id).length;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${c.nombre}</strong></td><td style="font-size:.82rem;color:var(--text-muted)">${c.topico || "—"}</td><td style="font-size:.82rem;color:var(--text-muted);max-width:220px">${c.descripcion || "—"}</td><td style="text-align:center"><span class="usos-badge">${usos} uso${usos !== 1 ? "s" : ""}</span></td><td class="action-btns"><button class="btn btn-sm" onclick="editComisionGlobal('${c.id}')">${ICON.edit}</button><button class="btn btn-sm btn-danger" onclick="deleteComisionGlobal('${c.id}')">${ICON.trash}</button></td>`;
    tbody.appendChild(tr);
  });
}
qs("#addComisionGlobalBtn").onclick = () => { qs("#comisionGlobalFormTitle").textContent = "Nueva Comisión"; clearForm(["cgf-id","cgf-nombre","cgf-topico","cgf-descripcion"]); toggleForm("comisionGlobalForm", true); };
qs("#cancelComisionGlobalBtn").onclick = () => toggleForm("comisionGlobalForm", false);
qs("#saveComisionGlobalBtn").onclick = async () => {
  const data = { id: qs("#cgf-id").value, nombre: qs("#cgf-nombre").value.trim(), topico: qs("#cgf-topico").value.trim(), descripcion: qs("#cgf-descripcion").value.trim() };
  if (!data.nombre) { alert("El nombre de la comisión es requerido."); return; }
  qs("#saveComisionGlobalBtn").textContent = "Guardando…";
  const res = await adminSave("comisiones", data);
  if (res.ok !== false) { await reloadData(); renderComisionesGlobalesTable(); populateAdminSelects(); toggleForm("comisionGlobalForm", false); }
  else alert("Error: " + res.error);
  qs("#saveComisionGlobalBtn").textContent = "Guardar";
};
function editComisionGlobal(id) {
  const c = COMISIONES.find(x => x.id === id); if (!c) return;
  qs("#comisionGlobalFormTitle").textContent = "Editar Comisión";
  qs("#cgf-id").value = c.id; qs("#cgf-nombre").value = c.nombre; qs("#cgf-topico").value = c.topico || ""; qs("#cgf-descripcion").value = c.descripcion;
  toggleForm("comisionGlobalForm", true);
}
async function deleteComisionGlobal(id) {
  const usos = MODELO_COMISIONES.filter(mc => mc.comision_id === id).length;
  if (!confirm(usos > 0 ? `Esta comisión está asignada a ${usos} evento(s). ¿Eliminar igualmente?` : "¿Eliminar esta comisión del catálogo?")) return;
  await adminDelete("comisiones", id); await reloadData(); renderComisionesGlobalesTable(); renderAsignacionesTable(); populateAdminSelects();
}

function renderAsignacionesTable() {
  const tbody = qs("#asignacionesTbody"); tbody.innerHTML = "";
  if (MODELO_COMISIONES.length === 0) { tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No hay asignaciones registradas.</td></tr>`; return; }
  MODELO_COMISIONES.forEach(a => {
    const ev = EVENTS.find(e => e.id === a.evento_id); const com = COMISIONES.find(c => c.id === a.comision_id);
    const mesas = MESAS_DIRECTIVAS.filter(m => m.evento_id === a.evento_id && m.comision_id === a.comision_id).length;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="font-size:.82rem">${ev ? ev.title : a.evento_id}</td><td>${com ? com.nombre : a.comision_id}</td><td style="font-size:.82rem;color:var(--text-muted)">${com ? (com.topico || "—") : "—"}</td><td style="text-align:center"><span class="usos-badge">${mesas}</span></td><td class="action-btns"><button class="btn btn-sm" onclick="editAsignacion('${a.id}')">${ICON.edit}</button><button class="btn btn-sm btn-danger" onclick="deleteAsignacion('${a.id}')">${ICON.trash}</button></td>`;
    tbody.appendChild(tr);
  });
}
qs("#addAsignacionBtn").onclick = () => { qs("#asignacionFormTitle").textContent = "Nueva Asignación"; clearForm(["asf-id","asf-evento_id","asf-comision_id","asf-descripcion"]); toggleForm("asignacionForm", true); };
qs("#cancelAsignacionBtn").onclick = () => toggleForm("asignacionForm", false);
qs("#saveAsignacionBtn").onclick = async () => {
  const data = { id: qs("#asf-id").value, evento_id: qs("#asf-evento_id").value, comision_id: qs("#asf-comision_id").value, descripcion: qs("#asf-descripcion").value.trim() };
  if (!data.evento_id || !data.comision_id) { alert("Evento y comisión son requeridos."); return; }
  qs("#saveAsignacionBtn").textContent = "Guardando…";
  const res = await adminSave("modelo_comisiones", data);
  if (res.ok !== false) { await reloadData(); renderAsignacionesTable(); toggleForm("asignacionForm", false); }
  else alert("Error: " + res.error);
  qs("#saveAsignacionBtn").textContent = "Guardar";
};
function editAsignacion(id) {
  const a = MODELO_COMISIONES.find(x => x.id === id); if (!a) return;
  qs("#asignacionFormTitle").textContent = "Editar Asignación";
  qs("#asf-id").value = a.id; qs("#asf-evento_id").value = a.evento_id; qs("#asf-comision_id").value = a.comision_id; qs("#asf-descripcion").value = a.descripcion;
  toggleForm("asignacionForm", true);
}
async function deleteAsignacion(id) {
  if (!confirm("¿Eliminar esta asignación?")) return;
  await adminDelete("modelo_comisiones", id); await reloadData(); renderAsignacionesTable(); renderMesasDirectivasTable();
}

function renderMesasDirectivasTable() {
  const tbody = qs("#mesasDirectivasTbody"); tbody.innerHTML = "";
  if (MESAS_DIRECTIVAS.length === 0) { tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No hay miembros registrados.</td></tr>`; return; }
  MESAS_DIRECTIVAS.forEach(m => {
    const ev = EVENTS.find(e => e.id === m.evento_id); const com = COMISIONES.find(c => c.id === m.comision_id);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="font-size:.78rem;color:var(--text-muted)">${ev ? ev.title : m.evento_id}</td><td style="font-size:.82rem">${com ? com.nombre : m.comision_id}</td><td><span class="role-chip role-${slugRole(m.role)}">${m.role}</span></td><td>${m.nombre}</td><td style="font-size:.78rem;color:var(--text-muted)">${m.escuela || "—"}</td><td class="action-btns"><button class="btn btn-sm" onclick="editMesaDirectiva('${m.id}')">${ICON.edit}</button><button class="btn btn-sm btn-danger" onclick="deleteMesaDirectiva('${m.id}')">${ICON.trash}</button></td>`;
    tbody.appendChild(tr);
  });
}
qs("#addMesaDirectivaBtn").onclick = () => { qs("#mesaDirectivaFormTitle").textContent = "Nuevo Miembro"; clearForm(["mdf-id","mdf-evento_id","mdf-comision_id","mdf-nombre","mdf-escuela"]); qs("#mdf-role").value = "Director/a"; toggleForm("mesaDirectivaForm", true); };
qs("#cancelMesaDirectivaBtn").onclick = () => toggleForm("mesaDirectivaForm", false);
qs("#saveMesaDirectivaBtn").onclick = async () => {
  const data = { id: qs("#mdf-id").value, evento_id: qs("#mdf-evento_id").value, comision_id: qs("#mdf-comision_id").value, role: qs("#mdf-role").value, nombre: qs("#mdf-nombre").value.trim(), escuela: qs("#mdf-escuela").value.trim() };
  if (!data.evento_id || !data.comision_id || !data.nombre) { alert("Evento, comisión y nombre son requeridos."); return; }
  qs("#saveMesaDirectivaBtn").textContent = "Guardando…";
  const res = await adminSave("mesas_directivas", data);
  if (res.ok !== false) { await reloadData(); renderMesasDirectivasTable(); toggleForm("mesaDirectivaForm", false); }
  else alert("Error: " + res.error);
  qs("#saveMesaDirectivaBtn").textContent = "Guardar";
};
function editMesaDirectiva(id) {
  const m = MESAS_DIRECTIVAS.find(x => x.id === id); if (!m) return;
  qs("#mesaDirectivaFormTitle").textContent = "Editar Miembro";
  qs("#mdf-id").value = m.id; qs("#mdf-evento_id").value = m.evento_id; qs("#mdf-comision_id").value = m.comision_id;
  qs("#mdf-role").value = m.role; qs("#mdf-nombre").value = m.nombre; qs("#mdf-escuela").value = m.escuela;
  toggleForm("mesaDirectivaForm", true);
}
async function deleteMesaDirectiva(id) {
  if (!confirm("¿Eliminar este miembro de mesa directiva?")) return;
  await adminDelete("mesas_directivas", id); await reloadData(); renderMesasDirectivasTable();
}

function toggleForm(formId, show) { qs(`#${formId}`).style.display = show ? "block" : "none"; }
function clearForm(ids) { ids.forEach(id => { const el = qs(`#${id}`); if (el) el.value = ""; }); }

window.addEventListener("scroll", () => { scrollTopBtn.classList.toggle("show", window.scrollY > 300); });
scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

document.addEventListener("DOMContentLoaded", () => { if (window.lucide) lucide.createIcons(); });
loadAllData();