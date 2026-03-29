// ================================================================
//  CELIDER-08 Calendar — Frontend App  v2.0
//  Requires Code.gs v2.0 deployed as Apps Script Web App
// ================================================================

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyYiu2FLLu5I9JBeoBi4zycjtJ75bkQi4AlQ5mimzT-6wWnJVjonZdB2_H6pYkrQqIQfQ/exec";
const YEAR       = 2026;
const MONTHS     = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_SHORT = ["D","L","M","M","J","V","S"];
const qs         = s => document.querySelector(s);

const TODAY      = new Date();
const THIS_YEAR  = TODAY.getFullYear();
const THIS_MONTH = TODAY.getMonth();
const THIS_DAY   = TODAY.getDate();

// ── Global data ──────────────────────────────────────────────────
let EVENTS           = [];
let MODELOS          = [];
let COMISIONES       = [];   // global commission catalogue
let MODELO_COMISIONES = [];  // junction: evento_id ↔ comision_id
let MESAS_DIRECTIVAS = [];   // directiva members per event × commission

// ── DOM refs ─────────────────────────────────────────────────────
const calendarArea = qs("#calendarArea");
const upcomingEl   = qs("#upcoming");
const refreshBtn   = qs("#refreshBtn");
const scrollTopBtn = qs("#scrollTopBtn");

// Regular modal
const modal        = qs("#modal");
const modalTitle   = qs("#modalTitle");
const modalDate    = qs("#modalDate");
const modalDesc    = qs("#modalDesc");
const modalImg     = qs("#modalImg");
const modalPicsBtn = qs("#modalPicsBtn");
const modalClose   = qs("#modalClose");

// Modelo modal
const modeloModal      = qs("#modeloModal");
const modeloModalClose = qs("#modeloModalClose");

// ── Mobile menu ───────────────────────────────────────────────────
const hamburgerBtn = qs("#hamburgerBtn");
const menuOverlay  = qs("#menuOverlay");
const mobileMenu   = qs("#mobileMenu");
const menuClose    = qs("#menuClose");

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

// ── Helpers ───────────────────────────────────────────────────────
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

function processEvents(rawData) {
  return rawData.map(r => {
    const dateStart = parseDate(r.date);
    if (!dateStart) return null;
    const dateEnd = parseDate(r.date_end) || new Date(dateStart);
    const days    = Math.round((dateEnd - dateStart) / 86400000) + 1;
    return {
      id:          r.id || "",
      date:        r.date || "",
      date_end:    r.date_end || "",
      title:       r.title || "",
      description: r.description || "",
      image:       r.image || "",
      pictures:    r.pictures || "",
      type:        (r.type || "evento").toLowerCase().trim(),
      modelo_ref:  r.modelo_ref || "",
      _dateStart:  dateStart,
      _dateEnd:    dateEnd,
      _days:       days
    };
  }).filter(Boolean).filter(e => e.title);
}

// ── API ───────────────────────────────────────────────────────────
async function apiGet(params) {
  const url = `${APPS_SCRIPT_URL}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  return res.json();
}

async function loadAllData() {
  calendarArea.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando eventos…</p>
    </div>`;
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
    calendarArea.innerHTML = `
      <div class="error-state">
        ⚠️ Error al cargar datos. Verifica la URL del Apps Script.
        <small>${err.message}</small>
      </div>`;
  }
}

// ── Day map ───────────────────────────────────────────────────────
function buildDayMap() {
  const map = {};
  EVENTS.forEach(ev => {
    if (ev._days === 1) { map[toKey(ev._dateStart)] = { ev, position: "single" }; return; }
    const cur = new Date(ev._dateStart);
    while (cur <= ev._dateEnd) {
      const key = toKey(cur);
      let pos;
      if (cur.getTime() === ev._dateStart.getTime())      pos = "start";
      else if (cur.getTime() === ev._dateEnd.getTime())   pos = "end";
      else                                                 pos = "middle";
      map[key] = { ev, position: pos };
      cur.setDate(cur.getDate() + 1);
    }
  });
  return map;
}

// ── Render calendar ───────────────────────────────────────────────
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
      const key   = `${YEAR}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const entry = dayMap[key];
      const cell  = document.createElement("button");
      cell.className = "day-cell";
      if (isCurrent && d === THIS_DAY) cell.classList.add("is-today");

      if (entry) {
        const { ev, position } = entry;
        cell.classList.add("has-event", `tag-${ev.type}`, `range-${position}`);
        cell.innerHTML = `<span>${d}</span>`;
        if (position === "start" && ev._days > 1)
          cell.innerHTML += `<span class="range-badge">${ev._days}d</span>`;
        cell.onclick = () => openEventModal(ev);
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

// ── Render upcoming ────────────────────────────────────────────────
function renderUpcoming() {
  upcomingEl.innerHTML = "";
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = EVENTS.filter(ev => ev._dateEnd >= today)
    .sort((a, b) => a._dateStart - b._dateStart).slice(0, 6);

  if (upcoming.length === 0) {
    upcomingEl.innerHTML = `<p style="opacity:.45;font-size:.88rem;font-family:var(--font-body)">No hay próximos eventos.</p>`;
    return;
  }

  upcoming.forEach(ev => {
    const card = document.createElement("div");
    card.className = `upcoming-card tag-${ev.type}`;
    const durHtml = ev._days > 1 ? `<span class="duration-pill">${ev._days} días</span>` : "";
    // Add MUN icon for modelo events
    const typeIcon = ev.type === "modelo" ? `<span class="upcoming-mun-badge">MUN</span>` : "";
    card.innerHTML = `
      <strong class="event-name">${ev.title}</strong>
      <div class="upcoming-meta">
        <span class="event-date">${dateRangeLabel(ev)}</span>${durHtml}${typeIcon}
      </div>`;
    card.onclick = () => openEventModal(ev);
    upcomingEl.appendChild(card);
  });
}

// ── Event modal router ────────────────────────────────────────────
function openEventModal(ev) {
  if (ev.type === "modelo") {
    openModeloModal(ev);
    return;
  }
  modalTitle.textContent = ev.title;
  modalDate.textContent  = ev._days > 1
    ? `${ev.date}  →  ${ev.date_end}  (${ev._days} días)`
    : ev.date;
  modalDesc.textContent  = ev.description;
  modalImg.style.display = ev.image ? "block" : "none";
  modalImg.src           = ev.image || "";
  modalPicsBtn.href      = ev.pictures || "#";
  modalPicsBtn.style.display = ev.pictures ? "flex" : "none";
  modal.classList.add("open");
}

// ── Modelo Distrital Modal ─────────────────────────────────────────
function openModeloModal(ev) {
  // Resolve extra metadata from modelos table if linked
  const meta = MODELOS.find(m => m.id === ev.modelo_ref) || {};
  const image = ev.image || meta.image || "";
  const edition = meta.edition || "";

  // Fetch commission assignments for this event
  const asignaciones = MODELO_COMISIONES.filter(mc => mc.evento_id === ev.id);
  const totalMiembros = MESAS_DIRECTIVAS.filter(m => m.evento_id === ev.id).length;

  const card = qs("#modeloModal .modal-card");
  card.innerHTML = buildModeloModalContent(ev, { image, edition }, asignaciones, totalMiembros);

  // Wire close button
  card.querySelector(".modal-close").onclick = () => modeloModal.classList.remove("open");

  // Wire accordion
  card.querySelectorAll(".com-panel-header").forEach(h => {
    h.addEventListener("click", () => {
      const panel = h.closest(".com-panel");
      const isOpen = panel.classList.contains("open");
      // Close all others
      card.querySelectorAll(".com-panel").forEach(p => p.classList.remove("open"));
      if (!isOpen) panel.classList.add("open");
    });
  });

  // Auto-open first commission if there are any
  const first = card.querySelector(".com-panel");
  if (first) first.classList.add("open");

  modeloModal.classList.add("open");
}

function buildModeloModalContent(ev, meta, asignaciones, totalMiembros) {
  const dateStr = ev.date_end && ev.date_end !== ev.date
    ? `${formatDateDisplay(ev.date)} – ${formatDateDisplay(ev.date_end)} · ${ev._days} días`
    : formatDateDisplay(ev.date);

  const statsHtml = `
    <div class="modelo-stats">
      <div class="modelo-stat">
        <span class="ms-value">${asignaciones.length}</span>
        <span class="ms-label">Comisiones</span>
      </div>
      <div class="modelo-stat-divider"></div>
      <div class="modelo-stat">
        <span class="ms-value">${totalMiembros}</span>
        <span class="ms-label">Miembros</span>
      </div>
      ${ev._days > 1 ? `
      <div class="modelo-stat-divider"></div>
      <div class="modelo-stat">
        <span class="ms-value">${ev._days}</span>
        <span class="ms-label">Días</span>
      </div>` : ""}
    </div>`;

  const imageHtml = meta.image
    ? `<img src="${meta.image}" class="modelo-banner-img" alt="${ev.title}" loading="lazy">`
    : "";

  const comisionesHtml = buildComisionesHtml(ev, asignaciones);

  return `
    <button class="modal-close">✕</button>

    <div class="modelo-hero">
      ${imageHtml}
      <div class="modelo-hero-body">
        <div class="modelo-hero-top">
          <span class="modelo-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 22V12a9 9 0 0118 0v10"/><path d="M9 22V12h6v10"/>
            </svg>
            Modelo Distrital · MUN
          </span>
          ${meta.edition ? `<span class="modelo-edition-pill">${meta.edition}</span>` : ""}
        </div>
        <h3 class="modelo-title">${ev.title}</h3>
        <p class="modelo-date-line">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          ${dateStr}
        </p>
      </div>
    </div>

    ${ev.description ? `<p class="modelo-description">${ev.description}</p>` : ""}

    ${statsHtml}

    <div class="comisiones-section">
      <div class="comisiones-section-header">
        <div class="csh-left">
          <span class="csh-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </span>
          Comisiones y Mesas Directivas
        </div>
      </div>
      <div class="comisiones-list">${comisionesHtml}</div>
    </div>`;
}

function buildComisionesHtml(ev, asignaciones) {
  if (asignaciones.length === 0) {
    return `<div class="empty-comisiones">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".35">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
      </svg>
      <p>No hay comisiones asignadas a este modelo todavía.</p>
    </div>`;
  }

  return asignaciones.map((a, idx) => {
    const com   = COMISIONES.find(c => c.id === a.comision_id) || {};
    const mesas = MESAS_DIRECTIVAS.filter(m => m.evento_id === ev.id && m.comision_id === a.comision_id);

    const membersHtml = buildMesaDirectivaHtml(mesas);

    return `
      <div class="com-panel" data-index="${idx}">
        <div class="com-panel-header">
          <div class="com-number">${String(idx + 1).padStart(2, "0")}</div>
          <div class="com-header-body">
            <span class="com-name">${com.nombre || "(Comisión sin nombre)"}</span>
            ${a.topico ? `<span class="com-topic">${a.topico}</span>` : ""}
          </div>
          <div class="com-header-right">
            <span class="com-member-count">${mesas.length} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></span>
            <span class="com-chevron">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </span>
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
  if (mesas.length === 0) {
    return `<p class="mesa-empty">Sin miembros registrados para esta comisión.</p>`;
  }

  const roleOrder = ["Presidente","Vicepresidente","Moderador","Secretario","Relator","Asesor","Delegado","Otro"];
  const sorted = [...mesas].sort((a, b) => {
    const ai = roleOrder.indexOf(a.role);
    const bi = roleOrder.indexOf(b.role);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return `
    <div class="mesa-grid">
      ${sorted.map(m => `
        <div class="mesa-card">
          <div class="mesa-role-badge role-${slugRole(m.role)}">${m.role}</div>
          <div class="mesa-name">${m.nombre}</div>
          ${m.escuela ? `<div class="mesa-school">${m.escuela}</div>` : ""}
        </div>`).join("")}
    </div>`;
}

function slugRole(role) {
  const map = {
    "Presidente":"presidente", "Vicepresidente":"vicepresidente",
    "Moderador":"moderador",   "Secretario":"secretario",
    "Relator":"relator",       "Asesor":"asesor",
    "Delegado":"delegado"
  };
  return map[role] || "otro";
}

function formatDateDisplay(str) {
  if (!str) return "";
  const d = parseDate(str);
  if (!d) return str;
  return d.toLocaleDateString("es-ES", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
}

// Modal close handlers
modalClose.onclick        = () => modal.classList.remove("open");
modal.onclick             = e => e.target === modal && modal.classList.remove("open");
modeloModal.onclick       = e => e.target === modeloModal && modeloModal.classList.remove("open");
refreshBtn.onclick        = () => location.reload();


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

// Tab switching
qs(".admin-tabs").addEventListener("click", e => {
  const tab = e.target.closest(".admin-tab");
  if (!tab) return;
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".admin-tab-pane").forEach(p => p.classList.remove("active"));
  tab.classList.add("active");
  qs(`#tab-${tab.dataset.tab}`).classList.add("active");
});

// Login
async function adminLogin() {
  const pass = adminPassInput.value.trim();
  if (!pass) { adminAuthError.textContent = "Ingresa la contraseña."; return; }
  adminLoginBtn.textContent = "Verificando…";
  adminLoginBtn.disabled = true;
  try {
    const res = await apiGet({ action: "getAll", password: pass });
    if (res.error === "Unauthorized") {
      adminAuthError.textContent = "Contraseña incorrecta.";
    } else {
      adminPassword      = pass;
      adminAuthenticated = true;
      adminAuth.style.display    = "none";
      adminContent.style.display = "flex";
      adminContent.style.flexDirection = "column";
      adminContent.style.flex   = "1";
      adminContent.style.overflow = "hidden";
      refreshAdminData();
    }
  } catch (e) {
    adminAuthError.textContent = "Error de conexión. ¿Está configurada la URL del Apps Script?";
  } finally {
    adminLoginBtn.textContent = "Entrar";
    adminLoginBtn.disabled    = false;
  }
}

adminLoginBtn.onclick = adminLogin;
adminPassInput.addEventListener("keydown", e => e.key === "Enter" && adminLogin());

// ── Admin CRUD helpers ────────────────────────────────────────────
async function adminSave(sheet, data) {
  const isNew = !data.id;
  return apiGet({
    action:   isNew ? "addRow" : "updateRow",
    sheet,
    data:     JSON.stringify(data),
    password: adminPassword
  });
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
  renderCalendarTable();
  renderModelosTable();
  renderComisionesGlobalesTable();
  renderAsignacionesTable();
  renderMesasDirectivasTable();
  populateAdminSelects();
}

// ── Populate all selects ──────────────────────────────────────────
function populateAdminSelects() {
  // Modelo events selector (calendar events with type=modelo)
  const modeloEvents = EVENTS.filter(e => e.type === "modelo");

  ["cf-modelo_ref", "asf-evento_id", "mdf-evento_id"].forEach(id => {
    const sel = qs(`#${id}`);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">— Seleccionar evento modelo —</option>`;
    modeloEvents.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev.id;
      opt.textContent = `${ev.title} (${ev.date})`;
      sel.appendChild(opt);
    });
    if (cur) sel.value = cur;
  });

  // Global commissions selector
  ["comf-id-ref", "asf-comision_id", "mdf-comision_id"].forEach(id => {
    const sel = qs(`#${id}`);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">— Seleccionar comisión —</option>`;
    COMISIONES.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre;
      sel.appendChild(opt);
    });
    if (cur) sel.value = cur;
  });
}

// ── Calendar Admin Tab ────────────────────────────────────────────
function renderCalendarTable() {
  const tbody = qs("#calendarTbody");
  tbody.innerHTML = "";
  if (EVENTS.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No hay eventos registrados.</td></tr>`;
    return;
  }
  EVENTS.sort((a,b) => a._dateStart - b._dateStart).forEach(ev => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ev.date}${ev.date_end ? ` → ${ev.date_end}` : ""}</td>
      <td>${ev.title}</td>
      <td><span class="type-chip tag-${ev.type}">${ev.type}</span></td>
      <td class="action-btns">
        <button class="btn btn-sm" onclick="editCalendarEvent('${ev.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCalendarEvent('${ev.id}')">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

qs("#addCalendarBtn").onclick = () => {
  qs("#calendarFormTitle").textContent = "Nuevo Evento";
  clearForm(["cf-id","cf-date","cf-date_end","cf-title","cf-description","cf-image","cf-pictures","cf-modelo_ref"]);
  qs("#cf-type").value = "actividad";
  qs("#cf-modelo-ref-field").style.display = "none";
  toggleForm("calendarForm", true);
};

qs("#cf-type").onchange = () => {
  qs("#cf-modelo-ref-field").style.display = qs("#cf-type").value === "modelo" ? "block" : "none";
};

qs("#cancelCalendarBtn").onclick = () => toggleForm("calendarForm", false);

qs("#saveCalendarBtn").onclick = async () => {
  const data = {
    id:          qs("#cf-id").value,
    date:        qs("#cf-date").value,
    date_end:    qs("#cf-date_end").value,
    title:       qs("#cf-title").value.trim(),
    description: qs("#cf-description").value.trim(),
    image:       qs("#cf-image").value.trim(),
    pictures:    qs("#cf-pictures").value.trim(),
    type:        qs("#cf-type").value,
    modelo_ref:  qs("#cf-modelo_ref").value
  };
  if (!data.date || !data.title) { alert("Fecha y título son requeridos."); return; }
  qs("#saveCalendarBtn").textContent = "Guardando…";
  const res = await adminSave("calendar", data);
  if (res.ok !== false) {
    await reloadData(); renderCalendar(); renderUpcoming();
    refreshAdminData(); toggleForm("calendarForm", false);
  } else { alert("Error: " + res.error); }
  qs("#saveCalendarBtn").textContent = "Guardar";
};

function editCalendarEvent(id) {
  const ev = EVENTS.find(e => e.id === id);
  if (!ev) return;
  qs("#calendarFormTitle").textContent = "Editar Evento";
  qs("#cf-id").value          = ev.id;
  qs("#cf-date").value        = ev.date;
  qs("#cf-date_end").value    = ev.date_end;
  qs("#cf-title").value       = ev.title;
  qs("#cf-description").value = ev.description;
  qs("#cf-image").value       = ev.image;
  qs("#cf-pictures").value    = ev.pictures;
  qs("#cf-type").value        = ev.type;
  qs("#cf-modelo_ref").value  = ev.modelo_ref;
  qs("#cf-modelo-ref-field").style.display = ev.type === "modelo" ? "block" : "none";
  toggleForm("calendarForm", true);
}

async function deleteCalendarEvent(id) {
  if (!confirm("¿Eliminar este evento del calendario?")) return;
  const res = await adminDelete("calendar", id);
  if (res.ok !== false) { await reloadData(); renderCalendar(); renderUpcoming(); refreshAdminData(); }
  else alert("Error: " + res.error);
}

// ── Modelos Admin Tab ─────────────────────────────────────────────
function renderModelosTable() {
  const tbody = qs("#modelosTbody");
  tbody.innerHTML = "";
  if (MODELOS.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No hay modelos registrados.</td></tr>`;
    return;
  }
  MODELOS.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${m.edition || "—"}</td>
      <td>${m.date}${m.date_end ? ` → ${m.date_end}` : ""}</td>
      <td class="action-btns">
        <button class="btn btn-sm" onclick="editModelo('${m.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteModelo('${m.id}')">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

qs("#addModeloBtn").onclick = () => {
  qs("#modeloFormTitle").textContent = "Nuevo Modelo";
  clearForm(["mf-id","mf-name","mf-edition","mf-date","mf-date_end","mf-description","mf-image"]);
  toggleForm("modeloForm", true);
};

qs("#cancelModeloBtn").onclick = () => toggleForm("modeloForm", false);

qs("#saveModeloBtn").onclick = async () => {
  const data = {
    id: qs("#mf-id").value, name: qs("#mf-name").value.trim(),
    edition: qs("#mf-edition").value.trim(), date: qs("#mf-date").value,
    date_end: qs("#mf-date_end").value, description: qs("#mf-description").value.trim(),
    image: qs("#mf-image").value.trim()
  };
  if (!data.name || !data.date) { alert("Nombre y fecha son requeridos."); return; }
  qs("#saveModeloBtn").textContent = "Guardando…";
  const res = await adminSave("modelos", data);
  if (res.ok !== false) {
    await reloadData(); renderModelosTable(); populateAdminSelects(); toggleForm("modeloForm", false);
  } else { alert("Error: " + res.error); }
  qs("#saveModeloBtn").textContent = "Guardar";
};

function editModelo(id) {
  const m = MODELOS.find(x => x.id === id);
  if (!m) return;
  qs("#modeloFormTitle").textContent = "Editar Modelo";
  ["id","name","edition","date","date_end","description","image"].forEach(f => {
    qs(`#mf-${f}`).value = m[f] || "";
  });
  toggleForm("modeloForm", true);
}

async function deleteModelo(id) {
  if (!confirm("¿Eliminar este modelo?")) return;
  await adminDelete("modelos", id);
  await reloadData(); renderModelosTable(); populateAdminSelects();
}

// ── Comisiones Globales Admin Tab ─────────────────────────────────
function renderComisionesGlobalesTable() {
  const tbody = qs("#comisionesTbody");
  tbody.innerHTML = "";
  if (COMISIONES.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="3">No hay comisiones en el catálogo.</td></tr>`;
    return;
  }
  COMISIONES.forEach(c => {
    // Count how many events use this commission
    const usos = MODELO_COMISIONES.filter(mc => mc.comision_id === c.id).length;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${c.nombre}</strong></td>
      <td style="font-size:.82rem;color:var(--text-muted);max-width:280px">${c.descripcion || "—"}</td>
      <td style="text-align:center"><span class="usos-badge">${usos} uso${usos !== 1 ? "s" : ""}</span></td>
      <td class="action-btns">
        <button class="btn btn-sm" onclick="editComisionGlobal('${c.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteComisionGlobal('${c.id}')">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

qs("#addComisionGlobalBtn").onclick = () => {
  qs("#comisionGlobalFormTitle").textContent = "Nueva Comisión";
  clearForm(["cgf-id","cgf-nombre","cgf-descripcion"]);
  toggleForm("comisionGlobalForm", true);
};

qs("#cancelComisionGlobalBtn").onclick = () => toggleForm("comisionGlobalForm", false);

qs("#saveComisionGlobalBtn").onclick = async () => {
  const data = {
    id:          qs("#cgf-id").value,
    nombre:      qs("#cgf-nombre").value.trim(),
    descripcion: qs("#cgf-descripcion").value.trim()
  };
  if (!data.nombre) { alert("El nombre de la comisión es requerido."); return; }
  qs("#saveComisionGlobalBtn").textContent = "Guardando…";
  const res = await adminSave("comisiones", data);
  if (res.ok !== false) {
    await reloadData(); renderComisionesGlobalesTable(); populateAdminSelects();
    toggleForm("comisionGlobalForm", false);
  } else { alert("Error: " + res.error); }
  qs("#saveComisionGlobalBtn").textContent = "Guardar";
};

function editComisionGlobal(id) {
  const c = COMISIONES.find(x => x.id === id);
  if (!c) return;
  qs("#comisionGlobalFormTitle").textContent = "Editar Comisión";
  qs("#cgf-id").value          = c.id;
  qs("#cgf-nombre").value      = c.nombre;
  qs("#cgf-descripcion").value = c.descripcion;
  toggleForm("comisionGlobalForm", true);
}

async function deleteComisionGlobal(id) {
  const usos = MODELO_COMISIONES.filter(mc => mc.comision_id === id).length;
  const msg = usos > 0
    ? `Esta comisión está asignada a ${usos} evento(s). ¿Eliminar igualmente?`
    : "¿Eliminar esta comisión del catálogo?";
  if (!confirm(msg)) return;
  await adminDelete("comisiones", id);
  await reloadData(); renderComisionesGlobalesTable(); renderAsignacionesTable(); populateAdminSelects();
}

// ── Asignaciones Admin Tab ────────────────────────────────────────
function renderAsignacionesTable() {
  const tbody = qs("#asignacionesTbody");
  tbody.innerHTML = "";
  if (MODELO_COMISIONES.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No hay asignaciones registradas.</td></tr>`;
    return;
  }
  MODELO_COMISIONES.forEach(a => {
    const ev  = EVENTS.find(e => e.id === a.evento_id);
    const com = COMISIONES.find(c => c.id === a.comision_id);
    const mesas = MESAS_DIRECTIVAS.filter(m => m.evento_id === a.evento_id && m.comision_id === a.comision_id).length;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-size:.82rem">${ev ? ev.title : a.evento_id}</td>
      <td>${com ? com.nombre : a.comision_id}</td>
      <td style="font-size:.82rem;color:var(--text-muted)">${a.topico || "—"}</td>
      <td style="text-align:center"><span class="usos-badge">${mesas}</span></td>
      <td class="action-btns">
        <button class="btn btn-sm" onclick="editAsignacion('${a.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAsignacion('${a.id}')">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

qs("#addAsignacionBtn").onclick = () => {
  qs("#asignacionFormTitle").textContent = "Nueva Asignación";
  clearForm(["asf-id","asf-evento_id","asf-comision_id","asf-topico","asf-descripcion"]);
  toggleForm("asignacionForm", true);
};

qs("#cancelAsignacionBtn").onclick = () => toggleForm("asignacionForm", false);

qs("#saveAsignacionBtn").onclick = async () => {
  const data = {
    id:          qs("#asf-id").value,
    evento_id:   qs("#asf-evento_id").value,
    comision_id: qs("#asf-comision_id").value,
    topico:      qs("#asf-topico").value.trim(),
    descripcion: qs("#asf-descripcion").value.trim()
  };
  if (!data.evento_id || !data.comision_id) { alert("Evento y comisión son requeridos."); return; }
  qs("#saveAsignacionBtn").textContent = "Guardando…";
  const res = await adminSave("modelo_comisiones", data);
  if (res.ok !== false) {
    await reloadData(); renderAsignacionesTable(); toggleForm("asignacionForm", false);
  } else { alert("Error: " + res.error); }
  qs("#saveAsignacionBtn").textContent = "Guardar";
};

function editAsignacion(id) {
  const a = MODELO_COMISIONES.find(x => x.id === id);
  if (!a) return;
  qs("#asignacionFormTitle").textContent = "Editar Asignación";
  qs("#asf-id").value          = a.id;
  qs("#asf-evento_id").value   = a.evento_id;
  qs("#asf-comision_id").value = a.comision_id;
  qs("#asf-topico").value      = a.topico;
  qs("#asf-descripcion").value = a.descripcion;
  toggleForm("asignacionForm", true);
}

async function deleteAsignacion(id) {
  if (!confirm("¿Eliminar esta asignación?")) return;
  await adminDelete("modelo_comisiones", id);
  await reloadData(); renderAsignacionesTable(); renderMesasDirectivasTable();
}

// ── Mesas Directivas Admin Tab ────────────────────────────────────
function renderMesasDirectivasTable() {
  const tbody = qs("#mesasDirectivasTbody");
  tbody.innerHTML = "";
  if (MESAS_DIRECTIVAS.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No hay miembros registrados.</td></tr>`;
    return;
  }
  MESAS_DIRECTIVAS.forEach(m => {
    const ev  = EVENTS.find(e => e.id === m.evento_id);
    const com = COMISIONES.find(c => c.id === m.comision_id);
    const tr  = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-size:.78rem;color:var(--text-muted)">${ev ? ev.title : m.evento_id}</td>
      <td style="font-size:.82rem">${com ? com.nombre : m.comision_id}</td>
      <td><span class="role-chip role-${slugRole(m.role)}">${m.role}</span></td>
      <td>${m.nombre}</td>
      <td style="font-size:.78rem;color:var(--text-muted)">${m.escuela || "—"}</td>
      <td class="action-btns">
        <button class="btn btn-sm" onclick="editMesaDirectiva('${m.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteMesaDirectiva('${m.id}')">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

qs("#addMesaDirectivaBtn").onclick = () => {
  qs("#mesaDirectivaFormTitle").textContent = "Nuevo Miembro";
  clearForm(["mdf-id","mdf-evento_id","mdf-comision_id","mdf-nombre","mdf-escuela"]);
  qs("#mdf-role").value = "Presidente";
  toggleForm("mesaDirectivaForm", true);
};

qs("#cancelMesaDirectivaBtn").onclick = () => toggleForm("mesaDirectivaForm", false);

qs("#saveMesaDirectivaBtn").onclick = async () => {
  const data = {
    id:          qs("#mdf-id").value,
    evento_id:   qs("#mdf-evento_id").value,
    comision_id: qs("#mdf-comision_id").value,
    role:        qs("#mdf-role").value,
    nombre:      qs("#mdf-nombre").value.trim(),
    escuela:     qs("#mdf-escuela").value.trim()
  };
  if (!data.evento_id || !data.comision_id || !data.nombre) {
    alert("Evento, comisión y nombre son requeridos."); return;
  }
  qs("#saveMesaDirectivaBtn").textContent = "Guardando…";
  const res = await adminSave("mesas_directivas", data);
  if (res.ok !== false) {
    await reloadData(); renderMesasDirectivasTable(); toggleForm("mesaDirectivaForm", false);
  } else { alert("Error: " + res.error); }
  qs("#saveMesaDirectivaBtn").textContent = "Guardar";
};

function editMesaDirectiva(id) {
  const m = MESAS_DIRECTIVAS.find(x => x.id === id);
  if (!m) return;
  qs("#mesaDirectivaFormTitle").textContent = "Editar Miembro";
  qs("#mdf-id").value          = m.id;
  qs("#mdf-evento_id").value   = m.evento_id;
  qs("#mdf-comision_id").value = m.comision_id;
  qs("#mdf-role").value        = m.role;
  qs("#mdf-nombre").value      = m.nombre;
  qs("#mdf-escuela").value     = m.escuela;
  toggleForm("mesaDirectivaForm", true);
}

async function deleteMesaDirectiva(id) {
  if (!confirm("¿Eliminar este miembro de mesa directiva?")) return;
  await adminDelete("mesas_directivas", id);
  await reloadData(); renderMesasDirectivasTable();
}

// ── UI Helpers ────────────────────────────────────────────────────
function toggleForm(formId, show) {
  qs(`#${formId}`).style.display = show ? "block" : "none";
}

function clearForm(ids) {
  ids.forEach(id => {
    const el = qs(`#${id}`);
    if (el) el.value = "";
  });
}

// ── Scroll to top ─────────────────────────────────────────────────
window.addEventListener("scroll", () => {
  scrollTopBtn.classList.toggle("show", window.scrollY > 300);
});
scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ── Init ──────────────────────────────────────────────────────────
loadAllData();