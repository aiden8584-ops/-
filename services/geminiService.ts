
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

// Helper to pick distractors from the sheet pool
const getDistractors = (pool: string[], correct: string, count: number = 3): string[] => {
  const others = pool.filter(w => w !== correct);
  return shuffleArray(others).slice(0, count);
};

/**
 * Generates a quiz locally using sheet words as distractors.
 * Includes logic to prevent consecutive answer positions.
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
  // Local quiz maps Context -> EngToKor fallback
  const targetEK = dist.engToKor + dist.context; 
  
  let lastAnswerIndex = -1;

  return limitedWords.map((sw, idx) => {
    let showWord = '';
    let correctAnswer = '';
    let distractorsPool: string[] = [];
    
    // Determine type
    let type: 'engToKor' | 'korToEng' = 'engToKor';
    if (currentEK < targetEK) {
      type = 'engToKor';
      currentEK++;
    } else {
      type = 'korToEng';
    }

    if (type === 'engToKor') {
      showWord = sw.word;
      correctAnswer = sw.meaning;
      distractorsPool = allMeanings;
    } else {
      showWord = sw.meaning;
      correctAnswer = sw.word;
      distractorsPool = allWords;
    }

    // 1. Get in-scope distractors
    const distractors = getDistractors(distractorsPool, correctAnswer, 3);
    let options = [correctAnswer, ...distractors];
    
    // 2. Shuffle ensuring no consecutive answer positions
    let shuffledOptions: string[] = [];
    let newAnswerIndex = -1;
    let attempts = 0;

    do {
      shuffledOptions = shuffleArray(options);
      newAnswerIndex = shuffledOptions.indexOf(correctAnswer);
      attempts++;
    } while (newAnswerIndex === lastAnswerIndex && attempts < 10);
    
    lastAnswerIndex = newAnswerIndex;

    return {
      id: idx,
      word: showWord,
      options: shuffledOptions,
      correctAnswerIndex: newAnswerIndex
    };
  });
};

export const generateQuizQuestions = async (settings: QuizSettings, sheetWords?: SheetWord[]): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-flash-preview";
  
  if (!sheetWords || sheetWords.length === 0) {
    throw new Error("시험을 생성할 단어 데이터가 없습니다.");
  }

  // Pre-prepare pools for distractors (In-Scope Enforcement)
  const allWords = sheetWords.map(s => s.word);
  const allMeanings = sheetWords.map(s => s.meaning);

  const dist = settings.typeDistribution;
  const totalQuestions = dist.engToKor + dist.korToEng + dist.context;

  const shuffled = shuffleArray(sheetWords);
  const limitedWords = shuffled.slice(0, totalQuestions); 
  
  const prompt = `
    SOURCE DATA: ${JSON.stringify(limitedWords)}

    Task: Generate content for ${totalQuestions} questions.
    
    REQUIREMENTS:
    1. **${dist.engToKor}** items: Type 'EngToKor' (English -> Korean).
    2. **${dist.korToEng}** items: Type 'KorToEng' (Korean -> English).
    3. **${dist.context}** items: Type 'Context'. Write a simple English sentence with a blank (_______) where the target word fits.
       - Use simple vocabulary.
       - Do NOT include the target word in the sentence.
    
    OUTPUT JSON FORMAT (Array of objects):
    {
      "id": number (original index in SOURCE DATA),
      "type": "engToKor" | "korToEng" | "context",
      "questionText": string (The English word, Korean meaning, or Sentence depending on type),
      "correctAnswerString": string (The correct answer text)
    }

    *IMPORTANT*: Do NOT generate options/distractors. I will generate them programmatically to ensure they are from the source list. Just provide the question content and the correct answer string.
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
              type: { type: Type.STRING },
              questionText: { type: Type.STRING },
              correctAnswerString: { type: Type.STRING }
            },
            required: ["id", "type", "questionText", "correctAnswerString"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const rawQuestions = JSON.parse(text) as { id: number, type: string, questionText: string, correctAnswerString: string }[];
    
    // Post-processing: Generate Options from SheetWords & Anti-consecutive Shuffle
    let lastAnswerIndex = -1;

    return rawQuestions.map((q, idx) => {
      // Find the source word object to ensure we have the correct data pairs
      // We rely on the AI returning the correct ID or string, but for safety, we re-verify against the limited list if possible.
      // However, AI might have shuffled. Let's use the provided 'correctAnswerString' as the anchor.
      
      const correct = q.correctAnswerString;
      let pool: string[] = [];

      // Determine distractor pool based on type
      if (q.type === 'engToKor') {
        pool = allMeanings;
      } else {
        // For Context and KorToEng, the answer is English, so distractors must be English words
        pool = allWords;
      }

      // 1. Force In-Scope Distractors
      const distractors = getDistractors(pool, correct, 3);
      const options = [correct, ...distractors];

      // 2. Shuffle options (Avoid consecutive same index)
      let shuffledOptions: string[] = [];
      let newIndex = -1;
      let attempts = 0;

      do {
        shuffledOptions = shuffleArray(options);
        newIndex = shuffledOptions.indexOf(correct);
        attempts++;
      } while (newIndex === lastAnswerIndex && attempts < 10);

      lastAnswerIndex = newIndex;

      return {
        id: idx,
        word: q.questionText,
        options: shuffledOptions,
        correctAnswerIndex: newIndex
      };
    });

  } catch (error: any) {
    console.warn("Gemini API Error. Falling back to local generation:", error.message);
    return generateLocalQuiz(sheetWords, settings);
  }
};
