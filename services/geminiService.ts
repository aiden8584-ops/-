
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
// Improved: Tries to match POS for Korean meanings (ending in '다')
const getDistractors = (pool: string[], correct: string, count: number = 3): string[] => {
  // 1. Filter out the correct answer
  let candidates = pool.filter(w => w !== correct);
  
  // 2. Simple POS Heuristic for Korean (Ends with '다' -> likely Verb/Adj)
  const isVerbOrAdj = correct.endsWith('다');
  const matchingCandidates = candidates.filter(w => w.endsWith('다') === isVerbOrAdj);

  // 3. If we have enough matching candidates, use them. Otherwise mix.
  let selectedPool = matchingCandidates.length >= count ? matchingCandidates : candidates;

  return shuffleArray(selectedPool).slice(0, count);
};

/**
 * Generates a quiz locally using sheet words as distractors.
 * Includes logic to prevent consecutive answer positions.
 * Supports Practice Mode (all words) and Fallback Mode (AI failure).
 */
const generateLocalQuiz = (sheetWords: SheetWord[], settings: QuizSettings, isPractice: boolean = false): Question[] => {
  let targetWords: SheetWord[] = [];
  
  if (isPractice) {
    // PRACTICE MODE: Use ALL words, shuffled
    targetWords = shuffleArray(sheetWords);
  } else {
    // TEST MODE: Slice based on settings
    const dist = settings.typeDistribution;
    const totalNeeded = dist.engToKor + dist.korToEng + dist.context;
    const actualTotal = Math.min(sheetWords.length, totalNeeded);
    
    if (settings.difficulty === 'HARD') {
      // Naive fallback: sort by word length descending (longer words = harder)
      const sortedByLength = [...sheetWords].sort((a, b) => b.word.length - a.word.length);
      // Take top 2x needed, then shuffle and slice
      const topHard = sortedByLength.slice(0, Math.max(actualTotal, Math.min(sheetWords.length, actualTotal * 2)));
      targetWords = shuffleArray(topHard).slice(0, actualTotal);
    } else {
      const shuffledSource = shuffleArray(sheetWords);
      targetWords = shuffledSource.slice(0, actualTotal);
    }
  }
  
  const allMeanings = sheetWords.map(sw => sw.meaning);
  const allWords = sheetWords.map(sw => sw.word);

  // Distribute Question Types
  let targetEK = 0;
  
  if (isPractice) {
    targetEK = Math.ceil(targetWords.length / 2);
  } else {
    const dist = settings.typeDistribution;
    // Split 'context' items evenly between EngToKor and KorToEng if AI failed or disabled
    const contextHalf = Math.ceil(dist.context / 2);
    targetEK = dist.engToKor + contextHalf;
  }

  // Create an array of types and shuffle it
  const typesArray: ('engToKor' | 'korToEng')[] = [];
  for (let i = 0; i < targetWords.length; i++) {
    if (i < targetEK) {
      typesArray.push('engToKor');
    } else {
      typesArray.push('korToEng');
    }
  }
  const shuffledTypes = shuffleArray(typesArray);

  let lastAnswerIndex = -1;

  return targetWords.map((sw, idx) => {
    let showWord = '';
    let correctAnswer = '';
    let distractorsPool: string[] = [];
    
    // Determine type from shuffled array
    let type = shuffledTypes[idx];

    if (type === 'engToKor') {
      showWord = sw.word;
      correctAnswer = sw.meaning;
      distractorsPool = allMeanings;
    } else {
      showWord = sw.meaning;
      correctAnswer = sw.word;
      distractorsPool = allWords;
    }

    // 1. Get in-scope distractors (POS aware for Korean)
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

export const generateQuizQuestions = async (settings: QuizSettings, sheetWords?: SheetWord[], isPractice: boolean = false): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-flash-preview";
  
  if (!sheetWords || sheetWords.length === 0) {
    throw new Error("시험을 생성할 단어 데이터가 없습니다.");
  }

  // FORCE LOCAL GENERATION FOR PRACTICE MODE
  if (isPractice) {
    return generateLocalQuiz(sheetWords, settings, true);
  }

  // EXPLICIT AI DISABLE CHECK
  // We skip AI if useAi is false.
  // We also skip AI if context is 0 AND difficulty is not HARD (since AI is only needed for context or difficulty).
  if (settings.useAi === false || (settings.typeDistribution.context === 0 && settings.difficulty !== 'HARD')) {
    // If user explicitly disabled AI, we skip calling it and use local generation.
    // generateLocalQuiz handles re-distributing 'context' counts to other types.
    return generateLocalQuiz(sheetWords, settings, false);
  }

  const dist = settings.typeDistribution;
  const totalQuestions = dist.engToKor + dist.korToEng + dist.context;

  let limitedWords: SheetWord[] = [];
  let taskDescription = `Generate ${totalQuestions} vocabulary questions based on SOURCE DATA.`;

  if (settings.difficulty === 'HARD') {
    // Take a larger sample and ask AI to pick the hardest ones
    const sampleSize = Math.min(sheetWords.length, Math.max(totalQuestions * 3, 100));
    limitedWords = shuffleArray(sheetWords).slice(0, sampleSize);
    taskDescription = `Select the ${totalQuestions} MOST DIFFICULT words from SOURCE DATA, and generate vocabulary questions for them.`;
  } else {
    const shuffled = shuffleArray(sheetWords);
    limitedWords = shuffled.slice(0, totalQuestions); 
  }
  
  const prompt = `
    SOURCE DATA: ${JSON.stringify(limitedWords)}
    FULL POOL (For distractors): ${JSON.stringify(sheetWords.map(s => s.word))} (English), ${JSON.stringify(sheetWords.map(s => s.meaning))} (Korean)

    Task: ${taskDescription}

    REQUIREMENTS:
    1. **Types**:
       - ${dist.engToKor} items: 'EngToKor' (Show English -> Select Korean Meaning)
       - ${dist.korToEng} items: 'KorToEng' (Show Korean Meaning -> Select English Word)
       - ${dist.context} items: 'Context' (Fill in the blank sentence -> Select English Word)
       - Total questions MUST be exactly ${totalQuestions}.
    
    2. **Context Sentence Rule**:
       - Write a simple English sentence with a blank (_______) where the target word fits naturally.
       - Do NOT include the target word in the sentence.
    
    3. **Distractors (CRITICAL)**:
       - For each question, provide 3 distractors (incorrect answers).
       - **SOURCE ONLY**: Distractors MUST be chosen from the provided 'FULL POOL'. Do NOT invent words.
       - **POS MATCHING (VERY IMPORTANT)**: 
         - The distractors MUST have the **SAME Part of Speech (POS)** as the correct answer.
         - If the answer is a Verb, all distractors must be Verbs.
         - If the answer is a Noun, all distractors must be Nouns.
         - If the answer is a Korean meaning ending in '다' (verb-like), distractors should also end in '다'.
         - *Goal*: Prevent students from guessing the answer by grammatical elimination.
       - If strict POS matching is impossible due to limited data, use other words from the pool but try to keep them similar in length/style.

    OUTPUT JSON FORMAT (Array of objects):
    {
      "id": number (original index in SOURCE DATA),
      "type": "engToKor" | "korToEng" | "context",
      "questionText": string (The problem text to display),
      "correctAnswerString": string (The correct option),
      "distractors": string[] (Array of 3 strings found in FULL POOL)
    }
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
              correctAnswerString: { type: Type.STRING },
              distractors: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["id", "type", "questionText", "correctAnswerString", "distractors"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const rawQuestions = JSON.parse(text) as { id: number, type: string, questionText: string, correctAnswerString: string, distractors: string[] }[];
    
    // Shuffle the questions so the types are distributed randomly
    const shuffledQuestions = shuffleArray(rawQuestions);
    
    // Post-processing: Shuffle Options & Anti-consecutive Logic
    let lastAnswerIndex = -1;

    return shuffledQuestions.map((q, idx) => {
      const correct = q.correctAnswerString;
      // Use AI provided distractors which are POS-matched
      const distractors = q.distractors;
      
      const options = [correct, ...distractors];

      // Shuffle options (Avoid consecutive same index)
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
    // CRITICAL FIX: Catch quota/billing errors or network issues and fallback gracefully
    // Instead of showing "Project quota class is not available" to the user,
    // we silently switch to local generation (Word <-> Meaning).
    console.warn("Gemini AI generation failed (Quota/Network). Switching to Local Mode:", error.message);
    return generateLocalQuiz(sheetWords, settings, isPractice);
  }
};
