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
import nowonLibraryLogo from "../assets/nowon-library-logo-vertical.png";
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
  entryMode?: "online" | "offline_entry";
  showModeLink?: boolean;
};

const initialAnswers = Object.fromEntries(
  localSurveyQuestions.map((question) => [question.code, initialValue(question)]),
) as Record<string, SurveyValue>;

const usageFrequencyPairs = [
  { monthly: "DQ1-M", annual: "DQ1-Y" },
  { monthly: "DQ6-M", annual: "DQ6-Y" },
];

const rq1QuestionCodes = new Set(["RQ1-1", "RQ1-2", "RQ1-3", "RQ1-4", "RQ1-5", "RQ1-6", "RQ1-7"]);
const satisfactionProgressLabels: Record<string, string> = {
  Q1: "공간/편의",
  Q2: "자료/정보",
  Q3: "소통",
  Q4: "문화·교육",
  Q5: "관계",
  Q6: "독서·삶의 질",
  Q7_Q8: "비용 혜택 & 투자 필요성",
};
const progressGroupOrder = ["pii", "respondent", "satisfaction:Q1", "satisfaction:Q2", "satisfaction:Q3", "satisfaction:Q4", "satisfaction:Q5", "satisfaction:Q6", "satisfaction:Q7_Q8", "behavior", "reading", "local_feedback", "intro"];

const surveyQuestions = reorderUsageFrequencyQuestions([
  ...localSurveyQuestions
    .filter((question) => question.section === "pii")
    .filter((question) => question.code !== "P1-EXCLUDE")
    .sort((left, right) => piiQuestionSortIndex(left.code) - piiQuestionSortIndex(right.code)),
  ...localSurveyQuestions.filter((question) => question.section !== "pii"),
]);

const submittedPhoneStorageKey = "libanalysis-survey-submitted-phones";
const samplePhoneValue = "01012345678";
const phoneConsentValue = "개인정보 수집·이용 동의";
const phoneNoConsentValue = "동의하지 않음(경품지급불가)";
const surveyTitle = "2026 노원구 도서관 서비스 성과조사";
const questionKeywordByCode: Partial<Record<string, string>> = {
  "Q1-A-1": "도서관 출입",
  "Q1-A-2": "도서관 공간",
  "Q1-A-3": "도서관 시설 이용",
  "Q1-A-4": "도서관 자료",
  "Q1-A-5": "편안",
  "Q1-A-6": "쾌적",
  "Q1-B-1": "경제적 부담",
  "Q1-B-2": "소요되는 시간",
  "Q1-B-3": "이동거리",
  "Q1-B-4": "사용하는 금액",
  "Q1-B-5": "도서관의 시설",
  "Q1-B-6": "매력적인 공간",
  "Q1-B-7": "마음이 편안하다",
  "Q1-C": "공간/이용 편의성",
  "Q2-A-1": "다양한 자료",
  "Q2-A-2": "다양한 주제의 자료",
  "Q2-A-3": "새로운 도서 및 정보",
  "Q2-A-4": "새로운 학습 기회",
  "Q2-A-5": "활용할 수 있는 자료",
  "Q2-A-6": "원하는 자료",
  "Q2-A-7": "자료 이용",
  "Q2-B-1": "학업/업무",
  "Q2-B-2": "자기계발 및 구직",
  "Q2-B-3": "취미/관심사",
  "Q2-B-4": "일상정보",
  "Q2-B-5": "사회문제 이해",
  "Q2-B-6": "경제적 부담",
  "Q2-C": "정보 획득/활용",
  "Q3-A-1": "이용 관련 정보",
  "Q3-A-2": "신속하게 제공",
  "Q3-A-3": "신뢰할 수 있다",
  "Q3-A-4": "사서의 도움",
  "Q3-A-5": "사서들",
  "Q3-A-6": "의견을 표현",
  "Q3-B-1": "도서관 정보",
  "Q3-B-2": "기대치를 충족",
  "Q3-B-3": "사서가 도움",
  "Q3-B-4": "의견을 지속적으로 반영",
  "Q3-B-5": "존중과 배려",
  "Q3-C": "소통/정책반영",
  "Q4-A-1": "원하는 프로그램",
  "Q4-A-2": "자녀/가족",
  "Q4-A-3": "새로운 프로그램",
  "Q4-A-4": "문화 활동",
  "Q4-A-5": "사회적 관심도",
  "Q4-A-6": "봉사 기회",
  "Q4-B-1": "프로그램을 확인",
  "Q4-B-2": "문화/여가 생활",
  "Q4-B-3": "문화·교육 프로그램",
  "Q4-C": "문화·교육향유",
  "Q5-A-1": "커뮤니티 활동",
  "Q5-A-2": "세대 교류",
  "Q5-A-3": "인간관계",
  "Q5-B-1": "알게 된 사람",
  "Q5-B-2": "가족 및 지인",
  "Q5-B-3": "사람들과 더욱 잘 소통",
  "Q5-B-4": "다른 세대",
  "Q5-B-5": "관계가 좋아졌다",
  "Q5-B-6": "지역과 연결된 느낌",
  "Q5-C": "사회적 관계형성",
  "Q6-B-1": "책에 대한 관심",
  "Q6-B-2": "독서량",
  "Q6-B-3": "다양한 즐거움",
  "Q6-B-4": "이해력",
  "Q6-B-5": "문화생활",
  "Q6-B-6": "성장",
  "Q6-B-7": "사는 곳에 관심",
  "Q6-B-8": "도서관의 중요성",
  "Q6-B-9": "삶의 질",
  "Q6-C": "행복감 상승",
  "Q7-D-12": "도서관 서비스의 혜택",
  "Q8": "지속적으로 투자를",
  "DQ1-Y": "연간 도서관 이용 횟수",
  "DQ1-M": "도서관 월 평균 이용 횟수",
  "DQ2": "도서관 이용 기간",
  "DQ3": "누구와 함께",
  "DQ4": "이용 경험",
  "DQ5": "주된 목적",
  "DQ6-Y": "연간 대출 서비스 이용 횟수",
  "DQ6-M": "대출 서비스 월 평균 이용 횟수",
  "DQ6-1": "도서를 대출하는 주된 목적",
  "RQ1-1": "종이책",
  "RQ1-2": "전자책",
  "RQ1-3": "오디오북",
  "RQ1-4": "웹소설",
  "RQ1-5": "만화책",
  "RQ1-6": "웹툰",
  "RQ1-7": "독서 한 적 없음",
  "RQ2": "책 읽기",
  "RQ3": "도움 된 사항",
};

export function SurveyPrototype({ onExportSnapshotChange, entryMode = "online", showModeLink = false }: SurveyPrototypeProps = {}) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, SurveyValue>>(initialAnswers);
  const [offlineEntryId, setOfflineEntryId] = React.useState("");
  const [progressExpanded, setProgressExpanded] = React.useState(false);
  const [submitMessage, setSubmitMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const submitLockRef = React.useRef(false);
  const surveyStartedAtRef = React.useRef(Date.now());
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

  function handleContactConsentChange(value: string) {
    if (value === phoneNoConsentValue) {
      setSubmitMessage("");
      setAnswers((current) => ({ ...current, "P1-EXCLUDE": value, "P2-EXCLUDE": "" }));
      setCurrentIndex((index) => nextVisibleQuestionIndex(index, { ...answers, "P1-EXCLUDE": value, "P2-EXCLUDE": "" }));
      return;
    }
    updateAnswers({ "P1-EXCLUDE": value });
    setSubmitMessage("");
  }

  function goNext() {
    if (question.code === "P2-EXCLUDE" && !String(answers["P1-EXCLUDE"] ?? "").trim()) {
      setSubmitMessage("개인정보 수집·이용 동의 여부를 선택해 주세요.");
      return;
    }
    if (question.code === "P2-EXCLUDE" && hasPhoneConsent(answers) && !isValidPhone(answers["P2-EXCLUDE"])) {
      setSubmitMessage(isSamplePhone(answers["P2-EXCLUDE"]) ? "예시 번호는 사용할 수 없습니다. 실제 휴대폰 번호를 입력해 주세요." : "휴대폰 번호는 숫자 11자리로 입력해 주세요.");
      return;
    }
    const nextAnswers = fillEmptyDirectInputsOnPage(pageQuestions, answers);
    const requiredWarning = requiredWarningForQuestions(pageQuestions, nextAnswers);
    if (requiredWarning) {
      setSubmitMessage(requiredWarning);
      return;
    }
    const rangeWarning = rangeWarningForQuestions(pageQuestions, nextAnswers);
    if (rangeWarning) {
      setSubmitMessage(rangeWarning);
      return;
    }
    if (nextAnswers !== answers) {
      setAnswers(nextAnswers);
    }
    setSubmitMessage("");
    setCurrentIndex((index) => nextVisibleQuestionIndex(index, nextAnswers));
  }

  function goPrevious() {
    setCurrentIndex((index) => previousVisibleQuestionIndex(index, answers));
  }

  async function handleSubmit() {
    if (submitLockRef.current || isSubmitted) {
      return;
    }
    const phone = normalizedPhone(answers["P2-EXCLUDE"]);
    const phoneConsent = hasPhoneConsent(answers);
    if (!String(answers["P1-EXCLUDE"] ?? "").trim()) {
      setSubmitMessage("개인정보 수집·이용 동의 여부를 선택해 주세요.");
      setCurrentIndex(surveyQuestions.findIndex((item) => item.code === "P2-EXCLUDE"));
      return;
    }
    if (phoneConsent && !isValidPhone(answers["P2-EXCLUDE"])) {
      setSubmitMessage(isSamplePhone(answers["P2-EXCLUDE"]) ? "예시 번호는 사용할 수 없습니다. 실제 휴대폰 번호를 입력해 주세요." : "휴대폰 번호는 숫자 11자리로 입력해 주세요.");
      setCurrentIndex(surveyQuestions.findIndex((item) => item.code === "P2-EXCLUDE"));
      return;
    }
    if (phoneConsent && hasSubmittedPhone(phone)) {
      setSubmitMessage("이미 제출이 완료된 휴대폰 번호입니다. 같은 번호로는 다시 제출할 수 없습니다.");
      setCurrentIndex(surveyQuestions.findIndex((item) => item.code === "P2-EXCLUDE"));
      return;
    }
    const finalAnswers = fillEmptyDirectInputsAcrossSurvey(answers);
    const firstInvalidIndex = findFirstInvalidRequiredQuestionIndex(finalAnswers);
    if (firstInvalidIndex >= 0) {
      const firstInvalidQuestion = surveyQuestions[firstInvalidIndex];
      setSubmitMessage(requiredWarningForQuestions(questionsForPage(firstInvalidQuestion), finalAnswers));
      setCurrentIndex(firstInvalidIndex);
      if (finalAnswers !== answers) {
        setAnswers(finalAnswers);
      }
      return;
    }
    const finalRangeWarning = rangeWarningForQuestions(surveyQuestions, finalAnswers);
    if (finalRangeWarning) {
      setSubmitMessage(finalRangeWarning);
      const targetIndex = surveyQuestions.findIndex((item) => finalRangeWarning.startsWith(item.title));
      if (targetIndex >= 0) {
        setCurrentIndex(targetIndex);
      }
      if (finalAnswers !== answers) {
        setAnswers(finalAnswers);
      }
      return;
    }
    if (finalAnswers !== answers) {
      setAnswers(finalAnswers);
    }
    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitMessage("제출 중입니다. 잠시만 기다려 주세요.");
    let completed = false;
    try {
      const response = await submitSurveyResponse({
        analysisPayload: buildAnalysisPayload(finalAnswers),
        piiPayload: buildPiiPayload(finalAnswers),
        completedFields: buildExportCompletion(finalAnswers).completedFields,
        totalFields: buildExportCompletion(finalAnswers).totalFields,
        responseDurationMs: Date.now() - surveyStartedAtRef.current,
        responseSource: entryMode,
        offlineEntryId: entryMode === "offline_entry" ? offlineEntryId : "",
      });
      if (!response.ok) {
        if (response.duplicate) {
          setSubmitMessage("이미 제출이 완료된 휴대폰 번호입니다. 같은 번호로는 다시 제출할 수 없습니다.");
          setCurrentIndex(surveyQuestions.findIndex((item) => item.code === "P2-EXCLUDE"));
          return;
        }
        setSubmitMessage(submissionFailureMessage(response));
        return;
      }
      if (phoneConsent) {
        saveSubmittedPhone(phone);
        setSubmitMessage("제출이 완료되었습니다. 같은 휴대폰 번호로는 다시 제출할 수 없습니다.");
      } else {
        setSubmitMessage("제출이 완료되었습니다.");
      }
      completed = true;
      setIsSubmitted(true);
    } catch {
      setSubmitMessage("네트워크 오류로 제출하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.");
    } finally {
      if (!completed) {
        submitLockRef.current = false;
      }
      setIsSubmitting(false);
    }
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
          <h1>{surveyTitle}</h1>
          {/* <p>모바일과 웹에서 문항 유형에 맞는 입력 방식을 검토하는 화면입니다.</p> */}
        </div>
        {showModeLink && <a className="survey-mode-link" href="/mockup">목업 보기</a>}
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
                {progressGroupsForSurvey()
                  .map(({ id, label }) => {
                    const firstIncompleteIndex = findFirstIncompleteProgressGroupQuestionIndex(id, answers);
                    const fallbackIndex = surveyQuestions.findIndex((item) => progressGroupIdForQuestion(item) === id);
                    const targetIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : fallbackIndex;
                    const sectionCompletion = buildProgressGroupCompletion(id, answers);
                    return (
                      <button
                        key={id}
                        className={progressGroupIdForQuestion(question) === id ? "active" : ""}
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
          {isSubmitted ? (
            <SubmissionCompletePage />
          ) : (
            <>
              {/* <div className="survey-question-meta">
                <span>{sectionLabels[question.section]}</span>
                {question.section !== "pii" && <strong>{question.code}</strong>}
              </div> */}
              {question.code === "P2-EXCLUDE" ? (
                <ContactVerificationPage
                  entryMode={entryMode}
                  offlineEntryId={offlineEntryId}
                  phoneValue={String(answers["P2-EXCLUDE"] ?? "")}
                  consentValue={String(answers["P1-EXCLUDE"] ?? "")}
                  onOfflineEntryIdChange={setOfflineEntryId}
                  onPhoneChange={(value) => updateAnswer("P2-EXCLUDE", value)}
                  onConsentChange={handleContactConsentChange}
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
                    onAutoAdvance={(code, value) => {
                      setSubmitMessage("");
                      const nextAnswers = { ...answers, [code]: value };
                      setCurrentIndex((index) => nextVisibleQuestionIndex(index, nextAnswers));
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
                  <button className="survey-secondary-button" type="button" onClick={goPrevious} disabled={isSubmitting}>
                    <ChevronLeft size={18} />
                    이전
                  </button>
                )}
                {currentIndex === surveyQuestions.length - 1 ? (
                  <button className="survey-primary-button" type="button" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "제출 중" : "제출"}
                    <Check size={18} />
                  </button>
                ) : (
                  <button className="survey-primary-button" type="button" onClick={goNext} disabled={isSubmitting}>
                    다음
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
              {submitMessage && <div className="survey-submit-message" role="status">{submitMessage}</div>}
            </>
          )}
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

function SubmissionCompletePage() {
  return (
    <section className="survey-completion-card" role="status" aria-live="polite">
      <span className="survey-completion-icon">
        <Check size={26} />
      </span>
      <p className="question-type-badge">제출 완료</p>
      <h2>응답 제출이 완료되었습니다</h2>
      <p>
        참여해 주셔서 감사합니다. 제출 처리 완료 후에는 같은 화면에서 다시 제출할 수 없습니다.
      </p>
    </section>
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
  onAutoAdvance: (code: string, value: SurveyValue) => void;
  onJumpToQuestion: (code: string) => void;
  shouldAutoAdvance: boolean;
}) {
  function handleSingleChoiceChange(nextValue: string) {
    onChange(nextValue);
    if (shouldAutoAdvance) {
      onAutoAdvance(question.code, nextValue);
    }
  }

  function handleLikertChange(nextValue: string) {
    onChange(nextValue);
    if (shouldAutoAdvance) {
      onAutoAdvance(question.code, nextValue);
    }
  }

  return (
    <div className={`survey-question ${question.type === "multi_choice" ? "multi-choice-page" : ""} ${isScaleQuestion(question) ? "scale-question" : ""}`}>
      <div className="survey-question-title">
          {iconForQuestion(question)}
          <div>
            <QuestionHeading question={question} />
          <QuestionDescription question={question} />
          </div>
        </div>
      {question.type === "single_choice" && <ChoiceButtons question={question} value={String(value ?? "")} onChange={handleSingleChoiceChange} />}
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

function QuestionHeading({ question }: { question: SurveyQuestion }) {
  const badgeLabel = questionTypeBadgeLabel(question);
  return (
    <div className="question-heading-row">
      <h2>{renderQuestionTitle(question)}</h2>
      {badgeLabel && <span className="question-type-badge">{badgeLabel}</span>}
    </div>
  );
}

function QuestionDescription({ question }: { question: SurveyQuestion }) {
  const description = questionDescriptionText(question);
  return <p className={description ? "" : "question-description-placeholder"}>{description || "\u00a0"}</p>;
}

function questionDescriptionText(question: SurveyQuestion) {
  const details: string[] = [];
  if (question.description) details.push(question.description);
  if (isScaleQuestionWithoutNa(question)) details.push("해당없음 선택지가 없는 문항입니다.");
  return details.join(" ");
}

function isScaleQuestionWithoutNa(question: SurveyQuestion) {
  return question.type === "likert_7" || question.type === "semantic_7";
}

function questionTypeBadgeLabel(question: SurveyQuestion) {
  if (question.type === "single_choice") return "1개 선택";
  if (question.type === "multi_choice") return "복수 선택 가능";
  if (question.type === "likert_7" || question.type === "likert_7_with_na" || question.type === "semantic_7") return "척도 선택";
  if (question.type === "numeric") return "숫자 입력";
  if (question.type === "period") return "기간 입력";
  if (question.type === "rank_choice") return `${question.rankCount ?? 3}순위 선택`;
  if (question.type === "district_dong") return "지역 선택";
  if (question.type === "long_text" || question.type === "short_text") return "선택 입력";
  return "";
}

function ContactVerificationPage({
  entryMode,
  offlineEntryId,
  phoneValue,
  consentValue,
  onOfflineEntryIdChange,
  onPhoneChange,
  onConsentChange,
}: {
  entryMode: "online" | "offline_entry";
  offlineEntryId: string;
  phoneValue: string;
  consentValue: string;
  onOfflineEntryIdChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onConsentChange: (value: string) => void;
}) {
  const consentQuestion = localSurveyQuestions.find((question) => question.code === "P1-EXCLUDE");
  const [privacyExpanded, setPrivacyExpanded] = React.useState(false);
  const showPhoneInput = consentValue === phoneConsentValue;
  const isOfflineEntry = entryMode === "offline_entry";

  return (
    <div className="survey-question contact-page">
      {isOfflineEntry && (
        <div className="offline-entry-banner">
          <strong>오프라인 설문 입력 모드</strong>
          <span>종이 설문지 응답을 담당자가 그대로 입력하는 화면입니다. 제출 로그에는 `source=offline_entry`로 기록됩니다.</span>
          <label className="offline-entry-id-field">
            <span>종이 설문 관리번호</span>
            <input
              autoComplete="off"
              inputMode="text"
              maxLength={32}
              placeholder="예: OFF-0001"
              value={offlineEntryId}
              onChange={(event) => onOfflineEntryIdChange(formatOfflineEntryId(event.target.value))}
            />
            <small>선택 입력입니다. 입력하면 제출 로그에만 기록됩니다.</small>
          </label>
        </div>
      )}
      <div className="contact-start-panel">
        <div className="contact-start-copy">
          <span>{surveyTitle}</span>
          <h2>{isOfflineEntry ? "종이 설문 응답을 입력합니다" : "도서관 서비스 발전을 위한 의견을 들려주세요"}</h2>
          {isOfflineEntry ? (
            <p>응답자가 표시한 그대로 입력하고, 빈칸이나 읽기 어려운 응답은 임의로 보정하지 않습니다.</p>
          ) : (
            <p>
              노원구립도서관 이용 경험과 서비스 혜택을 살펴보고 향후 발전 방향을 모색하기 위한 조사입니다.
              <br />
              전체 응답에는 약 <strong>7분</strong>이 소요됩니다.
            </p>
          )}
        </div>
        <div className="contact-start-steps" aria-label="설문 진행 안내">
          <strong>1</strong>
          <span>{isOfflineEntry ? "종이 설문 확인" : "중복 제출 확인"}</span>
          <strong>2</strong>
          <span>{isOfflineEntry ? "응답 그대로 입력" : "설문 응답"}</span>
          <strong>3</strong>
          <span>제출 완료</span>
        </div>
        <img className="contact-start-logo" src={nowonLibraryLogo} alt="노원구립도서관" />
      </div>

      {consentQuestion && (
        <div className="contact-consent-block">
          <div className="survey-question-title contact-consent-title">
            <Phone size={22} />
            <div>
              <h2><strong className="question-keyword">연락처 제공 여부</strong>를 선택해 주세요</h2>
              <p>{isOfflineEntry ? "종이 설문지에 표시된 연락처 제공 여부만 입력합니다. 표시가 없거나 불명확하면 동의하지 않음으로 처리하고 검수 대상에 남겨 주세요." : "동의하면 전화번호 기준으로 중복 제출을 확인하고, 동의하지 않으면 바로 설문으로 이동합니다."}</p>
            </div>
          </div>
          <ChoiceButtons question={consentQuestion} value={consentValue} onChange={onConsentChange} />
        </div>
      )}

      {showPhoneInput && (
        <div className="contact-phone-panel">
          <PhoneInput value={phoneValue} onChange={onPhoneChange} />
        </div>
      )}

      <div className="privacy-policy-note">
        <button
          className="privacy-policy-toggle"
          type="button"
          aria-expanded={privacyExpanded}
          onClick={() => setPrivacyExpanded((expanded) => !expanded)}
        >
          <strong>개인정보 수집·이용 안내</strong>
          <ChevronsUpDown size={15} />
        </button>
        {privacyExpanded && (
          <div className="privacy-policy-content">
            <p>
              본 조사의 응답 내용은 공공도서관 서비스 개선을 위한 통계 분석 목적으로만 사용됩니다. 응답 자료는 개인을 식별할 수 없도록 분석용 응답과 연락처 정보를 분리하여 처리하며, 연락처 제공에 동의한 경우에도 전화번호 원문은 저장하지 않고 해시 및 암호화 값으로 보호합니다. 분석용 자료에는 연락처 정보가 포함되지 않습니다.
            </p>
            <ul>
              <li>수집·이용 목적: 중복 제출 확인, 답례 발송, 조사 운영 관리</li>
              <li>수집 항목: 휴대폰 번호</li>
              <li>보유·이용 기간: 조사 종료 후 답례품 지급 후 파기</li>
              <li>동의 거부권 및 불이익: 동의하지 않아도 설문 참여는 가능하지만 전화번호 기반 중복 확인과 답례 발송은 제공되지 않습니다.</li>
              {/*
              <li>전화번호 원문은 저장하지 않고 서버에서 해시와 암호화 값으로 분리 저장합니다.</li>
              <li>분석용 export 파일에는 휴대폰 번호, 해시, 암호화 값을 포함하지 않습니다.</li>
              <li>반복 또는 이상 응답 여부는 제출 로그를 기준으로 사후 검토합니다.</li>
              <li>개인정보는 접근 권한이 제한된 운영 영역에 보관하고, 조사 운영 목적 달성 후 내부 보관 기준에 따라 파기합니다.</li>
              */}
            </ul>
          </div>
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
          <div className="question-heading-row">
            <h2><strong className="question-keyword">지난 1년 동안 읽은 독서량</strong></h2>
            <span className="question-type-badge">숫자 입력</span>
          </div>
          <p>유형별 권수를 한 번에 입력해 주세요.</p>
        </div>
      </div>

      <div className="rq1-input-grid">
        {numericQuestions.map((item) => (
          <div className="rq1-input-card" key={item.code}>
            <h3>{renderTextWithKeyword(item.title.replace("지난 1년 동안 읽은 ", ""), questionKeywordByCode[item.code])}</h3>
            <NumericInput question={item} value={String(answers[item.code] ?? "")} onChange={(value) => handleNumericChange(item, value)} />
          </div>
        ))}
      </div>

      {noReadingQuestion && (
        <div className="rq1-no-reading">
          <h3>{renderTextWithKeyword("독서 경험이 없는 경우", "독서 경험")}</h3>
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

const questionKeywordPhrases = [
  "연락처 제공 여부",
  "휴대폰 번호",
  "주 이용 도서관",
  "주로 이용하는 도서관 서비스",
  "최종학력",
  "거주지역",
  "성별",
  "연령",
  "직업",
  "도서관 월 평균 이용 횟수",
  "연간 도서관 이용 횟수",
  "도서관 이용 기간",
  "누구와 함께",
  "이용 경험",
  "주된 목적",
  "대출 서비스 월 평균 이용 횟수",
  "연간 대출 서비스 이용 횟수",
  "도서를 대출하는 주된 목적",
  "지난 1년 동안 읽은 독서량",
  "종이책",
  "전자책",
  "오디오북",
  "웹소설",
  "만화책",
  "웹툰",
  "책 읽기",
  "도움 된 사항",
  "도서관 출입",
  "도서관 공간",
  "도서관 시설",
  "도서관 자료",
  "경제적 부담",
  "이용할 가치",
  "만족한다",
  "다양한 자료",
  "다양한 주제의 자료",
  "새로운 도서 및 정보",
  "새로운 학습 기회",
  "자료 이용",
  "사서",
  "나의 의견",
  "도서관 서비스",
  "프로그램",
  "문화/여가 생활",
  "커뮤니티 활동",
  "세대 교류",
  "인간관계",
  "사회적 관계형성",
  "책에 대한 관심",
  "독서량",
  "삶의 질",
  "행복감",
  "도서관 서비스의 혜택",
  "지속적으로 투자를",
].sort((left, right) => right.length - left.length);

function renderQuestionTitle(question: SurveyQuestion) {
  const ranges = highlightRangesForText(question.title, questionKeywordByCode[question.code]);

  if (question.type === "multi_choice") {
    const marker = "모두 선택";
    const start = question.title.indexOf(marker);
    if (start >= 0) {
      const end = start + marker.length;
      const overlapsKeyword = ranges.some((range) => start < range.end && end > range.start);
      if (!overlapsKeyword) {
        ranges.push({ start, end, className: "multi-choice-emphasis" });
      }
    }
  }

  if (ranges.length === 0) return question.title;
  return renderHighlightedParts(question.title, ranges);
}

function renderTextWithKeyword(text: string, keyword?: string) {
  const ranges = highlightRangesForText(text, keyword);
  if (ranges.length === 0) return text;
  return renderHighlightedParts(text, ranges);
}

function highlightRangesForText(text: string, keyword?: string) {
  const ranges: Array<{ start: number; end: number; className: string }> = [];
  const keywordInText = keyword && text.includes(keyword) ? keyword : questionKeywordPhrases.find((phrase) => text.includes(phrase));
  if (keywordInText) {
    const start = text.indexOf(keywordInText);
    ranges.push({ start, end: start + keywordInText.length, className: "question-keyword" });
  }
  return ranges;
}

function renderHighlightedParts(text: string, ranges: Array<{ start: number; end: number; className: string }>) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges
    .sort((left, right) => left.start - right.start)
    .forEach((range, index) => {
      if (range.start > cursor) {
        parts.push(text.slice(cursor, range.start));
      }
      parts.push(
        <strong className={range.className} key={`${range.className}-${index}`}>
          {text.slice(range.start, range.end)}
        </strong>,
      );
      cursor = range.end;
    });
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return <>{parts}</>;
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
  const maxLength = 300;

  return (
    <label className="survey-input-label">
      <span>서술형 응답</span>
      <textarea maxLength={maxLength} rows={7} value={value} onChange={(event) => onChange(event.target.value.slice(0, maxLength))} />
      <small>{value.length}/{maxLength}자</small>
    </label>
  );
}

function PhoneInput({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
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
        disabled={disabled}
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
      <small className={!disabled && helperWarning ? "input-warning" : ""}>{disabled ? "동의하지 않음을 선택하면 전화번호를 수집하지 않습니다." : helperWarning || "숫자 11자리만 입력해 주세요."}</small>
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

type SubmitSurveyRequest = {
  analysisPayload: Record<string, unknown>;
  piiPayload: Record<string, unknown>;
  completedFields: number;
  totalFields: number;
  responseDurationMs?: number;
  responseSource?: "online" | "offline_entry";
  offlineEntryId?: string;
};

type SubmitSurveyResult = {
  ok: boolean;
  duplicate?: boolean;
  code?: string;
  message?: string;
  requestId?: string;
  status?: number;
};

async function submitSurveyResponse(payload: SubmitSurveyRequest): Promise<SubmitSurveyResult> {
  const response = await fetch("/api/submit-survey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      submittedAt: new Date().toISOString(),
      clientPath: window.location.pathname,
    }),
  });
  const result = await response.json().catch(() => ({}));
  return {
    ok: response.ok && result.ok !== false,
    duplicate: Boolean(result.duplicate),
    code: typeof result.code === "string" ? result.code : "",
    message: typeof result.message === "string" ? result.message : "",
    requestId: typeof result.requestId === "string" ? result.requestId : "",
    status: response.status,
  };
}

function buildAnalysisPayload(answers: Record<string, SurveyValue>) {
  const payload: Record<string, unknown> = {};
  const exportAnswers = normalizeConditionalAnswersForExport(answers);
  localSurveyQuestions
    .filter((question) => !question.pii)
    .forEach((question) => {
      const value = exportAnswers[question.code];
      if (question.type === "period" && isPeriodValue(value)) {
        const [yearCode = `${question.code}-Y`, monthCode = `${question.code}-M`] = question.exportCodes ?? [];
        payload[yearCode] = value.years;
        payload[monthCode] = value.months;
        return;
      }
      if (question.type === "district_dong" && isDistrictDongValue(value)) {
        const normalizedValue = normalizedDistrictDongValue(question, value);
        payload[question.code] = normalizedValue.district;
        payload[`${question.code}-DONG`] = normalizedValue.dong;
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

function exportValueForQuestion(question: SurveyQuestion, value: SurveyValue) {
  if (value === "해당없음") {
    return "9";
  }

  return value;
}

function buildPiiPayload(answers: Record<string, SurveyValue>) {
  const payload: Record<string, unknown> = {};
  localSurveyQuestions
    .filter((question) => question.pii)
    .forEach((question) => {
      const value = answers[question.code];
      payload[question.code] = question.code === "P2-EXCLUDE" && (!hasPhoneConsent(answers) || isSamplePhone(value)) ? "" : value;
    });
  return payload;
}

function normalizeConditionalAnswersForExport(answers: Record<string, SurveyValue>) {
  const nextAnswers = { ...answers };
  const rq1NumericQuestions = surveyQuestions.filter((item) => isRq1Question(item) && item.type === "numeric");
  const hasPositiveReadingCount = rq1NumericQuestions.some((item) => Number(nextAnswers[item.code] ?? 0) > 0);
  const noReadingValue = String(nextAnswers["RQ1-7"] ?? "").trim();

  if (hasPositiveReadingCount && noReadingValue) {
    nextAnswers["RQ1-7"] = "";
  } else if (noReadingValue) {
    rq1NumericQuestions.forEach((item) => {
      nextAnswers[item.code] = "0";
    });
  }

  return nextAnswers;
}

function normalizedDistrictDongValue(question: SurveyQuestion, value: DistrictDongValue): DistrictDongValue {
  if (!value.district) {
    return { district: "", dong: "" };
  }
  if (value.district === "기타") {
    // SQ3-DONG is kept as a sentinel export value because the submission schema has a fixed district/dong column pair.
    return { district: value.district, dong: "기타" };
  }
  const allowedDongs = question.dongChoicesByDistrict?.[value.district] ?? [];
  return {
    district: value.district,
    dong: allowedDongs.includes(value.dong) ? value.dong : "",
  };
}

function buildExportCompletion(answers: Record<string, SurveyValue>) {
  return localSurveyQuestions
    .filter((question) => !question.pii && !question.completionExcluded)
    .reduce(
      (summary, question) => {
        const stats = progressStatsForQuestion(question, answers);
        return {
          completedFields: summary.completedFields + stats.completedFields,
          totalFields: summary.totalFields + stats.totalFields,
        };
      },
      { completedFields: 0, totalFields: 0 },
    );
}

function progressGroupsForSurvey() {
  const groups = new Map<string, string>();
  surveyQuestions.forEach((item) => {
    const id = progressGroupIdForQuestion(item);
    if (!groups.has(id)) {
      groups.set(id, progressGroupLabelForQuestion(item, id));
    }
  });
  return Array.from(groups, ([id, label]) => ({ id, label })).sort((left, right) => progressGroupSortIndex(left.id) - progressGroupSortIndex(right.id));
}

function buildProgressGroupCompletion(groupId: string, answers: Record<string, SurveyValue>) {
  return localSurveyQuestions
    .filter((item) => progressGroupIdForQuestion(item) === groupId)
    .reduce(
      (summary, item) => {
        const stats = item.pii ? questionStatsForNavigation(item, answers[item.code]) : progressStatsForQuestion(item, answers);
        return {
          completedFields: summary.completedFields + stats.completedFields,
          totalFields: summary.totalFields + stats.totalFields,
        };
      },
      { completedFields: 0, totalFields: 0 },
    );
}

function findFirstIncompleteProgressGroupQuestionIndex(groupId: string, answers: Record<string, SurveyValue>) {
  if (groupId === "pii") {
    const piiIncomplete = localSurveyQuestions
      .filter((item) => progressGroupIdForQuestion(item) === groupId)
      .some((item) => questionStatsForNavigation(item, answers[item.code]).completedFields < 1);
    return piiIncomplete ? surveyQuestions.findIndex((item) => item.code === "P2-EXCLUDE") : surveyQuestions.findIndex((item) => progressGroupIdForQuestion(item) === groupId);
  }
  return surveyQuestions.findIndex((item) => {
    if (progressGroupIdForQuestion(item) !== groupId) return false;
    const stats = item.pii ? questionStatsForNavigation(item, answers[item.code]) : progressStatsForQuestion(item, answers);
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
    const normalizedValue = normalizedDistrictDongValue(question, districtDong);
    return countFilledFields([normalizedValue.district, normalizedValue.dong]);
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

function progressStatsForQuestion(question: SurveyQuestion, answers: Record<string, SurveyValue>) {
  if (question.code === "RQ1-7" && rq1NumericQuestionsHaveAnyAnswer(answers)) {
    return { completedFields: 0, totalFields: 0 };
  }
  return exportStatsForQuestion(question, answers[question.code]);
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

function fillEmptyDirectInputsOnPage(questions: SurveyQuestion[], answers: Record<string, SurveyValue>) {
  let nextAnswers: Record<string, SurveyValue> | null = null;

  questions.forEach((item) => {
    if (item.type !== "period") return;
    const rawPeriod = answers[item.code];
    const period: PeriodValue = isPeriodValue(rawPeriod) ? rawPeriod : { years: "", months: "" };
    if (!period.years && !period.months) return;
    const nextPeriod = {
      years: period.years || "0",
      months: period.months || "0",
    };
    if (nextPeriod.years !== period.years || nextPeriod.months !== period.months) {
      nextAnswers = { ...(nextAnswers ?? answers), [item.code]: nextPeriod };
    }
  });

  const numericQuestions = questions.filter((item) => item.type === "numeric");
  if (numericQuestions.length > 1 && numericQuestions.some((item) => isFilledExportValue(answers[item.code]))) {
    numericQuestions.forEach((item) => {
      if (isFilledExportValue((nextAnswers ?? answers)[item.code])) return;
      nextAnswers = { ...(nextAnswers ?? answers), [item.code]: "0" };
    });
  }

  return nextAnswers ?? answers;
}

function fillEmptyDirectInputsAcrossSurvey(answers: Record<string, SurveyValue>) {
  return surveyQuestions.reduce((currentAnswers, item) => fillEmptyDirectInputsOnPage(questionsForPage(item), currentAnswers), answers);
}

function requiredWarningForQuestions(questions: SurveyQuestion[], answers: Record<string, SurveyValue>) {
  const missingQuestion = questions.find((item) => isRequiredQuestionIncomplete(item, answers));
  if (!missingQuestion) return "";
  if (missingQuestion.type === "rank_choice") {
    return `${missingQuestion.title}: 순위 선택을 완료해 주세요.`;
  }
  if (missingQuestion.type === "multi_choice") {
    return `${missingQuestion.title}: 하나 이상 선택해 주세요.`;
  }
  if (missingQuestion.type === "district_dong") {
    return `${missingQuestion.title}: 자치구와 행정동을 선택해 주세요.`;
  }
  if (missingQuestion.type === "period") {
    return `${missingQuestion.title}: 년 또는 개월을 입력해 주세요.`;
  }
  return `${missingQuestion.title}: 응답을 선택하거나 입력해 주세요.`;
}

function findFirstInvalidRequiredQuestionIndex(answers: Record<string, SurveyValue>) {
  return surveyQuestions.findIndex((item) => isRequiredQuestionIncomplete(item, answers));
}

function isRequiredQuestionIncomplete(question: SurveyQuestion, answers: Record<string, SurveyValue>) {
  if (!question.required) return false;
  if (question.code === "RQ1-7") {
    return !hasAnswer(answers["RQ1-7"]) && !rq1NumericQuestionsHaveAnyAnswer(answers);
  }
  if (isRq1Question(question) && question.type === "numeric" && hasAnswer(answers["RQ1-7"])) {
    return false;
  }
  if (question.type === "rank_choice" || question.type === "period" || question.type === "district_dong") {
    const stats = exportStatsForQuestion(question, answers[question.code]);
    return stats.completedFields < stats.totalFields;
  }
  return !hasAnswer(answers[question.code]);
}

function rq1NumericQuestionsHaveAnyAnswer(answers: Record<string, SurveyValue>) {
  return surveyQuestions
    .filter((item) => isRq1Question(item) && item.type === "numeric")
    .some((item) => hasAnswer(answers[item.code]));
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
  return ["single_choice", "likert_7", "likert_7_with_na", "semantic_7"].includes(question.type);
}

function isScaleQuestion(question: SurveyQuestion) {
  return ["likert_7", "likert_7_with_na", "semantic_7"].includes(question.type);
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

function submissionFailureMessage(response: SubmitSurveyResult) {
  const contactCode = response.requestId ? ` 문의 코드: ${response.requestId}` : "";
  if (response.duplicate || response.code === "ERR_PII_DUPLICATE") {
    return `이미 제출이 완료된 휴대폰 번호입니다. 같은 번호로는 다시 제출할 수 없습니다.${contactCode}`;
  }
  if (response.code === "ERR_SERVICE_MAINTENANCE") {
    return `현재 설문 저장 서버 점검 중입니다. 잠시 후 다시 시도해 주세요.${contactCode}`;
  }
  if (response.code === "ERR_SUBMISSION_BLOCKED") {
    return `현재 제출이 일시 차단되어 있습니다. 차단이 해제되기 전에는 다시 시도해도 제출되지 않습니다.${contactCode}`;
  }
  if (response.code === "ERR_STORAGE_NOT_CONFIGURED" || response.status === 503) {
    return `제출 저장소 설정을 확인해야 합니다. 다시 시도해도 해결되지 않을 수 있으니 운영 담당자에게 문의해 주세요.${contactCode}`;
  }
  if (response.code === "ERR_PII_WRITE_FAILED" || response.code === "ERR_ANALYSIS_WRITE_FAILED") {
    return `응답 저장 중 오류가 발생했습니다. 잠시 후 다시 시도하고, 계속 실패하면 운영 담당자에게 문의해 주세요.${contactCode}`;
  }
  if (response.status && response.status >= 500) {
    return `서버 오류로 제출하지 못했습니다. 잠시 후 다시 시도하고, 계속 실패하면 운영 담당자에게 문의해 주세요.${contactCode}`;
  }
  return `${response.message || "입력값을 확인해 주세요."}${contactCode}`;
}

function sectionSortIndex(section: string) {
  const order = ["pii", "respondent", "satisfaction", "behavior", "reading", "local_feedback", "intro"];
  const index = order.indexOf(section);
  return index === -1 ? order.length : index;
}

function progressGroupIdForQuestion(question: SurveyQuestion) {
  if (question.section !== "satisfaction") {
    return question.section;
  }
  const match = question.code.match(/^Q\d+/);
  if (match?.[0] === "Q7" || match?.[0] === "Q8") {
    return "satisfaction:Q7_Q8";
  }
  return match ? `satisfaction:${match[0]}` : question.section;
}

function progressGroupLabelForQuestion(question: SurveyQuestion, groupId: string) {
  if (question.section !== "satisfaction") {
    return sectionLabels[question.section];
  }
  const satisfactionCode = groupId.replace("satisfaction:", "");
  return satisfactionProgressLabels[satisfactionCode] ?? sectionLabels.satisfaction;
}

function progressGroupSortIndex(groupId: string) {
  const index = progressGroupOrder.indexOf(groupId);
  if (index >= 0) return index;
  if (groupId.startsWith("satisfaction:")) return progressGroupOrder.indexOf("satisfaction:Q8");
  return progressGroupOrder.length + sectionSortIndex(groupId);
}

function piiQuestionSortIndex(code: string) {
  if (code === "P2-EXCLUDE") return 0;
  if (code === "P1-EXCLUDE") return 1;
  return 2;
}

function normalizedPhone(value: SurveyValue) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function formatOfflineEntryId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32).toUpperCase();
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

function hasPhoneConsent(answers: Record<string, SurveyValue>) {
  return String(answers["P1-EXCLUDE"] ?? "") === phoneConsentValue;
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
