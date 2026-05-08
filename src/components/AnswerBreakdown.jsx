import { isCorrectAnswer } from "../lib/questions.js";

export default function AnswerBreakdown({
  question,
  responses,
  participantCount,
  showCorrect = false,
}) {
  if (!question) {
    return null;
  }

  const responseList = Object.values(responses || {});
  const submittedCount = responseList.length;
  const counts = question.options.map((_, optionIndex) =>
    responseList.filter((response) => response.answerIndex === optionIndex).length
  );
  const totalForPercent = Math.max(submittedCount, 1);

  return (
    <section className="panel answer-breakdown-panel">
      <div className="panel-header">
        <h2>Answer Breakdown</h2>
        <span>
          {submittedCount}/{participantCount} submitted
        </span>
      </div>

      <div className="answer-bars">
        {question.options.map((option, index) => {
          const count = counts[index];
          const percent = Math.round((count / totalForPercent) * 100);
          const isCorrect = isCorrectAnswer(question, index);

          return (
            <div
              className={`answer-bar-row ${showCorrect && isCorrect ? "correct" : ""}`}
              key={option}
            >
              <div className="answer-bar-label">
                <strong>{String.fromCharCode(65 + index)}</strong>
                <span>{option}</span>
              </div>
              <div className="answer-bar-track" aria-hidden="true">
                <div style={{ width: `${percent}%` }} />
              </div>
              <div className="answer-bar-count">
                <strong>{count}</strong>
                <span>{percent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
