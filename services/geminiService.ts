
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
 * Fallback mechanism if API fails.
 */
const generateLocalQuiz = (sheetWords: SheetWord[], settings: QuizSettings): Question[] => {
  const dist = settings.typeDistribution;
  const totalNeeded = dist.engToKor + dist.korToEng + dist.context;
  const actualTotal = Math.min(sheetWords.length, totalNeeded);
  
  const shuffledSource = shuffleArray(sheetWords);
  const limitedWords = shuffledSource.slice(0, actualTotal);
  
  const allMeanings = sheetWords.map(sw => sw.meaning);
  const allWords = sheetWords.map(sw => sw.word);

  let currentEK = 0;
  let currentKE = 0;
  // Note: Local quiz cannot generate Context questions effectively without AI, so we map Context requests to EngToKor fallback.
  const targetEK = dist.engToKor + dist.context; 

  return limitedWords.map((sw, idx) => {
    let showWord = '';
    let correctAnswer = '';
    let distractorsPool: string[] = [];
    
    // Determine type for this specific question based on counts
    let type: 'engToKor' | 'korToEng' = 'engToKor';
    
    if (currentEK < targetEK) {
      type = 'engToKor';
      currentEK++;
    } else {
      type = 'korToEng';
      currentKE++;
    }

    if (type === 'engToKor') {
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

  const dist = settings.typeDistribution;
  const totalQuestions = dist.engToKor + dist.korToEng + dist.context;

  const shuffled = shuffleArray(sheetWords);
  const limitedWords = shuffled.slice(0, totalQuestions); 
  
  const prompt = `
    I have a vocabulary list.
    SOURCE DATA: ${JSON.stringify(limitedWords)}

    Task: Create a test with exactly ${totalQuestions} questions based on the following distribution rules:

    DISTRIBUTION REQUIREMENTS:
    1. Create **${dist.engToKor}** questions of Type 'EngToKor' (English Word -> Korean Meaning).
    2. Create **${dist.korToEng}** questions of Type 'KorToEng' (Korean Meaning -> English Word).
    3. Create **${dist.context}** questions of Type 'Context' (Fill-in-the-blank Sentence).

    RULES FOR EACH TYPE:
    
    [Type: EngToKor]
    - 'word': Show the English word from source.
    - 'options': 1 correct Korean meaning + 3 distinct incorrect Korean meanings.
    - Distractors: Must be distinct and not synonyms.

    [Type: KorToEng]
    - 'word': Show the Korean meaning from source.
    - 'options': 1 correct English word + 3 distinct incorrect English words.
    - Distractors: Must be same part of speech.

    [Type: Context]
    - 'word': Write a **single, clear English sentence** where the target word fits into a blank (_______).
       - Difficulty: Easy to Intermediate. Clear context clue.
       - Do NOT use the Korean definition in the sentence.
    - 'options': 1 correct English word + 3 distinct incorrect English words.
    - Distractors: Must be same part of speech and clearly incorrect in this context.

    GENERAL RULES:
    - Order: You can mix the order or group them, but the total counts must match.
    - Shuffle 'options' for every question so the answer position is random.
    - Assign a unique 'id' (0 to ${totalQuestions - 1}).

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
