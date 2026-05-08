export function getCorrectIndexes(question) {
  if (Array.isArray(question.correctIndexes)) {
    return question.correctIndexes;
  }

  return [question.correctIndex];
}

export function isCorrectAnswer(question, answerIndex) {
  return getCorrectIndexes(question).includes(answerIndex);
}

export function getCorrectAnswerText(question) {
  return getCorrectIndexes(question)
    .map((index) => question.options[index])
    .join(" / ");
}
