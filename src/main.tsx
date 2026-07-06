import React from "react";
import ReactDOM from "react-dom/client";
import { MobileSurveySample } from "./survey/MobileSurveySample";
import { SurveyMockupOnly } from "./survey/SurveyMockupOnly";
import { SurveyPrototype } from "./survey/SurveyPrototype";
import { WebSurveySample } from "./survey/WebSurveySample";

function SurveyApp() {
  const path = window.location.pathname;

  if (path.startsWith("/survey-mobile")) {
    return <MobileSurveySample />;
  }

  if (path.startsWith("/survey-mockup")) {
    return <SurveyMockupOnly />;
  }

  if (path.startsWith("/survey-review")) {
    return <WebSurveySample />;
  }

  return <SurveyPrototype />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SurveyApp />
  </React.StrictMode>,
);
