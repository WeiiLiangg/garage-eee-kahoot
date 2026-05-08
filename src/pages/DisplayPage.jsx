import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "../config/firebase.js";
import { SESSION_STATUS } from "../config/constants.js";
import { questions } from "../config/quiz.js";
import { listenToSession } from "../lib/session.js";
import AnswerBreakdown from "../components/AnswerBreakdown.jsx";
import Leaderboard from "../components/Leaderboard.jsx";
import QuestionView from "../components/QuestionView.jsx";
import StatusBanner from "../components/StatusBanner.jsx";

function useCountdown(session, question) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (
      !session?.questionStartTime ||
      session.status !== SESSION_STATUS.QUESTION_ACTIVE ||
      !question
    ) {
      setRemainingMs(0);
      return undefined;
    }

    const durationMs = question.durationSeconds * 1000;

    function updateRemaining() {
      const elapsed = Date.now() - session.questionStartTime;
      setRemainingMs(Math.max(0, durationMs - elapsed));
    }

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 250);

    return () => window.clearInterval(timer);
  }, [session?.questionStartTime, session?.status, question]);

  return Math.ceil(remainingMs / 1000);
}

export default function DisplayPage() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session")?.trim().toUpperCase() || "";
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState("");

  const currentQuestion = questions[session?.currentQuestionIndex || 0];
  const remainingSeconds = useCountdown(session, currentQuestion);
  const questionNumber = (session?.currentQuestionIndex || 0) + 1;
  const participantCount = Object.keys(session?.participants || {}).length;
  const submittedCount = currentQuestion
    ? Object.keys(session?.responses?.[currentQuestion.id] || {}).length
    : 0;
  const currentResponses = currentQuestion
    ? session?.responses?.[currentQuestion.id] || {}
    : {};
  const showQuestionResults =
    session?.status === SESSION_STATUS.QUESTION_ENDED ||
    session?.status === SESSION_STATUS.ANSWER_REVEALED;

  useEffect(() => {
    if (!sessionId || !isFirebaseConfigured) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = listenToSession(
      sessionId,
      (nextSession) => {
        setSession(nextSession);
        setLoading(false);
      },
      (listenError) => {
        setError(listenError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [sessionId]);

  return (
    <main className="display-shell">
      <section className="display-header">
        <div>
          <p className="eyebrow">Garage@EEE Innovation Festival 2026</p>
          <h1>Festival Quiz</h1>
        </div>
        {session?.status === SESSION_STATUS.QUESTION_ACTIVE && (
          <strong>{remainingSeconds}s</strong>
        )}
      </section>

      {!sessionId && (
        <StatusBanner tone="error">Missing session ID for display page.</StatusBanner>
      )}
      {!isFirebaseConfigured && (
        <StatusBanner tone="warning">Firebase is not configured.</StatusBanner>
      )}
      {error && <StatusBanner tone="error">{error}</StatusBanner>}
      {loading && <StatusBanner>Loading session...</StatusBanner>}
      {!loading && sessionId && !session && (
        <StatusBanner tone="error">Session {sessionId} was not found.</StatusBanner>
      )}

      {session && session.status !== SESSION_STATUS.FINISHED && (
        <>
          <section className="display-status-strip">
            <span>
              Question {questionNumber} of {questions.length}
            </span>
            <span>{session.status.replaceAll("_", " ")}</span>
            <span>
              Submitted {submittedCount}/{participantCount}
            </span>
          </section>

          {session.status === SESSION_STATUS.WAITING ? (
            <section className="display-waiting">
              <h2>Next question coming up</h2>
              <p>{participantCount} participants joined</p>
            </section>
          ) : !showQuestionResults ? (
            <QuestionView
              question={currentQuestion}
              disabled
            />
          ) : null}

          {showQuestionResults && (
            <section className="display-results-grid">
              <AnswerBreakdown
                question={currentQuestion}
                responses={currentResponses}
                participantCount={participantCount}
                showCorrect={session.status === SESSION_STATUS.ANSWER_REVEALED}
              />
              <Leaderboard session={session} limit={8} title="Live Ranking" />
            </section>
          )}
        </>
      )}

      {session?.status === SESSION_STATUS.FINISHED && (
        <Leaderboard session={session} limit={10} title="Final Leaderboard" />
      )}
    </main>
  );
}
