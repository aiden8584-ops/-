
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
  sheetId: "", 
  
  // 2. Apps Script 배포 URL
  scriptUrl: "",
  
  // 3. 배포된 사이트 주소
  baseUrl: "",

  // [기본 퀴즈 설정]
  defaultSettings: {
    totalQuestions: 50,
    timeLimitPerQuestion: 0, // 0이면 무제한
    questionType: "mixed" as const // "mixed", "engToKor", "korToEng"
  }
};
