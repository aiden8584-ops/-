
import { GoogleGenAI, Type } from "@google/genai";
import { Question, SheetWord } from "../types";

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Generates a quiz locally using sheet words as distractors.
 * This is used as a fallback when Gemini API hits quota limits.
 */
const generateLocalQuiz = (sheetWords: SheetWord[]): Question[] => {
  const shuffledSource = shuffleArray(sheetWords);
  const limitedWords = shuffledSource.slice(0, 50);
  
  // All meanings in the list to be used as distractor source
  const allMeanings = sheetWords.map(sw => sw.meaning);

  return limitedWords.map((sw, idx) => {
    const correctMeaning = sw.meaning;
    
    // Pick 3 random meanings from the rest of the list
    const otherMeanings = allMeanings.filter(m => m !== correctMeaning);
    const distractors = shuffleArray(otherMeanings).slice(0, 3);
    
    // Combine and shuffle options
    const options = shuffleArray([correctMeaning, ...distractors]);
    
    return {
      id: idx,
      word: sw.word,
      options,
      correctAnswerIndex: options.indexOf(correctMeaning)
    };
  });
};

export const generateQuizQuestions = async (date: string, sheetWords?: SheetWord[]): Promise<Question[]> => {
  // CRITICAL: Instantiate inside function to use the most recent process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-flash-preview";
  
  if (!sheetWords || sheetWords.length === 0) {
    throw new Error("시험을 생성할 단어 데이터가 없습니다.");
  }

  const shuffled = shuffleArray(sheetWords);
  const limitedWords = shuffled.slice(0, 50); 
  
  const prompt = `
    I have a vocabulary list for a test. 
    SOURCE DATA: ${JSON.stringify(limitedWords)}

    Task: Create a multiple-choice test based strictly on this source data.
    
    For each item in the source data:
    1. Use the 'word' as the question.
    2. Use the 'meaning' as the strictly Correct Answer.
    
    STRICT RULES FOR PREVENTING AMBIGUITY (CRITICAL):
    - Generate 3 distractors that are plausible in terms of part-of-speech but SEMANTICALLY DISTANT from the correct answer.
    - DO NOT use synonyms, near-synonyms, or words with overlapping meanings.
    - Ensure there is absolutely NO overlap in meaning between any of the 4 options.
    
    3. Randomly shuffle the position of the correct answer among the 4 options.
    4. 'correctAnswerIndex' must point to the correct meaning in the 'options' array.

    Return the result as a JSON array of Question objects.
  `;

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
    
    return JSON.parse(text) as Question[];

  } catch (error: any) {
    // Prevent triggering Google Login/Key selection prompt
    console.warn("Gemini API Error. Falling back to local generation:", error.message);
    return generateLocalQuiz(sheetWords);
  }
};
