# survey_pii

개인정보성 운영 데이터를 분석용 응답과 분리해 저장하는 테이블입니다. 전화번호 원문은 저장하지 않고, 중복 확인용 해시와 복호화 가능한 암호문만 저장합니다.

| Column | Type | Key | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | PII 행 식별자 |
| `submission_id` | `uuid` | FK | `survey_analysis_export.id` 참조 |
| `request_id` | `text` |  | 요청 추적용 |
| `received_at` | `timestamptz` |  | 서버 수신 시각 |
| `submitted_at` | `timestamptz` |  | 클라이언트 제출 시각 |
| `consent_value` | `text` |  | 개인정보 취급위탁 동의값 |
| `phone_hash` | `text` | UK | HMAC-SHA256, 중복 제출 차단용 |
| `phone_encrypted` | `text` |  | AES-256-GCM 암호문 |
| `phone_encryption_version` | `text` |  | 암호화 키/알고리즘 버전 |

## Constraints And Relations

- `phone_hash`에는 unique index를 둡니다.
- 동일 전화번호가 다시 제출되면 DB unique constraint로 거절합니다.
- PII CSV export 대상이며, 분석용 CSV와 분리합니다.

