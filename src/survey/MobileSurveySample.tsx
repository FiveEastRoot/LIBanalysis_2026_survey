import React from "react";
import { SurveyPrototype, type SurveyExportSnapshot } from "./SurveyPrototype";
import { localSurveyQuestions } from "./questionSchema";
import "./mobileSample.css";

const analysisFieldCount = localSurveyQuestions.reduce((count, question) => {
  if (question.pii) return count;
  if (question.exportCodes) return count + question.exportCodes.length;
  if (question.type === "district_dong") return count + 2;
  return count + 1;
}, 0);

const piiFieldCount = localSurveyQuestions.filter((question) => question.pii).length;

export function MobileSurveySample() {
  const [exportSnapshot, setExportSnapshot] = React.useState<SurveyExportSnapshot | null>(null);

  return (
    <main className="mobile-sample-page">
      <header className="mobile-sample-header">
        <div>
          <span>모바일 정격 샘플</span>
          <h1>390 x 844 기준 설문 화면</h1>
          <p>실제 모바일 화면 폭에서 문항, 진행률, 선택 UI, export 미리보기가 어떻게 보이는지 확인합니다.</p>
        </div>
        <a href="/survey">실제 설문 보기</a>
      </header>

      <section className="mobile-sample-workspace">
        <div className="mobile-sample-stage" aria-label="390 x 844 모바일 설문 미리보기">
          <div className="mobile-device-frame">
            <div className="mobile-device-status" aria-hidden="true">
              <span>9:41</span>
              <i />
            </div>
            <div className="mobile-device-screen">
              <SurveyPrototype onExportSnapshotChange={setExportSnapshot} />
            </div>
          </div>
        </div>

        <aside className="mobile-export-panel">
          <div>
            <span>운영 확인</span>
            <h2>Export 확인 영역</h2>
            <p>이 영역은 샘플 페이지 밖 운영자 확인용입니다. 실제 조사 폼 화면에는 표시되지 않습니다.</p>
          </div>

          <div className="mobile-export-card">
            <strong>Analysis Export</strong>
            <em>{analysisFieldCount} fields</em>
            <p>응답 완료 후 CSV/XLSX로 내려받아 분석 프로그램에 업로드할 영역입니다.</p>
          </div>

          <div className="mobile-export-card pii">
            <strong>PII / 운영정보</strong>
            <em>{piiFieldCount} fields</em>
            <p>답례·연락처 등 운영 목적 정보입니다. 분석 export에는 포함하지 않습니다.</p>
          </div>

          <div className="mobile-export-preview">
            <div>
              <strong>현재 선택값 저장 미리보기</strong>
              <em>{exportSnapshot ? `${exportSnapshot.completedFields}/${exportSnapshot.totalFields}` : "대기"}</em>
            </div>
            <span>Analysis Export</span>
            <pre>{JSON.stringify(exportSnapshot?.analysisPayload ?? {}, null, 2)}</pre>
            <span>PII / 운영정보</span>
            <pre>{JSON.stringify(exportSnapshot?.piiPayload ?? {}, null, 2)}</pre>
          </div>

          <div className="mobile-export-notes">
            <strong>확인 포인트</strong>
            <ul>
              <li>`SQ3`은 `SQ3`, `SQ3-DONG`으로 분리됩니다.</li>
              <li>`DQ2`, `DQ5`, `RQ3`은 화면에서는 묶고 export에서는 컬럼을 분리합니다.</li>
              <li>`해당없음`은 export에서 `9`로 저장됩니다.</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
