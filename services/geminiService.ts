
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
    
    // Local fallback cannot do high-level context, revert to engToKor
    if (currentType === 'context') {
       currentType = 'engToKor';
    }

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
  
  let prompt = '';

  if (settings.questionType === 'context') {
    prompt = `
      I have a vocabulary list.
      SOURCE DATA: ${JSON.stringify(limitedWords)}

      Task: Create a "Contextual Inference" test with exactly ${settings.totalQuestions} questions.

      STRICT RULES FOR 'CONTEXT' TYPE:
      1. **Structure**: For each target word, write a **single, clear English sentence** where the target word fits into a blank.
      2. **Difficulty**: Easy to Intermediate. Use simple vocabulary and grammar for the sentence so the student focuses on the target word.
      3. **The Blank**: Represent the missing word as "_______".
      4. **Logic**: The sentence should provide a clear clue (context) for the missing word.
      5. **Distractors**: The 3 distractors must be:
         - **Same Part of Speech**: If the answer is a verb, all distractors must be verbs.
         - **Distinct**: Distractors should be clearly incorrect in this context (not too confusing), but still valid English words.
      6. **Output**:
         - "word": The single sentence with the blank.
         - "options": Array of 4 words (1 correct + 3 distractors).
         - "correctAnswerIndex": Index of the correct word.

      Return the result as a JSON array of Question objects.
    `;
  } else {
    prompt = `
      I have a vocabulary list for a high-quality test. 
      SOURCE DATA: ${JSON.stringify(limitedWords)}

      Task: Create a test with exactly ${settings.totalQuestions} questions following strict pedagogical guidelines.
      
      QUIZ TYPE SETTING: ${settings.questionType}
      - If 'mixed': Split questions equally between (English Word -> Korean Meaning) and (Korean Meaning -> English Word).
      - If 'engToKor': Show English, ask for Korean meaning.
      - If 'korToEng': Show Korean, ask for English word.

      STRICT GUIDELINES FOR OPTIONS (DISTRACTORS):
      1. **PART OF SPEECH (품사 일치)**: All 4 options (correct answer and 3 distractors) MUST belong to the same part of speech (e.g., all verbs, all nouns, all adjectives).
      2. **NO SYNONYMS (의미 중복 금지)**: Do NOT use distractors that are synonyms or have overlapping/similar meanings to the correct answer. This is critical to prevent multiple correct answers. (e.g., if the answer is 'clear', do not use 'vivid' as a distractor).
      3. **BALANCED DIFFICULTY (난이도 조절)**: Distractors should be plausible but clearly incorrect. Do not make the correct answer too obvious by using irrelevant words.
      4. **NO AMBIGUITY**: Ensure the correct answer is the single most accurate translation based on the source data.
      5. **Shuffle**: Randomly place the correct answer among the 4 options and set 'correctAnswerIndex' (0-3) accurately.

      Return the result as a JSON array of Question objects.
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
