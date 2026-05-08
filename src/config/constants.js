export const SESSION_STATUS = {
  WAITING: "waiting",
  QUESTION_ACTIVE: "question_active",
  QUESTION_ENDED: "question_ended",
  ANSWER_REVEALED: "answer_revealed",
  FINISHED: "finished",
};

export const MAX_SCORE = 1000;
export const MIN_CORRECT_SCORE = 100;
export const SCORE_SPREAD = MAX_SCORE - MIN_CORRECT_SCORE;

export const LOCAL_STORAGE_KEYS = {
  HOST_SESSION: "garage-eee-host-session",
  PLAYER_PREFIX: "garage-eee-player",
};
