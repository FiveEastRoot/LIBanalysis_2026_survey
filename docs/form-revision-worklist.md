# Survey Form Revision Worklist

이 문서는 조사 폼의 편의성 개선 및 문항 수정 작업을 진행할 때 확인할 항목을 정리합니다.

## Priority Order For Form Revisions

1. Export 구조에 영향을 주는 문항 수정
   - 문항 코드 추가/삭제/변경
   - 문항 유형 변경
   - 단일응답/복수응답/순위응답 전환
   - 조건부 노출 변경
   - 값 코딩 방식 변경
   - Supabase 저장 함수 및 Netlify allowlist 동시 수정 필요

2. 응답 흐름에 영향을 주는 편의성 수정
   - 자동 다음 이동
   - Enter 키 동작
   - 필수 응답 누락 안내
   - 이전/다음 이동
   - 영역별 빠른 이동
   - 모바일 화면에서 긴 선택지 처리

3. 화면 표현만 바뀌는 UI 수정
   - 색상, 여백, 폰트 크기
   - 안내 문구 접기/펼치기
   - 선택 상태 표현
   - 카드/입력창 정렬

## Current Implemented Baseline

- 연락처 확인은 첫 화면에 배치되어 있습니다.
- 연락처 화면에서는 전체 진행도 영역을 표시하지 않습니다.
- 휴대폰 번호는 숫자 11자리만 입력할 수 있습니다.
- 개인정보 취급 안내는 접기/펼치기 방식입니다.
- 전체 진행도는 export 대상 필드 기준으로 계산합니다.
- 영역별 빠른 이동은 해당 영역의 첫 미완료 문항으로 이동합니다.
- 공통 만족도 7점 척도는 선택 후 자동으로 다음 문항으로 이동합니다.
- `해당없음`은 export 시 `9`로 변환합니다.
- DQ7-E-1부터 DQ7-E-8은 선택한 1-7 값을 그대로 export에 저장합니다.
- RQ1 문항은 한 페이지에 묶어 표시합니다.
- 월/연 이용 횟수 문항은 서로 자동 환산됩니다.
- 복수응답 문항은 제목에서 `모두 선택`을 강조하고 선택지 간격을 줄였습니다.
- 모바일/웹 목업과 운영 확인 화면은 실제 응답자용 화면과 분리되어 있습니다.

## Revision Intake Table

| Item | Question code or area | Requested change | Impact | Files likely affected | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | TBD | 문항 수정 내용 확정 필요 | TBD | `src/survey/questionSchema.ts`, `src/survey/SurveyPrototype.tsx`, `netlify/functions/submit-survey.mts` | Pending |
| 2 | TBD | 편의성 수정 내용 확정 필요 | TBD | `src/survey/SurveyPrototype.tsx`, `src/survey/survey.css` | Pending |

## Required Checks After Each Change

- `npm run typecheck`
- `npm run build`
- 실제 폼에서 모바일 폭 확인
- 실제 폼에서 웹 폭 확인
- export preview 확인
- Netlify API 제출 및 Supabase 저장 테스트
- 문항 코드 변경 시 Netlify/API allowlist 업데이트
- 문항 코드 변경 시 분석 대시보드 변경 필요 여부 표시
