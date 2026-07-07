const SPREADSHEET_ID = "1vIzG0PwrPzUUBYfKIGkJHeWIKNzM-8munnUsZX7jKzs";
const ANALYSIS_SHEET_NAME = "Analysis Export";
const PII_SHEET_NAME = "PII";
const LOG_SHEET_NAME = "Submission Log";
const SECRET_PROPERTY_KEY = "SHEETS_WEBHOOK_SECRET";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty(SECRET_PROPERTY_KEY);
    if (!expectedSecret || body.secret !== expectedSecret) {
      return jsonResponse({ ok: false, message: "Unauthorized" }, 401);
    }

    const piiPayload = body.piiPayload || {};
    const phone = String(piiPayload["P2-EXCLUDE"] || "").replace(/[^\d]/g, "");
    if (!/^\d{11}$/.test(phone)) {
      return jsonResponse({ ok: false, message: "Invalid phone" }, 400);
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const piiSheet = ensureSheet(spreadsheet, PII_SHEET_NAME);
    const analysisSheet = ensureSheet(spreadsheet, ANALYSIS_SHEET_NAME);
    const logSheet = ensureSheet(spreadsheet, LOG_SHEET_NAME);

    ensureHeaders(piiSheet, ["requestId", "receivedAt", "submittedAt", "P1-EXCLUDE", "P2-EXCLUDE"]);
    if (isDuplicatePhone(piiSheet, phone)) {
      return jsonResponse({ ok: false, duplicate: true, message: "Duplicate phone" }, 409);
    }

    const analysisPayload = body.analysisPayload || {};
    const analysisHeaders = ensurePayloadHeaders(analysisSheet, ["requestId", "receivedAt", "submittedAt"], analysisPayload);
    const piiHeaders = ensurePayloadHeaders(piiSheet, ["requestId", "receivedAt", "submittedAt"], piiPayload);
    ensureHeaders(logSheet, ["requestId", "receivedAt", "submittedAt", "completedFields", "totalFields", "clientPath", "userAgent"]);

    appendPayloadRow(analysisSheet, analysisHeaders, {
      requestId: body.requestId,
      receivedAt: body.receivedAt,
      submittedAt: body.submittedAt,
      ...analysisPayload,
    });

    appendPayloadRow(piiSheet, piiHeaders, {
      requestId: body.requestId,
      receivedAt: body.receivedAt,
      submittedAt: body.submittedAt,
      ...piiPayload,
      "P2-EXCLUDE": phone,
    });

    appendPayloadRow(logSheet, getHeaders(logSheet), {
      requestId: body.requestId,
      receivedAt: body.receivedAt,
      submittedAt: body.submittedAt,
      completedFields: body.completedFields,
      totalFields: body.totalFields,
      clientPath: body.client && body.client.path,
      userAgent: body.client && body.client.userAgent,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, message: String(error && error.message ? error.message : error) }, 500);
  }
}

function ensureSheet(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function ensurePayloadHeaders(sheet, baseHeaders, payload) {
  const existingHeaders = ensureHeaders(sheet, baseHeaders);
  const missingHeaders = Object.keys(payload).filter(function (key) {
    return existingHeaders.indexOf(key) === -1;
  });
  if (missingHeaders.length > 0) {
    sheet.getRange(1, existingHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }
  return getHeaders(sheet);
}

function ensureHeaders(sheet, requiredHeaders) {
  const headers = getHeaders(sheet);
  if (headers.length === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    sheet.setFrozenRows(1);
    return requiredHeaders;
  }
  const missingHeaders = requiredHeaders.filter(function (header) {
    return headers.indexOf(header) === -1;
  });
  if (missingHeaders.length > 0) {
    sheet.getRange(1, headers.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }
  return getHeaders(sheet);
}

function getHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value || "").trim();
  }).filter(Boolean);
}

function appendPayloadRow(sheet, headers, payload) {
  const row = headers.map(function (header) {
    const value = payload[header];
    if (header === "P2-EXCLUDE") return value == null || value === "" ? "" : "'" + String(value);
    if (Array.isArray(value)) return value.join("|");
    if (value && typeof value === "object") return JSON.stringify(value);
    return value == null ? "" : value;
  });
  sheet.appendRow(row);
}

function isDuplicatePhone(piiSheet, phone) {
  const headers = getHeaders(piiSheet);
  const phoneColumn = headers.indexOf("P2-EXCLUDE") + 1;
  if (phoneColumn <= 0 || piiSheet.getLastRow() < 2) return false;
  const values = piiSheet.getRange(2, phoneColumn, piiSheet.getLastRow() - 1, 1).getValues();
  return values.some(function (row) {
    return String(row[0] || "").replace(/[^\d]/g, "") === phone;
  });
}

function jsonResponse(body, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
