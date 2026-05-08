import { isCorrectAnswer } from "../lib/questions.js";

export default function QuestionView({
  question,
  disabled,
  onAnswer,
  submittedAnswerIndex,
  showCorrect,
}) {
  if (!question) {
    return null;
  }

  return (
    <section className="question-panel">
      <p className="eyebrow">{question.durationSeconds}s question</p>
      <h1>{question.question}</h1>

      <div className="option-grid">
        {question.options.map((option, index) => {
          const isSubmitted = submittedAnswerIndex === index;
          const isCorrect = isCorrectAnswer(question, index);
          const className = [
            "option-button",
            isSubmitted ? "selected" : "",
            showCorrect && isCorrect ? "correct" : "",
            showCorrect && isSubmitted && !isCorrect ? "wrong" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={option}
              className={className}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer(index)}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
