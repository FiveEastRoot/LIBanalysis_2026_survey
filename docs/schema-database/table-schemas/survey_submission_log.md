# survey_submission_log

조사폼 제출 과정의 운영 로그를 저장합니다. 정상 제출, 중복 거절, 검증 실패를 모두 기록해 운영 추적과 장애 분석에 사용합니다.

| Column | Type | Key | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | 로그 식별자 |
| `request_id` | `text` |  | 요청 추적용 |
| `received_at` | `timestamptz` |  | 서버 수신 시각 |
| `submitted_at` | `timestamptz` |  | 클라이언트 제출 시각 |
| `completed_fields` | `int` |  | 제출 시 진행도 계산값 |
| `total_fields` | `int` |  | 전체 export 대상 필드 수 |
| `client_path` | `text` |  | 제출 페이지 경로 |
| `user_agent` | `text` |  | 클라이언트 user agent |
| `event_type` | `text` |  | `submitted`, `duplicate_rejected`, `validation_failed` 등 |
| `message` | `text` |  | 운영 로그 메시지 |

## Constraints And Relations

- `request_id`로 `survey_analysis_export`, `survey_pii`와 같은 제출 흐름을 추적합니다.
- 개인정보 원문은 기록하지 않습니다.

