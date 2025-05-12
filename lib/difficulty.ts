// lib/difficulty.ts
'use client';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LEVELS: Record<Difficulty, { label: string; description: string; timeLimit: number }> = {
  easy: {
    label: 'Easy',
    description: '30 seconds per question',
    timeLimit: 30
  },
  medium: {
    label: 'Medium',
    description: '20 seconds per question',
    timeLimit: 20
  },
  hard: {
    label: 'Hard',
    description: '15 seconds per question',
    timeLimit: 15
  },
};

export const getDifficultySettings = (
  difficulty: Difficulty,
  media?: { image?: string | null; voice_record?: string | null },
  type?: number
): { showImage: boolean; showAudio: boolean; timeLimit: number } => {
  const timeLimit = DIFFICULTY_LEVELS[difficulty].timeLimit;

  if (difficulty === 'easy') {
    return { showImage: true, showAudio: true, timeLimit };
  }

  if (difficulty === 'medium') {
    const hasImage = !!media?.image;
    const hasAudio = !!media?.voice_record;

    if (hasImage && hasAudio) {
      const random = Math.random() < 0.5;
      return { showImage: random, showAudio: !random, timeLimit };
    } else if (hasImage) {
      return { showImage: true, showAudio: false, timeLimit };
    } else if (hasAudio) {
      return { showImage: false, showAudio: true, timeLimit };
    } else {
      return { showImage: false, showAudio: false, timeLimit };
    }
  }

  // Hard mode: type'a göre medya göster
  if (type === 1 || type === 2) {
    return { showImage: true, showAudio: false, timeLimit };
  }
  if (type === 3 || type === 4) {
    return { showImage: false, showAudio: true, timeLimit };
  }
  return { showImage: false, showAudio: false, timeLimit };
};



