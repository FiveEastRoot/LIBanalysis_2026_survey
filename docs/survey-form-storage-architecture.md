# 조사폼 및 조사결과 저장 구조

이 문서는 LIBanalysis-v2의 기존 대시보드 문서와 분리하여, 조사폼 제출과 조사결과 원천 저장 구조만 다룹니다.

## 문서 범위

- 조사폼 응답 제출 흐름
- 전화번호 암호화 및 중복 응답 방지
- Supabase 원천 저장 구조
- 관리자/일반 직원 권한에 따른 운영 흐름
- Google Sheets 백업과 CSV export 흐름
- 향후 작업 안건

## 핵심 결정

| 항목 | 결정 |
| --- | --- |
| 원천 저장소 | Supabase |
| Google Sheets 역할 | 원천 저장소가 아니라 관리자 백업 출력 대상 |
| 중복 응답 방지 | `phone_hash` unique constraint |
| 전화번호 저장 | 원문 미저장, `phone_hash`와 `phone_encrypted`만 저장 |
| 관리자 페이지 | 대시보드 로그인 이후 자치구 관리자/시스템 전체 관리자 권한에 따라 설정·백업·다운로드 범위 분기 |
| 일반 직원 페이지 | 소속 도서관 데이터만 홈 화면에서 저장/다운로드 가능 |
| CSV export | 분석용 파일과 개인정보 파일 분리 |

## 전체 운영 구조

```mermaid
flowchart TD
    A["응답자<br/>조사 폼 작성"] --> B["Netlify Function<br/>/api/submit-survey"]

    B --> C["서버 측 검증"]
    C --> C1["문항 payload 구조 검증"]
    C --> C2["개인정보 취급위탁 동의 확인"]
    C --> C3["전화번호 11자리 검증"]
    C --> C4["허용된 문항 코드만 통과"]

    C --> D["전화번호 보호 처리"]
    D --> D1["phone_hash 생성<br/>HMAC-SHA256<br/>중복 응답 방지용"]
    D --> D2["phone_encrypted 생성<br/>AES-256-GCM<br/>사후 복호화용"]
    D --> D3["phone_encryption_version 부여"]

    D --> E["Supabase DB<br/>원천 저장소"]

    E --> F["survey_analysis_export<br/>분석용 응답"]
    E --> G["survey_pii<br/>암호화된 개인정보"]
    E --> H["survey_submission_log<br/>제출/운영 로그"]
    E --> I["dashboard_users<br/>역할 + 소속 자치구/도서관"]
    E --> I2["districts / libraries<br/>자치구·도서관 기준정보"]
    E --> J["admin_export_log<br/>관리자 export/백업 로그"]

    G --> G1["phone_hash unique index<br/>반복 응답 차단"]
    G --> G2["phone_encrypted<br/>원문 전화번호 미저장"]

    E --> K["대시보드"]

    K --> L["일반 직원 뷰"]
    L --> L1["집계 현황 조회"]
    L --> L2["소속 도서관 데이터 저장/다운로드"]
    L --> L3["PII 접근 불가"]

    K --> M["자치구 관리자 뷰"]
    M --> M1["자치구 통합 현황 조회"]
    M --> M2["자치구 통합 Analysis CSV export"]
    M --> M3["자치구 통합 PII CSV export"]
    M --> M4["자치구 Google Sheets 백업"]
    M --> M5["일반 직원 계정 생성/소속 관리"]

    K --> Z["시스템 전체 관리자 뷰"]
    Z --> Z1["전체 자치구 통합 조회"]
    Z --> Z2["전체 데이터 export/백업"]
    Z --> Z3["자치구 관리자 계정 관리"]
    Z --> Z4["기준정보/시스템 설정 관리"]

    M2 --> N["분석용 CSV<br/>전화번호 없음"]
    M3 --> O["PII CSV<br/>phone_hash + phone_encrypted"]
    M4 --> P["Google Sheets 백업"]
    Z2 --> N
    Z2 --> O
    Z2 --> P

    P --> P1["Analysis Export"]
    P --> P2["PII"]
    P --> P3["Submission Log"]

    O --> Q["로컬 복호화 환경"]
    Q --> Q1["PHONE_ENCRYPTION_KEY 사용"]
    Q --> Q2["phoneDecrypted 생성"]
    Q --> Q3["답례 발송/운영 확인 등에 제한 사용"]
```

## 제출 흐름

```mermaid
sequenceDiagram
    participant User as 응답자
    participant Form as 조사 폼
    participant API as Netlify Function
    participant DB as Supabase DB

    User->>Form: 설문 작성 및 휴대폰 번호 입력
    Form->>API: HTTPS 제출

    API->>API: payload 구조 검증
    API->>API: 문항 코드 allowlist 검증
    API->>API: 개인정보 취급위탁 동의 확인
    API->>API: 전화번호 11자리 검증
    API->>API: phone_hash 생성
    API->>API: phone_encrypted 생성
    API->>API: 원문 전화번호 제거

    API->>DB: survey_analysis_export insert
    API->>DB: survey_pii insert with phone_hash unique

    alt phone_hash already exists
        DB-->>API: unique constraint violation
        API->>DB: survey_submission_log duplicate_rejected 기록
        API-->>Form: 중복 제출 안내
    else new phone_hash
        DB-->>API: 저장 성공
        API->>DB: survey_submission_log submitted 기록
        API-->>Form: 제출 완료
    end
```

## DB 구조

```mermaid
erDiagram
    survey_analysis_export {
        uuid id PK
        text request_id
        timestamptz received_at
        timestamptz submitted_at
        jsonb analysis_payload
    }

    survey_pii {
        uuid id PK
        uuid submission_id FK
        text request_id
        timestamptz received_at
        timestamptz submitted_at
        text consent_value
        text phone_hash UK
        text phone_encrypted
        text phone_encryption_version
    }

    survey_submission_log {
        uuid id PK
        text request_id
        timestamptz received_at
        timestamptz submitted_at
        int completed_fields
        int total_fields
        text client_path
        text user_agent
        text event_type
        text message
    }

    dashboard_users {
        uuid id PK
        uuid auth_user_id
        text email
        text role
        uuid district_id FK
        uuid library_id FK
        uuid created_by FK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    districts {
        uuid id PK
        text name
        text code
        boolean is_active
    }

    libraries {
        uuid id PK
        uuid district_id FK
        text name
        text code
        boolean is_active
    }

    admin_export_log {
        uuid id PK
        uuid admin_user_id FK
        text action_type
        timestamptz created_at
        int row_count
        text result_status
        text message
    }

    survey_analysis_export ||--|| survey_pii : "has encrypted PII"
    survey_analysis_export ||--o{ survey_submission_log : "tracked by request_id"
    districts ||--o{ libraries : "contains"
    districts ||--o{ dashboard_users : "scopes district admins"
    libraries ||--o{ dashboard_users : "scopes staff"
    dashboard_users ||--o{ admin_export_log : "performs admin actions"
```

## 데이터 산출물 분리 구조

```mermaid
flowchart LR
    A["Supabase 원천 데이터"] --> B["Analysis Export View"]
    A --> C["PII Export View"]
    A --> D["Dashboard Aggregation View"]
    A --> E["Admin Log View"]

    B --> B1["분석용 CSV"]
    B --> B2["분석 대시보드"]
    B --> B3["Google Sheets<br/>Analysis Export"]

    C --> C1["PII CSV"]
    C --> C2["Google Sheets<br/>PII"]
    C --> C3["로컬 복호화"]

    D --> D1["일반 직원 현황판<br/>소속 도서관 범위"]
    D --> D2["자치구 관리자 현황판<br/>자치구 범위"]
    D --> D3["시스템 관리자 현황판<br/>전체 범위"]

    E --> E1["관리자 작업 이력"]
    E --> E2["백업/export 감사 로그"]
```

## 권한 및 운영 흐름

```mermaid
flowchart TD
    A["대시보드 로그인"] --> B{"역할 확인"}

    B -->|일반 직원| C["일반 직원 뷰"]
    C --> C1["조사 현황 조회"]
    C --> C2["집계/분석 화면 조회"]
    C --> C3["소속 도서관 데이터 저장/다운로드"]
    C --> C4["PII 접근 불가"]
    C --> C5["별도 설정 페이지 없음<br/>분석 전 홈 화면에서 저장"]

    B -->|자치구 관리자| D["자치구 관리자 뷰"]
    D --> D1["자치구 통합 조사 현황 조회"]
    D --> D2["자치구 통합 Analysis CSV 다운로드"]
    D --> D3["자치구 통합 PII CSV 다운로드"]
    D --> D4["자치구 Google Sheets 백업 실행"]
    D --> D5["일반 직원 계정 생성"]
    D --> D6["직원 소속 자치구/도서관 관리"]

    D2 --> E["admin_export_log 기록"]
    D3 --> E
    D4 --> E

    B -->|시스템 전체 관리자| F["시스템 전체 관리자 뷰"]
    F --> F1["전체 자치구 통합 조회"]
    F --> F2["전체 Analysis/PII CSV 다운로드"]
    F --> F3["전체 Google Sheets 백업"]
    F --> F4["자치구 관리자 계정 관리"]
    F --> F5["자치구/도서관 기준정보 관리"]
    F2 --> E
    F3 --> E
```

## 관리자 작업별 문서화 안건

| 작업 | 설명 | 권한 | 로그 |
| --- | --- | --- | --- |
| 조사 응답 저장 | Netlify Function이 검증/암호화 후 Supabase에 저장 | 서버 전용 | `survey_submission_log` |
| 중복 제출 차단 | `phone_hash` unique constraint로 차단 | 서버/DB | `survey_submission_log` |
| 일반 직원 저장/다운로드 | 소속 도서관 데이터만 저장/다운로드 | 일반 직원 | 필요 시 `admin_export_log` 또는 별도 download log |
| 자치구 통합 Analysis CSV export | 해당 자치구 데이터만 분석용 CSV로 다운로드 | 자치구 관리자 | `admin_export_log` |
| 자치구 통합 PII CSV export | 해당 자치구의 암호화 개인정보 파일 다운로드 | 자치구 관리자 | `admin_export_log` |
| 전체 Analysis/PII export | 전체 자치구 통합 파일 다운로드 | 시스템 전체 관리자 | `admin_export_log` |
| Google Sheets 백업 | 권한 범위에 맞춰 현재 시트 구조와 같은 탭으로 백업 | 자치구 관리자, 시스템 전체 관리자 | `admin_export_log` |
| 일반 직원 계정 생성 | 자치구 관리자가 직원 계정과 소속 도서관 지정 | 자치구 관리자 | 계정 관리 로그 |
| 자치구 관리자 계정 생성/배포 | 시스템 전체 관리자가 자치구별 관리자 계정을 생성하고 배포 | 시스템 전체 관리자 | 계정 관리 로그 |
| 로컬 복호화 | PII CSV를 로컬 키로 복호화 | 지정 운영자 | 로컬 보안 절차 |

## 작업 우선순위

1. Supabase schema 초안 작성
2. `phone_hash` unique constraint 포함 migration 작성
3. Netlify Function 저장 대상을 Supabase로 전환
4. 기존 Apps Script/Google Sheets 저장 흐름을 백업 기능으로 재배치
5. 일반 직원/자치구 관리자/시스템 전체 관리자 권한 모델 정의
6. 시스템 전체 관리자에 의한 자치구 관리자 계정 생성/배포 흐름 정의
7. 자치구 관리자에 의한 일반 직원 계정 생성 및 소속 관리 흐름 정의
8. 권한 범위별 Analysis CSV / PII CSV export 규격 확정
9. Google Sheets 백업 규격 확정
10. 분석 대시보드 입력 구조와 Supabase view/export 매핑

## 로컬 관련 문서

- `docs/supabase-source-of-truth-plan.md`
- `docs/phone-encryption-operations.md`
- `docs/security-data-transfer.md`
- `docs/form-revision-worklist.md`
