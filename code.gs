// ================================================================
//  CELIDER-08 Calendar — Google Apps Script Backend  v2.1
//  Spreadsheet: https://docs.google.com/spreadsheets/d/...
//
//  SETUP (run once):
//    1. Extensions → Apps Script → paste this as Code.gs
//    2. Run  initSheets()  once to create all required sheets
//    3. Set admin password:
//         Project Settings → Script Properties
//         Key: ADMIN_PASS   Value: <your-password>
//    4. Deploy → New deployment → Web app
//         Execute as: Me   |   Who has access: Anyone
//    5. Copy deployment URL → app.js → APPS_SCRIPT_URL
//
//  SCHEMA  (v2.1):
//    calendar          — all events (type="modelo" triggers special logic)
//    modelos           — optional metadata for MUN events (image, edition…)
//    comisiones        — GLOBAL reusable commission catalogue (includes topico fijo)
//    modelo_comisiones — junction: which commissions belong to which event
//    mesas_directivas  — directiva members (per event × commission)
//
//  IDs: simple auto-increment integers (1, 2, 3…) — fully editable in Sheets
// ================================================================

const SS_ID = "1xhr7v-FDatIC6_rPimEDtKn01JWqHrfQ4cVmnsbH1qQ";

// ── Auth ────────────────────────────────────────────────────────
function getAdminPass() {
  return PropertiesService.getScriptProperties().getProperty("ADMIN_PASS") || "celider08admin";
}

// ── Response helper ─────────────────────────────────────────────
function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET router ──────────────────────────────────────────────────
function doGet(e) {
  const p      = e.parameter;
  const action = p.action || "getAll";

  try {
    // ── Public reads ────────────────────────────────────────────
    if (action === "getAll")           return json(getAllData());
    if (action === "getModeloDetails") return json(getModeloDetails(p.evento_id));

    // ── Admin writes (GET to avoid CORS preflight) ──────────────
    if (p.password !== getAdminPass())
      return json({ ok: false, error: "Unauthorized" });

    const data = p.data ? JSON.parse(p.data) : {};

    switch (action) {
      case "addRow":    return json(addRow(p.sheet, data));
      case "updateRow": return json(updateRow(p.sheet, data));
      case "deleteRow": return json(deleteRow(p.sheet, p.id));
      default:          return json({ error: "Unknown action" });
    }
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

// ── Spreadsheet helpers ─────────────────────────────────────────
function ss() { return SpreadsheetApp.openById(SS_ID); }

function sheetToObjects(name) {
  const sheet = ss().getSheetByName(name);
  if (!sheet) return [];
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return [];
  const headers = vals[0];
  return vals.slice(1)
    .filter(r => r[0] !== "" && r[0] !== undefined && r[0] !== null)
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        const v = r[i];
        obj[h] = (v instanceof Date)
          ? Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd")
          : (v !== undefined && v !== null ? String(v) : "");
      });
      return obj;
    });
}

// ── getAllData — public endpoint ─────────────────────────────────
function getAllData() {
  return {
    calendar:         sheetToObjects("calendar"),
    modelos:          sheetToObjects("modelos"),
    comisiones:       sheetToObjects("comisiones"),
    modeloComisiones: sheetToObjects("modelo_comisiones"),
    mesasDirectivas:  sheetToObjects("mesas_directivas")
  };
}

// ── getModeloDetails — structured JSON for a specific event ─────
function getModeloDetails(eventoId) {
  if (!eventoId) return { ok: false, error: "evento_id es requerido" };

  const allAsignaciones = sheetToObjects("modelo_comisiones");
  const allComisiones   = sheetToObjects("comisiones");
  const allMesas        = sheetToObjects("mesas_directivas");

  const asignaciones = allAsignaciones.filter(a => a.evento_id === eventoId);
  const mesasEvento  = allMesas.filter(m => m.evento_id === eventoId);

  const comisiones = asignaciones.map(a => {
    const com   = allComisiones.find(c => c.id === a.comision_id) || {};
    const mesas = mesasEvento.filter(m => m.comision_id === a.comision_id);

    return {
      asignacion_id:        a.id,
      comision_id:          a.comision_id,
      nombre:               com.nombre  || "(Sin nombre)",
      topico:               com.topico  || "",           // tópico fijo de la comisión
      descripcion_global:   com.descripcion || "",
      descripcion_asignacion: a.descripcion || "",
      mesas: mesas.map(m => ({
        id:      m.id,
        nombre:  m.nombre,
        role:    m.role,
        escuela: m.escuela || ""
      }))
    };
  });

  return {
    ok:               true,
    evento_id:        eventoId,
    total_comisiones: comisiones.length,
    total_miembros:   comisiones.reduce((acc, c) => acc + c.mesas.length, 0),
    comisiones
  };
}

// ── genId — simple auto-increment per sheet ──────────────────────
//  Finds the current max numeric id in the sheet and returns max+1.
//  IDs remain small, readable and editable directly from Sheets.
function genId(sheet) {
  if (!sheet) return "1";
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return "1";

  const vals    = sheet.getDataRange().getValues();
  const headers = vals[0];
  const idIdx   = headers.indexOf("id");
  if (idIdx === -1) return "1";

  let max = 0;
  for (let i = 1; i < vals.length; i++) {
    const v = parseInt(vals[i][idIdx], 10);
    if (!isNaN(v) && v > max) max = v;
  }
  return String(max + 1);
}

// ── CRUD — universal for any sheet ──────────────────────────────
function addRow(sheetName, data) {
  const sheet = ss().getSheetByName(sheetName);
  if (!sheet) return { ok: false, error: "Hoja no encontrada: " + sheetName };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (!data.id) data.id = genId(sheet);
  sheet.appendRow(headers.map(h => data[h] !== undefined ? data[h] : ""));
  return { ok: true, id: data.id };
}

function updateRow(sheetName, data) {
  const sheet = ss().getSheetByName(sheetName);
  if (!sheet) return { ok: false, error: "Hoja no encontrada" };
  const vals    = sheet.getDataRange().getValues();
  const headers = vals[0];
  const idIdx   = headers.indexOf("id");
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idIdx]) === String(data.id)) {
      headers.forEach((h, j) => {
        if (data[h] !== undefined) sheet.getRange(i + 1, j + 1).setValue(data[h]);
      });
      return { ok: true };
    }
  }
  return { ok: false, error: "Fila no encontrada" };
}

function deleteRow(sheetName, id) {
  const sheet = ss().getSheetByName(sheetName);
  if (!sheet) return { ok: false, error: "Hoja no encontrada" };
  const vals  = sheet.getDataRange().getValues();
  const idIdx = vals[0].indexOf("id");
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: "Fila no encontrada" };
}

// ── initSheets — RUN ONCE to create all sheets & headers ─────────
function initSheets() {
  const spreadsheet = ss();
  const navy  = "#0a1d38";
  const white = "#ffffff";

  const schemas = {
    "calendar": [
      "id","date","date_end","title","description",
      "image","pictures","type","modelo_ref"
    ],
    "modelos": [
      "id","name","edition","date","date_end","description","image"
    ],
    // tópico fijo vive aquí, en la comisión global
    "comisiones": [
      "id","nombre","topico","descripcion"
    ],
    // sin tópico — se hereda de la comisión global
    "modelo_comisiones": [
      "id","evento_id","comision_id","descripcion"
    ],
    "mesas_directivas": [
      "id","evento_id","comision_id","nombre","role","escuela"
    ]
  };

  Object.entries(schemas).forEach(([name, headers]) => {
    let sheet = spreadsheet.getSheetByName(name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      const range = sheet.getRange(1, 1, 1, headers.length);
      range.setValues([headers])
           .setBackground(navy)
           .setFontColor(white)
           .setFontWeight("bold");
      sheet.setFrozenRows(1);
    } else {
      // Add missing columns to existing sheet without disturbing data
      const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      headers.forEach(h => {
        if (!existing.includes(h)) {
          const col  = sheet.getLastColumn() + 1;
          const cell = sheet.getRange(1, col);
          cell.setValue(h).setBackground(navy).setFontColor(white).setFontWeight("bold");
        }
      });
      // Fill missing IDs for existing rows (convert UUIDs → keep as-is, only fill blanks)
      const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const idCol = updatedHeaders.indexOf("id") + 1;
      if (idCol > 0) {
        const lastRow = sheet.getLastRow();
        for (let r = 2; r <= lastRow; r++) {
          const cell = sheet.getRange(r, idCol);
          if (!cell.getValue()) {
            // Assign a temporary high number to avoid collisions
            cell.setValue(String(1000 + r));
          }
        }
      }
    }
  });

  // ── Seed sample global commissions ──────────────────────────────
  const comSheet = spreadsheet.getSheetByName("comisiones");
  if (comSheet && comSheet.getLastRow() <= 1) {
    const seeds = [
      ["1", "Medio Ambiente",           "Cambio climático y desarrollo sostenible",       "Debate sobre políticas ambientales, biodiversidad y acción climática."],
      ["2", "Derechos Humanos",          "Igualdad, justicia social y derechos universales","Discusión sobre acceso a derechos fundamentales y justicia social."],
      ["3", "Seguridad Internacional",   "Diplomacia, paz y resolución de conflictos",     "Análisis de conflictos globales y mecanismos de resolución pacífica."],
      ["4", "Desarrollo Económico",      "Crecimiento inclusivo y sostenible",             "Estrategias para el desarrollo económico con equidad social."],
      ["5", "Educación y Cultura",       "Acceso universal al conocimiento",               "Políticas educativas, diversidad cultural e innovación pedagógica."],
      ["6", "Salud Pública",             "Bienestar comunitario y sistemas de salud",      "Análisis de sistemas de salud, prevención y acceso a servicios médicos."]
    ];
    seeds.forEach(row => comSheet.appendRow(row));
    Logger.log("✅ Comisiones de ejemplo añadidas.");
  }

  // ── Seed sample modelo event if calendar is empty ────────────────
  const calSheet = spreadsheet.getSheetByName("calendar");
  if (calSheet && calSheet.getLastRow() <= 1) {
    calSheet.appendRow([
      "1", "2026-05-15", "2026-05-16",
      "I Modelo Distrital CELIDER-08",
      "Primer modelo distrital del ciclo 2026–2027.",
      "", "", "modelo", ""
    ]);

    const coms    = sheetToObjects("comisiones");
    const mcSheet = spreadsheet.getSheetByName("modelo_comisiones");
    const mdSheet = spreadsheet.getSheetByName("mesas_directivas");

    if (coms.length >= 2) {
      // Asignaciones (sin tópico — se hereda de la comisión global)
      mcSheet.appendRow(["1", "1", coms[0].id, "Contexto sobre políticas ambientales distritales."]);
      mcSheet.appendRow(["2", "1", coms[1].id, "Enfoque en igualdad educativa regional."]);

      // Mesa directiva — comisión 1
      mdSheet.appendRow(["1", "1", coms[0].id, "María López",   "Presidente",     "Liceo Juan Pablo Duarte"]);
      mdSheet.appendRow(["2", "1", coms[0].id, "Carlos Reyes",  "Vicepresidente", "Colegio Santa Rosa"]);
      mdSheet.appendRow(["3", "1", coms[0].id, "Ana Pérez",     "Secretario",     "Escuela Básica Primero de Mayo"]);
      mdSheet.appendRow(["4", "1", coms[0].id, "Pedro Gómez",   "Moderador",      "Liceo Secundario Los Pinos"]);

      // Mesa directiva — comisión 2
      mdSheet.appendRow(["5", "1", coms[1].id, "Luis Méndez",   "Presidente",     "Liceo Pedro Henríquez Ureña"]);
      mdSheet.appendRow(["6", "1", coms[1].id, "Sofía Vargas",  "Vicepresidente", "Centro Educativo La Paz"]);
      mdSheet.appendRow(["7", "1", coms[1].id, "Tomás Reyna",   "Secretario",     "Colegio San José"]);
    }
  }

  Logger.log("✅ Sheets initialized (v2.1 — IDs simples).");
  Logger.log("   Sheets: " + Object.keys(schemas).join(", "));
}