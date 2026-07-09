# Table Schemas

조사폼 및 조사결과 저장 구조에서 사용하는 Supabase 테이블별 스키마 문서입니다.

## Tables

| Table | Purpose |
| --- | --- |
| [`survey_analysis_export`](survey_analysis_export.md) | 분석용 응답 원천 저장 |
| [`survey_pii`](survey_pii.md) | 암호화된 전화번호와 개인정보 동의값 저장 |
| [`survey_submission_log`](survey_submission_log.md) | 제출/중복/검증 실패 등 운영 로그 저장 |
| [`auth_users`](auth_users.md) | Supabase Auth 사용자 참조 |
| [`dashboard_users`](dashboard_users.md) | 대시보드 업무 권한과 소속 범위 관리 |
| [`districts`](districts.md) | 자치구 기준정보 |
| [`libraries`](libraries.md) | 도서관 기준정보 |
| [`admin_export_log`](admin_export_log.md) | 관리자 다운로드/백업 작업 이력 |

