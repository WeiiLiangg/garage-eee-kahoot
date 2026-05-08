import { buildLeaderboard } from "../lib/scoring.js";

export default function Leaderboard({ session, limit = 10, title = "Leaderboard" }) {
  const leaderboard = buildLeaderboard(session).slice(0, limit);

  return (
    <section className="panel leaderboard-panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <span>{leaderboard.length} shown</span>
      </div>

      {leaderboard.length === 0 ? (
        <p className="muted">No participants yet.</p>
      ) : (
        <ol className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <li key={entry.participantId}>
              <span className="rank">{index + 1}</span>
              <span className="leader-name">{entry.nickname}</span>
              <strong>{entry.totalScore}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
