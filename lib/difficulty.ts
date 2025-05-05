// lib/difficulty.ts
'use client';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LEVELS: Record<Difficulty, { label: string; description: string }> = {
  easy: {
    label: 'Easy',
    description: 'Question + Audio + Visual',
  },
  medium: {
    label: 'Medium',
    description: 'Question + One Media',
  },
  hard: {
    label: 'Hard',
    description: 'Question Only',
  },
};

export const getDifficultySettings = (
  difficulty: Difficulty,
  media?: { image?: string | null; voice_record?: string | null }
): { showImage: boolean; showAudio: boolean } => {
  if (difficulty === 'easy') {
    return { showImage: true, showAudio: true };
  }

  if (difficulty === 'medium') {
    const hasImage = !!media?.image;
    const hasAudio = !!media?.voice_record;

    if (hasImage && hasAudio) {
      const random = Math.random() < 0.5;
      return { showImage: random, showAudio: !random };
    } else if (hasImage) {
      return { showImage: true, showAudio: false };
    } else if (hasAudio) {
      return { showImage: false, showAudio: true };
    } else {
      return { showImage: false, showAudio: false };
    }
  }

  // Hard mode
  return { showImage: false, showAudio: false };
};



