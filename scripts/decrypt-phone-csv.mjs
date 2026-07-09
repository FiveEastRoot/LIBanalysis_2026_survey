import { createDecipheriv } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const args = parseArgs(process.argv.slice(2));

if (!args.input || !args.output) {
  console.error("Usage: node scripts/decrypt-phone-csv.mjs --input pii.csv --output pii-decrypted.csv");
  process.exit(1);
}

const keyValue = process.env.PHONE_ENCRYPTION_KEY;
if (!keyValue) {
  console.error("PHONE_ENCRYPTION_KEY environment variable is required.");
  process.exit(1);
}

const key = Buffer.from(keyValue, "base64");
if (key.length !== 32) {
  console.error("PHONE_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  process.exit(1);
}

const rows = parseCsv(readFileSync(args.input, "utf8"));
if (rows.length === 0) {
  writeFileSync(args.output, "", "utf8");
  process.exit(0);
}

const headers = rows[0];
const encryptedIndex = headers.indexOf("phoneEncrypted");
if (encryptedIndex < 0) {
  console.error("Input CSV must include a phoneEncrypted column.");
  process.exit(1);
}

const outputHeaders = [...headers, "phoneDecrypted"];
const outputRows = [outputHeaders];

for (const row of rows.slice(1)) {
  const encrypted = row[encryptedIndex] ?? "";
  outputRows.push([...row, encrypted ? decryptPhone(encrypted, key) : ""]);
}

writeFileSync(args.output, stringifyCsv(outputRows), "utf8");

function decryptPhone(value, key) {
  const [version, ivText, tagText, ciphertextText] = value.split(":");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) {
    throw new Error(`Unsupported encrypted phone value: ${value}`);
  }

  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const ciphertext = Buffer.from(ciphertextText, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--input") parsed.input = values[index + 1];
    if (values[index] === "--output") parsed.output = values[index + 1];
  }
  return parsed;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted && char === '"' && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((item) => item.some((cellValue) => cellValue !== ""));
}

function stringifyCsv(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n") + "\n";
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
