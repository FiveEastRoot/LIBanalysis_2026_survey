const SPREADSHEET_ID = "1vIzG0PwrPzUUBYfKIGkJHeWIKNzM-8munnUsZX7jKzs";
const ANALYSIS_SHEET_NAME = "Analysis Export";
const PII_SHEET_NAME = "PII";
const LOG_SHEET_NAME = "Submission Log";
const SECRET_PROPERTY_KEY = "SHEETS_WEBHOOK_SECRET";
const ALLOWED_ANALYSIS_HEADERS = [
  "SQ1", "SQ2", "SQ3", "SQ3-DONG", "SQ4", "SQ5", "BQ1", "BQ2",
  "Q1-A-1", "Q1-A-2", "Q1-A-3", "Q1-A-4", "Q1-A-5", "Q1-A-6",
  "Q1-B-1", "Q1-B-2", "Q1-B-3", "Q1-B-4", "Q1-B-5", "Q1-B-6", "Q1-B-7", "Q1-C",
  "Q2-A-1", "Q2-A-2", "Q2-A-3", "Q2-A-4", "Q2-A-5", "Q2-A-6", "Q2-A-7",
  "Q2-B-1", "Q2-B-2", "Q2-B-3", "Q2-B-4", "Q2-B-5", "Q2-B-6", "Q2-C",
  "Q3-A-1", "Q3-A-2", "Q3-A-3", "Q3-A-4", "Q3-A-5", "Q3-A-6",
  "Q3-B-1", "Q3-B-2", "Q3-B-3", "Q3-B-4", "Q3-B-5", "Q3-C",
  "Q4-A-1", "Q4-A-2", "Q4-A-3", "Q4-A-4", "Q4-A-5", "Q4-A-6",
  "Q4-B-1", "Q4-B-2", "Q4-B-3", "Q4-C",
  "Q5-A-1", "Q5-A-2", "Q5-A-3", "Q5-B-1", "Q5-B-2", "Q5-B-3", "Q5-B-4", "Q5-B-5", "Q5-B-6", "Q5-C",
  "Q6-B-1", "Q6-B-2", "Q6-B-3", "Q6-B-4", "Q6-B-5", "Q6-B-6", "Q6-B-7", "Q6-B-8", "Q6-B-9", "Q6-C",
  "Q7-D-12", "Q8",
  "DQ1-Y", "DQ1-M", "DQ2-Y", "DQ2-M", "DQ3", "DQ4", "DQ5-1", "DQ5-2", "DQ5-3", "DQ6-Y", "DQ6-M", "DQ6-1",
  "DQ7-E-1", "DQ7-E-2", "DQ7-E-3", "DQ7-E-4", "DQ7-E-5", "DQ7-E-6", "DQ7-E-7", "DQ7-E-8",
  "RQ1-1", "RQ1-2", "RQ1-3", "RQ1-4", "RQ1-5", "RQ1-6", "RQ1-7", "RQ2", "RQ3-1", "RQ3-2", "RQ3-3",
];
const ALLOWED_PII_HEADERS = ["P1-EXCLUDE", "phoneHash", "phoneEncrypted", "phoneEncryptionVersion"];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty(SECRET_PROPERTY_KEY);
    if (!expectedSecret || body.secret !== expectedSecret) {
      return jsonResponse({ ok: false, message: "Unauthorized" }, 401);
    }

    const piiPayload = body.piiPayload || {};
    const phoneHash = String(piiPayload.phoneHash || "").trim();
    const phoneEncrypted = String(piiPayload.phoneEncrypted || "").trim();
    const phoneEncryptionVersion = String(piiPayload.phoneEncryptionVersion || "").trim();
    if (!phoneHash || !phoneEncrypted || !phoneEncryptionVersion) {
      return jsonResponse({ ok: false, message: "Invalid encrypted phone payload" }, 400);
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const piiSheet = ensureSheet(spreadsheet, PII_SHEET_NAME);
    const analysisSheet = ensureSheet(spreadsheet, ANALYSIS_SHEET_NAME);
    const logSheet = ensureSheet(spreadsheet, LOG_SHEET_NAME);

    ensureHeaders(piiSheet, ["requestId", "receivedAt", "submittedAt", "P1-EXCLUDE", "phoneHash", "phoneEncrypted", "phoneEncryptionVersion"]);
    if (isDuplicatePhoneHash(piiSheet, phoneHash)) {
      return jsonResponse({ ok: false, duplicate: true, message: "Duplicate phone" }, 409);
    }

    const analysisPayload = filterAllowedPayload(body.analysisPayload || {}, ALLOWED_ANALYSIS_HEADERS);
    const filteredPiiPayload = filterAllowedPayload(piiPayload, ALLOWED_PII_HEADERS);
    const analysisHeaders = ensurePayloadHeaders(analysisSheet, ["requestId", "receivedAt", "submittedAt"], analysisPayload);
    const piiHeaders = ensurePayloadHeaders(piiSheet, ["requestId", "receivedAt", "submittedAt"], filteredPiiPayload);
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
      ...filteredPiiPayload,
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

function filterAllowedPayload(payload, allowedHeaders) {
  const filtered = {};
  allowedHeaders.forEach(function (header) {
    if (Object.prototype.hasOwnProperty.call(payload, header)) {
      filtered[header] = payload[header];
    }
  });
  return filtered;
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
    if (["phoneHash", "phoneEncrypted"].indexOf(header) >= 0) return value == null || value === "" ? "" : "'" + String(value);
    if (Array.isArray(value)) return value.join("|");
    if (value && typeof value === "object") return JSON.stringify(value);
    return value == null ? "" : value;
  });
  sheet.appendRow(row);
}

function isDuplicatePhoneHash(piiSheet, phoneHash) {
  const headers = getHeaders(piiSheet);
  const phoneHashColumn = headers.indexOf("phoneHash") + 1;
  if (phoneHashColumn <= 0 || piiSheet.getLastRow() < 2) return false;
  const values = piiSheet.getRange(2, phoneHashColumn, piiSheet.getLastRow() - 1, 1).getValues();
  return values.some(function (row) {
    return String(row[0] || "").trim() === phoneHash;
  });
}

function jsonResponse(body, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
