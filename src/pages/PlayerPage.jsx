import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "../config/firebase.js";
import { SESSION_STATUS, LOCAL_STORAGE_KEYS } from "../config/constants.js";
import { questions } from "../config/quiz.js";
import { createParticipantId } from "../lib/ids.js";
import { joinQuizSession, listenToSession, submitAnswer } from "../lib/session.js";
import JoinPanel from "../components/JoinPanel.jsx";
import QuestionView from "../components/QuestionView.jsx";
import StatusBanner from "../components/StatusBanner.jsx";

function storageKey(sessionId) {
  return `${LOCAL_STORAGE_KEYS.PLAYER_PREFIX}-${sessionId}`;
}

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

export default function PlayerPage() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session")?.trim().toUpperCase() || "";
  const [participantId, setParticipantId] = useState(() =>
    sessionId ? localStorage.getItem(storageKey(sessionId)) : ""
  );
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [joinBusy, setJoinBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState("");

  const currentQuestion = questions[session?.currentQuestionIndex || 0];
  const currentResponse =
    session?.responses?.[currentQuestion?.id || ""]?.[participantId] || null;
  const participant = session?.participants?.[participantId];
  const hasJoined = Boolean(participant);
  const remainingSeconds = useCountdown(session, currentQuestion);

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

  async function handleJoin(nickname) {
    setJoinBusy(true);
    setError("");

    try {
      const nextParticipantId = participantId || createParticipantId();
      await joinQuizSession(sessionId, nextParticipantId, nickname);
      localStorage.setItem(storageKey(sessionId), nextParticipantId);
      setParticipantId(nextParticipantId);
    } catch (joinError) {
      setError(joinError.message);
    } finally {
      setJoinBusy(false);
    }
  }

  async function handleAnswer(answerIndex) {
    if (!participantId || currentResponse || submitBusy) {
      return;
    }

    setSubmitBusy(true);
    setError("");

    try {
      await submitAnswer(sessionId, participantId, answerIndex);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitBusy(false);
    }
  }

  if (!sessionId) {
    return (
      <main className="app-shell player-shell">
        <StatusBanner tone="error">Missing session ID. Use the link from the host.</StatusBanner>
      </main>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <main className="app-shell player-shell">
        <StatusBanner tone="warning">
          Firebase is not configured yet. Ask the host to finish setup.
        </StatusBanner>
      </main>
    );
  }

  return (
    <main className="app-shell player-shell">
      <StatusBanner tone="error">{error}</StatusBanner>

      {loading && <StatusBanner>Loading session...</StatusBanner>}

      {!loading && !session && (
        <StatusBanner tone="error">
          Session {sessionId} was not found. Check the link with the host.
        </StatusBanner>
      )}

      {session && !hasJoined && (
        <JoinPanel sessionId={sessionId} onJoin={handleJoin} busy={joinBusy} />
      )}

      {session && hasJoined && (
        <>
          <section className="player-header">
            <div>
              <p className="eyebrow">Session {sessionId}</p>
              <h1>{participant.nickname}</h1>
            </div>
            <strong>{participant.totalScore || 0} pts</strong>
          </section>

          {session.status === SESSION_STATUS.WAITING && (
            <section className="state-card">
              <h2>Get ready</h2>
              <p>The host will start the next question soon.</p>
            </section>
          )}

          {session.status === SESSION_STATUS.QUESTION_ACTIVE && (
            <>
              <div className="timer-pill">{remainingSeconds}s</div>
              <QuestionView
                question={currentQuestion}
                disabled={submitBusy || Boolean(currentResponse) || remainingSeconds <= 0}
                submittedAnswerIndex={currentResponse?.answerIndex}
                onAnswer={handleAnswer}
              />
              {currentResponse && (
                <section className="state-card compact">
                  <h2>Answer submitted</h2>
                  <p>Wait for the host to reveal the answer.</p>
                </section>
              )}
              {!currentResponse && remainingSeconds <= 0 && (
                <section className="state-card compact">
                  <h2>Time is up</h2>
                  <p>Waiting for the host to close the question.</p>
                </section>
              )}
            </>
          )}

          {session.status === SESSION_STATUS.QUESTION_ENDED && (
            <section className="state-card">
              <h2>Time is up</h2>
              <p>Waiting for the answer reveal.</p>
            </section>
          )}

          {session.status === SESSION_STATUS.ANSWER_REVEALED && (
            <>
              <QuestionView
                question={currentQuestion}
                disabled
                submittedAnswerIndex={currentResponse?.answerIndex}
                showCorrect
              />
              <section className="state-card compact">
                {currentResponse ? (
                  <>
                    <h2>{currentResponse.isCorrect ? "Correct" : "Not this time"}</h2>
                    <p>
                      You scored {currentResponse.score || 0} points on this question.
                    </p>
                  </>
                ) : (
                  <>
                    <h2>No answer submitted</h2>
                    <p>You scored 0 points on this question.</p>
                  </>
                )}
              </section>
            </>
          )}

          {session.status === SESSION_STATUS.FINISHED && (
            <section className="state-card">
              <h2>Quiz finished</h2>
              <p>Your final score is {participant.totalScore || 0} points.</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
