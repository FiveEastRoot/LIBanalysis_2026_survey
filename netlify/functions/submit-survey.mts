import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import type { Config, Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

type SurveySubmission = {
  analysisPayload?: Record<string, unknown>;
  piiPayload?: Record<string, unknown>;
  completedFields?: number;
  totalFields?: number;
  responseDurationMs?: number;
  responseSource?: string;
  offlineEntryId?: string;
  submittedAt?: string;
  clientPath?: string;
};

const maxBodyBytes = 900_000;
const consentValue = "개인정보 수집·이용 동의";
const legacyConsentValue = "취급위탁에 동의";
const noConsentValue = "동의하지 않음(경품지급불가)";
const storedConsentValue = "agree";
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
const optionalAnalysisFields = new Set(["NW-OE-1", "RQ1-7"]);
const rq1NumericFields = ["RQ1-1", "RQ1-2", "RQ1-3", "RQ1-4", "RQ1-5", "RQ1-6"];

export default async (req: Request, context: Context) => {
  const requestId = context.requestId;

  if (req.method !== "POST") {
    return json({ ok: false, code: "ERR_METHOD_NOT_ALLOWED", message: "Method not allowed", requestId }, 405);
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "ERR_UNSUPPORTED_CONTENT_TYPE", message: "JSON 요청만 허용됩니다.", requestId }, 415);
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > maxBodyBytes) {
    return json({ ok: false, code: "ERR_BODY_TOO_LARGE", message: "제출 데이터가 허용 크기를 초과했습니다.", requestId }, 413);
  }

  if (isTruthyEnv("SURVEY_MAINTENANCE_MODE")) {
    return json({ ok: false, code: "ERR_SERVICE_MAINTENANCE", message: "현재 설문 저장 서버 점검 중입니다.", requestId }, 503);
  }

  if (isTruthyEnv("SURVEY_SUBMISSIONS_DISABLED")) {
    return json({ ok: false, code: "ERR_SUBMISSION_BLOCKED", message: "현재 제출이 일시 차단되어 있습니다.", requestId }, 423);
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const phoneEncryptionKey = getEnv("PHONE_ENCRYPTION_KEY");
  const phoneHashSecret = getEnv("PHONE_HASH_SECRET");
  const surveySchema = getEnv("SURVEY_DB_SCHEMA");
  const sourceDistrictCode = getEnv("SURVEY_SOURCE_DISTRICT_CODE").trim();
  const sourceLibraryCode = getEnv("SURVEY_SOURCE_LIBRARY_CODE").trim();
  const sourceCampaignId = getEnv("SURVEY_SOURCE_CAMPAIGN_ID").trim();
  if (!supabaseUrl || !supabaseServiceRoleKey || !phoneEncryptionKey || !phoneHashSecret || !surveySchema || !sourceDistrictCode || !sourceCampaignId) {
    return json({ ok: false, code: "ERR_STORAGE_NOT_CONFIGURED", message: "제출 저장소가 아직 설정되지 않았습니다.", requestId }, 503);
  }

  const submissionLogTable = getSubmissionLogTable(surveySchema);
  const supabase = createServiceClient(supabaseUrl, supabaseServiceRoleKey, surveySchema);
  const receivedAt = new Date().toISOString();
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
      eventType: "error",
      message: "ERR_INVALID_JSON: invalid_json_body",
    });
    return json({ ok: false, code: "ERR_INVALID_JSON", message: "요청 본문을 읽을 수 없습니다.", requestId }, 400);
  }

  const submittedAt = safeSubmittedAt(submission.submittedAt);
  const safeClientPath = safeString(submission.clientPath);
  const responseDurationMs = safeResponseDurationMs(submission.responseDurationMs);
  const responseSource = safeResponseSource(submission.responseSource, safeClientPath);
  const offlineEntryId = safeOfflineEntryId(submission.offlineEntryId, responseSource);
  const validationResult = validateSubmission(submission);
  if (validationResult.ok === false) {
    await logSubmission(supabase, submissionLogTable, {
      requestId,
      receivedAt,
      submittedAt,
      completedFields: submission.completedFields,
      totalFields: submission.totalFields,
      clientPath: safeClientPath,
      userAgent,
      eventType: "error",
      message: messageWithMetadata(`${validationResult.code}: ${validationResult.message}`, responseDurationMs, responseSource, offlineEntryId),
    });
    return json({ ok: false, code: validationResult.code, message: validationResult.message, missingFields: validationResult.missingFields, requestId }, 400);
  }

  let sourceScope: SurveySourceScope;
  try {
    sourceScope = await resolveSurveySourceScope(supabase, {
      districtCode: sourceDistrictCode,
      libraryCode: sourceLibraryCode,
      campaignId: sourceCampaignId,
    });
  } catch (error) {
    const sourceMessage = error instanceof Error ? error.message : "source_scope_resolution_failed";
    await logSubmission(supabase, submissionLogTable, {
      requestId,
      receivedAt,
      submittedAt,
      completedFields: submission.completedFields,
      totalFields: submission.totalFields,
      clientPath: safeClientPath,
      userAgent,
      eventType: "error",
      message: messageWithMetadata(`ERR_SOURCE_SCOPE_CONFIG: ${sourceMessage}`, responseDurationMs, responseSource, offlineEntryId),
    });
    return json({ ok: false, code: "ERR_SOURCE_SCOPE_CONFIG", message: "조사 출처 설정을 확인할 수 없습니다.", requestId }, 503);
  }

  let analysisScope: MainLibraryAnalysisScope;
  try {
    analysisScope = await resolveMainLibraryAnalysisScope(supabase, submission.analysisPayload?.SQ4);
  } catch (error) {
    const analysisScopeMessage = error instanceof Error ? error.message : "main_library_mapping_failed";
    await logSubmission(supabase, submissionLogTable, {
      requestId,
      receivedAt,
      submittedAt,
      completedFields: submission.completedFields,
      totalFields: submission.totalFields,
      clientPath: safeClientPath,
      userAgent,
      eventType: "error",
      message: messageWithMetadata(`ERR_MAIN_LIBRARY_MAPPING: ${analysisScopeMessage}`, responseDurationMs, responseSource, offlineEntryId),
    });
    return json({ ok: false, code: "ERR_MAIN_LIBRARY_MAPPING", message: "주 이용도서관을 운영 기준정보와 매칭할 수 없습니다.", requestId }, 400);
  }

  const phoneConsent = isPhoneConsentValue(submission.piiPayload?.["P1-EXCLUDE"]);
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
        consentValue: storedConsentValue,
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
        eventType: "error",
        message: messageWithMetadata(`ERR_PHONE_ENCRYPTION_CONFIG: ${error instanceof Error ? error.message : "phone_encryption_failed"}`, responseDurationMs, responseSource, offlineEntryId),
      });
      return json({ ok: false, code: "ERR_PHONE_ENCRYPTION_CONFIG", message: "전화번호 암호화 설정이 올바르지 않습니다.", requestId }, 503);
    }
  }

  const analysisResult = await supabase
    .from("survey_analysis_export")
    .insert({
      request_id: requestId,
      received_at: receivedAt,
      submitted_at: submittedAt,
      analysis_payload: submission.analysisPayload,
      source_district_id: sourceScope.districtId,
      source_library_id: sourceScope.libraryId,
      source_campaign_id: sourceScope.campaignId,
      analysis_library_id: analysisScope.libraryId,
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
      eventType: "error",
      message: messageWithMetadata(`ERR_ANALYSIS_WRITE_FAILED: ${analysisResult.error.message}`, responseDurationMs, responseSource, offlineEntryId),
    });
    return json({ ok: false, code: "ERR_ANALYSIS_WRITE_FAILED", message: "응답 저장에 실패했습니다.", requestId }, 502);
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
      const duplicate = isUniqueViolation(piiResult.error, ["survey_pii_phone_hash_key", "idx_survey_ops_pii_phone_hash_unique"]);
      console.error("Failed to write survey PII response", piiResult.error);
      await logSubmission(supabase, submissionLogTable, {
        requestId,
        receivedAt,
        submittedAt,
        completedFields: submission.completedFields,
        totalFields: submission.totalFields,
        clientPath: safeClientPath,
        userAgent,
        eventType: duplicate ? "blocked_duplicate" : "error",
        message: messageWithMetadata(`${duplicate ? "ERR_PII_DUPLICATE" : "ERR_PII_WRITE_FAILED"}: ${piiResult.error.message}`, responseDurationMs, responseSource, offlineEntryId),
      });
      return json(
        {
          ok: false,
          duplicate,
          code: duplicate ? "ERR_PII_DUPLICATE" : "ERR_PII_WRITE_FAILED",
          message: duplicate ? "이미 제출된 전화번호입니다." : "개인정보 저장에 실패했습니다.",
          requestId,
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
    message: messageWithMetadata(phoneConsent ? "submitted" : "submitted_without_phone_consent", responseDurationMs, responseSource, offlineEntryId),
  });

  return json({ ok: true, code: "OK_SUBMITTED", requestId, phoneConsent });
};

export const config: Config = {
  path: "/api/submit-survey",
};

function validateSubmission(submission: SurveySubmission) {
  if (!isRecord(submission.analysisPayload) || !isRecord(submission.piiPayload)) {
    return validationError("ERR_PAYLOAD_SHAPE", "제출 데이터 형식이 올바르지 않습니다.");
  }

  if (hasUnknownKeys(submission.analysisPayload, allowedAnalysisFields) || hasUnknownKeys(submission.piiPayload, allowedPiiFields)) {
    return validationError("ERR_UNKNOWN_FIELDS", "허용되지 않은 제출 항목이 포함되어 있습니다.");
  }

  const missingFields = requiredMissingFields(submission.analysisPayload);
  if (missingFields.length > 0) {
    return validationError("ERR_REQUIRED_FIELDS_MISSING", "필수 응답이 누락되었습니다.", missingFields);
  }

  const consent = String(submission.piiPayload["P1-EXCLUDE"] ?? "");
  if (!isPhoneConsentValue(consent) && consent !== noConsentValue) {
    return validationError("ERR_PII_CONSENT_REQUIRED", "개인정보 수집·이용 동의 여부를 선택해 주세요.");
  }

  const phone = normalizedPhone(submission.piiPayload["P2-EXCLUDE"]);
  if (isPhoneConsentValue(consent) && !/^\d{11}$/.test(phone)) {
    return validationError("ERR_PHONE_INVALID", "휴대폰 번호는 숫자 11자리여야 합니다.");
  }

  if (typeof submission.completedFields !== "number" || typeof submission.totalFields !== "number") {
    return validationError("ERR_PROGRESS_INVALID", "진행도 정보가 올바르지 않습니다.");
  }

  return { ok: true as const };
}

function validationError(code: string, message: string, missingFields?: string[]) {
  return { ok: false as const, code, message, missingFields };
}

function requiredMissingFields(payload: Record<string, unknown>) {
  const missing = Array.from(allowedAnalysisFields).filter((key) => {
    if (optionalAnalysisFields.has(key)) return false;
    return !isFilledPayloadValue(payload[key]);
  });

  if (!isFilledPayloadValue(payload["RQ1-7"]) && rq1NumericFields.every((key) => !isFilledPayloadValue(payload[key]))) {
    missing.push("RQ1");
  }

  return missing;
}

function isFilledPayloadValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return String(value ?? "").trim() !== "";
}

function isPhoneConsentValue(value: unknown) {
  const normalized = String(value ?? "");
  return normalized === consentValue || normalized === legacyConsentValue;
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

function safeResponseDurationMs(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 86_400_000) return null;
  return rounded;
}

function messageWithMetadata(message: string, responseDurationMs: number | null, responseSource: "online" | "offline_entry" | "test", offlineEntryId: string) {
  const metadata = [`source=${responseSource}`];
  if (offlineEntryId) {
    metadata.push(`offline_entry_id=${offlineEntryId}`);
  }
  if (responseDurationMs !== null) {
    metadata.push(`duration_ms=${responseDurationMs}`);
  }
  return `${message}; ${metadata.join("; ")}`;
}

function safeResponseSource(value: unknown, clientPath: string): "online" | "offline_entry" | "test" {
  if (value === "offline_entry" || clientPath.startsWith("/survey-offline-entry")) return "offline_entry";
  if (value === "test") return "test";
  return "online";
}

function safeOfflineEntryId(value: unknown, responseSource: "online" | "offline_entry" | "test") {
  if (responseSource !== "offline_entry" || typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32).toUpperCase();
}

type SurveySourceScope = {
  districtId: string;
  libraryId: string | null;
  campaignId: string;
};

type MainLibraryAnalysisScope = {
  districtId: string;
  libraryId: string;
  officialCode: string;
};

async function resolveMainLibraryAnalysisScope(
  supabase: ReturnType<typeof createServiceClient>,
  value: unknown,
): Promise<MainLibraryAnalysisScope> {
  const mainLibrary = String(value ?? "").trim();
  if (!mainLibrary) throw new Error("main_library_required");

  let query = supabase
    .from("libraries")
    .select("id, district_id, official_code")
    .eq("is_active", true)
    .limit(2);
  query = /^[0-9]{6}$/.test(mainLibrary)
    ? query.eq("official_code", mainLibrary)
    : query.eq("name", mainLibrary);

  const { data: libraries, error: libraryError } = await query;
  if (libraryError) throw new Error("main_library_lookup_failed");
  if ((libraries?.length ?? 0) !== 1 || !libraries![0].official_code) {
    throw new Error("main_library_not_unique_or_inactive");
  }

  const districtId = String(libraries![0].district_id);
  const { data: districts, error: districtError } = await supabase
    .from("districts")
    .select("id")
    .eq("id", districtId)
    .eq("is_active", true)
    .limit(2);
  if (districtError) throw new Error("analysis_district_lookup_failed");
  if ((districts?.length ?? 0) !== 1) throw new Error("analysis_district_inactive");

  return {
    districtId,
    libraryId: String(libraries![0].id),
    officialCode: String(libraries![0].official_code),
  };
}

async function resolveSurveySourceScope(
  supabase: ReturnType<typeof createServiceClient>,
  config: { districtCode: string; libraryCode: string; campaignId: string },
): Promise<SurveySourceScope> {
  const districtCode = validatedSourceCode(config.districtCode, "SURVEY_SOURCE_DISTRICT_CODE");
  const libraryCode = config.libraryCode ? validatedSourceCode(config.libraryCode, "SURVEY_SOURCE_LIBRARY_CODE") : "";
  const campaignId = validatedCampaignId(config.campaignId);

  const { data: districts, error: districtError } = await supabase
    .from("districts")
    .select("id, code")
    .eq("code", districtCode)
    .eq("is_active", true)
    .limit(2);
  if (districtError) throw new Error("district_lookup_failed");
  if ((districts?.length ?? 0) !== 1) throw new Error("district_code_not_unique_or_inactive");
  const districtId = String(districts![0].id);

  if (!libraryCode) {
    return { districtId, libraryId: null, campaignId };
  }

  const { data: libraries, error: libraryError } = await supabase
    .from("libraries")
    .select("id, code, district_id")
    .eq("district_id", districtId)
    .eq("code", libraryCode)
    .eq("is_active", true)
    .limit(2);
  if (libraryError) throw new Error("library_lookup_failed");
  if ((libraries?.length ?? 0) !== 1) throw new Error("library_code_not_unique_in_district_or_inactive");
  return { districtId, libraryId: String(libraries![0].id), campaignId };
}

function validatedSourceCode(value: string, name: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized)) {
    throw new Error(`${name.toLowerCase()}_invalid`);
  }
  return normalized;
}

function validatedCampaignId(value: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(normalized)) {
    throw new Error("survey_source_campaign_id_invalid");
  }
  return normalized;
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
    eventType: "submitted" | "blocked_duplicate" | "error";
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

function isUniqueViolation(error: { code?: string; message?: string; details?: string }, constraintNames: string[]) {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  return error.code === "23505" && constraintNames.some((constraintName) => text.includes(constraintName));
}

function isTruthyEnv(name: string) {
  return ["1", "true", "yes", "on"].includes(getEnv(name).toLowerCase());
}
