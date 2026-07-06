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

function safeString(value: unknown) {
  return typeof value === "string" ? value.slice(0, 240) : "";
}
