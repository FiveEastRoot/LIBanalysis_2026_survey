import { SurveyPrototype } from "./SurveyPrototype";
import "./mobileSample.css";

export function SurveyMockupOnly() {
  return (
    <main className="mockup-only-page">
      <div className="mobile-device-frame" aria-label="390 x 844 모바일 설문 목업">
        <div className="mobile-device-status" aria-hidden="true">
          <span>9:41</span>
          <i />
        </div>
        <div className="mobile-device-screen">
          <SurveyPrototype />
        </div>
      </div>
    </main>
  );
}
