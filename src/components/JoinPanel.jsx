import { useState } from "react";

export default function JoinPanel({ sessionId, onJoin, busy }) {
  const [nickname, setNickname] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!nickname.trim()) {
      return;
    }

    onJoin(nickname.trim());
  }

  return (
    <section className="join-card">
      <p className="eyebrow">Session {sessionId}</p>
      <h1>Join the Festival Quiz</h1>
      <form onSubmit={handleSubmit} className="join-form">
        <label htmlFor="nickname">Nickname</label>
        <input
          id="nickname"
          autoComplete="nickname"
          maxLength={24}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Your name"
        />
        <button className="primary-button" type="submit" disabled={busy || !nickname.trim()}>
          {busy ? "Joining..." : "Join Quiz"}
        </button>
      </form>
    </section>
  );
}
