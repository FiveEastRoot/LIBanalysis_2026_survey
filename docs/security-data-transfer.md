# Survey To Sheets Security Notes

이 문서는 설문 폼 페이지에서 Google Sheets까지 응답이 전달되는 구간의 보안 처리 방식을 정리합니다.

## Data Flow

```text
Respondent browser
  -> HTTPS
Netlify Function /api/submit-survey
  -> HTTPS server-to-server request with shared secret
Google Apps Script Web App
  -> SpreadsheetApp write
Google Sheets
```

폼 페이지는 Google Apps Script Web App이나 Google Sheets API로 직접 전송하지 않습니다. 응답자는 같은 Netlify 도메인의 `/api/submit-survey` 엔드포인트로만 제출하고, Netlify Function이 서버 측 환경변수에 저장된 Webhook URL과 비밀키를 사용해 Apps Script로 중계합니다.

## Current Production Endpoints

- Netlify site: `https://libanalysis-2026-survey.netlify.app`
- Submit API: `https://libanalysis-2026-survey.netlify.app/api/submit-survey`
- Google Sheet: `1vIzG0PwrPzUUBYfKIGkJHeWIKNzM-8munnUsZX7jKzs`
- Apps Script deployment ID: `AKfycbxqcnhtxX72mHQXLia6No8j5gqsfRtMoWGLa2ENi134kQN5rJf0X9xLrljsqSyohq18`
- Apps Script Web App: `https://script.google.com/macros/s/AKfycbxqcnhtxX72mHQXLia6No8j5gqsfRtMoWGLa2ENi134kQN5rJf0X9xLrljsqSyohq18/exec`

## Security Controls

| Area | Implementation | Status |
| --- | --- | --- |
| Transport encryption | Netlify and Apps Script endpoints use HTTPS. | Applied |
| Direct Sheets exposure | Browser code does not call Google Sheets or Apps Script directly. | Applied |
| Webhook URL handling | Apps Script Web App URL is stored in Netlify environment variable `SHEETS_WEBHOOK_URL`. | Applied |
| Secret handling | Shared secret is stored only in Netlify environment variable `SHEETS_WEBHOOK_SECRET` and Apps Script Properties. | Applied |
| Repository secret safety | `.env.example` contains placeholders only. Real secret is not committed. | Applied |
| HTTP method restriction | Netlify Function accepts only `POST`. | Applied |
| Content type restriction | Netlify Function accepts only `application/json`. | Applied |
| Request body limit | Netlify Function rejects bodies over `900,000` bytes. | Applied |
| Server-side payload validation | Netlify Function validates payload shape, phone number, consent value, and progress fields before forwarding. | Applied |
| Export field allowlist | Netlify Function rejects unknown analysis or PII fields, preventing accidental columns such as `TEST`. | Applied |
| Webhook authentication | Apps Script compares request `secret` with Script Properties before writing. | Applied |
| Webhook-side field filtering | Apps Script stores only approved analysis and PII fields even if an unexpected key reaches the webhook. | Applied |
| PII separation | Analysis answers are written to `Analysis Export`; consent and phone are written to `PII`; operational metadata is written to `Submission Log`. | Applied |
| Phone exclusion from analysis export | Phone number is not included in `Analysis Export`. | Applied |
| Duplicate submission guard | Apps Script rejects a submission when the normalized phone already exists in `PII`. | Applied |
| Phone value preservation | Apps Script stores `P2-EXCLUDE` as a string so leading zero is preserved. | Applied and tested |
| Response caching | Netlify Function responses include `Cache-Control: no-store`. | Applied |

## Validation Rules

The Netlify Function performs the first server-side gate:

- `analysisPayload` must be an object.
- `piiPayload` must be an object.
- `analysisPayload` keys must be part of the approved analysis export schema.
- `piiPayload` keys must be `P1-EXCLUDE` or `P2-EXCLUDE`.
- `piiPayload["P2-EXCLUDE"]` must contain exactly 11 digits after normalization.
- `piiPayload["P1-EXCLUDE"]` must equal `취급위탁에 동의`.
- `completedFields` and `totalFields` must be numbers.

The Apps Script Web App performs the second gate:

- Request `secret` must match Script Properties.
- Phone number must be exactly 11 digits after normalization.
- Phone number must not already exist in the `PII` sheet.
- Unknown analysis or PII keys are filtered out before sheet headers and rows are written.

## Storage Separation

| Sheet tab | Purpose | PII included |
| --- | --- | --- |
| `Analysis Export` | Analysis-ready survey response values | No phone number |
| `PII` | Consent and phone number for identity/duplicate checks | Yes |
| `Submission Log` | Request ID, timestamps, progress, client path, user agent | No phone number |

Analysis is planned as a file-upload workflow. The analysis program should use `Analysis Export` only and should not receive the `PII` sheet.

## Verified Behavior

- Netlify to Apps Script submission succeeded through the production URL.
- Apps Script created and writes to `Analysis Export`, `PII`, and `Submission Log`.
- After Apps Script redeployment, `P2-EXCLUDE` was verified to store `010...` phone numbers as string values.

## Known Operational Tasks

- Remove test rows before production collection.
- Remove the temporary `TEST` column from `Analysis Export` if present. It was created by early connectivity tests and is not part of the real export schema. New submissions are now blocked/filtered from creating it again.
- Keep Google Sheet sharing restricted to the minimum required operators.
- Keep Apps Script project access restricted to operators who manage the integration.
- Rotate `SHEETS_WEBHOOK_SECRET` when an operator leaves or if exposure is suspected.

## Remaining Security Considerations

| Item | Current state | Recommendation |
| --- | --- | --- |
| Rate limiting | No dedicated rate limiter is implemented. | Consider Netlify-level rate limiting, CAPTCHA/Turnstile, or additional phone/session throttling before high-volume public launch. |
| Webhook signing | Uses a static shared secret. | For stronger replay resistance, add HMAC signature with timestamp and reject stale requests. |
| PII at rest | Phone numbers are stored in Google Sheets as plain text in the restricted `PII` tab. | If required by policy, store encrypted phone values or split operational lookup from visible PII. |
| Sheet permission governance | Controlled outside code by Google Drive sharing. | Review sharing before launch and remove link-wide edit access. |
| Test data | Connectivity tests may remain in sheet tabs. | Delete test rows and columns before production start. |
