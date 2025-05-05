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


export async function createQuestion(type: 1 | 2 | 3 | 4, difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Promise<QuestionFormat | null> {
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

    // For easy mode, we need to find a quote that has both image and voice record
    // For medium mode, we need a quote that has at least one of them
    // For hard mode, we just need a quote with text
    let correctQuoteData: FilmQuote | GameQuote | null = null;
    let attempts = 0;
    const maxAttempts = 10; // Limit the number of attempts to find a suitable quote

    while (attempts < maxAttempts) {
      // Fetch a random quote to base the question on
      const skip = Math.floor(Math.random() * totalQuotes);

      // Explicitly call findMany based on modelName
      if (modelName === 'filmQuote') {
        const results = await prisma.filmQuote.findMany({ take: 1, skip: skip });
        correctQuoteData = results[0] ?? null;
      } else {
        const results = await prisma.gameQuote.findMany({ take: 1, skip: skip });
        correctQuoteData = results[0] ?? null;
      }

      // Check if the quote meets the difficulty requirements
      if (difficulty === 'easy') {
        if (correctQuoteData?.image && correctQuoteData?.voice_record) {
          break; // Found a suitable quote for easy mode
        }
      } else if (difficulty === 'medium') {
        if (correctQuoteData?.image || correctQuoteData?.voice_record) {
          break; // Found a suitable quote for medium mode
        }
      } else if (difficulty === 'hard') {
        if (correctQuoteData?.quote) {
          break; // Found a suitable quote for hard mode
        }
      }

      attempts++;
      correctQuoteData = null;
    }

    if (!correctQuoteData) {
      console.error("Could not fetch a suitable quote.");
      return null;
    }

    let questionText = '';
    let options: string[] = [];
    let correctAnswer = '';
    const media: QuestionFormat['media'] = {};
    const neededIncorrectOptions = 3; // We need 3 incorrect options

    // For medium mode, randomly choose between image and voice record if both are available
    const hasImage = !!correctQuoteData.image;
    const hasVoice = !!correctQuoteData.voice_record;
    const useImage = difficulty === 'medium' && hasImage && (!hasVoice || Math.random() < 0.5);

    // For hard mode, we'll use a simplified type system (1: character, 2: recipient, 3: title)
    const hardModeType = difficulty === 'hard' ? Math.floor(Math.random() * 3) + 1 : type;
    if (difficulty === 'hard' && hardModeType === 4) {
      console.warn("Type 4 is not allowed in hard mode — retrying.");
      return await createQuestion(type, difficulty); // Retry with new random question
    }
    
    switch (hardModeType) {
      // 1: Guess Character from Quote
      case 1: {
        if (!correctQuoteData.quote) return null;
        correctAnswer = correctQuoteData.character;
        const incorrectOptions = await getRandomDistinct(modelName, 'character', neededIncorrectOptions, correctQuoteData.id, correctAnswer);
        if (incorrectOptions.length < neededIncorrectOptions) {
          console.warn(`Warning: Could only find ${incorrectOptions.length} distinct incorrect characters for type 1.`);
        }
        options = _.shuffle([correctAnswer, ...incorrectOptions]);
        questionText = `Who says "${correctQuoteData.quote}"?`;
        media.quote = correctQuoteData.quote;
        if (difficulty === 'easy') {
          media.image = correctQuoteData.image;
          media.voice_record = correctQuoteData.voice_record;
        } else if (difficulty === 'medium') {
          if (useImage) {
            media.image = correctQuoteData.image;
          } else {
            media.voice_record = correctQuoteData.voice_record;
          }
        }
        break;
      }

      // 2: Guess Recipient from Quote
      case 2: {
        if (!correctQuoteData.quote || !correctQuoteData.to) return null;
        correctAnswer = correctQuoteData.to;
        const incorrectOptions = await getRandomDistinct(modelName, 'to', neededIncorrectOptions, correctQuoteData.id, correctAnswer);
        if (incorrectOptions.length < neededIncorrectOptions) {
          console.warn(`Warning: Could only find ${incorrectOptions.length} distinct incorrect 'to' values for type 2.`);
        }
        options = _.shuffle([correctAnswer, ...incorrectOptions]);
        questionText = `Who is "${correctQuoteData.quote}" said to?`;
        media.quote = correctQuoteData.quote;
        if (difficulty === 'easy') {
          media.image = correctQuoteData.image;
          media.voice_record = correctQuoteData.voice_record;
        } else if (difficulty === 'medium') {
          if (useImage) {
            media.image = correctQuoteData.image;
          } else {
            media.voice_record = correctQuoteData.voice_record;
          }
        }
        break;
      }

      // 3: Guess Title from Quote
      case 3: {
        if (!correctQuoteData.quote) return null;
        correctAnswer = correctQuoteData.title;
        const incorrectOptions = await getRandomDistinct(modelName, 'title', neededIncorrectOptions, correctQuoteData.id, correctAnswer);
        if (incorrectOptions.length < neededIncorrectOptions) {
          console.warn(`Warning: Could only find ${incorrectOptions.length} distinct incorrect titles for type 3.`);
        }
        options = _.shuffle([correctAnswer, ...incorrectOptions]);
        questionText = `Which ${modelName === 'filmQuote' ? 'movie' : 'game'} is this quote from: "${correctQuoteData.quote}"?`;
        media.quote = correctQuoteData.quote;
        if (difficulty === 'easy') {
          media.image = correctQuoteData.image;
          media.voice_record = correctQuoteData.voice_record;
        } else if (difficulty === 'medium') {
          if (useImage) {
            media.image = correctQuoteData.image;
          } else {
            media.voice_record = correctQuoteData.voice_record;
          }
        }
        break;
      }

      // Original question types for easy and medium modes
      case 4: {
        if (difficulty === 'hard') return null; // Skip type 4 in hard mode
        if (!correctQuoteData.voice_record && !correctQuoteData.quote) return null;
        correctAnswer = correctQuoteData.title;
        const incorrectOptions = await getRandomDistinct(modelName, 'title', neededIncorrectOptions, correctQuoteData.id, correctAnswer);
        if (incorrectOptions.length < neededIncorrectOptions) {
          console.warn(`Warning: Could only find ${incorrectOptions.length} distinct incorrect titles for type 4.`);
        }
        options = _.shuffle([correctAnswer, ...incorrectOptions]);
        questionText = `Which ${modelName === 'filmQuote' ? 'movie' : 'game'} is ${correctQuoteData.voice_record ? 'this voice recording' : 'this quote'} from?`;
        if (difficulty === 'easy') {
          media.image = correctQuoteData.image;
          media.voice_record = correctQuoteData.voice_record;
          media.quote = correctQuoteData.quote;
        } else if (difficulty === 'medium') {
          if (useImage) {
            media.image = correctQuoteData.image;
          } else {
            media.voice_record = correctQuoteData.voice_record;
            media.quote = correctQuoteData.quote;
          }
        }
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
      type: hardModeType,
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