import React from "react";
import { SurveyPrototype, type SurveyExportSnapshot } from "./SurveyPrototype";
import { localSurveyQuestions } from "./questionSchema";
import "./webSample.css";

const analysisFieldCount = localSurveyQuestions.reduce((count, question) => {
  if (question.pii) return count;
  if (question.exportCodes) return count + question.exportCodes.length;
  if (question.type === "district_dong") return count + 2;
  return count + 1;
}, 0);

const piiFieldCount = localSurveyQuestions.filter((question) => question.pii).length;

export function WebSurveySample() {
  const [exportSnapshot, setExportSnapshot] = React.useState<SurveyExportSnapshot | null>(null);

  return (
    <main className="web-sample-page">
      <header className="web-sample-header">
        <div>
          <span>웹 기본 샘플</span>
          <h1>데스크톱 비율 설문 화면</h1>
          <p>웹 조사 환경에서 폼 화면과 운영 확인 영역을 분리해 검토합니다.</p>
        </div>
        <a href="/survey-mobile">모바일 웹 보기</a>
      </header>

      <section className="web-sample-workspace">
        <div className="web-preview-stage" aria-label="웹 설문 미리보기">
          <div className="web-preview-toolbar" aria-hidden="true">
            <span />
            <span />
            <span />
            <strong>survey.local/desktop-preview</strong>
          </div>
          <div className="web-preview-screen">
            <SurveyPrototype onExportSnapshotChange={setExportSnapshot} />
          </div>
        </div>

        <aside className="web-export-panel">
          <div>
            <span>운영 확인</span>
            <h2>Export 확인 영역</h2>
            <p>이 영역은 조사 폼 바깥의 운영자 확인용입니다. 실제 응답자 화면에는 표시하지 않습니다.</p>
          </div>

          <div className="web-export-card">
            <strong>Analysis Export</strong>
            <em>{analysisFieldCount} fields</em>
            <p>응답 완료 후 CSV/XLSX로 내려받아 분석 프로그램에 업로드할 영역입니다.</p>
          </div>

          <div className="web-export-card pii">
            <strong>PII / 운영정보</strong>
            <em>{piiFieldCount} fields</em>
            <p>답례·연락처 등 운영 목적 정보입니다. 분석 export에는 포함하지 않습니다.</p>
          </div>

          <div className="web-export-preview">
            <div>
              <strong>현재 선택값 저장 미리보기</strong>
              <em>{exportSnapshot ? `${exportSnapshot.completedFields}/${exportSnapshot.totalFields}` : "대기"}</em>
            </div>
            <span>Analysis Export</span>
            <pre>{JSON.stringify(exportSnapshot?.analysisPayload ?? {}, null, 2)}</pre>
            <span>PII / 운영정보</span>
            <pre>{JSON.stringify(exportSnapshot?.piiPayload ?? {}, null, 2)}</pre>
          </div>

          <div className="web-export-notes">
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
