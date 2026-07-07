import type { Config, Context } from "@netlify/functions";

type SurveySubmission = {
  analysisPayload?: Record<string, unknown>;
  piiPayload?: Record<string, unknown>;
  completedFields?: number;
  totalFields?: number;
  submittedAt?: string;
  clientPath?: string;
};

type SheetsWebhookResult = {
  ok?: boolean;
  duplicate?: boolean;
  message?: string;
};

const maxBodyBytes = 900_000;
const consentValue = "취급위탁에 동의";
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

  const webhookUrl = Netlify.env.get("SHEETS_WEBHOOK_URL");
  const webhookSecret = Netlify.env.get("SHEETS_WEBHOOK_SECRET");
  if (!webhookUrl || !webhookSecret) {
    return json({ ok: false, message: "제출 저장소가 아직 설정되지 않았습니다." }, 503);
  }

  let submission: SurveySubmission;
  try {
    submission = await req.json();
  } catch {
    return json({ ok: false, message: "요청 본문을 읽을 수 없습니다." }, 400);
  }

  const validationMessage = validateSubmission(submission);
  if (validationMessage) {
    return json({ ok: false, message: validationMessage }, 400);
  }

  const upstreamResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret: webhookSecret,
      requestId: context.requestId,
      receivedAt: new Date().toISOString(),
      client: {
        path: safeString(submission.clientPath),
        userAgent: req.headers.get("user-agent") ?? "",
        ip: context.ip ?? "",
      },
      analysisPayload: submission.analysisPayload,
      piiPayload: submission.piiPayload,
      completedFields: submission.completedFields,
      totalFields: submission.totalFields,
      submittedAt: submission.submittedAt,
    }),
  });

  const result = await readWebhookResult(upstreamResponse);
  if (!upstreamResponse.ok || result.ok === false) {
    return json(
      {
        ok: false,
        duplicate: Boolean(result.duplicate),
        message: result.message || "Google Sheets 저장에 실패했습니다.",
      },
      result.duplicate ? 409 : 502,
    );
  }

  return json({ ok: true, requestId: context.requestId });
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

  const phone = String(submission.piiPayload["P2-EXCLUDE"] ?? "").replace(/[^\d]/g, "");
  if (!/^\d{11}$/.test(phone)) {
    return "휴대폰 번호는 숫자 11자리여야 합니다.";
  }

  if (String(submission.piiPayload["P1-EXCLUDE"] ?? "") !== consentValue) {
    return "개인정보 취급위탁 동의가 필요합니다.";
  }

  if (typeof submission.completedFields !== "number" || typeof submission.totalFields !== "number") {
    return "진행도 정보가 올바르지 않습니다.";
  }

  return "";
}

async function readWebhookResult(response: Response): Promise<SheetsWebhookResult> {
  try {
    const value = await response.json();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
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
