export type SurveySection = "intro" | "respondent" | "satisfaction" | "behavior" | "reading" | "open_text" | "pii";

export type SurveyQuestionType =
  | "single_choice"
  | "district_dong"
  | "multi_choice"
  | "likert_7"
  | "likert_7_with_na"
  | "semantic_7"
  | "numeric"
  | "date"
  | "period"
  | "rank_choice"
  | "short_text"
  | "long_text"
  | "phone";

export type SurveyQuestion = {
  code: string;
  exportCodes?: string[];
  sourceCodes?: string[];
  section: SurveySection;
  type: SurveyQuestionType;
  title: string;
  description?: string;
  choices?: string[];
  dongChoicesByDistrict?: Record<string, string[]>;
  required?: boolean;
  min?: number;
  max?: number;
  unit?: string;
  rankCount?: number;
  leftLabel?: string;
  rightLabel?: string;
  pii?: boolean;
};

export const localSurveyQuestions: SurveyQuestion[] = [
  {
    "code": "SQ1",
    "section": "respondent",
    "type": "single_choice",
    "title": "성별",
    "required": true,
    "choices": [
      "남성",
      "여성"
    ]
  },
  {
    "code": "SQ2",
    "section": "respondent",
    "type": "numeric",
    "title": "연령",
    "required": true,
    "min": 14,
    "max": 120,
    "unit": "세",
    "description": "만 나이를 숫자로 입력해 주세요. 만 14세 미만은 조사 대상에서 제외합니다."
  },
  {
    "code": "SQ3",
    "section": "respondent",
    "type": "district_dong",
    "title": "거주지역",
    "required": true,
    "choices": [
      "노원구",
      "성북구",
      "도봉구",
      "중랑구",
      "기타"
    ],
    "dongChoicesByDistrict": {
      "노원구": [
        "월계1동",
        "월계2동",
        "월계3동",
        "공릉1동",
        "공릉2동",
        "하계1동",
        "하계2동",
        "중계본동",
        "중계1동",
        "중계2,3동",
        "중계4동",
        "상계1동",
        "상계2동",
        "상계3,4동",
        "상계5동",
        "상계6,7동",
        "상계8동",
        "상계9동",
        "상계10동"
      ],
      "중랑구": [
        "면목본동",
        "면목2동",
        "면목3.8동",
        "면목4동",
        "면목5동",
        "면목7동",
        "상봉1동",
        "상봉2동",
        "중화1동",
        "중화2동",
        "묵1동",
        "묵2동",
        "망우본동",
        "망우3동",
        "신내1동",
        "신내2동"
      ],
      "성북구": [
        "성북동",
        "삼선동",
        "동선동",
        "돈암1동",
        "돈암2동",
        "안암동",
        "보문동",
        "정릉1동",
        "정릉2동",
        "정릉3동",
        "정릉4동",
        "길음1동",
        "길음2동",
        "종암동",
        "월곡1동",
        "월곡2동",
        "장위1동",
        "장위2동",
        "장위3동",
        "석관동"
      ],
      "도봉구": [
        "쌍문1동",
        "쌍문2동",
        "쌍문3동",
        "쌍문4동",
        "방학1동",
        "방학2동",
        "방학3동",
        "창1동",
        "창2동",
        "창3동",
        "창4동",
        "창5동",
        "도봉1동",
        "도봉2동"
      ],
      "기타": [
        "기타"
      ]
    },
    "description": "자치구를 먼저 선택하면 해당 행정동 선택지가 표시됩니다. 기타는 행정동을 별도로 묻지 않습니다."
  },
  {
    "code": "SQ4",
    "section": "respondent",
    "type": "single_choice",
    "title": "주 이용 도서관(공공도서관)",
    "required": true,
    "choices": [
      "노원중앙도서관",
      "마들이음도서관",
      "상계도서관",
      "노원어린이도서관",
      "불암도서관",
      "화랑도서관",
      "월계도서관",
      "월계어린이도서관",
      "하계어린이도서관",
      "해당없음"
    ],
    // "description": "현재 노원구 조사폼 기준 도서관 목록입니다. 타 자치구 배포 시 목록만 교체합니다."
  },
  {
    "code": "SQ5",
    "section": "respondent",
    "type": "single_choice",
    "title": "주로 이용하는 도서관 서비스",
    "required": true,
    "choices": [
      "도서 대출서비스",
      "강연, 체험, 공연 등의 프로그램",
      "전자자료실 등 PC 이용",
      "학습을 위한 열람실",
      "식당, 매점 등 편의시설",
      "개인 독서 및 휴식이 가능한 공간",
      "기타"
    ]
  },
  {
    "code": "BQ1",
    "section": "respondent",
    "type": "single_choice",
    "title": "최종학력",
    "required": true,
    "choices": [
      "교육을 안 받았음",
      "초등학교 졸업",
      "중학교 졸업",
      "고등학교 졸업",
      "2년제 대학 재학 및 졸업",
      "4년제 대학 재학 및 졸업",
      "대학원 졸업 이상"
    ]
  },
  {
    "code": "BQ2",
    "section": "respondent",
    "type": "single_choice",
    "title": "직업",
    "required": true,
    "choices": [
      "관리직",
      "전문직 및 관련 종사자",
      "사무직 종사자",
      "서비스직 종사자",
      "판매직 종사자",
      "농림어업 숙련 종사자",
      "기능원 및 관련 기능 종사자",
      "장치·기계조작·조립직 종사자",
      "단순 노무 종사자",
      "자영업 종사자",
      "군인",
      "학생",
      "전업 주부",
      "은퇴",
      "구직자",
      "기타"
    ]
  },
  {
    "code": "Q1-A-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 출입이 편리하다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-A-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "이용할 수 있는 도서관 공간이 충분하다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-A-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 시설 이용이 편리하다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-A-4",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 자료가 이용하기 편하게 배치되어 있다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-A-5",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 공간이 편안하게 느껴진다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-A-6",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 공간이 전반적으로 쾌적하다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-B-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "경제적 부담없이 도서관의 자원(시설, 자료, 서비스)을 쉽게 이용할 수 있다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-B-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용을 위해 소요되는 시간을 고려하더라도, 도서관을 이용할 가치가 충분하다고 생각한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-B-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관까지의 이동거리를 고려하더라도, 도서관을 이용할 가치가 충분하다고 생각한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-B-4",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용을 위해 사용하는 금액을 고려하더라도, 도서관을 이용할 가치가 충분하다고 생각한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-B-5",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "내가 이용하는 도서관의 시설에 대해 만족한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-B-6",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "내가 이용하는 도서관은 매력적인 공간이다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-B-7",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "나는 도서관에 가면 마음이 편안하다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q1-C",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관 공간/이용 편의성 및 그 효과에 대해 만족한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q2-A-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서 등 다양한 자료를 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-A-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "다양한 주제의 자료를 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-A-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "새로운 도서 및 정보를 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-A-4",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "새로운 학습 기회를 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-A-5",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "내가 활용할 수 있는 자료가 충분하다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-A-6",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "내가 원하는 자료를 필요할 때 얻을 수 있다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-A-7",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "자료 이용에 대해 문의할 수 있는 채널이 있다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-B-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용이 학업/업무에 도움이 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-B-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용이 자기계발 및 구직에 도움이 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-B-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용이 취미/관심사와 관련해 도움이 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-B-4",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용이 일상정보(주거생활, 건강관리, 여가 등) 획득에 도움이 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-B-5",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용이 사회문제 이해 및 관련 활동에 도움이 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-B-6",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용으로 경제적 부담이 줄었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q2-C",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관 정보 획득/활용 및 그 효과에 대해 만족한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q3-A-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용 관련 정보(운영, 행사, 프로그램 등)가 충분하다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-A-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용 관련 정보(운영, 행사, 프로그램 등)가 신속하게 제공된다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-A-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관에서 제공하는 이용 관련 정보(운영, 행사, 프로그램 등)는 신뢰할 수 있다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-A-4",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "내가 필요할 때 사서의 도움을 받을 수 있다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-A-5",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "사서들이 친절하고 도움에 적극적이다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-A-6",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "나의 의견을 표현하는 통로가 다양하다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-B-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 정보(운영, 행사, 프로그램 등)가 나의 도서관 이용에 도움이 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-B-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 서비스는 나의 기대치를 충족한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-B-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "나의 도서관 이용에 사서가 도움이 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-B-4",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관은 이용자의 의견을 지속적으로 반영하고 있다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-B-5",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관을 이용하며 존중과 배려를 받는다고 느낀다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q3-C",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관 소통/정책반영 및 그 효과에 대해 만족한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q4-A-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "내가 원하는 프로그램을 다양하게 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q4-A-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "자녀/가족에게 적합한 프로그램을 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q4-A-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "새로운 프로그램을 지속적으로 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q4-A-4",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "평소 체험하기 어려운 문화 활동을 지원한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q4-A-5",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "사회적 관심도(기후, 인구 등)가 높은 프로그램을 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q4-A-6",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "다양한 봉사 기회를 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q4-B-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "평소 도서관의 프로그램을 확인하는 편이다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q4-B-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "나의 문화/여가 생활에 도움이 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q4-B-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관의 문화·교육 프로그램을 경험하고 지인에게 도서관 이용을 추천하게 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q4-C",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관 문화·교육향유 및 그 효과에 대해 만족한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q5-A-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관은 다양한 커뮤니티 활동을 지원한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q5-A-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관은 세대 교류가 가능한 프로그램을 제공한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q5-A-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관은 다양한 인간관계를 형성할 수 있는 곳이다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q5-B-1",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관을 이용하면서 알게 된 사람이 늘어났다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q5-B-2",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "가족 및 지인과 도서관에서 자주 만남을 갖는다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q5-B-3",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용으로 사람들과 더욱 잘 소통할 수 있게 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q5-B-4",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용으로 다른 세대를 더 잘 이해하게 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q5-B-5",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용으로 기존에 알던 사람과 관계가 좋아졌다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q5-B-6",
    "section": "satisfaction",
    "type": "likert_7_with_na",
    "title": "도서관 이용으로 내가 사는 지역과 연결된 느낌이 들었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다. 판단하기 어려우면 해당없음을 선택하세요."
  },
  {
    "code": "Q5-C",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관 기반 사회적 관계형성 및 그 효과에 대해 만족한다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-B-1",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관을 이용하면서 책에 대한 관심이 높아졌다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-B-2",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관을 이용하면서 독서량이 증가했다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-B-3",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관을 이용하면서 다양한 즐거움을 얻었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-B-4",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관을 이용하면서 나의 이해력이 향상되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-B-5",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관을 통해 나의 문화생활이 풍요로워졌다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-B-6",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관을 이용하면서 내가 성장한다고 느꼈다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-B-7",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관을 이용하면서 내가 사는 곳에 관심이 생겼다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-B-8",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "독서 문화공간으로서 도서관의 중요성을 알게 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-B-9",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관을 이용하면서 삶의 질이 좋아졌다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q6-C",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "도서관 이용이 나의 행복감 상승에 도움이 되었다",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q7-D-12",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "우리 가족이 낸 세금 이상으로 도서관 서비스의 혜택을 누린다고 생각하십니까?",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "Q8",
    "section": "satisfaction",
    "type": "likert_7",
    "title": "국민의 삶의 질 향상을 위해 정부가 도서관 운영에 지속적으로 투자를 해야 한다는 의견에 얼마나 동의하십니까?",
    "required": true,
    "description": "1점은 전혀 그렇지 않음, 7점은 매우 그러함입니다."
  },
  {
    "code": "DQ1-Y",
    "section": "behavior",
    "type": "numeric",
    "title": "자주 이용하지 않는 경우 연간 도서관 이용 횟수",
    "required": true,
    "min": 0,
    "max": 365,
    "unit": "회/년"
  },
  {
    "code": "DQ1-M",
    "section": "behavior",
    "type": "numeric",
    "title": "2025년 기준 도서관 월 평균 이용 횟수",
    "required": true,
    "min": 0,
    "max": 31,
    "unit": "회/월"
  },
  {
    "code": "DQ2",
    "exportCodes": [
      "DQ2-Y",
      "DQ2-M"
    ],
    "sourceCodes": [
      "DQ2-Y",
      "DQ2-M"
    ],
    "section": "behavior",
    "type": "period",
    "title": "모든 도서관 기준 도서관 이용 기간",
    "description": "년과 개월을 나누어 입력합니다. 예: 3년 6개월",
    "required": false
  },
  {
    "code": "DQ3",
    "section": "behavior",
    "type": "single_choice",
    "title": "도서관 방문 시 주로 누구와 함께 이용하십니까?",
    "required": true,
    "choices": [
      "가족",
      "친구·연인",
      "이웃",
      "혼자",
      "기타"
    ]
  },
  {
    "code": "DQ4",
    "section": "behavior",
    "type": "multi_choice",
    "title": "도서관을 이용하는 목적은 무엇입니까? 이용 경험이 있는 것을 모두 선택해 주십시오.",
    "required": true,
    "choices": [
      "관심 정보자료",
      "사서 도움",
      "자녀 도서 대출",
      "본인 도서 대출",
      "실제 문제 해결",
      "학교 과제",
      "PC 사용",
      "지역모임·동아리",
      "문화·독서 프로그램",
      "수험·취업 준비",
      "시간 보내기",
      "도서관 공간 이용",
      "기타"
    ],
    "description": "해당되는 항목을 모두 선택해 주세요."
  },
  {
    "code": "DQ5",
    "exportCodes": [
      "DQ5-1",
      "DQ5-2",
      "DQ5-3"
    ],
    "sourceCodes": [
      "DQ5-1",
      "DQ5-2",
      "DQ5-3"
    ],
    "section": "behavior",
    "type": "rank_choice",
    "title": "도서관을 이용하는 주된 목적",
    "description": "가장 중요한 목적부터 3순위까지 선택해 주세요. 같은 항목은 중복 선택할 수 없습니다.",
    "choices": [
      "관심 정보자료",
      "사서 도움",
      "자녀 도서 대출",
      "본인 도서 대출",
      "실제 문제 해결",
      "학교 과제",
      "PC 사용",
      "지역모임·동아리",
      "문화·독서 프로그램",
      "수험·취업 준비",
      "시간 보내기",
      "도서관 공간 이용",
      "기타"
    ],
    "rankCount": 3,
    "required": false
  },
  {
    "code": "DQ6-Y",
    "section": "behavior",
    "type": "numeric",
    "title": "자주 이용하지 않는 경우 연간 대출 서비스 이용 횟수",
    "required": true,
    "min": 0,
    "max": 365,
    "unit": "회/년"
  },
  {
    "code": "DQ6-M",
    "section": "behavior",
    "type": "numeric",
    "title": "2025년 기준 도서관 대출 서비스 월 평균 이용 횟수",
    "required": true,
    "min": 0,
    "max": 31,
    "unit": "회/월"
  },
  {
    "code": "DQ6-1",
    "section": "behavior",
    "type": "single_choice",
    "title": "대출 경험이 있는 경우 도서를 대출하는 주된 목적은 무엇입니까?",
    "required": true,
    "choices": [
      "학업·연구",
      "자기 계발",
      "취미·여가",
      "생활·실용",
      "자녀 교육",
      "기타"
    ]
  },
  {
    "code": "DQ7-E-1",
    "section": "behavior",
    "type": "semantic_7",
    "title": "도서관 이미지: 부담스럽다 / 편안하다",
    "required": true,
    "leftLabel": "부담스럽다",
    "rightLabel": "편안하다",
    "description": "양끝 표현 중 어디에 가까운지 선택해 주세요."
  },
  {
    "code": "DQ7-E-2",
    "section": "behavior",
    "type": "semantic_7",
    "title": "도서관 이미지: 구식이다 / 최신이다",
    "required": true,
    "leftLabel": "구식이다",
    "rightLabel": "최신이다",
    "description": "양끝 표현 중 어디에 가까운지 선택해 주세요."
  },
  {
    "code": "DQ7-E-3",
    "section": "behavior",
    "type": "semantic_7",
    "title": "도서관 이미지: 단순하다 / 다양하다",
    "required": true,
    "leftLabel": "단순하다",
    "rightLabel": "다양하다",
    "description": "양끝 표현 중 어디에 가까운지 선택해 주세요."
  },
  {
    "code": "DQ7-E-4",
    "section": "behavior",
    "type": "semantic_7",
    "title": "도서관 이미지: 비실용적이다 / 실용적이다",
    "required": true,
    "leftLabel": "비실용적이다",
    "rightLabel": "실용적이다",
    "description": "양끝 표현 중 어디에 가까운지 선택해 주세요."
  },
  {
    "code": "DQ7-E-5",
    "section": "behavior",
    "type": "semantic_7",
    "title": "도서관 이미지: 폐쇄적이다 / 개방적이다",
    "required": true,
    "leftLabel": "폐쇄적이다",
    "rightLabel": "개방적이다",
    "description": "양끝 표현 중 어디에 가까운지 선택해 주세요."
  },
  {
    "code": "DQ7-E-6",
    "section": "behavior",
    "type": "semantic_7",
    "title": "도서관 이미지: 지루하다 / 재미있다",
    "required": true,
    "leftLabel": "지루하다",
    "rightLabel": "재미있다",
    "description": "양끝 표현 중 어디에 가까운지 선택해 주세요."
  },
  {
    "code": "DQ7-E-7",
    "section": "behavior",
    "type": "semantic_7",
    "title": "도서관 이미지: 딱딱하다 / 부드럽다",
    "required": true,
    "leftLabel": "딱딱하다",
    "rightLabel": "부드럽다",
    "description": "양끝 표현 중 어디에 가까운지 선택해 주세요."
  },
  {
    "code": "DQ7-E-8",
    "section": "behavior",
    "type": "semantic_7",
    "title": "도서관 이미지: 보수적이다 / 창의적이다",
    "required": true,
    "leftLabel": "보수적이다",
    "rightLabel": "창의적이다",
    "description": "양끝 표현 중 어디에 가까운지 선택해 주세요."
  },
  {
    "code": "RQ1-1",
    "section": "reading",
    "type": "numeric",
    "title": "지난 1년 동안 읽은 종이책 권수",
    "required": true,
    "min": 0,
    "max": 999,
    "unit": "권"
  },
  {
    "code": "RQ1-2",
    "section": "reading",
    "type": "numeric",
    "title": "지난 1년 동안 읽은 전자책 권수",
    "required": true,
    "min": 0,
    "max": 999,
    "unit": "권"
  },
  {
    "code": "RQ1-3",
    "section": "reading",
    "type": "numeric",
    "title": "지난 1년 동안 읽은 오디오북 권수",
    "required": true,
    "min": 0,
    "max": 999,
    "unit": "권"
  },
  {
    "code": "RQ1-4",
    "section": "reading",
    "type": "numeric",
    "title": "지난 1년 동안 읽은 웹소설 권수",
    "required": true,
    "min": 0,
    "max": 999,
    "unit": "권"
  },
  {
    "code": "RQ1-5",
    "section": "reading",
    "type": "numeric",
    "title": "지난 1년 동안 읽은 만화책 권수",
    "required": true,
    "min": 0,
    "max": 999,
    "unit": "권"
  },
  {
    "code": "RQ1-6",
    "section": "reading",
    "type": "numeric",
    "title": "지난 1년 동안 읽은 웹툰 권수",
    "required": true,
    "min": 0,
    "max": 999,
    "unit": "권"
  },
  {
    "code": "RQ1-7",
    "section": "reading",
    "type": "single_choice",
    "title": "지난 1년 동안 읽은 독서 한 적 없음",
    "required": true,
    "choices": [
      "독서 경험 없음"
    ]
  },
  {
    "code": "RQ2",
    "section": "reading",
    "type": "single_choice",
    "title": "책 읽기가 살아가는 데 얼마나 도움이 된다고 생각하십니까?",
    "required": true,
    "choices": [
      "매우 도움이 된다",
      "어느 정도 도움이 된다",
      "보통이다",
      "별로 도움이 되지 않는다",
      "전혀 도움이 되지 않는다"
    ]
  },
  {
    "code": "RQ3",
    "exportCodes": [
      "RQ3-1",
      "RQ3-2",
      "RQ3-3"
    ],
    "sourceCodes": [
      "RQ3-1",
      "RQ3-2",
      "RQ3-3"
    ],
    "section": "reading",
    "type": "rank_choice",
    "title": "책 읽기를 통해 도움 된 사항",
    "description": "가장 도움이 된 사항부터 3순위까지 선택해 주세요. 같은 항목은 중복 선택할 수 없습니다.",
    "choices": [
      "정보 수용과 해석 능력 향상",
      "풍부한 정서와 감성 발달",
      "논리적·비판적 사고",
      "전문 지식 습득",
      "행복감·삶의 질 향상",
      "창의력과 표현력 향상",
      "원활한 의사소통",
      "교감·공감 능력 향상",
      "마음의 평안과 심리적 치유",
      "세상 이해와 통찰력 향상"
    ],
    "rankCount": 3,
    "required": false
  },
  {
    "code": "P1-EXCLUDE",
    "section": "pii",
    "type": "single_choice",
    "title": "경품 발송을 위한 개인정보 제3자 제공 동의 여부",
    "required": false,
    "choices": [
      "취급위탁에 동의",
      "동의하지 않음(경품지급불가)"
    ],
    "pii": true
  },
  {
    "code": "P2-EXCLUDE",
    "section": "pii",
    "type": "phone",
    "title": "휴대폰 번호",
    "required": false,
    "pii": true,
    "description": "답례 또는 조사 운영 목적에만 사용하며 분석용 파일에는 포함하지 않습니다."
  }
];

export const sectionLabels: Record<SurveySection, string> = {
  intro: "시작",
  respondent: "응답자 정보",
  satisfaction: "공통 만족도",
  behavior: "이용양태",
  reading: "독서",
  open_text: "서술형",
  pii: "연락처",
};
