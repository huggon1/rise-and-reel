import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { GAME_CONFIG } from "./game/config";
import { isFishOverlappingBar } from "./game/engine";
import {
  advanceMatch,
  createMatch,
  getMatchResults,
  pauseMatch,
  resumeMatch,
} from "./game/match";
import type {
  GameMode,
  LaneState,
  MatchState,
  PlayerDefinition,
} from "./game/types";

type Screen = "home" | "setup" | "game" | "results";

const PLAYER_COLORS = ["#ffcf70", "#67d5c3", "#ff8f8f", "#b6a1ff"];
const BLOCKED_BINDINGS = new Set([
  "Escape",
  "Tab",
  "Enter",
  "Backspace",
  "Delete",
  "MetaLeft",
  "MetaRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
]);

const formatKeyCode = (code: string) =>
  code
    .replace(/^Key/, "")
    .replace(/^Digit/, "")
    .replace("Arrow", " ")
    .replace("Space", "SPACE")
    .trim()
    .toUpperCase();

const initialBindings = (count: number) =>
  count === 1
    ? ["Space"]
    : Array.from<string | null>({ length: count }).fill(null);

const playersFromMatch = (match: MatchState): PlayerDefinition[] =>
  match.lanes.map(({ id, name, keyCode }) => ({ id, name, keyCode }));

const formatPercent = (rate: number) => `${Math.round(rate * 100)}%`;

function FishingLane({ lane }: { lane: LaneState }) {
  const overlap = isFishOverlappingBar(lane);
  const catchPercent = Math.round(lane.catchProgress * 100);
  const escapeWarning = lane.catchProgress <= 0.25;
  const laneStyle = {
    "--player-color": PLAYER_COLORS[lane.id - 1],
    "--fish-color": lane.fish.color,
  } as CSSProperties;

  return (
    <article className="fishing-lane" style={laneStyle}>
      <header className="lane-header">
        <div>
          <span className="player-dot" />
          <strong>{lane.name}</strong>
        </div>
        <kbd>{formatKeyCode(lane.keyCode)}</kbd>
      </header>

      <div className="lane-stats" aria-label={`${lane.name} statistics`}>
        <div>
          <span>Score</span>
          <strong>{lane.score}</strong>
        </div>
        <div>
          <span>Caught</span>
          <strong>{lane.catches}</strong>
        </div>
        <div>
          <span>Fish</span>
          <strong>{lane.fish.name}</strong>
        </div>
        <div>
          <span>Streak</span>
          <strong>{lane.streak}</strong>
        </div>
      </div>

      <div className="water-column">
        <div className="water-shimmer" />
        <div
          className={`catch-zone ${overlap ? "is-overlapping" : ""}`}
          style={{
            top: `${lane.barY * 100}%`,
            height: `${GAME_CONFIG.bar.height * 100}%`,
          }}
        >
          <span className="zone-grip" />
        </div>
        <div
          className={`fish-marker ${overlap ? "is-overlapping" : ""}`}
          style={{ top: `${lane.fishY * 100}%` }}
          aria-label={`${lane.fish.name}, ${lane.fish.difficulty} difficulty`}
        >
          <span>{lane.fish.symbol}</span>
        </div>

        {lane.phase !== "fishing" && (
          <div className={`round-result ${lane.phase}`}>
            <strong>
              {lane.phase === "caught"
                ? `Caught! +${lane.lastReward}`
                : "Escaped"}
            </strong>
            <span>Next fish incoming</span>
          </div>
        )}
      </div>

      <div className={`progress-block ${escapeWarning ? "is-warning" : ""}`}>
        <div className="progress-copy">
          <span>Catch meter</span>
          <strong>{catchPercent}%</strong>
        </div>
        <div
          className="progress-track catch-progress-track"
          role="progressbar"
          aria-label={`${lane.name} catch meter`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={catchPercent}
        >
          <span
            className="progress-fill"
            style={{ width: `${lane.catchProgress * 100}%` }}
          />
        </div>
        <div className="meter-endpoints" aria-hidden="true">
          <span>Escape</span>
          <span>Catch</span>
        </div>
      </div>
    </article>
  );
}

function ResultsScreen({
  match,
  onPlayAgain,
  onHome,
}: {
  match: MatchState;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const results = getMatchResults(match);

  return (
    <main className="screen results-screen">
      <section className="results-card">
        <p className="eyebrow">Lines up</p>
        <h2>Final standings</h2>
        <p className="results-intro">
          Sixty seconds on the water. Here is how every angler finished.
        </p>

        <div className="results-list">
          {results.map((result) => (
            <article
              className="result-row"
              key={result.playerId}
              style={
                {
                  "--player-color": PLAYER_COLORS[result.playerId - 1],
                } as CSSProperties
              }
            >
              <div className="result-place">
                <span>Rank</span>
                <strong>#{result.rank}</strong>
              </div>
              <div className="result-player">
                <span className="player-dot" />
                <strong>{result.name}</strong>
              </div>
              <dl>
                <div>
                  <dt>Score</dt>
                  <dd>{result.score}</dd>
                </div>
                <div>
                  <dt>Caught</dt>
                  <dd>{result.catches}</dd>
                </div>
                <div>
                  <dt>Escaped</dt>
                  <dd>{result.escapes}</dd>
                </div>
                <div>
                  <dt>Best streak</dt>
                  <dd>{result.maxStreak}</dd>
                </div>
                <div>
                  <dt>Overlap</dt>
                  <dd>{formatPercent(result.overlapRate)}</dd>
                </div>
                <div>
                  <dt>Catch rate</dt>
                  <dd>{formatPercent(result.catchRate)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <div className="results-actions">
          <button className="primary-button" onClick={onPlayAgain}>
            Play again
            <span aria-hidden="true">→</span>
          </button>
          <button className="text-button" onClick={onHome}>
            Return home
          </button>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameMode>("timed");
  const [playerCount, setPlayerCount] = useState(2);
  const [bindings, setBindings] = useState<(string | null)[]>(
    initialBindings(2),
  );
  const [bindingError, setBindingError] = useState("");
  const [match, setMatch] = useState<MatchState | null>(null);
  const pressedKeys = useRef(new Set<string>());

  const nextBinding = bindings.findIndex((binding) => binding === null);
  const canStart = bindings.length === playerCount && nextBinding === -1;
  const lanes = match?.lanes ?? [];
  const keySignature = lanes.map((lane) => lane.keyCode).join("|");
  const leader = useMemo(
    () =>
      lanes.length === 0
        ? null
        : lanes.reduce((best, lane) => (lane.score > best.score ? lane : best)),
    [lanes],
  );

  useEffect(() => {
    if (screen !== "setup") {
      return;
    }

    const handleBinding = (event: KeyboardEvent) => {
      if (event.repeat || BLOCKED_BINDINGS.has(event.code)) {
        return;
      }

      event.preventDefault();
      setBindings((current) => {
        const openIndex = current.findIndex((binding) => binding === null);
        if (openIndex === -1) {
          return current;
        }
        if (current.includes(event.code)) {
          setBindingError(`${formatKeyCode(event.code)} is already assigned.`);
          return current;
        }

        const updated = [...current];
        updated[openIndex] = event.code;
        setBindingError("");
        return updated;
      });
    };

    window.addEventListener("keydown", handleBinding);
    return () => window.removeEventListener("keydown", handleBinding);
  }, [screen]);

  useEffect(() => {
    if (screen !== "game") {
      return;
    }

    const codes = new Set(keySignature.split("|").filter(Boolean));
    const handleKeyDown = (event: KeyboardEvent) => {
      if (codes.has(event.code)) {
        event.preventDefault();
        pressedKeys.current.add(event.code);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (codes.has(event.code)) {
        event.preventDefault();
        pressedKeys.current.delete(event.code);
      }
    };
    const clearKeys = () => pressedKeys.current.clear();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearKeys);
      clearKeys();
    };
  }, [keySignature, screen]);

  useEffect(() => {
    if (screen !== "game" || match?.phase === "paused") {
      pressedKeys.current.clear();
      return;
    }

    let animationFrame = 0;
    let previousTime = performance.now();
    const tick = (currentTime: number) => {
      const elapsed = (currentTime - previousTime) / 1000;
      previousTime = currentTime;
      setMatch((current) =>
        current
          ? advanceMatch(current, pressedKeys.current, elapsed)
          : current,
      );
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [match?.phase, screen]);

  useEffect(() => {
    if (screen === "game" && match?.phase === "finished") {
      pressedKeys.current.clear();
      setScreen("results");
    }
  }, [match?.phase, screen]);

  const selectPlayerCount = (count: number) => {
    setPlayerCount(count);
    setBindings(initialBindings(count));
    setBindingError("");
  };

  const beginSetup = () => {
    setBindings(initialBindings(playerCount));
    setBindingError("");
    setScreen("setup");
  };

  const startGame = () => {
    if (!canStart) {
      return;
    }
    const players = bindings.map((keyCode, index) => ({
      id: index + 1,
      name: `Player ${index + 1}`,
      keyCode: keyCode!,
    }));
    setMatch(createMatch(mode, players));
    pressedKeys.current.clear();
    setScreen("game");
  };

  const restartGame = () => {
    if (!match) {
      return;
    }
    setMatch(createMatch(match.mode, playersFromMatch(match)));
    pressedKeys.current.clear();
    setScreen("game");
  };

  const returnHome = () => {
    pressedKeys.current.clear();
    setMatch(null);
    setScreen("home");
  };

  const togglePause = () => {
    setMatch((current) => {
      if (!current) {
        return current;
      }
      return current.phase === "paused"
        ? resumeMatch(current)
        : pauseMatch(current);
    });
  };

  if (screen === "home") {
    return (
      <main className="screen home-screen">
        <div className="home-glow" />
        <section className="hero-card">
          <p className="eyebrow">A same-keyboard fishing showdown</p>
          <h1>
            Reel
            <span>Rivals</span>
          </h1>
          <p className="hero-copy">
            Hold to rise. Release to fall. Stay with the fish and outscore
            everyone beside you.
          </p>
          <button className="primary-button" onClick={beginSetup}>
            Set up a game
            <span aria-hidden="true">→</span>
          </button>
          <div className="feature-row">
            <span>1–4 players</span>
            <span>60-second matches</span>
            <span>Endless practice</span>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "setup") {
    return (
      <main className="screen setup-screen">
        <section className="setup-card">
          <button className="text-button back-button" onClick={returnHome}>
            ← Back
          </button>
          <p className="eyebrow">Game setup</p>
          <h2>Bring everyone to the dock.</h2>
          <p className="setup-intro">
            Choose a mode and player count, then give every angler a key.
          </p>

          <div className="setup-section">
            <div className="section-heading">
              <span>01</span>
              <div>
                <strong>Mode</strong>
                <small>Race the clock or settle in and practice.</small>
              </div>
            </div>
            <div className="mode-picker">
              <button
                className={mode === "timed" ? "selected" : ""}
                onClick={() => setMode("timed")}
              >
                <strong>60-second score</strong>
                <small>Countdown, compete, then compare results.</small>
              </button>
              <button
                className={mode === "practice" ? "selected" : ""}
                onClick={() => setMode("practice")}
              >
                <strong>Endless practice</strong>
                <small>No timer, no standings, just keep fishing.</small>
              </button>
            </div>
          </div>

          <div className="setup-section">
            <div className="section-heading">
              <span>02</span>
              <div>
                <strong>Players</strong>
                <small>Choose how many lanes to open.</small>
              </div>
            </div>
            <div className="count-picker">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  className={playerCount === count ? "selected" : ""}
                  onClick={() => selectPlayerCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <div className="section-heading">
              <span>03</span>
              <div>
                <strong>Controls</strong>
                <small>Every player needs a different key.</small>
              </div>
            </div>
            <div>
              <div className="binding-grid">
                {bindings.map((binding, index) => (
                  <button
                    className={`binding-card ${
                      index === nextBinding ? "listening" : ""
                    }`}
                    key={index}
                    onClick={() => {
                      setBindings((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? null : value,
                        ),
                      );
                      setBindingError("");
                    }}
                    style={
                      {
                        "--player-color": PLAYER_COLORS[index],
                      } as CSSProperties
                    }
                  >
                    <span>Player {index + 1}</span>
                    <kbd>
                      {binding
                        ? formatKeyCode(binding)
                        : index === nextBinding
                          ? "PRESS A KEY"
                          : "WAITING"}
                    </kbd>
                    <small>{binding ? "Click to rebind" : "Listening…"}</small>
                  </button>
                ))}
              </div>
              <p className={`binding-message ${bindingError ? "error" : ""}`}>
                {bindingError ||
                  (canStart
                    ? playerCount === 1 && bindings[0] === "Space"
                      ? "Space is ready. Click the control card to rebind."
                      : "Everyone is ready."
                    : `Waiting for Player ${nextBinding + 1}.`)}
              </p>
            </div>
          </div>

          <button
            className="primary-button start-button"
            disabled={!canStart}
            onClick={startGame}
          >
            Start fishing
            <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    );
  }

  if (screen === "results" && match) {
    return (
      <ResultsScreen
        match={match}
        onPlayAgain={restartGame}
        onHome={returnHome}
      />
    );
  }

  if (!match) {
    return null;
  }

  const isPaused = match.phase === "paused";
  const clock =
    match.mode === "timed"
      ? `${Math.ceil(match.remainingSeconds ?? 0)}s`
      : "Practice";

  return (
    <main className="game-screen">
      <header className="game-toolbar">
        <div className="game-brand">
          <span className="brand-mark">R</span>
          <div>
            <strong>Reel Rivals</strong>
            <small>
              {leader && leader.score > 0
                ? `${leader.name} leads with ${leader.score}`
                : match.mode === "timed"
                  ? "Sixty seconds. Make every catch count."
                  : "Practice water — no score record"}
            </small>
          </div>
        </div>
        <div className="match-status" aria-live="polite">
          <span>{match.mode === "timed" ? "Time left" : "Mode"}</span>
          <strong>{clock}</strong>
        </div>
        <div className="game-actions">
          <button onClick={togglePause}>{isPaused ? "Resume" : "Pause"}</button>
          <button onClick={restartGame}>Restart</button>
          <button onClick={returnHome}>Home</button>
        </div>
      </header>

      <section
        className={`lanes-grid ${lanes.length === 1 ? "single-player" : ""}`}
        style={{ "--lane-count": lanes.length } as CSSProperties}
      >
        {lanes.map((lane) => (
          <FishingLane key={lane.id} lane={lane} />
        ))}
      </section>

      <footer className="game-footer">
        <span className="status-light" />
        Hold your key to lift. Release it to fall. Keep the fish inside your
        catch zone.
      </footer>

      {match.phase === "countdown" && (
        <div className="countdown-overlay" aria-live="assertive">
          <div>
            <p className="eyebrow">Get ready</p>
            <strong>{Math.max(1, Math.ceil(match.countdownSeconds))}</strong>
            <span>Lines drop when the count reaches zero.</span>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="pause-overlay">
          <div>
            <p className="eyebrow">Lines held</p>
            <h2>Game paused</h2>
            <button className="primary-button" onClick={togglePause}>
              Resume fishing
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
