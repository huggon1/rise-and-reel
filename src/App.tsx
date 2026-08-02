import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { GAME_CONFIG } from "./game/config";
import {
  advanceCooperativeGame,
  createCooperativeGame,
  isFishInsideCooperativeZone,
} from "./game/cooperativeEngine";
import { isFishOverlappingBar } from "./game/engine";
import {
  advanceMatch,
  createMatch,
  getMatchResults,
  pauseMatch,
  resumeMatch,
} from "./game/match";
import type {
  CooperativePlayerDefinition,
  CooperativeState,
  GameMode as MatchMode,
  LaneState,
  MatchState,
  PlayerDefinition,
} from "./game/types";

type Screen = "home" | "setup" | "game" | "results";
type PlayMode = "rivals" | "cooperative";

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

const initialRivalsBindings = (count: number) =>
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

function CooperativeBoard({ game }: { game: CooperativeState }) {
  const overlap = isFishInsideCooperativeZone(game);
  const catchPercent = Math.round(game.catchProgress * 100);
  const escapeWarning = game.catchProgress <= 0.25;
  const zone = GAME_CONFIG.cooperative.zone;
  const boardStyle = {
    "--fish-color": game.fish.color,
  } as CSSProperties;

  return (
    <section className="cooperative-layout" style={boardStyle}>
      <aside className="cooperative-sidebar">
        <p className="eyebrow">Two anglers · one catch</p>
        <h2>Coordinate the zone.</h2>
        <div className="cooperative-controls">
          {game.players.map((player) => (
            <div
              className="axis-control"
              key={player.axis}
              style={
                {
                  "--player-color": PLAYER_COLORS[player.id - 1],
                } as CSSProperties
              }
            >
              <span>{player.axis.toUpperCase()} axis</span>
              <strong>{player.name}</strong>
              <kbd>{formatKeyCode(player.keyCode)}</kbd>
              <small>
                {player.axis === "x"
                  ? "Hold right · release left"
                  : "Hold up · release down"}
              </small>
            </div>
          ))}
        </div>
        <div className="cooperative-stats">
          <div>
            <span>Team score</span>
            <strong>{game.score}</strong>
          </div>
          <div>
            <span>Caught</span>
            <strong>{game.catches}</strong>
          </div>
          <div>
            <span>Streak</span>
            <strong>{game.streak}</strong>
          </div>
          <div>
            <span>Fish</span>
            <strong>{game.fish.name}</strong>
          </div>
        </div>
      </aside>

      <div className="cooperative-play">
        <div className="water-plane">
          <div className="water-shimmer" />
          <div
            className={`cooperative-zone ${overlap ? "is-overlapping" : ""}`}
            style={{
              left: `${(game.zoneX - zone.width / 2) * 100}%`,
              top: `${(game.zoneY - zone.height / 2) * 100}%`,
              width: `${zone.width * 100}%`,
              height: `${zone.height * 100}%`,
            }}
          >
            <span className="axis-handle axis-handle-x">X</span>
            <span className="axis-handle axis-handle-y">Y</span>
          </div>
          <div
            className={`fish-marker cooperative-fish ${
              overlap ? "is-overlapping" : ""
            }`}
            style={{
              left: `${game.fishX * 100}%`,
              top: `${game.fishY * 100}%`,
            }}
            aria-label={`${game.fish.name}, ${game.fish.difficulty} difficulty`}
          >
            <span>{game.fish.symbol}</span>
          </div>

          {game.phase !== "fishing" && (
            <div className={`round-result ${game.phase}`}>
              <strong>
                {game.phase === "caught"
                  ? `Team catch! +${game.lastReward}`
                  : "The fish escaped"}
              </strong>
              <span>Next fish incoming</span>
            </div>
          )}
        </div>

        <div
          className={`progress-block cooperative-progress ${
            escapeWarning ? "is-warning" : ""
          }`}
        >
          <div className="progress-copy">
            <span>Shared catch meter</span>
            <strong>{catchPercent}%</strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Shared catch meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={catchPercent}
          >
            <span
              className="progress-fill"
              style={{ width: `${game.catchProgress * 100}%` }}
            />
          </div>
          <div className="meter-endpoints" aria-hidden="true">
            <span>Escape</span>
            <span>Catch</span>
          </div>
        </div>
      </div>
    </section>
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
  const [playMode, setPlayMode] = useState<PlayMode>("rivals");
  const [matchMode, setMatchMode] = useState<MatchMode>("timed");
  const [playerCount, setPlayerCount] = useState(2);
  const [bindings, setBindings] = useState<(string | null)[]>(
    initialRivalsBindings(2),
  );
  const [bindingError, setBindingError] = useState("");
  const [match, setMatch] = useState<MatchState | null>(null);
  const [cooperativeGame, setCooperativeGame] =
    useState<CooperativeState | null>(null);
  const [cooperativePaused, setCooperativePaused] = useState(false);
  const pressedKeys = useRef(new Set<string>());

  const nextBinding = bindings.findIndex((binding) => binding === null);
  const canStart = bindings.length === playerCount && nextBinding === -1;
  const lanes = match?.lanes ?? [];
  const keySignature =
    playMode === "cooperative"
      ? cooperativeGame?.players.map((player) => player.keyCode).join("|") ?? ""
      : lanes.map((lane) => lane.keyCode).join("|");
  const leader = useMemo(
    () =>
      lanes.length === 0
        ? null
        : lanes.reduce((best, lane) => (lane.score > best.score ? lane : best)),
    [lanes],
  );
  const isCooperativeGame =
    playMode === "cooperative" && cooperativeGame !== null;
  const isPaused = isCooperativeGame
    ? cooperativePaused
    : match?.phase === "paused";

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
    if (screen !== "game" || isPaused) {
      pressedKeys.current.clear();
      return;
    }

    let animationFrame = 0;
    let previousTime = performance.now();
    const tick = (currentTime: number) => {
      const elapsed = (currentTime - previousTime) / 1000;
      previousTime = currentTime;

      if (playMode === "cooperative") {
        setCooperativeGame((current) => {
          if (!current) {
            return current;
          }
          const xPlayer = current.players.find((player) => player.axis === "x");
          const yPlayer = current.players.find((player) => player.axis === "y");
          return advanceCooperativeGame(
            current,
            {
              xPressed: Boolean(
                xPlayer && pressedKeys.current.has(xPlayer.keyCode),
              ),
              yPressed: Boolean(
                yPlayer && pressedKeys.current.has(yPlayer.keyCode),
              ),
            },
            elapsed,
          );
        });
      } else {
        setMatch((current) =>
          current
            ? advanceMatch(current, pressedKeys.current, elapsed)
            : current,
        );
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPaused, playMode, screen]);

  useEffect(() => {
    if (
      screen === "game" &&
      playMode === "rivals" &&
      match?.phase === "finished"
    ) {
      pressedKeys.current.clear();
      setScreen("results");
    }
  }, [match?.phase, playMode, screen]);

  const selectPlayerCount = (count: number) => {
    setPlayerCount(count);
    setBindings(initialRivalsBindings(count));
    setBindingError("");
  };

  const beginSetup = (mode: PlayMode) => {
    const setupPlayerCount = mode === "cooperative" ? 2 : playerCount;
    setPlayMode(mode);
    setPlayerCount(setupPlayerCount);
    setBindings(
      mode === "cooperative"
        ? [null, null]
        : initialRivalsBindings(setupPlayerCount),
    );
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

    if (playMode === "cooperative") {
      const cooperativePlayers = players.map((player, index) => ({
        ...player,
        axis: index === 0 ? "x" : "y",
      })) as [
        CooperativePlayerDefinition,
        CooperativePlayerDefinition,
      ];
      setCooperativeGame(createCooperativeGame(cooperativePlayers));
      setMatch(null);
      setCooperativePaused(false);
    } else {
      setMatch(createMatch(matchMode, players));
      setCooperativeGame(null);
    }

    pressedKeys.current.clear();
    setScreen("game");
  };

  const restartGame = () => {
    if (isCooperativeGame) {
      setCooperativeGame(createCooperativeGame(cooperativeGame.players));
      setCooperativePaused(false);
    } else if (match) {
      setMatch(createMatch(match.mode, playersFromMatch(match)));
    }
    pressedKeys.current.clear();
    setScreen("game");
  };

  const returnHome = () => {
    pressedKeys.current.clear();
    setMatch(null);
    setCooperativeGame(null);
    setCooperativePaused(false);
    setScreen("home");
  };

  const togglePause = () => {
    if (isCooperativeGame) {
      setCooperativePaused((current) => !current);
      return;
    }
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
            Face off in independent fishing lanes, or coordinate two axes to
            land one shared catch.
          </p>
          <div className="mode-picker">
            <button className="mode-card" onClick={() => beginSetup("rivals")}>
              <span className="mode-number">01</span>
              <strong>Rivals</strong>
              <small>60-second matches or endless practice</small>
              <span aria-hidden="true">→</span>
            </button>
            <button
              className="mode-card cooperative-mode-card"
              onClick={() => beginSetup("cooperative")}
            >
              <span className="mode-number">02</span>
              <strong>Co-op</strong>
              <small>Two players · one 2D zone</small>
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="feature-row">
            <span>1–4 players</span>
            <span>One keyboard</span>
            <span>Rivals or co-op</span>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "setup") {
    const controlSectionNumber = playMode === "cooperative" ? "01" : "03";

    return (
      <main className="screen setup-screen">
        <section className="setup-card">
          <button className="text-button back-button" onClick={returnHome}>
            ← Back
          </button>
          <p className="eyebrow">
            {playMode === "cooperative" ? "Co-op setup" : "Rivals setup"}
          </p>
          <h2>
            {playMode === "cooperative"
              ? "Split the controls. Share the catch."
              : "Bring everyone to the dock."}
          </h2>
          <p className="setup-intro">
            {playMode === "cooperative"
              ? "Bind one key for each axis. Both players must coordinate to keep the moving fish inside one shared catch zone."
              : "Choose a match type and player count, then give every angler a key."}
          </p>

          {playMode === "rivals" && (
            <>
              <div className="setup-section">
                <div className="section-heading">
                  <span>01</span>
                  <div>
                    <strong>Match</strong>
                    <small>Race the clock or settle in and practice.</small>
                  </div>
                </div>
                <div className="match-mode-picker">
                  <button
                    className={matchMode === "timed" ? "selected" : ""}
                    onClick={() => setMatchMode("timed")}
                  >
                    <strong>60-second score</strong>
                    <small>Countdown, compete, then compare results.</small>
                  </button>
                  <button
                    className={matchMode === "practice" ? "selected" : ""}
                    onClick={() => setMatchMode("practice")}
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
            </>
          )}

          <div className="setup-section">
            <div className="section-heading">
              <span>{controlSectionNumber}</span>
              <div>
                <strong>Controls</strong>
                <small>
                  {playMode === "cooperative"
                    ? "One key moves each axis."
                    : "Every player needs a different key."}
                </small>
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
                    <span>
                      {playMode === "cooperative"
                        ? `Player ${index + 1} · ${
                            index === 0 ? "X axis" : "Y axis"
                          }`
                        : `Player ${index + 1}`}
                    </span>
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
                    ? playMode === "rivals" &&
                      playerCount === 1 &&
                      bindings[0] === "Space"
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

  if (!isCooperativeGame && !match) {
    return null;
  }

  const clock = isCooperativeGame
    ? "Co-op"
    : match?.mode === "timed"
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
              {isCooperativeGame
                ? cooperativeGame.score > 0
                  ? `Team score ${cooperativeGame.score}`
                  : "Two controls, one catch"
                : leader && leader.score > 0
                  ? `${leader.name} leads with ${leader.score}`
                  : match?.mode === "timed"
                    ? "Sixty seconds. Make every catch count."
                    : "Practice water — no score record"}
            </small>
          </div>
        </div>
        <div className="match-status" aria-live="polite">
          <span>
            {isCooperativeGame
              ? "Mode"
              : match?.mode === "timed"
                ? "Time left"
                : "Mode"}
          </span>
          <strong>{clock}</strong>
        </div>
        <div className="game-actions">
          <button onClick={togglePause}>{isPaused ? "Resume" : "Pause"}</button>
          <button onClick={restartGame}>Restart</button>
          <button onClick={returnHome}>Home</button>
        </div>
      </header>

      {isCooperativeGame ? (
        <CooperativeBoard game={cooperativeGame} />
      ) : (
        <section
          className={`lanes-grid ${lanes.length === 1 ? "single-player" : ""}`}
          style={{ "--lane-count": lanes.length } as CSSProperties}
        >
          {lanes.map((lane) => (
            <FishingLane key={lane.id} lane={lane} />
          ))}
        </section>
      )}

      <footer className="game-footer">
        <span className="status-light" />
        {isCooperativeGame
          ? "X holds right and releases left. Y holds up and releases down. Keep the fish inside your shared zone."
          : "Hold your key to lift. Release it to fall. Keep the fish inside your catch zone."}
      </footer>

      {!isCooperativeGame && match?.phase === "countdown" && (
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
