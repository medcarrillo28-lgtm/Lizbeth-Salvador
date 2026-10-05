const CONFIG = {
  SPREADSHEET_ID: "1uEQgFdA4Lfi30NH59LXH-DKpsgdIXCc2r0vfft4AtN8",
  SHEET_NAME: "Invitados",

  // Cambia esto después de publicar GitHub Pages.
  // Ejemplo: "https://tuusuario.github.io/invitacion-boda/"
  GITHUB_PAGES_URL: "https://TU-USUARIO.github.io/TU-REPOSITORIO/"
};

const COL = {
  ID: 1,
  FAMILY: 2,
  PLACES: 3,
  STATUS: 4,
  ATTENDEES: 5,
  CONFIRMED_AT: 6,
  MESSAGE: 7,
  LINK: 8
};

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || "info");
  if (action !== "info") {
    return jsonp_({ok:false, error:"Acción no válida"}, e);
  }

  const id = normalizeId_((e.parameter || {}).id);
  if (!id) return jsonp_({ok:false, error:"Falta ID"}, e);

  const result = getInvitation_(id);
  return jsonp_(result, e);
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const id = normalizeId_(p.id);
    const attending = String(p.asiste || "").toUpperCase();
    const message = String(p.mensaje || "").trim().slice(0, 500);

    if (!id) return htmlResponse_("Falta el ID de invitación.");
    if (!["SI", "NO"].includes(attending)) return htmlResponse_("Respuesta inválida.");

    const sheet = getSheet_();
    const row = findRowById_(sheet, id);
    if (!row) return htmlResponse_("Invitación no encontrada.");

    const places = Number(sheet.getRange(row, COL.PLACES).getValue()) || 0;
    let attendees = 0;
    let status = "NO ASISTE";

    if (attending === "SI") {
      attendees = Number(p.asistentes);
      if (!Number.isInteger(attendees) || attendees < 1 || attendees > places) {
        return htmlResponse_("Número de asistentes inválido.");
      }
      status = "CONFIRMADO";
    }

    sheet.getRange(row, COL.STATUS, 1, 4).setValues([[
      status,
      attendees,
      new Date(),
      message
    ]]);

    return htmlResponse_("¡Gracias! Tu confirmación fue registrada.");
  } catch (err) {
    console.error(err);
    return htmlResponse_("Ocurrió un error al guardar la confirmación.");
  }
}

// Ejecuta esta función cuando agregues nuevas familias.
// Solo necesitas llenar INVITACIÓN / FAMILIA y LUGARES.
function generateInvitationLinks() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  let changed = false;

  values.forEach((row, i) => {
    const family = String(row[COL.FAMILY - 1] || "").trim();
    const places = Number(row[COL.PLACES - 1]) || 0;
    if (!family || places < 1) return;

    if (!row[COL.ID - 1]) {
      row[COL.ID - 1] = createOpaqueId_();
      changed = true;
    }
    if (!row[COL.STATUS - 1]) {
      row[COL.STATUS - 1] = "PENDIENTE";
      changed = true;
    }

    const expectedLink = buildInviteUrl_(row[COL.ID - 1]);
    if (row[COL.LINK - 1] !== expectedLink) {
      row[COL.LINK - 1] = expectedLink;
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(2, 1, values.length, 8).setValues(values);
  }
}

function regenerateMissingLinksOnly() {
  generateInvitationLinks();
}

function getInvitation_(id) {
  const sheet = getSheet_();
  const row = findRowById_(sheet, id);
  if (!row) return {ok:false, error:"Invitación no encontrada"};

  const v = sheet.getRange(row, 1, 1, 8).getValues()[0];
  return {
    ok: true,
    id: String(v[COL.ID - 1]),
    family: String(v[COL.FAMILY - 1]),
    places: Number(v[COL.PLACES - 1]) || 0,
    status: String(v[COL.STATUS - 1] || "PENDIENTE"),
    attendees: v[COL.ATTENDEES - 1] === "" ? "" : Number(v[COL.ATTENDEES - 1])
  };
}

function findRowById_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const ids = sheet.getRange(2, COL.ID, lastRow - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (normalizeId_(ids[i][0]) === id) return i + 2;
  }
  return 0;
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`No existe la hoja "${CONFIG.SHEET_NAME}"`);
  return sheet;
}

function buildInviteUrl_(id) {
  const base = CONFIG.GITHUB_PAGES_URL.replace(/\/?$/, "/");
  return `${base}?id=${encodeURIComponent(id)}`;
}

function createOpaqueId_() {
  // UUID aleatorio: no revela número de fila ni nombre de la familia.
  return Utilities.getUuid().replace(/-/g, "");
}

function normalizeId_(id) {
  return String(id || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function jsonp_(payload, e) {
  const callback = String((e && e.parameter && e.parameter.callback) || "");
  const safeCallback = /^[A-Za-z_$][A-Za-z0-9_$]{0,80}$/.test(callback) ? callback : "";
  const json = JSON.stringify(payload);

  if (safeCallback) {
    return ContentService
      .createTextOutput(`${safeCallback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function htmlResponse_(message) {
  const safe = String(message).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[s]);

  return HtmlService.createHtmlOutput(`
    <!doctype html><html><head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;padding:30px;text-align:center">
      <p>${safe}</p>
    </body></html>
  `);
}
