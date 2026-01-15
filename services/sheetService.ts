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

export const checkSheetAvailability = async (sheetId: string): Promise<boolean> => {
  // Try to fetch the CSV of the default (first) sheet.
  // This endpoint works for public sheets without an API key.
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    console.warn("Public sheet access check failed:", error);
    return false;
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      
      if (cols.length >= 2) {
        const word = cols[0];
        const fullMeaning = cols[1];
        
        if (word.toLowerCase() === 'word' || word.toLowerCase() === 'english') continue;

        if (word && fullMeaning) {
          // Rule: If multiple meanings exist (comma separated), take only the first one
          const primaryMeaning = fullMeaning.split(',')[0].trim();
          words.push({ word, meaning: primaryMeaning });
        }
      }
    }

    if (words.length === 0) {
      throw new Error("Found the sheet tab, but could not parse any words.");
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
      // Changed from result.date to result.className as per teacher's request
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