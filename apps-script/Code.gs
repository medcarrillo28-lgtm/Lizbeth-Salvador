/**
 * Backend RSVP — Lizbeth & Salvador
 * Compatible con la interfaz final y con el proyecto anterior.
 */

const CONFIG = {
  SPREADSHEET_ID: '1uEQgFdA4Lfi30NH59LXH-DKpsgdIXCc2r0vfft4AtN8',
  SHEET_NAME: 'Invitados',
  SUMMARY_SHEET: 'Resumen',
  DEFAULT_PUBLIC_SITE_URL: 'https://medcarrillo28-lgtm.github.io/Lizbeth-Salvador/'
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

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💍 Boda RSVP')
    .addItem('1. Preparar hojas', 'setupProject')
    .addItem('2. Generar IDs y enlaces', 'generateInvitationLinks')
    .addItem('3. Guardar URL pública', 'setPublicSiteUrl')
    .addItem('4. Actualizar resumen', 'setupSummary_')
    .addToUi();
}

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = String(p.action || 'info').toLowerCase();
    if (!['info', 'invite'].includes(action)) {
      return jsonp_({ ok:false, error:'Acción no válida', message:'Acción no válida' }, e);
    }

    const id = normalizeId_(p.id);
    if (!id) {
      return jsonp_({ ok:false, error:'Falta ID', message:'La invitación no contiene un ID válido.' }, e);
    }

    const data = getInvitation_(id);
    if (!data.ok) return jsonp_(data, e);

    // Respuesta híbrida: la interfaz final usa campos planos y el proyecto viejo usa guest{}.
    return jsonp_({
      ...data,
      guest: {
        id: data.id,
        name: data.family,
        reservedSeats: data.places,
        status: normalizeLegacyStatus_(data.status),
        attendees: Number(data.attendees || 0)
      }
    }, e);
  } catch (err) {
    return jsonp_({ ok:false, error:'No se pudo cargar la invitación', message:'No se pudo cargar la invitación.' }, e);
  }
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const id = normalizeId_(p.id);
    if (!id) return postResponse_({ ok:false, message:'Falta el ID de invitación.' });

    // Acepta tanto el formulario actual como el formulario viejo.
    let status = String(p.status || '').trim().toUpperCase();
    if (!status) {
      const attending = String(p.asiste || '').trim().toUpperCase();
      if (attending === 'SI') status = 'CONFIRMADO';
      if (attending === 'NO') status = 'NO ASISTE';
    }
    status = normalizeSheetStatus_(status);

    if (!['CONFIRMADO', 'NO ASISTE'].includes(status)) {
      return postResponse_({ ok:false, message:'Selecciona si podrás asistir.' });
    }

    const sheet = getSheet_();
    const row = findRowById_(sheet, id);
    if (!row) return postResponse_({ ok:false, message:'Invitación no encontrada.' });

    const places = Math.max(1, Number(sheet.getRange(row, COL.PLACES).getValue()) || 1);
    let attendees = Number(p.attendees || p.asistentes || 0);

    if (status === 'NO ASISTE') {
      attendees = 0;
    } else if (!Number.isInteger(attendees) || attendees < 1 || attendees > places) {
      return postResponse_({ ok:false, message:'El número de asistentes no coincide con los lugares reservados.' });
    }

    const message = String(p.message || p.mensaje || '').trim().slice(0, 500);

    sheet.getRange(row, COL.STATUS).setValue(status);
    sheet.getRange(row, COL.ATTENDEES).setValue(attendees);
    sheet.getRange(row, COL.CONFIRMED_AT).setValue(new Date());
    sheet.getRange(row, COL.MESSAGE).setValue(message);
    SpreadsheetApp.flush();

    return postResponse_({
      ok: true,
      status: normalizeLegacyStatus_(status),
      attendees,
      message: status === 'CONFIRMADO'
        ? '¡Gracias por confirmar! Nos emociona compartir este día contigo.'
        : 'Gracias por avisarnos. Te tendremos presente en este día especial.'
    });
  } catch (err) {
    return postResponse_({ ok:false, message:'Ocurrió un error al guardar la confirmación.' });
  }
}

function setupProject() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);

  const headers = [
    'ID', 'INVITACIÓN / FAMILIA', 'LUGARES', 'ESTADO',
    'ASISTENTES', 'FECHA CONFIRMACIÓN', 'MENSAJE', 'ENLACE'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#586143')
    .setFontColor('#FFFFFF');

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['PENDIENTE', 'CONFIRMADO', 'NO ASISTE'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('D2:D').setDataValidation(statusRule);
  sheet.getRange('C2:C').setNumberFormat('0');
  sheet.getRange('E2:E').setNumberFormat('0');
  sheet.getRange('F2:F').setNumberFormat('dd/MM/yyyy HH:mm');

  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 90);
  sheet.setColumnWidth(4, 125);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 175);
  sheet.setColumnWidth(7, 300);
  sheet.setColumnWidth(8, 450);

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PUBLIC_SITE_URL')) {
    props.setProperty('PUBLIC_SITE_URL', CONFIG.DEFAULT_PUBLIC_SITE_URL);
  }

  setupSummary_();
  generateInvitationLinks();

  SpreadsheetApp.getUi().alert('Listo. El sistema RSVP quedó preparado.');
}

function setupSummary_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SUMMARY_SHEET);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SUMMARY_SHEET);
  sheet.clear();

  sheet.getRange('A1:B1').setValues([['RESUMEN RSVP', 'TOTAL']]);
  sheet.getRange('A2:A7').setValues([
    ['Invitaciones'],
    ['Personas invitadas'],
    ['Personas confirmadas'],
    ['Invitaciones pendientes'],
    ['Invitaciones que no asistirán'],
    ['Lugares pendientes de respuesta']
  ]);

  sheet.getRange('B2').setFormula('=COUNTA(Invitados!B2:B)');
  sheet.getRange('B3').setFormula('=SUM(Invitados!C2:C)');
  sheet.getRange('B4').setFormula('=SUMIF(Invitados!D2:D,"CONFIRMADO",Invitados!E2:E)');
  sheet.getRange('B5').setFormula('=COUNTIF(Invitados!D2:D,"PENDIENTE")');
  sheet.getRange('B6').setFormula('=COUNTIF(Invitados!D2:D,"NO ASISTE")');
  sheet.getRange('B7').setFormula('=SUMIF(Invitados!D2:D,"PENDIENTE",Invitados!C2:C)');

  sheet.getRange('A1:B1')
    .setFontWeight('bold')
    .setBackground('#586143')
    .setFontColor('#FFFFFF');
  sheet.getRange('A1:B7').setBorder(true, true, true, true, true, true);
  sheet.setColumnWidth(1, 290);
  sheet.setColumnWidth(2, 120);
}

function setPublicSiteUrl() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const current = props.getProperty('PUBLIC_SITE_URL') || CONFIG.DEFAULT_PUBLIC_SITE_URL;
  const response = ui.prompt(
    'URL pública de la invitación',
    'Pega la URL de GitHub Pages.\nActual: ' + current,
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  let url = response.getResponseText().trim();
  if (!/^https:\/\//i.test(url)) {
    ui.alert('La URL debe comenzar con https://');
    return;
  }
  if (!url.endsWith('/')) url += '/';
  props.setProperty('PUBLIC_SITE_URL', url);
  generateInvitationLinks();
}

function generateInvitationLinks() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const props = PropertiesService.getScriptProperties();
  let baseUrl = props.getProperty('PUBLIC_SITE_URL') || CONFIG.DEFAULT_PUBLIC_SITE_URL;
  if (!baseUrl.endsWith('/')) baseUrl += '/';

  let changed = false;
  values.forEach(row => {
    const family = String(row[COL.FAMILY - 1] || '').trim();
    const places = Number(row[COL.PLACES - 1]) || 0;
    if (!family || places < 1) return;

    if (!row[COL.ID - 1] || String(row[COL.ID - 1]).toLowerCase() === '(automático)') {
      row[COL.ID - 1] = createOpaqueId_();
      changed = true;
    }
    if (!row[COL.STATUS - 1]) {
      row[COL.STATUS - 1] = 'PENDIENTE';
      changed = true;
    }

    const expectedLink = baseUrl + '?id=' + encodeURIComponent(row[COL.ID - 1]);
    if (row[COL.LINK - 1] !== expectedLink) {
      row[COL.LINK - 1] = expectedLink;
      changed = true;
    }
  });

  if (changed) sheet.getRange(2, 1, values.length, 8).setValues(values);
  setupSummary_();
}

function regenerateMissingLinksOnly() {
  generateInvitationLinks();
}

function getInvitation_(id) {
  const sheet = getSheet_();
  const row = findRowById_(sheet, id);
  if (!row) return { ok:false, error:'Invitación no encontrada', message:'No encontramos esta invitación.' };

  const v = sheet.getRange(row, 1, 1, 8).getValues()[0];
  return {
    ok: true,
    id: String(v[COL.ID - 1]),
    family: String(v[COL.FAMILY - 1] || 'Invitado'),
    places: Math.max(1, Number(v[COL.PLACES - 1]) || 1),
    status: String(v[COL.STATUS - 1] || 'PENDIENTE'),
    attendees: v[COL.ATTENDEES - 1] === '' ? '' : Number(v[COL.ATTENDEES - 1])
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
  if (!sheet) throw new Error('No existe la hoja "' + CONFIG.SHEET_NAME + '"');
  return sheet;
}

function createOpaqueId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase();
}

function normalizeId_(id) {
  return String(id || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeSheetStatus_(status) {
  const s = String(status || '').trim().toUpperCase().replace(/_/g, ' ');
  if (s === 'NO ASISTE' || s === 'NO ASISTIRÁ' || s === 'NO ASISTIRA') return 'NO ASISTE';
  if (s === 'CONFIRMADO') return 'CONFIRMADO';
  return s;
}

function normalizeLegacyStatus_(status) {
  return normalizeSheetStatus_(status) === 'NO ASISTE' ? 'NO_ASISTE' : normalizeSheetStatus_(status);
}

function jsonp_(payload, e) {
  const callback = String((e && e.parameter && e.parameter.callback) || '');
  const safeCallback = /^[A-Za-z_$][A-Za-z0-9_$.]{0,100}$/.test(callback) ? callback : '';
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  if (safeCallback) {
    return ContentService
      .createTextOutput(safeCallback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function postResponse_(payload) {
  const data = JSON.stringify({
    source: 'wedding-rsvp',
    ...payload
  }).replace(/</g, '\\u003c');

  return HtmlService.createHtmlOutput(
    '<!doctype html><html><body><script>' +
    'window.parent.postMessage(' + data + ', "*");' +
    '</script></body></html>'
  );
}
