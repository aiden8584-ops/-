
import { GoogleGenAI, Type } from "@google/genai";
import { Question, SheetWord, QuizSettings } from "../types";

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
 * Fallback mechanism.
 */
const generateLocalQuiz = (sheetWords: SheetWord[], settings: QuizSettings): Question[] => {
  const total = Math.min(sheetWords.length, settings.totalQuestions);
  const shuffledSource = shuffleArray(sheetWords);
  const limitedWords = shuffledSource.slice(0, total);
  
  const allMeanings = sheetWords.map(sw => sw.meaning);
  const allWords = sheetWords.map(sw => sw.word);

  return limitedWords.map((sw, idx) => {
    let showWord = '';
    let correctAnswer = '';
    let distractorsPool: string[] = [];
    
    // Determine type for this specific question
    let currentType = settings.questionType;
    if (currentType === 'mixed') {
      currentType = idx < (total / 2) ? 'engToKor' : 'korToEng';
    }

    if (currentType === 'engToKor') {
      showWord = sw.word;
      correctAnswer = sw.meaning;
      distractorsPool = allMeanings.filter(m => m !== correctAnswer);
    } else {
      showWord = sw.meaning;
      correctAnswer = sw.word;
      distractorsPool = allWords.filter(w => w !== correctAnswer);
    }

    const distractors = shuffleArray(distractorsPool).slice(0, 3);
    const options = shuffleArray([correctAnswer, ...distractors]);
    
    return {
      id: idx,
      word: showWord,
      options,
      correctAnswerIndex: options.indexOf(correctAnswer)
    };
  });
};

export const generateQuizQuestions = async (settings: QuizSettings, sheetWords?: SheetWord[]): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-flash-preview";
  
  if (!sheetWords || sheetWords.length === 0) {
    throw new Error("시험을 생성할 단어 데이터가 없습니다.");
  }

  const shuffled = shuffleArray(sheetWords);
  const limitedWords = shuffled.slice(0, settings.totalQuestions); 
  
  const prompt = `
    I have a vocabulary list for a test. 
    SOURCE DATA: ${JSON.stringify(limitedWords)}

    Task: Create a test with exactly ${settings.totalQuestions} questions.
    
    QUIZ TYPE SETTING: ${settings.questionType}
    - If 'mixed': Split questions equally between (English Word -> Korean Meaning) and (Korean Meaning -> English Word).
    - If 'engToKor': All questions must show English and ask for Korean meaning.
    - If 'korToEng': All questions must show Korean and ask for English word.

    CRITICAL RULES FOR OPTIONS (DISTRACTORS):
    1. **NO AMBIGUITY**: The Correct Answer must be CLEARLY distinct.
    2. **NO SYNONYMS**: Do NOT use distractors that are synonyms or have very similar meanings to the correct answer.
    3. **Index**: 'correctAnswerIndex' must point to the correct option.
    4. **Language**: Ensure distractors match the language of the correct answer.

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
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as Question[];

  } catch (error: any) {
    console.warn("Gemini API Error. Falling back to local generation:", error.message);
    return generateLocalQuiz(sheetWords, settings);
  }
};
