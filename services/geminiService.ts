import { GoogleGenAI, Type } from "@google/genai";
import { Question, SheetWord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const generateQuizQuestions = async (date: string, sheetWords?: SheetWord[]): Promise<Question[]> => {
  const model = "gemini-3-flash-preview";
  let prompt = "";

  if (sheetWords && sheetWords.length > 0) {
    // Mode 1: Real Data from Sheet
    const shuffled = shuffleArray(sheetWords);
    const limitedWords = shuffled.slice(0, 50); 
    
    prompt = `
      I have a vocabulary list for a test. 
      SOURCE DATA: ${JSON.stringify(limitedWords)}

      Task: Create a multiple-choice test based strictly on this source data.
      
      For each item in the source data:
      1. Use the 'word' as the question.
      2. Use the 'meaning' as the strictly Correct Answer.
      
      STRICT RULES FOR PREVENTING AMBIGUITY (CRITICAL):
      - Generate 3 distractors that are plausible in terms of part-of-speech but SEMANTICALLY DISTANT from the correct answer.
      - DO NOT use synonyms, near-synonyms, or words with overlapping meanings.
      - EXAMPLE: If the word is 'entirely' and the answer is '전적으로', DO NOT use '완전히', '모두', or '통틀어' as distractors. Instead, use words like '우연히' (by chance), '부분적으로' (partially), or '조심스럽게' (carefully).
      - EACH OPTION MUST BE A SINGLE CLEAR WORD/PHRASE. No commas (e.g., use "결과" instead of "결과, 성과").
      - Ensure there is absolutely NO overlap in meaning between any of the 4 options.
      - If a word has multiple meanings, strictly stick to the one provided in the source data.
      
      3. Randomly shuffle the position of the correct answer among the 4 options.
      4. 'correctAnswerIndex' must point to the correct meaning in the 'options' array.

      Return the result as a JSON array of Question objects.
    `;
  } else {
    // Mode 2: Fallback (AI Simulation)
    prompt = `
      Generate a high-difficulty vocabulary test for students for date: ${date}.
      Select 50 English words at CEFR B2/C1 levels.
      
      CRITICAL RULES FOR SELECTING OPTIONS:
      - Only ONE option must be correct.
      - Distractors must be definitively and objectively incorrect for the chosen word.
      - ABSOLUTELY NO SYNONYMS of the correct answer allowed in the distractors.
      - Each option must be a SINGLE clear Korean word (no commas).
      - The semantic gap between the correct answer and distractors must be wide enough that a student who knows the word will not hesitate.
      
      Return the data strictly as a JSON array.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              word: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
              },
              correctAnswerIndex: { type: Type.INTEGER }
            },
            required: ["id", "word", "options", "correctAnswerIndex"],
            propertyOrdering: ["id", "word", "options", "correctAnswerIndex"]
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const data = JSON.parse(text) as Question[];
    return data;

  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};