# Supabase Source Of Truth Plan

이 문서는 2026 공공도서관 서비스 성과조사 응답 저장소를 Google Sheets 중심 구조에서 Supabase 원천저장 구조로 전환하기 위한 목표 설계를 정리합니다.

## Direction

Supabase를 조사 응답의 원천 저장소로 사용합니다. Google Sheets는 원천 저장소가 아니라 관리자 백업 기능의 출력 대상입니다.

```text
Survey form
  -> Netlify Function
  -> phone validation, phoneHash, phoneEncrypted
  -> Supabase database
  -> Admin dashboard
       -> Backup to Google Sheets
       -> Export CSV
       -> Dashboard views
```

## Role Model

관리자 페이지와 권한 분기는 조사 대시보드에서 처리합니다.

| Role | Purpose | Allowed actions |
| --- | --- | --- |
| 일반 직원 | 소속 도서관 조사 현황 확인 및 원자료 저장 | 소속 도서관 데이터만 조회/저장/다운로드 |
| 자치구 관리자 | 자치구 단위 조사 운영, 직원 계정 관리, 백업/export | 해당 자치구 통합 데이터 다운로드, Google Sheets 백업, 일반 직원 계정 생성 |
| 시스템 전체 관리자 | 전체 자치구 운영 관리 | 전체 데이터 다운로드/백업, 자치구 관리자 계정 생성/배포 및 기준정보 관리 |

일반 직원도 원자료 저장/다운로드가 가능하지만, 범위는 해당 직원이 소속된 도서관 데이터로 제한합니다. 자치구 관리자는 해당 자치구 데이터를 통합으로 다운로드할 수 있고, 시스템 전체 관리자는 전체 자치구 데이터를 관리합니다.

## Storage Principle

- 원천 저장은 Supabase입니다.
- 전화번호 원문은 DB에 저장하지 않습니다.
- DB에는 `phone_hash`, `phone_encrypted`, `phone_encryption_version`만 저장합니다.
- 중복 응답 방지는 `phone_hash` unique constraint로 처리합니다.
- 분석용 데이터와 개인정보성 운영 데이터는 분리 저장합니다.
- 대시보드 로그인/권한 정보에는 역할, 소속 자치구, 소속 도서관을 저장합니다.

## Proposed Tables

현재 Google Sheets의 탭 구조를 기준으로 Supabase 테이블을 설계합니다. 여기에 대시보드 운영 기능과 권한 정보를 추가합니다.

### `survey_analysis_export`

현재 `Analysis Export` 시트와 같은 역할입니다.

| Column | Notes |
| --- | --- |
| `id` | UUID primary key |
| `request_id` | Netlify request id 또는 서버 생성 id |
| `received_at` | 서버 수신 시각 |
| `submitted_at` | 클라이언트 제출 시각 |
| `analysis_payload` | 문항 코드별 응답 JSONB |

초기에는 문항 변경 가능성을 고려해 `analysis_payload jsonb` 중심으로 저장합니다. 대시보드와 CSV export 단계에서 현재 시트와 동일한 컬럼 구조로 펼치는 view 또는 export 로직을 둡니다.

### `survey_pii`

현재 `PII` 시트와 같은 역할입니다.

| Column | Notes |
| --- | --- |
| `id` | UUID primary key |
| `submission_id` | `survey_analysis_export.id` reference |
| `request_id` | 요청 추적용 |
| `received_at` | 서버 수신 시각 |
| `submitted_at` | 클라이언트 제출 시각 |
| `consent_value` | 개인정보 취급위탁 동의값 |
| `phone_hash` | HMAC-SHA256, unique |
| `phone_encrypted` | AES-256-GCM 암호문 |
| `phone_encryption_version` | 암호화 버전 |

`phone_hash`에는 unique index를 설정합니다. 같은 전화번호로 다시 제출하면 DB 단계에서 거절됩니다.

### `survey_submission_log`

현재 `Submission Log` 시트와 같은 역할입니다.

| Column | Notes |
| --- | --- |
| `id` | UUID primary key |
| `request_id` | 요청 추적용 |
| `received_at` | 서버 수신 시각 |
| `submitted_at` | 클라이언트 제출 시각 |
| `completed_fields` | 제출 시 진행도 계산값 |
| `total_fields` | 전체 export 대상 필드 수 |
| `client_path` | 제출 페이지 경로 |
| `user_agent` | 클라이언트 user agent |
| `event_type` | submitted, duplicate_rejected, validation_failed 등 |
| `message` | 운영 로그 메시지 |

### `dashboard_users`

대시보드 로그인과 역할을 관리합니다.

| Column | Notes |
| --- | --- |
| `id` | UUID primary key |
| `auth_user_id` | Supabase Auth user id 또는 외부 로그인 식별자 |
| `email` | 운영자 이메일 |
| `role` | `staff`, `district_admin`, `system_admin` |
| `district_id` | 소속 자치구. 일반 직원/자치구 관리자에게 필요 |
| `library_id` | 소속 도서관. 일반 직원에게 필요 |
| `created_by` | 계정을 생성한 관리자 |
| `is_active` | 사용 여부 |
| `created_at` | 생성 시각 |
| `updated_at` | 수정 시각 |

자치구별 자치구 관리자 계정은 1개를 기본 원칙으로 합니다. 시스템 전체 관리자가 자치구 관리자 계정을 생성해 각 자치구에 배포하고, 자치구 관리자는 일반 직원 계정을 생성하면서 어느 자치구의 어느 도서관 소속인지 지정합니다.

### `districts`

자치구 기준정보입니다.

| Column | Notes |
| --- | --- |
| `id` | UUID primary key |
| `name` | 자치구명 |
| `code` | 자치구 코드 |
| `is_active` | 사용 여부 |

### `libraries`

도서관 기준정보입니다.

| Column | Notes |
| --- | --- |
| `id` | UUID primary key |
| `district_id` | 소속 자치구 |
| `name` | 도서관명 |
| `code` | 도서관 코드 |
| `is_active` | 사용 여부 |

### `admin_export_log`

관리자 다운로드와 백업 작업을 기록합니다.

| Column | Notes |
| --- | --- |
| `id` | UUID primary key |
| `admin_user_id` | 작업 수행자 |
| `action_type` | `backup_google_sheets`, `export_analysis_csv`, `export_pii_csv`, `export_combined_csv` |
| `created_at` | 작업 시각 |
| `row_count` | 대상 행 수 |
| `result_status` | success, failed |
| `message` | 실패/성공 메시지 |

## Admin Dashboard Actions

| Action | Result | Role |
| --- | --- | --- |
| 백업 | Supabase 데이터를 Google Sheets로 내보냄 | 관리자 |
| 도서관 범위 원자료 저장/다운로드 | 소속 도서관 데이터만 다운로드 | 일반 직원 |
| 자치구 Analysis CSV export | 해당 자치구 분석용 응답만 CSV 다운로드 | 자치구 관리자 |
| 자치구 PII CSV export | 해당 자치구 암호화 전화번호/동의 정보만 CSV 다운로드 | 자치구 관리자 |
| 전체 Analysis/PII export | 전체 자치구 파일 다운로드 | 시스템 전체 관리자 |
| 일반 직원 계정 생성 | 직원의 자치구/도서관 소속 지정 | 자치구 관리자 |
| 자치구 관리자 계정 생성/배포 | 자치구별 관리자 계정을 생성해 배포 | 시스템 전체 관리자 |
| 대시보드 조회 | 권한 범위별 집계/현황 화면 조회 | 일반 직원, 자치구 관리자, 시스템 전체 관리자 |

## Export Separation

CSV export는 최소 2가지로 분리합니다.

| Export | Contains | Excludes |
| --- | --- | --- |
| Analysis CSV | `Analysis Export`와 동일한 분석 응답 컬럼 | `phone_hash`, `phone_encrypted`, 복호화 전화번호 |
| PII CSV | `request_id`, 동의값, `phone_hash`, `phone_encrypted`, `phone_encryption_version` | 설문 분석 응답 |

필요 시 관리자 전용으로 결합 export를 둘 수 있지만, 기본 운영은 분석 파일과 개인정보 파일을 분리합니다.

## Google Sheets Backup

자치구 관리자 또는 시스템 전체 관리자 페이지에서 `백업`을 누르면 권한 범위에 맞는 Supabase 데이터를 Google Sheets로 내보냅니다.

백업 시트 구조는 현재와 동일하게 유지합니다.

- `Analysis Export`
- `PII`
- `Submission Log`

Google Sheets는 운영 편의용 백업/확인 수단이며 원천 데이터는 Supabase에 둡니다.

## Dashboard Integration

대시보드는 Supabase에서 직접 읽는 구조를 우선합니다.

- 일반 직원 뷰: 소속 도서관 집계/현황, 분석 전 홈 화면에서 해당 도서관 원자료 저장/다운로드
- 자치구 관리자 뷰: 설정 페이지 표시, 일반 직원 계정 생성, 자치구 통합 백업/export, 운영 로그 조회
- 시스템 전체 관리자 뷰: 설정 페이지 표시, 자치구 관리자 계정 생성/배포, 기준정보 관리, 전체 백업/export
- 분석용 대시보드는 `survey_analysis_export` 또는 분석용 view를 기준으로 구성
- PII 관련 export는 자치구 관리자/시스템 전체 관리자 기능에서만 접근

## Security Notes

- 브라우저에서 Supabase에 직접 insert하지 않습니다.
- Netlify Function만 Supabase service role key를 사용합니다.
- service role key는 Netlify 환경변수에만 저장합니다.
- 원문 전화번호는 Netlify Function에서만 일시 처리합니다.
- DB에는 암호화/해시 처리된 전화번호만 저장합니다.
- 관리자 다운로드와 백업은 `admin_export_log`에 기록합니다.
- 대시보드에서 일반 직원, 자치구 관리자, 시스템 전체 관리자 역할을 분리합니다.
- 일반 직원 다운로드는 소속 도서관 범위로 제한합니다.
- 자치구 관리자 다운로드는 해당 자치구 범위로 제한합니다.

## Migration Notes

1. 현재 Google Sheets 구조를 기준으로 Supabase 테이블과 export view를 만듭니다.
2. Netlify Function의 저장 대상을 Apps Script Webhook에서 Supabase insert로 변경합니다.
3. `phone_hash` unique constraint로 중복 응답을 차단합니다.
4. 관리자 대시보드에서 Google Sheets 백업과 CSV export를 구현합니다.
5. 분석 대시보드는 Supabase 분석용 view 또는 Analysis CSV 구조에 맞춰 개편합니다.
