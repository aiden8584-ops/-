
/**
 * [영구 설정 파일]
 * 
 * 브라우저 캐시가 삭제되거나, 다른 기기에서 접속해도 
 * 아래 설정값들이 기본으로 적용되도록 합니다.
 * 
 * 값을 입력할 때는 따옴표("") 안에 넣어주세요.
 */

export const APP_CONFIG = {
  // 1. 구글 시트 ID (URL의 /d/ 와 /edit 사이의 값)
  // 예: https://docs.google.com/spreadsheets/d/1BxiMIG0W0zkSUTfgL3Y71S76L33yQLX_7uWdzLp-W8g/edit
  // 에서 "1BxiMIG0W0zkSUTfgL3Y71S76L33yQLX_7uWdzLp-W8g" 부분이 ID입니다.
  sheetId: "", 
  
  // 2. Apps Script 배포 URL (결과 전송용)
  // 선생님 관리 페이지에서 설정하거나 여기에 직접 입력할 수 있습니다.
  scriptUrl: "",
  
  // 3. 배포된 사이트 주소 (QR코드 생성용)
  baseUrl: "",

  // [기본 퀴즈 설정]
  defaultSettings: {
    totalQuestions: 50,
    timeLimitPerQuestion: 15, // 15초 제한
    questionType: "mixed" as const,
    typeDistribution: {
      engToKor: 20,
      korToEng: 20,
      context: 10
    },
    useAi: true
  }
};
