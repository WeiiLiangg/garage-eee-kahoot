import { questions } from "../config/quiz.js";
import { getCorrectAnswerText } from "./questions.js";
import { buildLeaderboard } from "./scoring.js";

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildResultsCsv(sessionId, session) {
  const leaderboard = buildLeaderboard(session);
  const rows = [
    [
      "Rank",
      "Participant ID",
      "Nickname",
      "Total Score",
      "Question ID",
      "Question",
      "Selected Answer",
      "Correct Answer",
      "Is Correct",
      "Response Time Ms",
      "Question Score",
    ],
  ];

  leaderboard.forEach((participant, participantIndex) => {
    questions.forEach((question) => {
      const response =
        session?.responses?.[question.id]?.[participant.participantId] || null;
      const selectedAnswer =
        response?.answerIndex !== undefined
          ? question.options[response.answerIndex]
          : "";

      rows.push([
        participantIndex + 1,
        participant.participantId,
        participant.nickname,
        participant.totalScore,
        question.id,
        question.question,
        selectedAnswer,
        getCorrectAnswerText(question),
        response ? response.isCorrect : "",
        response ? response.responseTimeMs : "",
        response ? response.score : 0,
      ]);
    });
  });

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadResultsCsv(sessionId, session) {
  const csv = buildResultsCsv(sessionId, session);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `garage-eee-quiz-${sessionId}-results.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
