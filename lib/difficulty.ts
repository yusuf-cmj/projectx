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

export const getDifficultySettings = (value: Difficulty): { showImage: boolean; showAudio: boolean } => {
  return {
    showImage: value === 'easy' || value === 'medium',
    showAudio: value === 'easy' || value === 'medium',
  };
};

