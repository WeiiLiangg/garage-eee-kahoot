import HostPage from "./pages/HostPage.jsx";
import PlayerPage from "./pages/PlayerPage.jsx";
import DisplayPage from "./pages/DisplayPage.jsx";
import { isFirebaseConfigured } from "./config/firebase.js";

function HomePage() {
  return (
    <main className="app-shell home-screen">
      <section className="hero-panel">
        <p className="eyebrow">Garage@EEE Innovation Festival 2026</p>
        <h1>Festival Quiz</h1>
        <p className="lede">
          A lightweight speed-scored quiz for annual review engagement.
        </p>
        {!isFirebaseConfigured && (
          <p className="setup-warning">
            Firebase is not configured yet. Add a `.env` file before running a
            live session.
          </p>
        )}
        <div className="home-actions">
          <a className="primary-link" href="/host">
            Open Host Page
          </a>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const path = window.location.pathname;

  if (path.startsWith("/host")) {
    return <HostPage />;
  }

  if (path.startsWith("/play")) {
    return <PlayerPage />;
  }

  if (path.startsWith("/display")) {
    return <DisplayPage />;
  }

  return <HomePage />;
}
