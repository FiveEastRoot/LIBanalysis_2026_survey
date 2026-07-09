# admin_export_log

관리자 다운로드와 Google Sheets 백업 작업 이력을 기록합니다. 권한 범위별 export가 실제로 언제, 누가, 몇 건을 대상으로 수행했는지 추적합니다.

| Column | Type | Key | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | 로그 식별자 |
| `admin_user_id` | `uuid` | FK | 작업 수행자 |
| `action_type` | `text` |  | `backup_google_sheets`, `export_analysis_csv`, `export_pii_csv`, `export_combined_csv` |
| `created_at` | `timestamptz` |  | 작업 시각 |
| `row_count` | `int` |  | 대상 행 수 |
| `result_status` | `text` |  | `success`, `failed` |
| `message` | `text` |  | 실패/성공 메시지 |

## Constraints And Relations

- `admin_user_id`는 `dashboard_users.id`를 참조합니다.
- 일반 직원 다운로드 로그를 이 테이블에 포함할지, 별도 download log로 분리할지는 구현 단계에서 확정합니다.

