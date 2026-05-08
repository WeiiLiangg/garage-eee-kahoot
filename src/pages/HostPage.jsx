import { useEffect, useMemo, useRef, useState } from "react";
import { isFirebaseConfigured } from "../config/firebase.js";
import { SESSION_STATUS, LOCAL_STORAGE_KEYS } from "../config/constants.js";
import { questions } from "../config/quiz.js";
import { createSessionId } from "../lib/ids.js";
import { downloadResultsCsv } from "../lib/resultsExport.js";
import {
  createQuizSession,
  endQuestion,
  finishQuiz,
  listenToSession,
  moveToQuestion,
  revealCurrentQuestion,
  startQuestion,
} from "../lib/session.js";
import Leaderboard from "../components/Leaderboard.jsx";
import QuestionView from "../components/QuestionView.jsx";
import QRCodePanel from "../components/QRCodePanel.jsx";
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

export default function HostPage() {
  const params = new URLSearchParams(window.location.search);
  const initialSessionId =
    params.get("session") || localStorage.getItem(LOCAL_STORAGE_KEYS.HOST_SESSION) || "";
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialSessionId));
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const autoEndedQuestionRef = useRef("");

  const currentQuestion = questions[session?.currentQuestionIndex || 0];
  const remainingSeconds = useCountdown(session, currentQuestion);
  const joinUrl = useMemo(() => {
    if (!sessionId) {
      return "";
    }

    return `${window.location.origin}/play?session=${sessionId}`;
  }, [sessionId]);
  const displayUrl = useMemo(() => {
    if (!sessionId) {
      return "";
    }

    return `${window.location.origin}/display?session=${sessionId}`;
  }, [sessionId]);

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

  useEffect(() => {
    if (
      !sessionId ||
      !session?.questionStartTime ||
      session.status !== SESSION_STATUS.QUESTION_ACTIVE ||
      !currentQuestion
    ) {
      return undefined;
    }

    const questionKey = `${sessionId}-${currentQuestion.id}-${session.questionStartTime}`;
    const durationMs = currentQuestion.durationSeconds * 1000;
    const elapsedMs = Date.now() - session.questionStartTime;
    const delayMs = Math.max(0, durationMs - elapsedMs) + 250;

    const timer = window.setTimeout(async () => {
      if (autoEndedQuestionRef.current === questionKey) {
        return;
      }

      autoEndedQuestionRef.current = questionKey;
      setBusyAction("auto-end");
      setError("");

      try {
        await endQuestion(sessionId);
        setMessage("Question ended automatically.");
      } catch (autoEndError) {
        setError(autoEndError.message);
      } finally {
        setBusyAction("");
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    sessionId,
    session?.questionStartTime,
    session?.status,
    currentQuestion,
  ]);

  async function runAction(label, action) {
    setBusyAction(label);
    setError("");
    setMessage("");

    try {
      await action();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateSession() {
    await runAction("create", async () => {
      const nextSessionId = createSessionId();
      await createQuizSession(nextSessionId);
      localStorage.setItem(LOCAL_STORAGE_KEYS.HOST_SESSION, nextSessionId);
      window.history.replaceState(null, "", `/host?session=${nextSessionId}`);
      setSessionId(nextSessionId);
      setMessage("Session created. Share the join link when ready.");
    });
  }

  async function handleNewSession() {
    const confirmed = window.confirm(
      "Create a new session? The current session will remain in Firebase, but this host page will switch to a fresh quiz."
    );

    if (!confirmed) {
      return;
    }

    setSession(null);
    await handleCreateSession();
  }

  async function handleRevealAnswer() {
    const confirmed = window.confirm(
      "Reveal the answer and calculate scores for this question?"
    );

    if (!confirmed) {
      return;
    }

    await runAction("reveal", () => revealCurrentQuestion(sessionId));
  }

  async function handleFinishQuiz() {
    const confirmed = window.confirm(
      "Finish the quiz now? The final leaderboard will be shown."
    );

    if (!confirmed) {
      return;
    }

    await runAction("finish", () => finishQuiz(sessionId));
  }

  async function copyJoinLink() {
    if (!joinUrl) {
      return;
    }

    await navigator.clipboard.writeText(joinUrl);
    setMessage("Join link copied.");
  }

  async function copyDisplayLink() {
    if (!displayUrl) {
      return;
    }

    await navigator.clipboard.writeText(displayUrl);
    setMessage("Display link copied.");
  }

  function exportResults() {
    downloadResultsCsv(sessionId, session);
    setMessage("Results CSV downloaded.");
  }

  function participantCount() {
    return Object.keys(session?.participants || {}).length;
  }

  function submittedCount() {
    if (!currentQuestion) {
      return 0;
    }

    return Object.keys(session?.responses?.[currentQuestion.id] || {}).length;
  }

  const questionNumber = (session?.currentQuestionIndex || 0) + 1;
  const isLastQuestion = questionNumber >= questions.length;
  const totalParticipants = participantCount();
  const totalSubmitted = submittedCount();

  return (
    <main className="app-shell host-layout">
      <section className="top-bar">
        <div>
          <p className="eyebrow">Garage@EEE Innovation Festival 2026</p>
          <h1>Host Console</h1>
        </div>
        <a className="ghost-link" href="/">
          Home
        </a>
      </section>

      {!isFirebaseConfigured && (
        <StatusBanner tone="warning">
          Firebase is not configured. Create `.env` from `.env.example` before running a live quiz.
        </StatusBanner>
      )}
      <StatusBanner tone="success">{message}</StatusBanner>
      <StatusBanner tone="error">{error}</StatusBanner>

      {!sessionId && (
        <section className="panel setup-panel">
          <h2>Create a quiz session</h2>
          <p className="muted">
            This creates one Firebase session for the event. Players join using the link shown after creation.
          </p>
          <button
            className="primary-button"
            type="button"
            disabled={!isFirebaseConfigured || busyAction === "create"}
            onClick={handleCreateSession}
          >
            {busyAction === "create" ? "Creating..." : "Create Session"}
          </button>
        </section>
      )}

      {sessionId && loading && <StatusBanner>Loading session...</StatusBanner>}

      {sessionId && !loading && !session && (
        <section className="panel setup-panel">
          <h2>Session not found</h2>
          <p className="muted">
            Create a new session, or check that the session ID in the URL is correct.
          </p>
          <button className="primary-button" type="button" onClick={handleCreateSession}>
            Create New Session
          </button>
        </section>
      )}

      {session && (
        <>
          <section className="host-grid">
            <section className="panel session-panel">
              <div className="panel-header">
                <h2>Session {sessionId}</h2>
                <span>{totalParticipants} joined</span>
              </div>
              <QRCodePanel value={joinUrl} label={`Session ${sessionId}`} />
              <div className="join-link-box">
                <span>Player link</span>
                <strong>{joinUrl}</strong>
              </div>
              <button className="secondary-button" type="button" onClick={copyJoinLink}>
                Copy Join Link
              </button>
            </section>

            <section className="panel controls-panel">
              <div className="panel-header">
                <h2>Controls</h2>
                <span>{session.status.replaceAll("_", " ")}</span>
              </div>
              <div className="host-stats">
                <div>
                  <span>Joined</span>
                  <strong>{totalParticipants}</strong>
                </div>
                <div>
                  <span>Submitted</span>
                  <strong>
                    {totalSubmitted}/{totalParticipants}
                  </strong>
                </div>
              </div>
              <div className="control-buttons">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={handleNewSession}
                >
                  New Session
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={copyDisplayLink}
                >
                  Copy Display Link
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  disabled={Boolean(busyAction) || totalParticipants === 0}
                  onClick={exportResults}
                >
                  Export CSV
                </button>

                {session.status === SESSION_STATUS.WAITING && (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() =>
                      runAction("start", () =>
                        startQuestion(sessionId, session.currentQuestionIndex || 0)
                      )
                    }
                  >
                    Start Question
                  </button>
                )}

                {session.status === SESSION_STATUS.QUESTION_ACTIVE && (
                  <button
                    className="danger-button"
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => runAction("end", () => endQuestion(sessionId))}
                  >
                    End Question
                  </button>
                )}

                {session.status === SESSION_STATUS.QUESTION_ENDED && (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={handleRevealAnswer}
                  >
                    Reveal Answer & Scores
                  </button>
                )}

                {session.status === SESSION_STATUS.ANSWER_REVEALED && !isLastQuestion && (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() =>
                      runAction("next", () =>
                        moveToQuestion(sessionId, (session.currentQuestionIndex || 0) + 1)
                      )
                    }
                  >
                    Next Question
                  </button>
                )}

                {session.status === SESSION_STATUS.ANSWER_REVEALED && isLastQuestion && (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={handleFinishQuiz}
                  >
                    Finish Quiz
                  </button>
                )}
              </div>
            </section>
          </section>

          <section className="display-panel">
            <div className="question-meta">
              <span>
                Question {questionNumber} of {questions.length}
              </span>
              {session.status === SESSION_STATUS.QUESTION_ACTIVE && (
                <span>
                  Submitted {totalSubmitted}/{totalParticipants}
                </span>
              )}
              {session.status === SESSION_STATUS.QUESTION_ACTIVE && (
                <strong>{remainingSeconds}s</strong>
              )}
            </div>

            {session.status === SESSION_STATUS.FINISHED ? (
              <Leaderboard session={session} limit={10} title="Final Leaderboard" />
            ) : (
              <>
                <QuestionView
                  question={currentQuestion}
                  disabled
                  showCorrect={session.status === SESSION_STATUS.ANSWER_REVEALED}
                />
                {(session.status === SESSION_STATUS.ANSWER_REVEALED ||
                  session.status === SESSION_STATUS.QUESTION_ENDED) && (
                  <Leaderboard session={session} limit={10} />
                )}
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
