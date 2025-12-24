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
      I have a vocabulary list for a high-stakes test. 
      SOURCE DATA: ${JSON.stringify(limitedWords)}

      Task: Create an extremely challenging multiple-choice test based strictly on this source data.
      
      For each item in the source data:
      1. Use the 'word' as the question.
      2. Use the 'meaning' as the Correct Answer.
      3. CRITICAL: Generate 3 INCORRECT Korean meanings (distractors) that are very difficult to distinguish from the correct one.
         - Use synonyms with subtle nuance differences.
         - Use words that students frequently confuse with the target word (similar spelling or similar context).
         - Use words that belong to the same semantic field.
         - Ensure the distractors have the same part of speech as the correct answer.
      4. Avoid obviously wrong or unrelated answers. The goal is to test the student's precise understanding of the word.
      5. Randomly shuffle the position of the correct answer among the 4 options.
      6. 'correctAnswerIndex' must point to the correct meaning in the 'options' array.

      Return the result as a JSON array of Question objects.
    `;
  } else {
    // Mode 2: Fallback (AI Simulation)
    prompt = `
      Generate a high-difficulty vocabulary test for students based on a simulated curriculum for date: ${date}.
      Select 50 English words at CEFR B2 to C1 levels.
      
      For each question:
      1. Select a challenging English word.
      2. Provide 4 Korean meanings as options. 
         CRITICAL: For each option, provide only ONE clear meaning. Do not use multiple synonyms separated by commas (e.g., use "사과" instead of "사과, 능금").
      3. Make the distractors highly plausible and confusing. Use near-synonyms, words often confused due to spelling, or words with related but distinct meanings.
      4. Ensure only ONE option is strictly correct.
      
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