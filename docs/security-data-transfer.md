# Survey Submission Security Notes

이 문서는 설문 폼 페이지에서 Supabase 원천 저장소까지 응답이 전달되는 구간의 보안 처리 방식을 정리합니다. Google Sheets는 원천 저장소가 아니라 관리자 백업/export 대상입니다.

## Data Flow

```text
Respondent browser
  -> HTTPS
Netlify Function /api/submit-survey
  -> server-side payload validation
  -> phone normalization, HMAC hash, AES-256-GCM encryption
  -> Supabase service_role insert
Supabase
  -> survey_analysis_export
  -> survey_pii
  -> survey_submission_log
```

폼 페이지는 Supabase, Google Sheets, Apps Script로 직접 전송하지 않습니다. 응답자는 같은 Netlify 도메인의 `/api/submit-survey` 엔드포인트로만 제출하고, Netlify Function이 서버 측 환경변수에 저장된 Supabase service role key로 원천 DB에 저장합니다.

## Current Production Endpoints

- Netlify site: `https://libanalysis-2026-survey.netlify.app`
- Submit API: `https://libanalysis-2026-survey.netlify.app/api/submit-survey`
- Supabase project: `libanalysis-v2-survey`
- Supabase ref: `xerxcdneuvfoioiwhsxj`
- Supabase connection values are stored in Netlify production environment variables.

## Security Controls

| Area | Implementation | Status |
| --- | --- | --- |
| Transport encryption | Browser to Netlify and Netlify to Supabase use HTTPS. | Applied |
| Direct DB exposure | Browser code does not call Supabase directly for submission. | Applied |
| Service role handling | `SUPABASE_SERVICE_ROLE_KEY` is used only in Netlify Function runtime. | Applied |
| Phone encryption key handling | `PHONE_ENCRYPTION_KEY` is stored in Netlify environment variables and local operator decryption environment only. | Applied |
| Phone hash secret handling | `PHONE_HASH_SECRET` is stored in Netlify environment variables and used only for duplicate-check HMAC generation. | Applied |
| Repository secret safety | `.env.example` contains placeholders only. Real secrets are not committed. | Applied |
| HTTP method restriction | Netlify Function accepts only `POST`. | Applied |
| Content type restriction | Netlify Function accepts only `application/json`. | Applied |
| Request body limit | Netlify Function rejects bodies over `900,000` bytes. | Applied |
| Server-side payload validation | Netlify Function validates payload shape, phone number, consent value, progress fields, and allowlisted export fields. | Applied |
| Phone protection before storage | Netlify Function converts normalized phone number to `phone_hash` and `phone_encrypted` before DB insert. | Applied |
| PII separation | Analysis answers are stored in `survey_analysis_export`; consent and encrypted/hash phone fields are stored in `survey_pii`; operational events are stored in `survey_submission_log`. | Applied |
| Duplicate submission guard | `survey_pii.phone_hash` unique constraint rejects repeated completed submissions. | Applied |
| Plain phone exclusion | Supabase and Google Sheets backup store no raw phone number. | Applied |
| Response caching | Netlify Function responses include `Cache-Control: no-store`. | Applied |
| RLS | RLS is enabled on all survey tables. Server-only tables have no direct anon/authenticated policies. | Applied |

## Validation Rules

The Netlify Function performs the server-side gate:

- `analysisPayload` must be an object.
- `piiPayload` must be an object.
- `analysisPayload` keys must be part of the approved analysis export schema.
- `piiPayload` keys must be `P1-EXCLUDE` or `P2-EXCLUDE`.
- `piiPayload["P2-EXCLUDE"]` must contain exactly 11 digits after normalization.
- `piiPayload["P1-EXCLUDE"]` must equal `취급위탁에 동의`.
- `completedFields` and `totalFields` must be numbers.
- The normalized phone number is transformed into `phone_hash`, `phone_encrypted`, and `phone_encryption_version` before storage.

## Storage Separation

| Table | Purpose | PII included |
| --- | --- | --- |
| `survey_analysis_export` | Analysis-ready survey response values | No phone number |
| `survey_pii` | Consent, phone hash, encrypted phone value, encryption version | Encrypted only |
| `survey_submission_log` | Request ID, timestamps, progress, client path, user agent, event type | No phone number |

Analysis is planned as a file-upload workflow. The analysis program should use Analysis CSV exports only and should not receive PII exports.

Phone decryption is a separate local operator workflow documented in `docs/phone-encryption-operations.md`.

## Google Sheets Backup

Google Sheets backup is a later administrator action, not the live submission path. When backup is implemented, it should read from Supabase and preserve the same separation:

- Analysis data from `survey_analysis_export`
- PII data from `survey_pii`
- Operational logs from `survey_submission_log` or `admin_export_log`

## Remaining Security Considerations

| Item | Current state | Recommendation |
| --- | --- | --- |
| Rate limiting | No dedicated rate limiter is implemented. | Consider Netlify-level rate limiting, CAPTCHA/Turnstile, or additional phone/session throttling before high-volume public launch. |
| Admin export authorization | Not implemented in this repo yet. | Implement via dashboard API and `dashboard_users` scope checks. |
| PII at rest | Phone numbers are stored as AES-256-GCM encrypted values plus HMAC hashes. | Keep decryption key outside GitHub and restrict it to authorized operators. |
| Test data | Local and remote test submissions may be created during integration testing. | Delete test rows before production start. |
