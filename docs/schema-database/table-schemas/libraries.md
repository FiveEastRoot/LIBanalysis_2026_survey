# libraries

도서관 기준정보를 관리합니다. 각 도서관은 하나의 자치구에 소속됩니다.

| Column | Type | Key | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | 도서관 식별자 |
| `district_id` | `uuid` | FK | 소속 자치구 |
| `name` | `text` |  | 도서관명 |
| `code` | `text` |  | 도서관 코드 |
| `is_active` | `boolean` |  | 사용 여부 |

## Constraints And Relations

- `district_id`는 `districts.id`를 참조합니다.
- `dashboard_users.library_id`와 연결되어 일반 직원의 데이터 범위를 소속 도서관으로 제한합니다.

