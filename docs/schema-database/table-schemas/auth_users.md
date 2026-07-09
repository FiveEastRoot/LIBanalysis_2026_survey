# auth_users

Supabase Auth 사용자 테이블을 ERD에서 참조하기 위한 논리적 표기입니다. 실제 인증, 비밀번호, 세션 관리는 Supabase Auth가 담당합니다.

| Column | Type | Key | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Supabase Auth user id |
| `email` | `text` |  | 로그인 이메일 |

## Constraints And Relations

- `dashboard_users.auth_user_id`와 연결됩니다.
- 업무 권한, 자치구, 도서관 소속은 이 테이블이 아니라 `dashboard_users`에서 관리합니다.

