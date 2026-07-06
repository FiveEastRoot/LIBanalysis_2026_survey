import React from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Hash,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { localSurveyQuestions, sectionLabels, type SurveyQuestion } from "./questionSchema";
import "./survey.css";

type SurveyValue = string | number | string[] | PeriodValue | DistrictDongValue | Record<string, string>;

type PeriodValue = {
  years: string;
  months: string;
};

type DistrictDongValue = {
  district: string;
  dong: string;
};

export type SurveyExportSnapshot = {
  analysisPayload: Record<string, unknown>;
  piiPayload: Record<string, unknown>;
  progress: number;
  completedFields: number;
  totalFields: number;
};

type SurveyPrototypeProps = {
  onExportSnapshotChange?: (snapshot: SurveyExportSnapshot) => void;
};

const initialAnswers = Object.fromEntries(
  localSurveyQuestions.map((question) => [question.code, initialValue(question)]),
) as Record<string, SurveyValue>;

const usageFrequencyPairs = [
  { monthly: "DQ1-M", annual: "DQ1-Y" },
  { monthly: "DQ6-M", annual: "DQ6-Y" },
];

const rq1QuestionCodes = new Set(["RQ1-1", "RQ1-2", "RQ1-3", "RQ1-4", "RQ1-5", "RQ1-6", "RQ1-7"]);

const surveyQuestions = reorderUsageFrequencyQuestions([
  ...localSurveyQuestions
    .filter((question) => question.section === "pii")
    .filter((question) => question.code !== "P1-EXCLUDE")
    .sort((left, right) => piiQuestionSortIndex(left.code) - piiQuestionSortIndex(right.code)),
  ...localSurveyQuestions.filter((question) => question.section !== "pii"),
]);

const submittedPhoneStorageKey = "libanalysis-survey-submitted-phones";
const samplePhoneValue = "01012345678";

export function SurveyPrototype({ onExportSnapshotChange }: SurveyPrototypeProps = {}) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, SurveyValue>>(initialAnswers);
  const [progressExpanded, setProgressExpanded] = React.useState(false);
  const [submitMessage, setSubmitMessage] = React.useState("");
  const question = surveyQuestions[currentIndex];
  const analysisPayload = React.useMemo(() => buildAnalysisPayload(answers), [answers]);
  const piiPayload = React.useMemo(() => buildPiiPayload(answers), [answers]);
  const exportCompletion = React.useMemo(() => buildExportCompletion(answers), [answers]);
  const progress = exportCompletion.totalFields > 0 ? Math.round((exportCompletion.completedFields / exportCompletion.totalFields) * 100) : 0;
  const showDebugExport = new URLSearchParams(window.location.search).get("debug") === "1";
  const pageQuestions = questionsForPage(question);

  React.useEffect(() => {
    onExportSnapshotChange?.({
      analysisPayload,
      piiPayload,
      progress,
      completedFields: exportCompletion.completedFields,
      totalFields: exportCompletion.totalFields,
    });
  }, [analysisPayload, exportCompletion.completedFields, exportCompletion.totalFields, onExportSnapshotChange, piiPayload, progress]);

  function updateAnswer(code: string, value: SurveyValue) {
    setAnswers((current) => {
      const nextAnswers = { ...current, [code]: value };
      const annualCode = annualCodeForMonthlyCode(code);
      const monthlyCode = monthlyCodeForAnnualCode(code);
      if (annualCode) {
        nextAnswers[annualCode] = annualUsageFromMonthly(value);
      }
      if (monthlyCode) {
        nextAnswers[monthlyCode] = monthlyAverageFromAnnual(value);
      }
      return nextAnswers;
    });
  }

  function updateAnswers(patch: Record<string, SurveyValue>) {
    setAnswers((current) => ({ ...current, ...patch }));
  }

  function goNext() {
    if (question.code === "P2-EXCLUDE" && !isValidPhone(answers["P2-EXCLUDE"])) {
      setSubmitMessage(isSamplePhone(answers["P2-EXCLUDE"]) ? "예시 번호는 사용할 수 없습니다. 실제 휴대폰 번호를 입력해 주세요." : "휴대폰 번호는 숫자 11자리로 입력해 주세요.");
      return;
    }
    if (question.code === "P2-EXCLUDE" && !String(answers["P1-EXCLUDE"] ?? "").trim()) {
      setSubmitMessage("개인정보 취급위탁 동의 여부를 선택해 주세요.");
      return;
    }
    const rangeWarning = rangeWarningForQuestions(pageQuestions, answers);
    if (rangeWarning) {
      setSubmitMessage(rangeWarning);
      return;
    }
    setSubmitMessage("");
    setCurrentIndex((index) => nextVisibleQuestionIndex(index, answers));
  }

  function goPrevious() {
    setCurrentIndex((index) => previousVisibleQuestionIndex(index, answers));
  }

  function handleSubmit() {
    const phone = normalizedPhone(answers["P2-EXCLUDE"]);
    if (!isValidPhone(answers["P2-EXCLUDE"])) {
      setSubmitMessage(isSamplePhone(answers["P2-EXCLUDE"]) ? "예시 번호는 사용할 수 없습니다. 실제 휴대폰 번호를 입력해 주세요." : "휴대폰 번호는 숫자 11자리로 입력해 주세요.");
      setCurrentIndex(surveyQuestions.findIndex((item) => item.code === "P2-EXCLUDE"));
      return;
    }
    if (hasSubmittedPhone(phone)) {
      setSubmitMessage("이미 제출이 완료된 휴대폰 번호입니다. 같은 번호로는 다시 제출할 수 없습니다.");
      setCurrentIndex(surveyQuestions.findIndex((item) => item.code === "P2-EXCLUDE"));
      return;
    }
    saveSubmittedPhone(phone);
    setSubmitMessage("제출 완료 처리되었습니다. 같은 휴대폰 번호로는 다시 제출할 수 없습니다.");
  }

  function handleQuestionKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (target instanceof HTMLTextAreaElement) return;
    if (target instanceof HTMLButtonElement) {
      const isSelectedAnswerButton = target.classList.contains("selected") && Boolean(target.closest(".choice-grid, .likert-grid, .likert-wrap"));
      if (!isSelectedAnswerButton) return;
    }
    event.preventDefault();
    if (currentIndex === surveyQuestions.length - 1) {
      handleSubmit();
      return;
    }
    goNext();
  }

  return (
    <main className="survey-shell">
      <section className="survey-top">
        <div className="survey-title-block">
          {/* <span>로컬 설문 프로토타입</span> */}
          <h1>2026 공공도서관 서비스 성과조사</h1>
          {/* <p>모바일과 웹에서 문항 유형에 맞는 입력 방식을 검토하는 화면입니다.</p> */}
        </div>
        <a className="survey-mode-link" href="/survey-mobile">모바일 웹 보기</a>
      </section>

      <section className={`survey-layout ${showDebugExport ? "" : "no-preview"} ${question.section === "pii" ? "contact-only" : ""}`}>
        {question.section !== "pii" && (
          <aside className="survey-progress-panel">
            <button
              className="survey-progress-toggle"
              type="button"
              aria-expanded={progressExpanded}
              aria-controls="survey-section-progress"
              onClick={() => setProgressExpanded((expanded) => !expanded)}
            >
              <span>전체 진행도</span>
              <strong>{progress}%</strong>
              <ChevronsUpDown size={16} />
            </button>
            <div className="survey-progress-track" aria-hidden="true">
              <i style={{ width: `${progress}%` }} />
            </div>
            {progressExpanded && (
              <div className="survey-section-list" id="survey-section-progress">
                {Object.entries(sectionLabels)
                  .sort(([leftSection], [rightSection]) => sectionSortIndex(leftSection) - sectionSortIndex(rightSection))
                  .filter(([section]) => surveyQuestions.some((item) => item.section === section))
                  .map(([section, label]) => {
                    const firstIncompleteIndex = findFirstIncompleteQuestionIndex(section, answers);
                    const fallbackIndex = surveyQuestions.findIndex((item) => item.section === section);
                    const targetIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : fallbackIndex;
                    const sectionCompletion = buildSectionCompletion(section, answers);
                    return (
                      <button
                        key={section}
                        className={question.section === section ? "active" : ""}
                        type="button"
                        onClick={() => setCurrentIndex(targetIndex)}
                      >
                        <span>{label}</span>
                        <em>{sectionCompletion.completedFields}/{sectionCompletion.totalFields}</em>
                      </button>
                    );
                  })}
              </div>
            )}
          </aside>
        )}

        <section className="survey-question-panel" onKeyDown={handleQuestionKeyDown}>
          {/* <div className="survey-question-meta">
            <span>{sectionLabels[question.section]}</span>
            {question.section !== "pii" && <strong>{question.code}</strong>}
          </div> */}
          {question.code === "P2-EXCLUDE" ? (
            <ContactVerificationPage
              phoneValue={String(answers["P2-EXCLUDE"] ?? "")}
              consentValue={String(answers["P1-EXCLUDE"] ?? "")}
              onPhoneChange={(value) => updateAnswer("P2-EXCLUDE", value)}
              onConsentChange={(value) => updateAnswer("P1-EXCLUDE", value)}
            />
          ) : (
            isRq1Question(question) ? (
              <Rq1QuestionGroup
                questions={pageQuestions}
                answers={answers}
                onChange={updateAnswer}
                onBatchChange={updateAnswers}
              />
            ) : (
              <QuestionField
                question={question}
                value={answers[question.code]}
                onChange={(value) => updateAnswer(question.code, value)}
                onAutoAdvance={() => {
                  setSubmitMessage("");
                  setCurrentIndex((index) => Math.min(index + 1, surveyQuestions.length - 1));
                }}
                onJumpToQuestion={(code) => {
                  const targetIndex = surveyQuestions.findIndex((item) => item.code === code);
                  if (targetIndex >= 0) {
                    setSubmitMessage("");
                    setCurrentIndex(targetIndex);
                  }
                }}
                shouldAutoAdvance={shouldAutoAdvanceQuestion(question)}
              />
            )
          )}
          <div className="survey-controls">
            {currentIndex > 0 && (
              <button className="survey-secondary-button" type="button" onClick={goPrevious}>
                <ChevronLeft size={18} />
                이전
              </button>
            )}
            {currentIndex === surveyQuestions.length - 1 ? (
              <button className="survey-primary-button" type="button" onClick={handleSubmit}>
                제출
                <Check size={18} />
              </button>
            ) : (
              <button className="survey-primary-button" type="button" onClick={goNext}>
                다음
                <ChevronRight size={18} />
              </button>
            )}
          </div>
          {submitMessage && <div className="survey-submit-message" role="status">{submitMessage}</div>}
        </section>

        {showDebugExport && (
          <aside className="survey-preview-panel">
            <h2>파일 export 구조 미리보기</h2>
            <PayloadPreview title="Analysis Export" payload={analysisPayload} tone="analysis" />
            <PayloadPreview title="PII" payload={piiPayload} tone="pii" />
          </aside>
        )}
      </section>

      <footer className="survey-privacy-footer">
        <ShieldCheck size={18} />
        <div>
          <strong>개인정보 분리 처리</strong>
          <span>연락처 등 운영 목적 정보는 분석용 파일에 포함하지 않습니다.</span>
        </div>
      </footer>
    </main>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  onAutoAdvance,
  onJumpToQuestion,
  shouldAutoAdvance,
}: {
  question: SurveyQuestion;
  value: SurveyValue;
  onChange: (value: SurveyValue) => void;
  onAutoAdvance: () => void;
  onJumpToQuestion: (code: string) => void;
  shouldAutoAdvance: boolean;
}) {
  function handleLikertChange(nextValue: string) {
    onChange(nextValue);
    if (shouldAutoAdvance) {
      onAutoAdvance();
    }
  }

  return (
    <div className={`survey-question ${question.type === "multi_choice" ? "multi-choice-page" : ""}`}>
      <div className="survey-question-title">
        {iconForQuestion(question)}
        <div>
          <h2>{question.type === "multi_choice" ? emphasizeAllSelect(question.title) : question.title}</h2>
          {question.description && <p>{question.description}</p>}
        </div>
      </div>
      {question.type === "single_choice" && <ChoiceButtons question={question} value={String(value ?? "")} onChange={onChange} />}
      {question.type === "district_dong" && <DistrictDongInput question={question} value={isDistrictDongValue(value) ? value : { district: "", dong: "" }} onChange={onChange} />}
      {question.type === "multi_choice" && <MultiChoiceButtons question={question} value={Array.isArray(value) ? value : []} onChange={onChange} />}
      {question.type === "likert_7" && <LikertScale value={String(value ?? "")} onChange={handleLikertChange} />}
      {question.type === "likert_7_with_na" && <LikertScale value={String(value ?? "")} onChange={handleLikertChange} includeNa />}
      {question.type === "semantic_7" && <LikertScale value={String(value ?? "")} onChange={handleLikertChange} leftLabel={question.leftLabel} rightLabel={question.rightLabel} />}
      {question.type === "numeric" && (
        <NumericInput
          question={question}
          value={String(value ?? "")}
          onChange={onChange}
          onAnnualModeClick={annualCodeForMonthlyCode(question.code) ? () => onJumpToQuestion(annualCodeForMonthlyCode(question.code) ?? "") : undefined}
        />
      )}
      {question.type === "date" && <DateInput value={String(value ?? "")} onChange={onChange} />}
      {question.type === "period" && <PeriodInput value={isPeriodValue(value) ? value : { years: "", months: "" }} onChange={onChange} />}
      {question.type === "rank_choice" && <RankChoice question={question} value={isRankValue(value) ? value : {}} onChange={onChange} />}
      {question.type === "short_text" && <TextInput value={String(value ?? "")} onChange={onChange} />}
      {question.type === "long_text" && <LongTextInput value={String(value ?? "")} onChange={onChange} />}
      {question.type === "phone" && <PhoneInput value={String(value ?? "")} onChange={onChange} />}
    </div>
  );
}

function ContactVerificationPage({
  phoneValue,
  consentValue,
  onPhoneChange,
  onConsentChange,
}: {
  phoneValue: string;
  consentValue: string;
  onPhoneChange: (value: string) => void;
  onConsentChange: (value: string) => void;
}) {
  const consentQuestion = localSurveyQuestions.find((question) => question.code === "P1-EXCLUDE");
  const [privacyExpanded, setPrivacyExpanded] = React.useState(false);

  return (
    <div className="survey-question contact-page">
      <div className="contact-start-panel">
        {/* <span>설문 시작</span> */}
        <h2>본인 확인 후 설문을 시작합니다</h2>
        <p>휴대폰 번호는 중복 제출 방지와 조사 운영 확인에만 사용됩니다.</p>
      </div>

      <div className="survey-question-title">
        <Phone size={22} />
        <div>
          <h2>연락처 확인</h2>
          <p>중복 제출 방지와 조사 운영을 위해 휴대폰 번호를 확인합니다.</p>
        </div>
      </div>

      <PhoneInput value={phoneValue} onChange={onPhoneChange} />

      {consentQuestion && (
        <div className="contact-consent-block">
          <ChoiceButtons question={consentQuestion} value={consentValue} onChange={onConsentChange} />
        </div>
      )}

      <div className="privacy-policy-note">
        <button
          className="privacy-policy-toggle"
          type="button"
          aria-expanded={privacyExpanded}
          onClick={() => setPrivacyExpanded((expanded) => !expanded)}
        >
          <strong>개인정보 취급 안내</strong>
          <ChevronsUpDown size={15} />
        </button>
        {privacyExpanded && (
          <p>
            수집한 휴대폰 번호는 본인 확인, 중복 제출 방지, 답례 발송 등 조사 운영 목적에만 사용합니다.
            분석용 export 파일에는 포함하지 않으며, 통계 분석에는 개인을 식별할 수 없는 응답 데이터만 사용합니다.
            개인정보는 접근 권한이 제한된 운영 영역에 분리 보관하고, 조사 운영 목적 달성 후 내부 보관 기준에 따라 파기합니다.
          </p>
        )}
      </div>
    </div>
  );
}

function Rq1QuestionGroup({
  questions,
  answers,
  onChange,
  onBatchChange,
}: {
  questions: SurveyQuestion[];
  answers: Record<string, SurveyValue>;
  onChange: (code: string, value: SurveyValue) => void;
  onBatchChange: (patch: Record<string, SurveyValue>) => void;
}) {
  const numericQuestions = questions.filter((item) => item.type === "numeric");
  const noReadingQuestion = questions.find((item) => item.code === "RQ1-7");
  const noReadingValue = String(answers["RQ1-7"] ?? "");

  function handleNumericChange(question: SurveyQuestion, value: string) {
    onChange(question.code, value);
    if (Number(value) > 0 && noReadingValue) {
      onChange("RQ1-7", "");
    }
  }

  function handleNoReading(value: string) {
    const zeroPatch = Object.fromEntries(numericQuestions.map((item) => [item.code, "0"])) as Record<string, SurveyValue>;
    onBatchChange({ ...zeroPatch, "RQ1-7": value });
  }

  return (
    <div className="survey-question rq1-group-page">
      <div className="survey-question-title">
        <Hash size={22} />
        <div>
          <h2>지난 1년 동안 읽은 독서량</h2>
          <p>유형별 권수를 한 번에 입력해 주세요.</p>
        </div>
      </div>

      <div className="rq1-input-grid">
        {numericQuestions.map((item) => (
          <div className="rq1-input-card" key={item.code}>
            <h3>{item.title.replace("지난 1년 동안 읽은 ", "")}</h3>
            <NumericInput question={item} value={String(answers[item.code] ?? "")} onChange={(value) => handleNumericChange(item, value)} />
          </div>
        ))}
      </div>

      {noReadingQuestion && (
        <div className="rq1-no-reading">
          <h3>독서 경험이 없는 경우</h3>
          <ChoiceButtons question={noReadingQuestion} value={noReadingValue} onChange={handleNoReading} />
        </div>
      )}
    </div>
  );
}

function DistrictDongInput({ question, value, onChange }: { question: SurveyQuestion; value: DistrictDongValue; onChange: (value: DistrictDongValue) => void }) {
  const districts = question.choices ?? [];
  const dongChoices = value.district ? question.dongChoicesByDistrict?.[value.district] ?? [] : [];
  const showDong = value.district && value.district !== "기타";

  function updateDistrict(district: string) {
    if (!districts.includes(district)) return;
    const nextDongChoices = question.dongChoicesByDistrict?.[district] ?? [];
    onChange({
      district,
      dong: district === "기타" ? "기타" : nextDongChoices.includes(value.dong) ? value.dong : "",
    });
  }

  return (
    <div className="district-dong-stack">
      <label className="survey-input-label">
        <span>자치구</span>
        <select value={value.district} onChange={(event) => updateDistrict(event.target.value)}>
          <option value="">자치구 선택</option>
          {districts.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
      </label>

      {showDong && (
        <label className="survey-input-label">
          <span>행정동</span>
          <select value={value.dong} onChange={(event) => {
            const dong = event.target.value;
            if (dong && !dongChoices.includes(dong)) return;
            onChange({ ...value, dong });
          }}>
            <option value="">행정동 선택</option>
            {dongChoices.map((dong) => (
              <option key={dong} value={dong}>{dong}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function ChoiceButtons({ question, value, onChange }: { question: SurveyQuestion; value: string; onChange: (value: string) => void }) {
  return (
    <div className="choice-grid">
      {(question.choices ?? []).map((choice) => (
        <button key={choice} className={value === choice ? "selected" : ""} type="button" onClick={() => {
          if ((question.choices ?? []).includes(choice)) onChange(choice);
        }}>
          <span>{choice}</span>
          {value === choice && <Check size={17} />}
        </button>
      ))}
    </div>
  );
}

function MultiChoiceButtons({ question, value, onChange }: { question: SurveyQuestion; value: string[]; onChange: (value: string[]) => void }) {
  function toggle(choice: string) {
    if (!(question.choices ?? []).includes(choice)) return;
    onChange(value.includes(choice) ? value.filter((item) => item !== choice) : [...value, choice]);
  }

  return (
    <div className="choice-grid compact">
      {(question.choices ?? []).map((choice) => (
        <button key={choice} className={value.includes(choice) ? "selected" : ""} type="button" onClick={() => toggle(choice)}>
          <span>{choice}</span>
          {value.includes(choice) && <Check size={17} />}
        </button>
      ))}
    </div>
  );
}

function emphasizeAllSelect(title: string) {
  const marker = "모두 선택";
  const index = title.indexOf(marker);
  if (index < 0) return title;
  return (
    <>
      {title.slice(0, index)}
      <strong className="multi-choice-emphasis">{marker}</strong>
      {title.slice(index + marker.length)}
    </>
  );
}

function LikertScale({
  value,
  onChange,
  includeNa = false,
  leftLabel = "전혀 그렇지 않음",
  rightLabel = "매우 그러함",
}: {
  value: string;
  onChange: (value: string) => void;
  includeNa?: boolean;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="likert-wrap">
      <div className="likert-labels">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="likert-grid">
        {Array.from({ length: 7 }, (_, index) => String(index + 1)).map((score) => (
          <button key={score} className={value === score ? "selected" : ""} type="button" onClick={() => onChange(score)}>
            {score}
          </button>
        ))}
      </div>
      {includeNa && (
        <button className={`na-button ${value === "해당없음" ? "selected" : ""}`} type="button" onClick={() => onChange("해당없음")}>
          해당없음
        </button>
      )}
    </div>
  );
}

function NumericInput({
  question,
  value,
  onChange,
  onAnnualModeClick,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (value: string) => void;
  onAnnualModeClick?: () => void;
}) {
  const [warning, setWarning] = React.useState("");
  const rangeLabel = `${question.min ?? 0}~${question.max ?? "제한 없음"}`;
  const allowDecimal = Boolean(annualCodeForMonthlyCode(question.code));

  function handleChange(nextValue: string) {
    const result = allowDecimal ? constrainDecimalText(nextValue, question.min, question.max, 3) : constrainIntegerText(nextValue, question.min, question.max);
    setWarning(result.wasFiltered || result.isBelowMin ? `${rangeLabel} 범위의 숫자만 입력할 수 있습니다.` : "");
    onChange(result.value);
  }

  return (
    <div className="numeric-input-stack">
      <label className="survey-input-label">
        <span>{question.unit ? `${question.unit} 단위로 입력` : "숫자 입력"}</span>
        <div className="survey-input-with-unit">
          <input
            inputMode={allowDecimal ? "decimal" : "numeric"}
            max={question.max}
            min={question.min}
            pattern={allowDecimal ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
            step={allowDecimal ? "0.001" : undefined}
            type="number"
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={(event) => blockInvalidNumberKey(event, () => setWarning("숫자만 입력할 수 있습니다."), allowDecimal)}
            onPaste={(event) => {
              const pastedText = event.clipboardData.getData("text");
              if (allowDecimal ? /[^\d.]/.test(pastedText) : /[^\d]/.test(pastedText)) {
                setWarning("숫자만 입력할 수 있습니다.");
              }
            }}
          />
          {question.unit && <em>{question.unit}</em>}
        </div>
        {(question.min !== undefined || question.max !== undefined) && (
          <small className={warning ? "input-warning" : ""}>{warning || `${rangeLabel} 범위`}</small>
        )}
      </label>
      {onAnnualModeClick && (
        <button className="survey-inline-secondary-button" type="button" onClick={onAnnualModeClick}>
          연단위로 이동
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="survey-input-label">
      <span>날짜 선택</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PeriodInput({ value, onChange }: { value: PeriodValue; onChange: (value: PeriodValue) => void }) {
  const [yearWarning, setYearWarning] = React.useState("");
  const [monthWarning, setMonthWarning] = React.useState("");

  function handlePeriodNumber(rawValue: string, min: number, max: number, onValidChange: (nextValue: string) => void, onWarning: (message: string) => void, label: string) {
    const result = constrainIntegerText(rawValue, min, max);
    onWarning(result.wasFiltered || result.isBelowMin ? `${label} 범위의 숫자만 입력할 수 있습니다.` : "");
    onValidChange(result.value);
  }

  return (
    <div className="period-grid">
      <label className="survey-input-label">
        <span>년</span>
        <input
          inputMode="numeric"
          min={0}
          pattern="[0-9]*"
          type="number"
          value={value.years}
          onChange={(event) => handlePeriodNumber(event.target.value, 0, 80, (years) => onChange({ ...value, years }), setYearWarning, "0~80년")}
          onKeyDown={(event) => blockInvalidNumberKey(event, () => setYearWarning("숫자만 입력할 수 있습니다."))}
          onPaste={(event) => {
            if (/[^\d]/.test(event.clipboardData.getData("text"))) {
              setYearWarning("숫자만 입력할 수 있습니다.");
            }
          }}
        />
        <small className={yearWarning ? "input-warning" : ""}>{yearWarning || "0~80년"}</small>
      </label>
      <label className="survey-input-label">
        <span>개월</span>
        <input
          inputMode="numeric"
          max={11}
          min={0}
          pattern="[0-9]*"
          type="number"
          value={value.months}
          onChange={(event) => handlePeriodNumber(event.target.value, 0, 11, (months) => onChange({ ...value, months }), setMonthWarning, "0~11개월")}
          onKeyDown={(event) => blockInvalidNumberKey(event, () => setMonthWarning("숫자만 입력할 수 있습니다."))}
          onPaste={(event) => {
            if (/[^\d]/.test(event.clipboardData.getData("text"))) {
              setMonthWarning("숫자만 입력할 수 있습니다.");
            }
          }}
        />
        <small className={monthWarning ? "input-warning" : ""}>{monthWarning || "0~11개월"}</small>
      </label>
    </div>
  );
}

function RankChoice({ question, value, onChange }: { question: SurveyQuestion; value: Record<string, string>; onChange: (value: Record<string, string>) => void }) {
  const rankCount = question.rankCount ?? 3;
  const choices = question.choices ?? [];

  function selectRank(rank: number, choice: string) {
    if (choice && !choices.includes(choice)) return;
    const nextValue = { ...value };
    Object.entries(nextValue).forEach(([key, selected]) => {
      if (selected === choice && key !== String(rank)) {
        nextValue[key] = "";
      }
    });
    nextValue[String(rank)] = choice;
    onChange(nextValue);
  }

  return (
    <div className="rank-stack">
      {Array.from({ length: rankCount }, (_, index) => index + 1).map((rank) => (
        <label key={rank} className="rank-select-row">
          <span>{rank}순위</span>
          <select value={value[String(rank)] ?? ""} onChange={(event) => selectRank(rank, event.target.value)}>
            <option value="">선택</option>
            {choices.map((choice) => {
              const selectedAtOtherRank = Object.entries(value).some(([key, selected]) => key !== String(rank) && selected === choice);
              return (
                <option key={choice} value={choice} disabled={selectedAtOtherRank}>
                  {choice}
                </option>
              );
            })}
          </select>
        </label>
      ))}
    </div>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="survey-input-label">
      <span>직접 입력</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function LongTextInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const maxLength = 1000;

  return (
    <label className="survey-input-label">
      <span>서술형 응답</span>
      <textarea maxLength={maxLength} rows={7} value={value} onChange={(event) => onChange(event.target.value.slice(0, maxLength))} />
      <small>{value.length}/{maxLength}자</small>
    </label>
  );
}

function PhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [warning, setWarning] = React.useState("");

  function formatPhone(rawValue: string) {
    const digitsOnly = rawValue.replace(/[^\d]/g, "");
    const formatted = digitsOnly.slice(0, 11);
    setWarning(rawValue !== formatted ? "전화번호는 숫자 11자리까지만 입력할 수 있습니다." : "");
    return formatted;
  }

  const isComplete = value.length === 11;
  const isSampleValue = isSamplePhone(value);
  const helperWarning = warning || (isSampleValue ? "예시 번호는 사용할 수 없습니다. 실제 휴대폰 번호를 입력해 주세요." : value && !isComplete ? "숫자 11자리만 입력해 주세요." : "");

  return (
    <label className="survey-input-label pii-input">
      <span>전화번호</span>
      <input
        autoComplete="tel"
        inputMode="tel"
        maxLength={11}
        pattern="[0-9]{11}"
        placeholder="전화번호 : 숫자만 입력"
        type="tel"
        value={value}
        onChange={(event) => onChange(formatPhone(event.target.value))}
        onBeforeInput={(event) => {
          const nextText = event.data ?? "";
          if (nextText && (/[^\d]/.test(nextText) || value.length >= 11)) {
            setWarning("전화번호는 숫자 11자리까지만 입력할 수 있습니다.");
          }
        }}
        onPaste={(event) => {
          const pastedText = event.clipboardData.getData("text");
          if (/[^\d]/.test(pastedText) || pastedText.replace(/[^\d]/g, "").length > 11) {
            setWarning("전화번호는 숫자 11자리까지만 입력할 수 있습니다.");
          }
        }}
      />
      <small className={helperWarning ? "input-warning" : ""}>{helperWarning || "숫자 11자리만 입력해 주세요."}</small>
    </label>
  );
}

function PayloadPreview({ title, payload, tone }: { title: string; payload: Record<string, unknown>; tone: "analysis" | "pii" }) {
  return (
    <div className={`payload-box ${tone}`}>
      <div>
        <strong>{title}</strong>
        <span>{Object.keys(payload).length} fields</span>
      </div>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </div>
  );
}

function buildAnalysisPayload(answers: Record<string, SurveyValue>) {
  const payload: Record<string, unknown> = {};
  localSurveyQuestions
    .filter((question) => !question.pii)
    .forEach((question) => {
      const value = answers[question.code];
      if (question.type === "period" && isPeriodValue(value)) {
        const [yearCode = `${question.code}-Y`, monthCode = `${question.code}-M`] = question.exportCodes ?? [];
        payload[yearCode] = value.years;
        payload[monthCode] = value.months;
        return;
      }
      if (question.type === "district_dong" && isDistrictDongValue(value)) {
        payload[question.code] = value.district;
        payload[`${question.code}-DONG`] = value.dong;
        return;
      }
      if (question.type === "rank_choice" && isRankValue(value)) {
        const exportCodes = question.exportCodes ?? [];
        Array.from({ length: question.rankCount ?? 3 }, (_, index) => index + 1).forEach((rank, index) => {
          payload[exportCodes[index] ?? `${question.code}-${rank}`] = value[String(rank)] ?? "";
        });
        return;
      }
      payload[question.code] = exportValueForQuestion(question, value);
    });
  return payload;
}

const reverseCodedExportCodes = new Set(["DQ7-E-1", "DQ7-E-2", "DQ7-E-3", "DQ7-E-4", "DQ7-E-5", "DQ7-E-6", "DQ7-E-7", "DQ7-E-8"]);

function exportValueForQuestion(question: SurveyQuestion, value: SurveyValue) {
  if (value === "해당없음") {
    return "9";
  }

  // DQ7-E-*는 화면에서는 1=부정, 7=긍정으로 표시하지만,
  // 분석 export는 기존 스키마(1=긍정, 7=부정)에 맞춰 역코딩한다.
  if (reverseCodedExportCodes.has(question.code)) {
    return reverseScale7Value(value);
  }

  return value;
}

function reverseScale7Value(value: SurveyValue) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 7) {
    return value;
  }
  return String(8 - score);
}

function buildPiiPayload(answers: Record<string, SurveyValue>) {
  const payload: Record<string, unknown> = {};
  localSurveyQuestions
    .filter((question) => question.pii)
    .forEach((question) => {
      const value = answers[question.code];
      payload[question.code] = question.code === "P2-EXCLUDE" && isSamplePhone(value) ? "" : value;
    });
  return payload;
}

function buildExportCompletion(answers: Record<string, SurveyValue>) {
  return localSurveyQuestions
    .filter((question) => !question.pii)
    .reduce(
      (summary, question) => {
        const stats = exportStatsForQuestion(question, answers[question.code]);
        return {
          completedFields: summary.completedFields + stats.completedFields,
          totalFields: summary.totalFields + stats.totalFields,
        };
      },
      { completedFields: 0, totalFields: 0 },
    );
}

function buildSectionCompletion(section: string, answers: Record<string, SurveyValue>) {
  return localSurveyQuestions
    .filter((question) => question.section === section)
    .reduce(
      (summary, question) => {
        const stats = question.pii ? questionStatsForNavigation(question, answers[question.code]) : exportStatsForQuestion(question, answers[question.code]);
        return {
          completedFields: summary.completedFields + stats.completedFields,
          totalFields: summary.totalFields + stats.totalFields,
        };
      },
      { completedFields: 0, totalFields: 0 },
    );
}

function findFirstIncompleteQuestionIndex(section: string, answers: Record<string, SurveyValue>) {
  if (section === "pii") {
    const piiIncomplete = localSurveyQuestions
      .filter((question) => question.section === "pii")
      .some((question) => questionStatsForNavigation(question, answers[question.code]).completedFields < 1);
    return piiIncomplete ? surveyQuestions.findIndex((question) => question.code === "P2-EXCLUDE") : surveyQuestions.findIndex((question) => question.section === "pii");
  }
  return surveyQuestions.findIndex((question) => {
    if (question.section !== section) return false;
    const stats = question.pii ? questionStatsForNavigation(question, answers[question.code]) : exportStatsForQuestion(question, answers[question.code]);
    return stats.completedFields < stats.totalFields;
  });
}

function questionStatsForNavigation(question: SurveyQuestion, value: SurveyValue) {
  if (question.type === "rank_choice") {
    return exportStatsForQuestion(question, value);
  }
  return { completedFields: hasAnswer(value) ? 1 : 0, totalFields: 1 };
}

function exportStatsForQuestion(question: SurveyQuestion, value: SurveyValue) {
  if (question.type === "period") {
    const period = isPeriodValue(value) ? value : { years: "", months: "" };
    return countFilledFields([period.years, period.months]);
  }
  if (question.type === "district_dong") {
    const districtDong = isDistrictDongValue(value) ? value : { district: "", dong: "" };
    return countFilledFields([districtDong.district, districtDong.dong]);
  }
  if (question.type === "rank_choice") {
    const rankValue = isRankValue(value) ? value : {};
    const rankCount = question.rankCount ?? 3;
    return countFilledFields(Array.from({ length: rankCount }, (_, index) => rankValue[String(index + 1)] ?? ""));
  }
  if (question.type === "multi_choice") {
    return { completedFields: Array.isArray(value) && value.length > 0 ? 1 : 0, totalFields: 1 };
  }
  return { completedFields: isFilledExportValue(value) ? 1 : 0, totalFields: 1 };
}

function countFilledFields(values: SurveyValue[]) {
  return {
    completedFields: values.filter(isFilledExportValue).length,
    totalFields: values.length,
  };
}

function isFilledExportValue(value: SurveyValue) {
  if (Array.isArray(value)) return value.length > 0;
  if (isPeriodValue(value)) return Boolean(value.years || value.months);
  if (isDistrictDongValue(value)) return Boolean(value.district && value.dong);
  if (isRankValue(value)) return Object.values(value).some(Boolean);
  return String(value ?? "").trim() !== "";
}

function constrainIntegerText(rawValue: string, min = 0, max?: number) {
  const digits = rawValue.replace(/[^\d]/g, "");
  if (!digits) return { value: "", wasFiltered: rawValue !== "", isBelowMin: false };
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return { value: "", wasFiltered: true, isBelowMin: false };
  const bounded = Math.min(numeric, max ?? numeric);
  const value = String(bounded);
  return {
    value,
    wasFiltered: rawValue !== digits || numeric !== bounded,
    isBelowMin: numeric < min,
  };
}

function constrainDecimalText(rawValue: string, min = 0, max?: number, maxDecimalPlaces = 3) {
  const sanitized = rawValue.replace(/[^\d.]/g, "");
  const parts = sanitized.split(".");
  const integerPart = parts[0] ?? "";
  const decimalPart = parts.slice(1).join("").slice(0, maxDecimalPlaces);
  const hasDot = sanitized.includes(".");
  const normalized = `${integerPart}${hasDot ? "." : ""}${hasDot ? decimalPart : ""}`;
  if (!integerPart && !decimalPart) return { value: "", wasFiltered: rawValue !== "", isBelowMin: false };
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return { value: "", wasFiltered: true, isBelowMin: false };
  const bounded = Math.min(numeric, max ?? numeric);
  const value = numeric !== bounded ? formatDecimalValue(bounded) : normalized;
  return {
    value,
    wasFiltered: rawValue !== normalized || numeric !== bounded,
    isBelowMin: numeric < min,
  };
}

function blockInvalidNumberKey(event: React.KeyboardEvent<HTMLInputElement>, onBlocked?: () => void, allowDecimal = false) {
  const blockedKeys = allowDecimal ? ["e", "E", "+", "-"] : ["e", "E", "+", "-", "."];
  if (blockedKeys.includes(event.key)) {
    event.preventDefault();
    onBlocked?.();
  }
  if (allowDecimal && event.key === "." && event.currentTarget.value.includes(".")) {
    event.preventDefault();
    onBlocked?.();
  }
}

function monthlyAverageFromAnnual(value: SurveyValue) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";
  const annual = Number(rawValue);
  if (!Number.isFinite(annual)) return "";
  return formatDecimalValue(annual / 12);
}

function formatDecimalValue(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

function annualUsageFromMonthly(value: SurveyValue) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";
  const monthly = Number(rawValue);
  if (!Number.isFinite(monthly)) return "";
  return formatDecimalValue(monthly * 12);
}

function annualCodeForMonthlyCode(code: string) {
  return usageFrequencyPairs.find((pair) => pair.monthly === code)?.annual;
}

function monthlyCodeForAnnualCode(code: string) {
  return usageFrequencyPairs.find((pair) => pair.annual === code)?.monthly;
}

function nextVisibleQuestionIndex(currentIndex: number, _answers: Record<string, SurveyValue>) {
  if (isRq1Question(surveyQuestions[currentIndex])) {
    const lastRq1Index = lastQuestionIndex(rq1QuestionCodes);
    return Math.min(lastRq1Index + 1, surveyQuestions.length - 1);
  }
  return Math.min(currentIndex + 1, surveyQuestions.length - 1);
}

function previousVisibleQuestionIndex(currentIndex: number, _answers: Record<string, SurveyValue>) {
  if (isRq1Question(surveyQuestions[currentIndex])) {
    const firstRq1Index = firstQuestionIndex(rq1QuestionCodes);
    return Math.max(firstRq1Index - 1, 0);
  }
  return Math.max(currentIndex - 1, 0);
}

function questionsForPage(question: SurveyQuestion) {
  if (isRq1Question(question)) {
    return surveyQuestions.filter(isRq1Question);
  }
  return [question];
}

function isRq1Question(question: SurveyQuestion | undefined) {
  return Boolean(question && rq1QuestionCodes.has(question.code));
}

function firstQuestionIndex(codes: Set<string>) {
  return surveyQuestions.findIndex((question) => codes.has(question.code));
}

function lastQuestionIndex(codes: Set<string>) {
  return surveyQuestions.reduce((lastIndex, question, index) => (codes.has(question.code) ? index : lastIndex), -1);
}

function reorderUsageFrequencyQuestions(questions: SurveyQuestion[]) {
  const nextQuestions = [...questions];
  usageFrequencyPairs.forEach(({ annual, monthly }) => {
    const annualIndex = nextQuestions.findIndex((question) => question.code === annual);
    const monthlyIndex = nextQuestions.findIndex((question) => question.code === monthly);
    if (annualIndex < 0 || monthlyIndex < 0 || monthlyIndex < annualIndex) return;
    const [monthlyQuestion] = nextQuestions.splice(monthlyIndex, 1);
    nextQuestions.splice(annualIndex, 0, monthlyQuestion);
  });
  return nextQuestions;
}

function shouldAutoAdvanceQuestion(question: SurveyQuestion) {
  return question.section === "satisfaction" && ["likert_7", "likert_7_with_na", "semantic_7"].includes(question.type);
}

function rangeWarningForQuestion(question: SurveyQuestion, value: SurveyValue) {
  if (question.type !== "numeric") return "";
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";
  const numeric = Number(rawValue);
  const min = question.min;
  const max = question.max;
  if (!Number.isFinite(numeric)) return `${min ?? 0}~${max ?? "제한 없음"} 범위의 숫자만 입력할 수 있습니다.`;
  if (min !== undefined && numeric < min) return `${min}~${max ?? "제한 없음"} 범위의 숫자만 입력할 수 있습니다.`;
  if (max !== undefined && numeric > max) return `${min ?? 0}~${max} 범위의 숫자만 입력할 수 있습니다.`;
  return "";
}

function rangeWarningForQuestions(questions: SurveyQuestion[], answers: Record<string, SurveyValue>) {
  for (const item of questions) {
    const warning = rangeWarningForQuestion(item, answers[item.code]);
    if (warning) {
      return `${item.title}: ${warning}`;
    }
  }
  return "";
}

function sectionSortIndex(section: string) {
  const order = ["pii", "respondent", "satisfaction", "behavior", "reading", "open_text", "intro"];
  const index = order.indexOf(section);
  return index === -1 ? order.length : index;
}

function piiQuestionSortIndex(code: string) {
  if (code === "P2-EXCLUDE") return 0;
  if (code === "P1-EXCLUDE") return 1;
  return 2;
}

function normalizedPhone(value: SurveyValue) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function isValidPhone(value: SurveyValue) {
  return normalizedPhone(value).length === 11 && !isSamplePhone(value);
}

function isSamplePhone(value: SurveyValue) {
  return normalizedPhone(value) === samplePhoneValue;
}

function submittedPhones() {
  try {
    const rawValue = window.localStorage.getItem(submittedPhoneStorageKey);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function hasSubmittedPhone(phone: string) {
  return submittedPhones().includes(phone);
}

function saveSubmittedPhone(phone: string) {
  const phones = new Set(submittedPhones());
  phones.add(phone);
  window.localStorage.setItem(submittedPhoneStorageKey, JSON.stringify([...phones]));
}

function hasAnswer(value: SurveyValue) {
  if (Array.isArray(value)) return value.length > 0;
  if (isPeriodValue(value)) return Boolean(value.years || value.months);
  if (isDistrictDongValue(value)) return Boolean(value.district && (value.district === "기타" || value.dong));
  if (isRankValue(value)) return Object.values(value).some(Boolean);
  return value !== "";
}

function iconForQuestion(question: SurveyQuestion) {
  if (question.type === "numeric") return <Hash size={22} />;
  if (question.type === "date") return <CalendarDays size={22} />;
  if (question.type === "period") return <CalendarDays size={22} />;
  if (question.type === "district_dong") return <ListChecks size={22} />;
  if (question.type === "rank_choice") return <ListChecks size={22} />;
  if (question.type === "long_text" || question.type === "short_text") return <MessageSquareText size={22} />;
  if (question.type === "phone") return <Phone size={22} />;
  if (question.pii) return <LockKeyhole size={22} />;
  return <Check size={22} />;
}

function initialValue(question: SurveyQuestion): SurveyValue {
  if (question.type === "multi_choice") return [];
  if (question.type === "period") return { years: "", months: "" };
  if (question.type === "district_dong") return { district: "", dong: "" };
  if (question.type === "rank_choice") return {};
  return "";
}

function isPeriodValue(value: SurveyValue): value is PeriodValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "years" in value && "months" in value;
}

function isDistrictDongValue(value: SurveyValue): value is DistrictDongValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "district" in value && "dong" in value;
}

function isRankValue(value: SurveyValue): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !("years" in value) && !("district" in value);
}
