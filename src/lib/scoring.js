import { MAX_SCORE, MIN_CORRECT_SCORE, SCORE_SPREAD } from "../config/constants.js";

export function clampResponseTime(responseTimeMs, questionDurationMs) {
  return Math.min(Math.max(responseTimeMs, 0), questionDurationMs);
}

export function calculateScore({ isCorrect, responseTimeMs, questionDurationMs }) {
  if (!isCorrect) {
    return 0;
  }

  const clampedTime = clampResponseTime(responseTimeMs, questionDurationMs);
  const score = Math.round(
    MAX_SCORE - (clampedTime / questionDurationMs) * SCORE_SPREAD
  );

  return Math.max(MIN_CORRECT_SCORE, score);
}

export function buildLeaderboard(session) {
  const participants = session?.participants || {};

  return Object.entries(participants)
    .map(([participantId, participant]) => ({
      participantId,
      nickname: participant.nickname || "Player",
      totalScore: participant.totalScore || 0,
    }))
    .sort((a, b) => b.totalScore - a.totalScore || a.nickname.localeCompare(b.nickname));
}
