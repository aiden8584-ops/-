
import { SheetWord, QuizResult } from "../types";

// Helper to parse CSV line correctly handling quotes
const parseCSVLine = (line: string): string[] => {
  const result = [];
  let start = 0;
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(line.substring(start, i).replace(/^"|"$/g, '').replace(/""/g, '"').trim());
      start = i + 1;
    }
  }
  result.push(line.substring(start).replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  return result;
};

/**
 * Fetches tab titles from a spreadsheet.
 * Note: This requires the API Key to have Sheets API access.
 * Most standard Gemini keys from AI Studio don't have this enabled by default.
 */
export const fetchSheetTabs = async (sheetId: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return [];
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title&key=${apiKey}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn("Google Sheets API rejected the request. This is normal if your API Key doesn't have Sheets permission enabled in GCP.", {
        status: response.status,
        message: errorData.error?.message || "Unknown error"
      });
      return [];
    }

    const data = await response.json();
    if (data.sheets && Array.isArray(data.sheets)) {
      return data.sheets.map((s: any) => s.properties.title);
    }
    return [];
  } catch (error) {
    console.error("Critical error fetching sheet tabs:", error);
    return [];
  }
};

export const checkSheetAvailability = async (sheetId: string): Promise<boolean> => {
  // Uses the visualization API which works on public sheets without an API key
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    console.warn("Public sheet access check failed:", error);
    return false;
  }
};

export const fetchWordsFromSheet = async (sheetId: string, tabName: string, mode: 'TEST' | 'PRACTICE' = 'TEST'): Promise<SheetWord[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`시트 탭 '${tabName}'을 찾을 수 없습니다. 시트 하단의 탭 이름과 정확히 일치하는지 확인하세요.`);
      }
      throw new Error(`시트 데이터를 가져오지 못했습니다. (Status: ${response.status})`);
    }

    const text = await response.text();
    const lines = text.split('\n');
    const words: SheetWord[] = [];

    // Define column indices based on mode
    // TEST Mode: B(1), C(2) (A is 범위)
    // PRACTICE Mode: F(5), G(6) (E is 범위)
    const rangeColIdx = mode === 'PRACTICE' ? 4 : 0;
    const wordColIdx = mode === 'PRACTICE' ? 5 : 1;
    const meaningColIdx = mode === 'PRACTICE' ? 6 : 2;

    let currentRange = "기본 범위";

    for (let i = 0; i < lines.length; i++) {
      // Always skip the first row (Header)
      if (i === 0) continue;

      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      
      // Update current range if the cell is not empty
      if (cols[rangeColIdx] && cols[rangeColIdx].trim() !== '') {
        currentRange = cols[rangeColIdx].trim();
      }
      
      // Check if we have enough columns for the requested indices
      if (cols.length > Math.max(wordColIdx, meaningColIdx)) {
        const word = cols[wordColIdx];
        const fullMeaning = cols[meaningColIdx];
        
        // Skip header-like keywords if they appear in data rows (legacy safety check)
        if (word && (word.toLowerCase() === 'word' || word.toLowerCase() === 'english' || word.toLowerCase() === '단어')) continue;

        if (word && fullMeaning) {
          // Remove content within parentheses (e.g., "(adj) happy" -> "happy")
          // Support both standard () and full-width （） parentheses
          let cleanedMeaning = fullMeaning
            .replace(/\([^)]*\)/g, '')
            .replace(/（[^）]*）/g, '')
            .replace(/\s+/g, ' ')
            .trim();
            
          // Remove leading/trailing commas that might remain after removal
          cleanedMeaning = cleanedMeaning.replace(/^,|,$/g, '').trim();

          if (cleanedMeaning) {
             words.push({ word, meaning: cleanedMeaning, range: currentRange });
          }
        }
      }
    }

    if (words.length === 0) {
      const colName = mode === 'PRACTICE' ? 'F, G열' : 'B, C열';
      throw new Error(`데이터를 찾을 수 없습니다. (${colName}에 단어와 뜻이 있는지 확인해주세요)`);
    }

    return words;

  } catch (error) {
    console.error("Sheet Fetch Error:", error);
    throw error;
  }
};

export const submitResultToSheet = async (scriptUrl: string, result: QuizResult): Promise<boolean> => {
  try {
    const payload = {
      tabName: result.className,
      studentName: result.studentName,
      score: result.score,
      total: result.totalQuestions,
      timeTaken: result.timeTakenSeconds,
      timestamp: result.timestamp,
      testDate: result.date
    };

    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });

    return true;
  } catch (error) {
    console.error("Failed to submit result:", error);
    return false;
  }
};
