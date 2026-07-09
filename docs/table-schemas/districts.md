# districts

자치구 기준정보를 관리합니다.

| Column | Type | Key | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | 자치구 식별자 |
| `name` | `text` |  | 자치구명 |
| `code` | `text` |  | 자치구 코드 |
| `is_active` | `boolean` |  | 사용 여부 |

## Constraints And Relations

- `libraries.district_id`와 연결됩니다.
- `dashboard_users.district_id`와 연결되어 자치구 관리자/일반 직원의 데이터 범위를 제한합니다.

