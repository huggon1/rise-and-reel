import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { GAME_CONFIG } from "./game/config";
import { advanceLane, createLane } from "./game/engine";
import type { LaneState, PlayerDefinition } from "./game/types";

type Screen = "home" | "setup" | "game";

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

const playerFromLane = (lane: LaneState): PlayerDefinition => ({
  id: lane.id,
  name: lane.name,
  keyCode: lane.keyCode,
});

function FishingLane({ lane }: { lane: LaneState }) {
  const overlap =
    lane.fishY >= lane.barY &&
    lane.fishY <= lane.barY + GAME_CONFIG.bar.height;
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
          <span>Reward</span>
          <strong>+{lane.fish.score}</strong>
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

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [playerCount, setPlayerCount] = useState(2);
  const [bindings, setBindings] = useState<(string | null)[]>([null, null]);
  const [bindingError, setBindingError] = useState("");
  const [lanes, setLanes] = useState<LaneState[]>([]);
  const [paused, setPaused] = useState(false);
  const pressedKeys = useRef(new Set<string>());

  const nextBinding = bindings.findIndex((binding) => binding === null);
  const canStart = bindings.length === playerCount && nextBinding === -1;
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
    if (screen !== "game" || paused) {
      pressedKeys.current.clear();
      return;
    }

    let animationFrame = 0;
    let previousTime = performance.now();
    const tick = (currentTime: number) => {
      const elapsed = (currentTime - previousTime) / 1000;
      previousTime = currentTime;
      setLanes((current) =>
        current.map((lane) =>
          advanceLane(
            lane,
            pressedKeys.current.has(lane.keyCode),
            elapsed,
          ),
        ),
      );
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [paused, screen]);

  const selectPlayerCount = (count: number) => {
    setPlayerCount(count);
    setBindings(Array.from({ length: count }, () => null));
    setBindingError("");
  };

  const beginSetup = () => {
    setBindings(Array.from({ length: playerCount }, () => null));
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
    setLanes(players.map((player) => createLane(player)));
    setPaused(false);
    setScreen("game");
  };

  const restartGame = () => {
    setLanes((current) =>
      current.map((lane) => createLane(playerFromLane(lane))),
    );
    setPaused(false);
  };

  const returnHome = () => {
    pressedKeys.current.clear();
    setPaused(false);
    setScreen("home");
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
            <span>One keyboard</span>
            <span>Endless rounds</span>
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
            Pick a player count, then have each player press the key they want
            to hold while fishing.
          </p>

          <div className="setup-section">
            <div className="section-heading">
              <span>01</span>
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
              <span>02</span>
              <div>
                <strong>Controls</strong>
                <small>Every player needs a different key.</small>
              </div>
            </div>
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
                  ? "Everyone is ready."
                  : `Waiting for Player ${nextBinding + 1}.`)}
            </p>
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
                : "The lake is wide open"}
            </small>
          </div>
        </div>
        <div className="game-actions">
          <button onClick={() => setPaused((current) => !current)}>
            {paused ? "Resume" : "Pause"}
          </button>
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

      {paused && (
        <div className="pause-overlay">
          <div>
            <p className="eyebrow">Lines held</p>
            <h2>Game paused</h2>
            <button
              className="primary-button"
              onClick={() => setPaused(false)}
            >
              Resume fishing
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
