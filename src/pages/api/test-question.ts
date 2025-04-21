// src/pages/api/test-question.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createQuestion } from '../../server/utils/quizGenerator'; // Adjust path if needed

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get desired question type from query param, default to 1 if not provided
  const typeParam = req.query.type;
  let type: number = 1; // Default to type 1

  if (typeParam) {
    try {
      const parsedType = parseInt(typeParam as string);
      if (!isNaN(parsedType)) {
        type = parsedType;
      }
    } catch {
      // Ignore parsing errors, use default
      console.warn("Could not parse 'type' query parameter:", typeParam)
    }
  }

  if (type < 1 || type > 4) {
    return res.status(400).json({ error: 'Invalid question type. Must be 1, 2, 3, or 4.' });
  }

  try {
    const question = await createQuestion(type as 1 | 2 | 3 | 4);

    if (question) {
      // Successfully generated question
      res.status(200).json(question);
    } else {
      // createQuestion returned null, likely due to missing data for the type (e.g., no image for type 1)
      // Or potentially no quotes in the DB at all.
      res.status(404).json({ error: 'Failed to generate question. Could not find suitable data for the requested type. Check server logs for details.' });
    }
  } catch (error) {
    // Catch any unexpected errors during generation
    console.error('API Error generating question:', error);
    res.status(500).json({ error: 'Internal server error occurred while generating the question.' });
  }
} 