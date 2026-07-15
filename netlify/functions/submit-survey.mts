import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import type { Config, Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

type SurveySubmission = {
  analysisPayload?: Record<string, unknown>;
  piiPayload?: Record<string, unknown>;
  completedFields?: number;
  totalFields?: number;
  submittedAt?: string;
  clientPath?: string;
};

const maxBodyBytes = 900_000;
const consentValue = "취급위탁에 동의";
const noConsentValue = "동의하지 않음(경품지급불가)";
const phoneEncryptionVersion = "v1";
const allowedAnalysisFields = new Set([
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
  "NW-OE-1",
]);
const allowedPiiFields = new Set(["P1-EXCLUDE", "P2-EXCLUDE"]);

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed" }, 405);
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ ok: false, message: "JSON 요청만 허용됩니다." }, 415);
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > maxBodyBytes) {
    return json({ ok: false, message: "제출 데이터가 허용 크기를 초과했습니다." }, 413);
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const phoneEncryptionKey = getEnv("PHONE_ENCRYPTION_KEY");
  const phoneHashSecret = getEnv("PHONE_HASH_SECRET");
  if (!supabaseUrl || !supabaseServiceRoleKey || !phoneEncryptionKey || !phoneHashSecret) {
    return json({ ok: false, message: "제출 저장소가 아직 설정되지 않았습니다." }, 503);
  }

  const surveySchema = getSurveySchema();
  const submissionLogTable = getSubmissionLogTable(surveySchema);
  const supabase = createServiceClient(supabaseUrl, supabaseServiceRoleKey, surveySchema);
  const receivedAt = new Date().toISOString();
  const requestId = context.requestId;
  const clientPath = "";
  const userAgent = req.headers.get("user-agent") ?? "";

  let submission: SurveySubmission;
  try {
    submission = await req.json();
  } catch {
    await logSubmission(supabase, submissionLogTable, {
      requestId,
      receivedAt,
      submittedAt: null,
      clientPath,
      userAgent,
      eventType: "validation_failed",
      message: "invalid_json_body",
    });
    return json({ ok: false, message: "요청 본문을 읽을 수 없습니다." }, 400);
  }

  const submittedAt = safeSubmittedAt(submission.submittedAt);
  const safeClientPath = safeString(submission.clientPath);
  const validationMessage = validateSubmission(submission);
  if (validationMessage) {
    await logSubmission(supabase, submissionLogTable, {
      requestId,
      receivedAt,
      submittedAt,
      completedFields: submission.completedFields,
      totalFields: submission.totalFields,
      clientPath: safeClientPath,
      userAgent,
      eventType: "validation_failed",
      message: validationMessage,
    });
    return json({ ok: false, message: validationMessage }, 400);
  }

  const phoneConsent = String(submission.piiPayload?.["P1-EXCLUDE"] ?? "") === consentValue;
  let protectedPiiPayload: {
    consentValue: string;
    phoneHash: string;
    phoneEncrypted: string;
    phoneEncryptionVersion: string;
  } | null = null;
  if (phoneConsent) {
    try {
      const normalizedPhoneValue = normalizedPhone(submission.piiPayload?.["P2-EXCLUDE"]);
      protectedPiiPayload = {
        consentValue,
        phoneHash: hashPhone(normalizedPhoneValue, phoneHashSecret),
        phoneEncrypted: encryptPhone(normalizedPhoneValue, phoneEncryptionKey),
        phoneEncryptionVersion,
      };
    } catch (error) {
      await logSubmission(supabase, submissionLogTable, {
        requestId,
        receivedAt,
        submittedAt,
        completedFields: submission.completedFields,
        totalFields: submission.totalFields,
        clientPath: safeClientPath,
        userAgent,
        eventType: "storage_failed",
        message: error instanceof Error ? error.message : "phone_encryption_failed",
      });
      return json({ ok: false, message: "전화번호 암호화 설정이 올바르지 않습니다." }, 503);
    }
  }

  const analysisResult = await supabase
    .from("survey_analysis_export")
    .insert({
      request_id: requestId,
      received_at: receivedAt,
      submitted_at: submittedAt,
      analysis_payload: submission.analysisPayload,
    })
    .select("id")
    .single();

  if (analysisResult.error) {
    console.error("Failed to write survey analysis response", analysisResult.error);
    await logSubmission(supabase, submissionLogTable, {
      requestId,
      receivedAt,
      submittedAt,
      completedFields: submission.completedFields,
      totalFields: submission.totalFields,
      clientPath: safeClientPath,
      userAgent,
      eventType: "storage_failed",
      message: analysisResult.error.message,
    });
    return json({ ok: false, message: "응답 저장에 실패했습니다." }, 502);
  }

  if (protectedPiiPayload) {
    const piiResult = await supabase.from("survey_pii").insert({
      submission_id: analysisResult.data.id,
      request_id: requestId,
      received_at: receivedAt,
      submitted_at: submittedAt,
      consent_value: protectedPiiPayload.consentValue,
      phone_hash: protectedPiiPayload.phoneHash,
      phone_encrypted: protectedPiiPayload.phoneEncrypted,
      phone_encryption_version: protectedPiiPayload.phoneEncryptionVersion,
    });

    if (piiResult.error) {
      await supabase.from("survey_analysis_export").delete().eq("id", analysisResult.data.id);
      const duplicate = isUniqueViolation(piiResult.error, "survey_pii_phone_hash_key");
      console.error("Failed to write survey PII response", piiResult.error);
      await logSubmission(supabase, submissionLogTable, {
        requestId,
        receivedAt,
        submittedAt,
        completedFields: submission.completedFields,
        totalFields: submission.totalFields,
        clientPath: safeClientPath,
        userAgent,
        eventType: duplicate ? "duplicate_rejected" : "storage_failed",
        message: piiResult.error.message,
      });
      return json(
        {
          ok: false,
          duplicate,
          message: duplicate ? "이미 제출된 전화번호입니다." : "개인정보 저장에 실패했습니다.",
        },
        duplicate ? 409 : 502,
      );
    }
  }

  await logSubmission(supabase, submissionLogTable, {
    requestId,
    receivedAt,
    submittedAt,
    completedFields: submission.completedFields,
    totalFields: submission.totalFields,
    clientPath: safeClientPath,
    userAgent,
    eventType: "submitted",
    message: phoneConsent ? "submitted" : "submitted_without_phone_consent",
  });

  return json({ ok: true, requestId, phoneConsent });
};

export const config: Config = {
  path: "/api/submit-survey",
};

function validateSubmission(submission: SurveySubmission) {
  if (!isRecord(submission.analysisPayload) || !isRecord(submission.piiPayload)) {
    return "제출 데이터 형식이 올바르지 않습니다.";
  }

  if (hasUnknownKeys(submission.analysisPayload, allowedAnalysisFields) || hasUnknownKeys(submission.piiPayload, allowedPiiFields)) {
    return "허용되지 않은 제출 항목이 포함되어 있습니다.";
  }

  const consent = String(submission.piiPayload["P1-EXCLUDE"] ?? "");
  if (consent !== consentValue && consent !== noConsentValue) {
    return "개인정보 취급위탁 동의 여부를 선택해 주세요.";
  }

  const phone = normalizedPhone(submission.piiPayload["P2-EXCLUDE"]);
  if (consent === consentValue && !/^\d{11}$/.test(phone)) {
    return "휴대폰 번호는 숫자 11자리여야 합니다.";
  }

  if (typeof submission.completedFields !== "number" || typeof submission.totalFields !== "number") {
    return "진행도 정보가 올바르지 않습니다.";
  }

  return "";
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasUnknownKeys(payload: Record<string, unknown>, allowedKeys: Set<string>) {
  return Object.keys(payload).some((key) => !allowedKeys.has(key));
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.slice(0, 240) : "";
}

function safeSubmittedAt(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function normalizedPhone(value: unknown) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function hashPhone(phone: string, secret: string) {
  return createHmac("sha256", secret).update(phone).digest("base64url");
}

function encryptPhone(phone: string, keyValue: string) {
  const key = decodeBase64Key(keyValue, "PHONE_ENCRYPTION_KEY");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(phone, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

function decodeBase64Key(value: string, name: string) {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error(`${name} must be a base64-encoded 32-byte key.`);
  }
  return key;
}

function getEnv(name: string) {
  const netlifyValue = typeof Netlify === "undefined" ? "" : Netlify.env.get(name);
  return netlifyValue || process.env[name] || "";
}

function getSurveySchema() {
  return getEnv("SURVEY_DB_SCHEMA") || "public";
}

function getSubmissionLogTable(schema: string) {
  return schema === "survey_ops" ? "survey_submissions" : "survey_submission_log";
}

function createServiceClient(supabaseUrl: string, serviceRoleKey: string, schema: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    db: {
      schema,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function logSubmission(
  supabase: ReturnType<typeof createServiceClient>,
  submissionLogTable: string,
  value: {
    requestId: string;
    receivedAt: string;
    submittedAt: string | null;
    completedFields?: number;
    totalFields?: number;
    clientPath: string;
    userAgent: string;
    eventType: "submitted" | "duplicate_rejected" | "validation_failed" | "storage_failed";
    message: string;
  },
) {
  const { error } = await supabase.from(submissionLogTable).insert({
    request_id: value.requestId,
    received_at: value.receivedAt,
    submitted_at: value.submittedAt,
    completed_fields: value.completedFields,
    total_fields: value.totalFields,
    client_path: value.clientPath,
    user_agent: value.userAgent,
    event_type: value.eventType,
    message: value.message,
  });
  if (error) {
    console.error("Failed to write survey submission log", error);
  }
}

function isUniqueViolation(error: { code?: string; message?: string; details?: string }, constraintName: string) {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  return error.code === "23505" && text.includes(constraintName);
}
