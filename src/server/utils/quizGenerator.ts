import { PrismaClient, FilmQuote, GameQuote, Prisma } from '@prisma/client';
import _ from 'lodash'; // Using lodash for shuffling

const prisma = new PrismaClient();

interface QuestionFormat {
  questionText: string;
  options: string[];
  correctAnswer: string;
  media?: {
    image?: string | null;
    voice_record?: string | null;
    quote?: string | null; // Include quote text when media is voice
  };
  type: number;
  source: 'film' | 'game';
  timeLimit: number; // Added time limit based on difficulty
}

// Helper function to get N distinct random items
// Removed complex generics, handling models explicitly inside
async function getRandomDistinct(
  model: 'filmQuote' | 'gameQuote',
  field: keyof FilmQuote | keyof GameQuote, // Field must be a valid key of either model
  count: number,
  excludeId?: string,
  excludeValue?: string | null // Assuming the fields we query are strings
): Promise<string[]> {
  console.log(`\n--- [getRandomDistinct V5] Attempting to find ${count} distinct '${String(field)}' values ---`);
  console.log(`--- Excluding ID: ${excludeId}, Filtering Value post-fetch: ${excludeValue} ---`);

  // Base where condition
  const whereCondition: { id?: { not?: string } } = {};
  if (excludeId) {
    whereCondition.id = { not: excludeId };
  }

  console.log("--- [getRandomDistinct V5] Using DB Where Condition: ---");
  console.dir(whereCondition, { depth: null });
  console.log("-------------------------------------------------------");

  try {
    // Define type for the result of findMany with select
    type Candidate = { [key in typeof field]: string | null };
    let allCandidates: Candidate[] = []; // Initialize with correct type

    // Fetch candidates based on the model using explicit calls
    if (model === 'filmQuote') {
      // Prisma returns Array<{ [field]: string | null }> here
      allCandidates = await prisma.filmQuote.findMany({
        where: whereCondition as Prisma.FilmQuoteWhereInput,
        select: { [field]: true } as Prisma.FilmQuoteSelect,
      }) as unknown as Candidate[]; // Use type assertion workaround
    } else { // model === 'gameQuote'
      // Prisma returns Array<{ [field]: string | null }> here
      allCandidates = await prisma.gameQuote.findMany({
        where: whereCondition as Prisma.GameQuoteWhereInput,
        select: { [field]: true } as Prisma.GameQuoteSelect,
      }) as unknown as Candidate[]; // Use type assertion workaround
    }

    console.log("--- [getRandomDistinct V5] Fetched ALL Candidates (Before JS filtering): ---");
    // Explicitly type 'item' according to the actual fetched structure
    console.dir(allCandidates.map((item: Candidate) => item[field]), { depth: null });
    console.log("-----------------------------------------------------------------------------");

    // Filter in JavaScript with explicit types
    const filteredValues = allCandidates
      .map((item: Candidate) => item[field]) // Extract the value
      .filter((value: string | null | undefined): value is string => // Type guard to filter non-strings
        value !== null && value !== undefined && value !== ''
      )
      .filter((value: string) => value !== excludeValue); // Filter out the specific excluded value

    // Get distinct values
    const distinctValues: string[] = [...new Set(filteredValues)];

    console.log("--- [getRandomDistinct V5] Values After ALL JS Filtering & Distinct: ---");
    console.dir(distinctValues, { depth: null });
    console.log("---------------------------------------------------------------------");

    // Shuffle and take the required count
    const finalOptions = _.shuffle(distinctValues).slice(0, count);
    console.log(`--- [getRandomDistinct V5] Returning ${finalOptions.length} options:`, finalOptions);
    return finalOptions;

  } catch (error) {
    console.error("--- [getRandomDistinct V5] Error during fetch or processing: ---", error);
    return []; // Return empty array on error
  }
}

// Type 1 - Quote Identification
async function generateType1Question(
  correctQuoteData: FilmQuote | GameQuote,
  modelName: 'filmQuote' | 'gameQuote',
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<QuestionFormat | null> {
  if (!correctQuoteData.quote || !correctQuoteData.image) return null;

  const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 20 : 15;
  let questionText = '';
  let media: QuestionFormat['media'] = {};

  if (difficulty === 'easy') {
    questionText = `In this scene, what does ${correctQuoteData.character} say to ${correctQuoteData.to || 'the other character'}?`;
    media = {
      image: correctQuoteData.image,
      quote: correctQuoteData.quote
    };
  } else if (difficulty === 'medium') {
    questionText = `In this scene, what does ${correctQuoteData.character} say?`;
    media = {
      image: correctQuoteData.image,
      quote: correctQuoteData.quote
    };
  } else {
    questionText = 'What is the quote said in this scene?';
    media = {
      image: correctQuoteData.image
    };
  }

  // Get 3 incorrect quotes
  const incorrectOptions = await getRandomDistinct(modelName, 'quote', 3, correctQuoteData.id, correctQuoteData.quote);
  const options = _.shuffle([correctQuoteData.quote, ...incorrectOptions]);

  return {
    questionText,
    options,
    correctAnswer: correctQuoteData.quote,
    media,
    type: 1,
    source: modelName === 'filmQuote' ? 'film' : 'game',
    timeLimit
  };
}

// Type 2 - Target Identification
async function generateType2Question(
  correctQuoteData: FilmQuote | GameQuote,
  modelName: 'filmQuote' | 'gameQuote',
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<QuestionFormat | null> {
  if (!correctQuoteData.quote || !correctQuoteData.image || !correctQuoteData.to) return null;

  const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 20 : 15;
  let questionText = '';
  let media: QuestionFormat['media'] = {};

  if (difficulty === 'easy') {
    questionText = `In this scene, who does ${correctQuoteData.character} say "${correctQuoteData.quote}" to?`;
    media = {
      image: correctQuoteData.image,
      quote: correctQuoteData.quote
    };
  } else if (difficulty === 'medium') {
    questionText = `Who is the target of the quote "${correctQuoteData.quote}" in this scene?`;
    media = {
      image: correctQuoteData.image,
      quote: correctQuoteData.quote
    };
  } else {
    questionText = 'Who is being spoken to in this scene?';
    media = {
      image: correctQuoteData.image
    };
  }

  const incorrectOptions = await getRandomDistinct(modelName, 'to', 3, correctQuoteData.id, correctQuoteData.to);
  const options = _.shuffle([correctQuoteData.to, ...incorrectOptions]);

  return {
    questionText,
    options,
    correctAnswer: correctQuoteData.to,
    media,
    type: 2,
    source: modelName === 'filmQuote' ? 'film' : 'game',
    timeLimit
  };
}

// Type 3 - Speaker Identification
async function generateType3Question(
  correctQuoteData: FilmQuote | GameQuote,
  modelName: 'filmQuote' | 'gameQuote',
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<QuestionFormat | null> {
  if (!correctQuoteData.quote || !correctQuoteData.voice_record) return null;

  const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 20 : 15;
  let questionText = '';
  let media: QuestionFormat['media'] = {};

  if (difficulty === 'easy') {
    questionText = `Who says this quote: "${correctQuoteData.quote}"?`;
    media = {
      voice_record: correctQuoteData.voice_record,
      quote: correctQuoteData.quote
    };
  } else if (difficulty === 'medium') {
    questionText = 'Who says this line? (Listen to the audio clip.)';
    media = {
      voice_record: correctQuoteData.voice_record
    };
  } else {
    questionText = 'Identify the speaker from the audio clip.';
    media = {
      voice_record: correctQuoteData.voice_record
    };
  }

  const incorrectOptions = await getRandomDistinct(modelName, 'character', 3, correctQuoteData.id, correctQuoteData.character);
  const options = _.shuffle([correctQuoteData.character, ...incorrectOptions]);

  return {
    questionText,
    options,
    correctAnswer: correctQuoteData.character,
    media,
    type: 3,
    source: modelName === 'filmQuote' ? 'film' : 'game',
    timeLimit
  };
}

// Type 4 - Source Identification
async function generateType4Question(
  correctQuoteData: FilmQuote | GameQuote,
  modelName: 'filmQuote' | 'gameQuote',
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<QuestionFormat | null> {
  if (!correctQuoteData.quote || !correctQuoteData.voice_record) return null;

  const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 20 : 15;
  let questionText = '';
  let media: QuestionFormat['media'] = {};

  if (difficulty === 'easy') {
    questionText = `From which ${modelName === 'filmQuote' ? 'movie' : 'game'} is this quote: "${correctQuoteData.quote}"?`;
    media = {
      voice_record: correctQuoteData.voice_record,
      quote: correctQuoteData.quote
    };
  } else if (difficulty === 'medium') {
    questionText = `Identify the ${modelName === 'filmQuote' ? 'movie' : 'game'} from this line.`;
    media = {
      voice_record: correctQuoteData.voice_record
    };
  } else {
    questionText = `From which ${modelName === 'filmQuote' ? 'movie' : 'game'} is this voice clip?`;
    media = {
      voice_record: correctQuoteData.voice_record
    };
  }

  const incorrectOptions = await getRandomDistinct(modelName, 'title', 3, correctQuoteData.id, correctQuoteData.title);
  const options = _.shuffle([correctQuoteData.title, ...incorrectOptions]);

  return {
    questionText,
    options,
    correctAnswer: correctQuoteData.title,
    media,
    type: 4,
    source: modelName === 'filmQuote' ? 'film' : 'game',
    timeLimit
  };
}

async function getRandomQuote(modelName: 'filmQuote' | 'gameQuote'): Promise<FilmQuote | GameQuote | null> {
  if (modelName === 'filmQuote') {
    const count = await prisma.filmQuote.count();
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const results = await prisma.filmQuote.findMany({ take: 1, skip });
    return results[0] || null;
  } else {
    const count = await prisma.gameQuote.count();
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const results = await prisma.gameQuote.findMany({ take: 1, skip });
    return results[0] || null;
  }
}

export async function createQuestion(type: 1 | 2 | 3 | 4, difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Promise<QuestionFormat | null> {
  try {
    const modelName = Math.random() < 0.5 ? 'filmQuote' : 'gameQuote';
    let correctQuoteData: FilmQuote | GameQuote | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const quote = await getRandomQuote(modelName);
      if (!quote) continue;

      // Check if quote meets requirements for the question type
      const isValid = (() => {
        switch (type) {
          case 1: // Quote Identification
            return quote.image && quote.quote;
          case 2: // Target Identification
            return quote.image && quote.quote && quote.to;
          case 3: // Speaker Identification
            return quote.voice_record && quote.quote;
          case 4: // Source Identification
            return quote.voice_record && quote.quote;
          default:
            return false;
        }
      })();

      if (isValid) {
        correctQuoteData = quote;
        break;
      }

      attempts++;
    }

    if (!correctQuoteData) {
      console.error("Could not find a suitable quote for the question type.");
      return null;
    }

    // Generate question based on type
    switch (type) {
      case 1:
        return await generateType1Question(correctQuoteData, modelName, difficulty);
      case 2:
        return await generateType2Question(correctQuoteData, modelName, difficulty);
      case 3:
        return await generateType3Question(correctQuoteData, modelName, difficulty);
      case 4:
        return await generateType4Question(correctQuoteData, modelName, difficulty);
      default:
        console.error("Invalid question type requested.");
        return null;
    }

  } catch (error) {
    console.error("Error creating question:", error);
    return null;
  }
}

// Example Usage (You would call this from an API route or server-side component)
/*
async function testQuestions() {
  console.log("--- Question Type 1 ---");
  const q1 = await createQuestion(1);
  console.log(q1);

  console.log("\n--- Question Type 2 ---");
  const q2 = await createQuestion(2);
  console.log(q2);

  console.log("\n--- Question Type 3 ---");
  const q3 = await createQuestion(3);
  console.log(q3);

  console.log("\n--- Question Type 4 ---");
  const q4 = await createQuestion(4);
  console.log(q4);
}

testQuestions().catch(console.error);
*/ 