
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
 * Used as fallback.
 * Logic: 25 Eng->Kor, 25 Kor->Eng
 */
const generateLocalQuiz = (sheetWords: SheetWord[]): Question[] => {
  const shuffledSource = shuffleArray(sheetWords);
  const limitedWords = shuffledSource.slice(0, 50);
  
  // Split into two sets
  const engToKorSet = limitedWords.slice(0, 25);
  const korToEngSet = limitedWords.slice(25, 50);

  // Pools for distractors
  const allMeanings = sheetWords.map(sw => sw.meaning);
  const allWords = sheetWords.map(sw => sw.word);

  const questionsA: Question[] = engToKorSet.map((sw, idx) => {
    const correctMeaning = sw.meaning;
    // Filter out the correct answer from distractors
    const otherMeanings = allMeanings.filter(m => m !== correctMeaning);
    const distractors = shuffleArray(otherMeanings).slice(0, 3);
    const options = shuffleArray([correctMeaning, ...distractors]);
    
    return {
      id: idx,
      word: sw.word, // Show English
      options,       // Select Korean
      correctAnswerIndex: options.indexOf(correctMeaning)
    };
  });

  const questionsB: Question[] = korToEngSet.map((sw, idx) => {
    const correctWord = sw.word;
    // Filter out the correct answer from distractors
    const otherWords = allWords.filter(w => w !== correctWord);
    const distractors = shuffleArray(otherWords).slice(0, 3);
    const options = shuffleArray([correctWord, ...distractors]);

    return {
      id: 25 + idx,
      word: sw.meaning, // Show Korean
      options,          // Select English
      correctAnswerIndex: options.indexOf(correctWord)
    };
  });

  return [...questionsA, ...questionsB];
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

    Task: Create a test with exactly 50 questions based on the source data.
    
    STRUCTURE:
    1. **Questions 1-25 (Eng -> Kor)**: 
       - Question: English 'word'.
       - Options: 4 Korean 'meanings'.
    2. **Questions 26-50 (Kor -> Eng)**: 
       - Question: Korean 'meaning'.
       - Options: 4 English 'words'.

    CRITICAL RULES FOR OPTIONS (DISTRACTORS):
    1. **NO AMBIGUITY**: The Correct Answer must be CLEARLY distinct.
    2. **NO SYNONYMS**: Do NOT use distractors that are synonyms or have very similar meanings to the correct answer (e.g., if answer is '명확한', do NOT use '분명한' as a distractor).
    3. **Mix Types**: 
       - For Eng->Kor, options must be Korean.
       - For Kor->Eng, options must be English.
    4. **Shuffle**: Randomly shuffle the position of the correct answer among the 4 options.
    5. **Index**: 'correctAnswerIndex' must point to the correct option.

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
    console.warn("Gemini API Error. Falling back to local generation:", error.message);
    return generateLocalQuiz(sheetWords);
  }
};
