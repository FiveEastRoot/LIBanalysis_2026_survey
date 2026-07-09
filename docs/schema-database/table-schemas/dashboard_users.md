# dashboard_users

대시보드 업무 권한과 소속 범위를 관리하는 테이블입니다. Supabase Auth 로그인 이후 이 테이블을 조회해 일반 직원, 자치구 관리자, 시스템 전체 관리자 권한을 분기합니다.

| Column | Type | Key | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | 대시보드 사용자 프로필 id |
| `auth_user_id` | `uuid` | FK | Supabase Auth user id |
| `email` | `text` |  | 운영자 이메일 |
| `role` | `text` |  | `staff`, `district_admin`, `system_admin` |
| `district_id` | `uuid` | FK | 소속 자치구. 일반 직원/자치구 관리자에게 필요 |
| `library_id` | `uuid` | FK | 소속 도서관. 일반 직원에게 필요 |
| `created_by` | `uuid` | FK | 계정을 생성한 관리자 |
| `is_active` | `boolean` |  | 사용 여부 |
| `created_at` | `timestamptz` |  | 생성 시각 |
| `updated_at` | `timestamptz` |  | 수정 시각 |

## Constraints And Relations

- `auth_user_id`는 `auth_users.id`를 참조합니다.
- `district_id`는 `districts.id`를 참조합니다.
- `library_id`는 `libraries.id`를 참조합니다.
- `created_by`는 `dashboard_users.id`를 참조하는 자기참조입니다.
- 자치구 관리자 계정은 시스템 전체 관리자가 생성/배포합니다.
- 일반 직원 계정은 자치구 관리자가 생성하고 소속 자치구/도서관을 지정합니다.

