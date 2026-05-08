import {
  get,
  onValue,
  ref,
  set,
  update,
  runTransaction,
} from "firebase/database";
import { database } from "../config/firebase.js";
import { questions } from "../config/quiz.js";
import { SESSION_STATUS } from "../config/constants.js";
import { isCorrectAnswer } from "./questions.js";
import { calculateScore, clampResponseTime } from "./scoring.js";

function requireDatabase() {
  if (!database) {
    throw new Error("Firebase is not configured. Add your .env values first.");
  }

  return database;
}

function sessionRef(sessionId) {
  return ref(requireDatabase(), `sessions/${sessionId}`);
}

function responseRef(sessionId, questionId, participantId) {
  return ref(
    requireDatabase(),
    `sessions/${sessionId}/responses/${questionId}/${participantId}`
  );
}

async function getServerNow() {
  requireDatabase();
  return Date.now();
}

export function listenToSession(sessionId, onChange, onError) {
  return onValue(
    sessionRef(sessionId),
    (snapshot) => onChange(snapshot.val()),
    onError
  );
}

export async function createQuizSession(sessionId) {
  const now = await getServerNow();

  await set(sessionRef(sessionId), {
    status: SESSION_STATUS.WAITING,
    currentQuestionIndex: 0,
    createdAt: now,
    questionStartTime: null,
    questionEndTime: null,
  });
}

export async function joinQuizSession(sessionId, participantId, nickname) {
  const now = await getServerNow();

  await update(sessionRef(sessionId), {
    [`participants/${participantId}/nickname`]: nickname.trim(),
    [`participants/${participantId}/totalScore`]: 0,
    [`participants/${participantId}/joinedAt`]: now,
  });
}

export async function startQuestion(sessionId, questionIndex) {
  const now = await getServerNow();

  await update(sessionRef(sessionId), {
    status: SESSION_STATUS.QUESTION_ACTIVE,
    currentQuestionIndex: questionIndex,
    questionStartTime: now,
    questionEndTime: null,
  });
}

export async function endQuestion(sessionId) {
  const now = await getServerNow();

  await update(sessionRef(sessionId), {
    status: SESSION_STATUS.QUESTION_ENDED,
    questionEndTime: now,
  });
}

export async function revealCurrentQuestion(sessionId) {
  const snapshot = await get(sessionRef(sessionId));
  const session = snapshot.val();

  if (!session) {
    throw new Error("Session not found.");
  }

  const question = questions[session.currentQuestionIndex];

  if (!question) {
    throw new Error("Question not found.");
  }

  const questionId = question.id;
  const alreadyScored = session.scoredQuestions?.[questionId];
  const updates = {
    status: SESSION_STATUS.ANSWER_REVEALED,
    questionEndTime: session.questionEndTime || (await getServerNow()),
  };

  if (!alreadyScored) {
    const participants = session.participants || {};
    const responses = session.responses?.[questionId] || {};

    Object.entries(responses).forEach(([participantId, response]) => {
      const currentTotal = participants[participantId]?.totalScore || 0;
      updates[`participants/${participantId}/totalScore`] =
        currentTotal + (response.score || 0);
    });

    updates[`scoredQuestions/${questionId}`] = true;
  }

  await update(sessionRef(sessionId), updates);
}

export async function moveToQuestion(sessionId, questionIndex) {
  await update(sessionRef(sessionId), {
    status: SESSION_STATUS.WAITING,
    currentQuestionIndex: questionIndex,
    questionStartTime: null,
    questionEndTime: null,
  });
}

export async function finishQuiz(sessionId) {
  await update(sessionRef(sessionId), {
    status: SESSION_STATUS.FINISHED,
  });
}

export async function submitAnswer(sessionId, participantId, answerIndex) {
  const sessionSnapshot = await get(sessionRef(sessionId));
  const session = sessionSnapshot.val();

  if (!session) {
    throw new Error("Session not found.");
  }

  if (session.status !== SESSION_STATUS.QUESTION_ACTIVE) {
    throw new Error("This question is not accepting answers.");
  }

  const question = questions[session.currentQuestionIndex];

  if (!question) {
    throw new Error("Question not found.");
  }

  const submittedAt = await getServerNow();
  const questionDurationMs = question.durationSeconds * 1000;
  const rawResponseTimeMs = submittedAt - session.questionStartTime;

  if (rawResponseTimeMs > questionDurationMs) {
    throw new Error("Time is up for this question.");
  }

  const responseTimeMs = clampResponseTime(
    rawResponseTimeMs,
    questionDurationMs
  );
  const isCorrect = isCorrectAnswer(question, answerIndex);
  const score = calculateScore({
    isCorrect,
    responseTimeMs,
    questionDurationMs,
  });
  const answerPayload = {
    answerIndex,
    submittedAt,
    responseTimeMs,
    isCorrect,
    score,
  };

  let didWrite = false;

  await runTransaction(
    responseRef(sessionId, question.id, participantId),
    (currentValue) => {
      if (currentValue) {
        return currentValue;
      }

      didWrite = true;
      return answerPayload;
    },
    { applyLocally: false }
  );

  if (!didWrite) {
    throw new Error("You already submitted an answer for this question.");
  }

  return answerPayload;
}
