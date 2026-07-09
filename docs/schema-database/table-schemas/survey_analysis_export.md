# survey_analysis_export

분석용 응답을 저장하는 원천 테이블입니다. 개인정보는 포함하지 않고, 문항 코드별 응답은 `analysis_payload`에 JSONB로 저장합니다.

| Column | Type | Key | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | 제출 건 식별자 |
| `request_id` | `text` |  | Netlify request id 또는 서버 생성 id |
| `received_at` | `timestamptz` |  | 서버 수신 시각 |
| `submitted_at` | `timestamptz` |  | 클라이언트 제출 시각 |
| `analysis_payload` | `jsonb` |  | 문항 코드별 응답 JSON |

## Constraints And Relations

- `survey_pii.submission_id`와 1:1로 연결됩니다.
- `request_id`를 기준으로 `survey_submission_log`와 운영 로그를 추적합니다.
- CSV export 또는 대시보드 조회 단계에서 현재 분석 파일 컬럼 구조로 펼치는 view/export 로직을 둡니다.

