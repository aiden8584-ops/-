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

export const fetchSheetTabs = async (sheetId: string): Promise<string[]> => {
  // Use Google Sheets API v4 to fetch spreadsheet metadata (title of sheets)
  // This requires the API_KEY to have 'Google Sheets API' enabled in Google Cloud Console.
  const apiKey = process.env.API_KEY;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title&key=${apiKey}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn("Failed to fetch sheet tabs via API. Falling back to manual input.");
      return [];
    }

    const data = await response.json();
    if (data.sheets && Array.isArray(data.sheets)) {
      return data.sheets.map((s: any) => s.properties.title);
    }
    return [];
  } catch (error) {
    console.error("Error fetching sheet tabs:", error);
    return [];
  }
};

export const fetchWordsFromSheet = async (sheetId: string, tabName: string): Promise<SheetWord[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Sheet not found. Check ID or Tab Name: ${tabName}`);
      }
      throw new Error(`Failed to fetch sheet. Status: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n');
    const words: SheetWord[] = [];
    const startIdx = 0; 

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      
      if (cols.length >= 2) {
        const word = cols[0];
        const meaning = cols[1];
        
        if (word.toLowerCase() === 'word' || word.toLowerCase() === 'english') continue;

        if (word && meaning) {
          words.push({ word, meaning });
        }
      }
    }

    if (words.length === 0) {
      throw new Error("Found the sheet tab, but could not parse any words. Ensure Col A is Word and Col B is Meaning.");
    }

    return words;

  } catch (error) {
    console.error("Sheet Fetch Error:", error);
    throw error;
  }
};

export const submitResultToSheet = async (scriptUrl: string, result: QuizResult): Promise<boolean> => {
  try {
    // Prepare payload matching the Google Apps Script expectation
    const payload = {
      tabName: result.date,
      studentName: result.studentName,
      score: result.score,
      total: result.totalQuestions,
      timeTaken: result.timeTakenSeconds,
      timestamp: result.timestamp
    };

    // Use no-cors mode because Google Apps Script redirects and causes CORS issues in standard mode.
    // With no-cors, we can send data but cannot read the response. We assume success if no network error.
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain', // Avoid preflight OPTIONS check
      },
      body: JSON.stringify(payload)
    });

    return true;
  } catch (error) {
    console.error("Failed to submit result:", error);
    return false;
  }
};