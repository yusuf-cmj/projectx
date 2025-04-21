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


export async function createQuestion(type: 1 | 2 | 3 | 4): Promise<QuestionFormat | null> {
  try {
    // Randomly choose between film and game quotes
    const modelName = Math.random() < 0.5 ? 'filmQuote' : 'gameQuote';

    // Explicitly call count based on modelName
    let totalQuotes = 0;
    if (modelName === 'filmQuote') {
        totalQuotes = await prisma.filmQuote.count();
    } else {
        totalQuotes = await prisma.gameQuote.count();
    }

    if (totalQuotes < 4 && (type === 1 || type === 2)) {
      console.warn(`Need at least 4 quotes with distinct values for the chosen field to reliably generate type ${type} questions.`);
    }
    if (totalQuotes === 0) {
      console.error("No quotes found in the database.");
      return null;
    }

    // Fetch a random quote to base the question on
    const skip = Math.floor(Math.random() * totalQuotes);

    // Explicitly call findMany based on modelName
    let correctQuoteData: FilmQuote | GameQuote | null = null;
    if (modelName === 'filmQuote') {
        const results = await prisma.filmQuote.findMany({ take: 1, skip: skip });
        correctQuoteData = results[0] ?? null;
    } else {
        const results = await prisma.gameQuote.findMany({ take: 1, skip: skip });
        correctQuoteData = results[0] ?? null;
    }

    // --- DEBUG LOGGING --- >
    console.log("\n--- Fetched Correct Quote Data ---");
    console.log(correctQuoteData);
    console.log("------------------------------------\n");
    // <--- DEBUG LOGGING ---

    if (!correctQuoteData) {
      console.error("Could not fetch a random quote.");
      return null;
    }

    let questionText = '';
    let options: string[] = [];
    let correctAnswer = '';
    const media: QuestionFormat['media'] = {};
    const neededIncorrectOptions = 3; // We need 3 incorrect options

    switch (type) {
      // 1: Guess Quote from Image
      case 1: {
        if (!correctQuoteData.image) return null;
        correctAnswer = correctQuoteData.quote;
        // Call getRandomDistinct with correct field name as string literal
        const incorrectOptions = await getRandomDistinct(modelName, 'quote', neededIncorrectOptions, correctQuoteData.id, correctAnswer);
        if (incorrectOptions.length < neededIncorrectOptions) {
          console.warn(`Warning: Could only find ${incorrectOptions.length} distinct incorrect quotes for type 1.`);
        }
        options = _.shuffle([correctAnswer, ...incorrectOptions]);
        questionText = `In this scene, what does ${correctQuoteData.character || 'the character'} say to ${correctQuoteData.to ? `'${correctQuoteData.to}'` : 'the other character'}?`;
        media.image = correctQuoteData.image;
        break;
      }

      // 2: Guess 'To' from Image/Quote
      case 2: {
        if (!correctQuoteData.image || !correctQuoteData.to) return null;
        correctAnswer = correctQuoteData.to;
        // Call getRandomDistinct with correct field name as string literal
        const incorrectOptions = await getRandomDistinct(modelName, 'to', neededIncorrectOptions, correctQuoteData.id, correctAnswer);
        if (incorrectOptions.length < neededIncorrectOptions) {
          console.warn(`Warning: Could only find ${incorrectOptions.length} distinct incorrect 'to' values for type 2.`);
        }
        options = _.shuffle([correctAnswer, ...incorrectOptions]);
        questionText = `In this scene, who does ${correctQuoteData.character || 'the character'} say "${correctQuoteData.quote}" to?`;
        media.image = correctQuoteData.image;
        break;
      }

      // 3: Guess Character from Quote/Voice
      case 3: {
        if (!correctQuoteData.voice_record && !correctQuoteData.quote) return null;
        correctAnswer = correctQuoteData.character;
        // Call getRandomDistinct with correct field name as string literal
        const incorrectOptions = await getRandomDistinct(modelName, 'character', neededIncorrectOptions, correctQuoteData.id, correctAnswer);
        if (incorrectOptions.length < neededIncorrectOptions) {
          console.warn(`Warning: Could only find ${incorrectOptions.length} distinct incorrect characters for type 3.`);
        }
        options = _.shuffle([correctAnswer, ...incorrectOptions]);
        questionText = `Who says ${correctQuoteData.voice_record ? 'this voice recording' : 'this quote'}?`;
        media.voice_record = correctQuoteData.voice_record;
        media.quote = correctQuoteData.quote;
        break;
      }

      // 4: Guess Title from Quote/Voice
      case 4: {
        if (!correctQuoteData.voice_record && !correctQuoteData.quote) return null;
        correctAnswer = correctQuoteData.title;
        // Call getRandomDistinct with correct field name as string literal
        const incorrectOptions = await getRandomDistinct(modelName, 'title', neededIncorrectOptions, correctQuoteData.id, correctAnswer);
        if (incorrectOptions.length < neededIncorrectOptions) {
          console.warn(`Warning: Could only find ${incorrectOptions.length} distinct incorrect titles for type 4.`);
        }
        options = _.shuffle([correctAnswer, ...incorrectOptions]);
        questionText = `Which ${modelName === 'filmQuote' ? 'movie' : 'game'} is ${correctQuoteData.voice_record ? 'this voice recording' : 'this quote'} from?`;
        media.voice_record = correctQuoteData.voice_record;
        media.quote = correctQuoteData.quote;
        break;
      }

      default:
        console.error("Invalid question type requested.");
        return null;
    }

    // Ensure we always return the minimum number of options, even if duplicates from less data
    while (options.length < neededIncorrectOptions + 1) {
      console.warn(`Padding options for type ${type} due to lack of distinct data.`);
      options.push("Insufficient Data");
    }
    options = _.shuffle(options.slice(0, neededIncorrectOptions + 1));

    return {
      questionText,
      options,
      correctAnswer,
      media,
      type,
      source: modelName === 'filmQuote' ? 'film' : 'game'
    };

  } catch (error) {
    console.error("Error creating question:", error);
    return null;
  } finally {
    // Optional: Disconnect Prisma client if used transiently
    // await prisma.$disconnect();
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