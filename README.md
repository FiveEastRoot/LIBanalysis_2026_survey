# LIBanalysis 2026 Survey

2026 공공도서관 서비스 성과조사 설문 전용 Netlify 배포 앱입니다.

## Routes

- `/` 또는 `/survey`: 실제 응답자용 설문 화면
- `/mockup`: 모바일 목업 + 운영 확인 테스트 화면
- `/survey-mockup`: 모바일 목업 단독 화면
- `/survey-review`: 웹 검토 화면과 export 확인 영역

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`

## Google Sheets 제출 연결

응답 제출은 브라우저에서 Google Sheets로 직접 보내지 않고, 같은 도메인의 Netlify Function `/api/submit-survey`를 거쳐 저장합니다.

조사 폼 문항 및 편의성 수정 작업표는 [docs/form-revision-worklist.md](docs/form-revision-worklist.md)에 정리되어 있습니다.

전달 구간 보안 처리 내역은 [docs/security-data-transfer.md](docs/security-data-transfer.md)에 정리되어 있습니다.

전화번호 암호화 및 로컬 복호화 절차는 [docs/phone-encryption-operations.md](docs/phone-encryption-operations.md)에 정리되어 있습니다.

Supabase 원천저장 및 관리자 대시보드 연계 목표 구조는 [docs/supabase-source-of-truth-plan.md](docs/supabase-source-of-truth-plan.md)에 정리되어 있습니다.

현재 운영 연결값:

- Google Sheet: `1vIzG0PwrPzUUBYfKIGkJHeWIKNzM-8munnUsZX7jKzs`
- Apps Script 배포 ID: `AKfycbxqcnhtxX72mHQXLia6No8j5gqsfRtMoWGLa2ENi134kQN5rJf0X9xLrljsqSyohq18`
- Apps Script Web App: `https://script.google.com/macros/s/AKfycbxqcnhtxX72mHQXLia6No8j5gqsfRtMoWGLa2ENi134kQN5rJf0X9xLrljsqSyohq18/exec`
- Apps Script 라이브러리: `https://script.google.com/macros/library/d/1hGkiLzLAQSXY4E2dOFiucYk5EsN1N6Negs4SWtCK4Cj0hMAzXiPpjn2R/2`

보안 구조:

- 브라우저에는 Google Apps Script URL과 비밀키를 노출하지 않습니다.
- Netlify Function이 전화번호 11자리, 개인정보 취급위탁 동의, payload 형식을 다시 검증합니다.
- Netlify Function이 전화번호를 `phoneHash`와 `phoneEncrypted`로 변환한 뒤 Apps Script로 전달합니다.
- Netlify Function은 HTTPS로 Apps Script Web App에 서버 간 전송합니다.
- Apps Script는 `SHEETS_WEBHOOK_SECRET`이 일치할 때만 시트에 저장합니다.
- 분석 응답은 `Analysis Export`, 암호화된 연락처/동의 정보는 `PII`, 운영 로그는 `Submission Log` 시트에 분리 저장합니다.
- 동일 전화번호의 `phoneHash`가 `PII` 시트에 이미 있으면 중복 제출로 거절합니다.

설정 순서:

1. Google Sheet `1vIzG0PwrPzUUBYfKIGkJHeWIKNzM-8munnUsZX7jKzs`에서 Apps Script를 엽니다.
2. `apps-script/sheets-webhook.gs` 내용을 붙여 넣습니다.
3. Apps Script 프로젝트 속성에 `SHEETS_WEBHOOK_SECRET`을 긴 랜덤 문자열로 저장합니다.
4. Apps Script를 Web App으로 배포합니다.
   - Execute as: 본인
   - Who has access: Anyone
5. Netlify 환경변수에 아래 값을 저장합니다.
   - `SHEETS_WEBHOOK_URL`: Apps Script Web App `/exec` URL
   - `SHEETS_WEBHOOK_SECRET`: Apps Script 프로젝트 속성과 같은 값
   - `PHONE_ENCRYPTION_KEY`: base64 인코딩된 32바이트 암호화 키
   - `PHONE_HASH_SECRET`: HMAC용 긴 랜덤 문자열
6. Netlify를 다시 배포한 뒤 실제 제출 테스트를 진행합니다.
