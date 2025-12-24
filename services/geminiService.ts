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
    // Randomly select 50 words
    const shuffled = shuffleArray(sheetWords);
    const limitedWords = shuffled.slice(0, 50); // Cap at 50
    
    prompt = `
      I have a vocabulary list for a test.
      SOURCE DATA: ${JSON.stringify(limitedWords)}

      Task: Create a multiple-choice test based strictly on this source data.
      
      For each item in the source data:
      1. Use the 'word' as the question.
      2. Use the 'meaning' as the Correct Answer.
      3. Generate 3 other INCORRECT Korean meanings (distractors) that are plausible but definitely wrong for this word.
      4. Randomly shuffle the position of the correct answer among the 4 options.
      5. 'correctAnswerIndex' must point to the correct meaning in the 'options' array.

      Return the result as a JSON array of Question objects.
    `;
  } else {
    // Mode 2: Fallback (AI Simulation if no sheet data found/provided)
    prompt = `
      Generate a vocabulary test for students based on a simulated curriculum for date: ${date}.
      Create exactly 50 multiple-choice questions.
      
      For each question:
      1. Select a distinct English vocabulary word (CEFR B1/B2).
      2. Provide 4 Korean meanings as options.
      3. Only ONE option should be correct.
      4. The other 3 options should be plausible but incorrect meanings.
      
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