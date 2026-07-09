# Supabase Migration Draft

이 문서는 조사폼 원천 저장 구조의 첫 Supabase migration 초안을 설명합니다.

## Migration File

- `supabase/migrations/20260709093653_initial_survey_storage_schema.sql`
- Local Supabase project id: `libanalysis-v2-survey`

## Included Objects

| Object | Included |
| --- | --- |
| `survey_analysis_export` | 분석용 응답 JSONB 저장 |
| `survey_pii` | 동의값, `phone_hash`, `phone_encrypted`, `phone_encryption_version` 저장 |
| `survey_submission_log` | 제출/중복/검증 실패 운영 로그 |
| `districts` | 자치구 기준정보 |
| `libraries` | 도서관 기준정보 |
| `dashboard_users` | 대시보드 사용자 권한/소속 범위 |
| `admin_export_log` | 관리자 export/백업 감사 로그 |
| RLS | 전체 테이블 활성화 |
| Explicit grants | `service_role` 중심, `authenticated`는 기준정보/본인 프로필 조회만 |
| Seed data | 노원구/성북구/도봉구/중랑구, 노원구 도서관 목록 |

## Security Defaults

- `anon`에는 테이블 권한을 부여하지 않습니다.
- 공개 조사폼 제출은 브라우저가 DB에 직접 쓰지 않고 Netlify Function을 통해 처리합니다.
- 조사 응답, PII, 제출 로그, 관리자 export 로그는 `service_role` 서버 코드 경유를 전제로 합니다.
- `authenticated`는 `districts`, `libraries`, 본인의 `dashboard_users` row만 조회할 수 있는 최소 정책만 둡니다.
- 세부 관리자 조회/export 권한 정책은 대시보드 API 설계 단계에서 추가합니다.

## Verification Commands

Docker Desktop이 실행 중인 상태에서 다음 순서로 검증했습니다.

```powershell
npx supabase db start
npx supabase db reset
npx supabase migration list --local
npx supabase db lint
npx supabase db advisors
```

## Verification Result

| Check | Result |
| --- | --- |
| `npx supabase db reset` | Passed |
| `npx supabase migration list --local` | Local and remote local-dev migration versions matched |
| `npx supabase db lint` | Passed, no schema errors |
| `npx supabase db advisors` | Passed, no issues |
| Table creation | 7 public tables created |
| Seed data | 4 districts, 9 Nowon libraries |
| RLS | Enabled on all 7 public tables |
| Duplicate guard | Second insert with same `phone_hash` failed on `survey_pii_phone_hash_key` |

The local Supabase config uses non-default ports to avoid conflict with the existing `libanalysis-v2` local Supabase stack.

## Follow-Up Decisions

- `survey_analysis_export.analysis_payload`를 JSONB로 유지할지, 주요 컬럼을 별도 typed column/view로 펼칠지 결정
- 일반 직원 다운로드 로그를 `admin_export_log`에 포함할지 별도 download log로 분리할지 결정
- 관리자 API에서 service role을 사용할지, authenticated + RLS direct access를 일부 허용할지 결정
- 복호화 CSV 컬럼명을 `phone_decrypted` 또는 `phoneDecrypted` 중 하나로 확정
