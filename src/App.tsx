import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { GAME_CONFIG } from "./game/config";
import { isFishOverlappingBar } from "./game/engine";
import { createLogicalInput, playerControlId } from "./game/input";
import {
  cancelGroupExit,
  confirmGroupExit,
  pauseFishingSession,
  requestGroupExit,
  resumeFishingSession,
  type SessionPauseReason,
} from "./game/session";
import type { FishId, LaneState } from "./game/types";
import {
  advanceMultiplayerGame,
  createMultiplayerGame,
  type MultiplayerGameState,
} from "./multiplayer/game";
import { advanceSoloGame, createSoloGame, type SoloGameState } from "./solo/game";
import {
  cleanupKnownLegacyStorage,
  loadPreferences,
  savePreferences,
  type Language,
} from "./solo/preferences";
import {
  createSoloHistoryRepository,
  type SoloHistory,
  type SoloSessionRecord,
} from "./solo/storage";

type Screen =
  | "home"
  | "setup"
  | "game"
  | "summary"
  | "history"
  | "multiplayer-setup"
  | "multiplayer-game";
type SaveState = "idle" | "saving" | "saved" | "error";
type PendingAction = "finish" | "restart" | null;

const PLAYER_COLORS = ["#ffcf70", "#67d5c3", "#ff8f8f", "#b6a1ff"];

const EMPTY_HISTORY: SoloHistory = {
  sessions: [],
  bestScore: 0,
  lifetimeScore: 0,
};

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

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const createSessionId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const fishNames: Record<FishId, { en: string; zh: string }> = {
  carp: { en: "Carp", zh: "鲤鱼" },
  bass: { en: "Bass", zh: "鲈鱼" },
  catfish: { en: "Catfish", zh: "鲶鱼" },
  squid: { en: "Squid", zh: "鱿鱼" },
};

function MultiplayerLane({
  lane,
  keyCode,
  language,
}: {
  lane: LaneState;
  keyCode: string;
  language: Language;
}) {
  const overlap = isFishOverlappingBar(lane);
  const catchPercent = Math.round(lane.catchProgress * 100);
  const localizedPlayer =
    language === "en" ? `Player ${lane.id}` : `玩家 ${lane.id}`;
  const style = {
    "--player-color": PLAYER_COLORS[lane.id - 1],
    "--fish-color": lane.fish.color,
  } as CSSProperties;

  return (
    <article className="multiplayer-lane" style={style}>
      <header>
        <span><i />{localizedPlayer}</span>
        <kbd>{formatKeyCode(keyCode)}</kbd>
      </header>
      <div className="multiplayer-stats">
        <span>{language === "en" ? "Score" : "得分"}<strong>{lane.score}</strong></span>
        <span>{language === "en" ? "Caught" : "捕获"}<strong>{lane.catches}</strong></span>
        <span>{language === "en" ? "Escaped" : "逃脱"}<strong>{lane.escapes}</strong></span>
      </div>
      <div className="multiplayer-water">
        <div className="water-lines" />
        <div
          className={`catch-zone ${overlap ? "overlap" : ""}`}
          style={{
            top: `${lane.barY * 100}%`,
            height: `${GAME_CONFIG.bar.height * 100}%`,
          }}
        ><span /></div>
        <div
          className={`fish-marker ${overlap ? "overlap" : ""}`}
          style={{ top: `${lane.fishY * 100}%` }}
          aria-label={fishNames[lane.fish.id][language]}
        >{lane.fish.symbol}</div>
        {lane.phase !== "fishing" && (
          <div className={`round-callout ${lane.phase}`}>
            <strong>
              {lane.phase === "caught"
                ? language === "en"
                  ? `Caught! +${lane.lastReward}`
                  : `捕获！+${lane.lastReward}`
                : language === "en" ? "Escaped" : "逃脱"}
            </strong>
          </div>
        )}
      </div>
      <div className="multiplayer-meter">
        <span>{language === "en" ? "Catch meter" : "捕获进度"}</span>
        <strong>{catchPercent}%</strong>
        <div
          className="meter-track"
          role="progressbar"
          aria-label={`${localizedPlayer} ${language === "en" ? "catch meter" : "捕获进度"}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={catchPercent}
        ><span style={{ width: `${catchPercent}%` }} /></div>
      </div>
    </article>
  );
}

export default function App() {
  const initialPreferences = useMemo(() => {
    cleanupKnownLegacyStorage(window.localStorage);
    return loadPreferences(window.localStorage);
  }, []);
  const historyRepository = useMemo(
    () => createSoloHistoryRepository(window.localStorage),
    [],
  );
  const [language, setLanguage] = useState<Language>(
    initialPreferences.language,
  );
  const [keyCode, setKeyCode] = useState(initialPreferences.keyCode);
  const [screen, setScreen] = useState<Screen>("home");
  const [isBinding, setIsBinding] = useState(false);
  const [game, setGame] = useState<SoloGameState | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [summary, setSummary] = useState<SoloSessionRecord | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [history, setHistory] = useState<SoloHistory>(EMPTY_HISTORY);
  const [isBest, setIsBest] = useState(false);
  const [multiplayerCount, setMultiplayerCount] = useState(2);
  const [multiplayerBindings, setMultiplayerBindings] = useState<
    (string | null)[]
  >([null, null]);
  const [multiplayerBindingError, setMultiplayerBindingError] = useState("");
  const [multiplayerGame, setMultiplayerGame] =
    useState<MultiplayerGameState | null>(null);
  const [multiplayerPendingAction, setMultiplayerPendingAction] =
    useState<PendingAction>(null);
  const pressedKeys = useRef(new Set<string>());
  const sessionIdentity = useRef<{ id: string; startedAt: Date } | null>(null);

  const tr = useCallback(
    (english: string, chinese: string) =>
      language === "en" ? english : chinese,
    [language],
  );

  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    document.title = tr("Rise & Reel · Local Fishing", "Rise & Reel · 本地钓鱼");
    try {
      savePreferences(window.localStorage, { language, keyCode });
    } catch {
      // Preferences are optional and never block play.
    }
  }, [keyCode, language, tr]);

  useEffect(() => {
    if (screen !== "setup" || !isBinding) return;
    const bind = (event: KeyboardEvent) => {
      if (event.repeat || BLOCKED_BINDINGS.has(event.code)) return;
      event.preventDefault();
      setKeyCode(event.code);
      setIsBinding(false);
    };
    window.addEventListener("keydown", bind);
    return () => window.removeEventListener("keydown", bind);
  }, [isBinding, screen]);

  useEffect(() => {
    if (screen !== "multiplayer-setup") return;
    const bind = (event: KeyboardEvent) => {
      if (event.repeat || BLOCKED_BINDINGS.has(event.code)) return;
      const openIndex = multiplayerBindings.findIndex(
        (binding) => binding === null,
      );
      if (openIndex === -1) return;
      event.preventDefault();
      if (multiplayerBindings.includes(event.code)) {
        setMultiplayerBindingError(
          tr(
            `${formatKeyCode(event.code)} is already assigned.`,
            `${formatKeyCode(event.code)} 已被绑定。`,
          ),
        );
        return;
      }
      setMultiplayerBindings((current) =>
        current.map((binding, index) =>
          index === openIndex ? event.code : binding,
        ),
      );
      setMultiplayerBindingError("");
    };
    window.addEventListener("keydown", bind);
    return () => window.removeEventListener("keydown", bind);
  }, [multiplayerBindings, screen, tr]);

  const interruptSession = useCallback((reason: SessionPauseReason) => {
    pressedKeys.current.clear();
    setGame((current) =>
      current
        ? { ...current, session: pauseFishingSession(current.session, reason) }
        : current,
    );
  }, []);

  const interruptMultiplayerSession = useCallback(
    (reason: SessionPauseReason) => {
      pressedKeys.current.clear();
      setMultiplayerGame((current) =>
        current
          ? {
              ...current,
              session: pauseFishingSession(current.session, reason),
            }
          : current,
      );
    },
    [],
  );

  useEffect(() => {
    if (screen !== "game") return;
    const down = (event: KeyboardEvent) => {
      if (event.code !== keyCode) return;
      event.preventDefault();
      pressedKeys.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== keyCode) return;
      event.preventDefault();
      pressedKeys.current.delete(event.code);
    };
    const blur = () => interruptSession("window-blur");
    const visibility = () => {
      if (document.hidden) interruptSession("page-hidden");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      pressedKeys.current.clear();
    };
  }, [interruptSession, keyCode, screen]);

  const multiplayerKeySignature = multiplayerBindings.join("|");
  useEffect(() => {
    if (screen !== "multiplayer-game") return;
    const codes = new Set(multiplayerBindings.filter(Boolean) as string[]);
    const down = (event: KeyboardEvent) => {
      if (!codes.has(event.code)) return;
      event.preventDefault();
      pressedKeys.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => {
      if (!codes.has(event.code)) return;
      event.preventDefault();
      pressedKeys.current.delete(event.code);
    };
    const blur = () => interruptMultiplayerSession("window-blur");
    const visibility = () => {
      if (document.hidden) interruptMultiplayerSession("page-hidden");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      pressedKeys.current.clear();
    };
  }, [
    interruptMultiplayerSession,
    multiplayerBindings,
    multiplayerKeySignature,
    screen,
  ]);

  const phase = game?.session.phase;
  useEffect(() => {
    if (screen !== "game" || (phase !== "countdown" && phase !== "active")) {
      return;
    }
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - previous) / 1000;
      previous = now;
      setGame((current) => {
        if (!current) return current;
        const input = createLogicalInput(
          pressedKeys.current.has(keyCode) ? [playerControlId(1)] : [],
        );
        return advanceSoloGame(current, input, elapsed);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [keyCode, phase, screen]);

  const multiplayerPhase = multiplayerGame?.session.phase;
  useEffect(() => {
    if (
      screen !== "multiplayer-game" ||
      (multiplayerPhase !== "countdown" && multiplayerPhase !== "active")
    ) {
      return;
    }
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - previous) / 1000;
      previous = now;
      setMultiplayerGame((current) => {
        if (!current) return current;
        const controls = multiplayerBindings.flatMap((binding, index) =>
          binding && pressedKeys.current.has(binding)
            ? [playerControlId(index + 1)]
            : [],
        );
        return advanceMultiplayerGame(
          current,
          createLogicalInput(controls),
          elapsed,
        );
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [multiplayerBindings, multiplayerPhase, screen]);

  const beginSession = useCallback(() => {
    sessionIdentity.current = { id: createSessionId(), startedAt: new Date() };
    pressedKeys.current.clear();
    setGame(createSoloGame());
    setSummary(null);
    setSaveState("idle");
    setIsBest(false);
    setPendingAction(null);
    setScreen("game");
  }, [keyCode]);

  const beginMultiplayerSession = useCallback(() => {
    if (multiplayerBindings.some((binding) => binding === null)) return;
    const players = multiplayerBindings.map((_, index) => ({
      id: index + 1,
      name: `Player ${index + 1}`,
    }));
    pressedKeys.current.clear();
    setMultiplayerGame(createMultiplayerGame(players));
    setMultiplayerPendingAction(null);
    setScreen("multiplayer-game");
  }, [multiplayerBindings]);

  const selectMultiplayerCount = (count: number) => {
    setMultiplayerCount(count);
    setMultiplayerBindings(Array.from({ length: count }, () => null));
    setMultiplayerBindingError("");
  };

  const loadHistory = useCallback(async () => {
    setHistory(await historyRepository.read());
  }, [historyRepository]);

  const saveSummary = useCallback(
    async (record: SoloSessionRecord) => {
      setSaveState("saving");
      try {
        await historyRepository.save(record);
        const updated = await historyRepository.read();
        setHistory(updated);
        setIsBest(record.score > 0 && record.score === updated.bestScore);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [historyRepository],
  );

  const askTo = (action: Exclude<PendingAction, null>) => {
    setPendingAction(action);
    setGame((current) =>
      current
        ? { ...current, session: requestGroupExit(current.session) }
        : current,
    );
  };

  const cancelConfirmation = () => {
    setPendingAction(null);
    setGame((current) =>
      current
        ? { ...current, session: cancelGroupExit(current.session) }
        : current,
    );
  };

  const confirmAction = () => {
    if (!game || !pendingAction) return;
    if (pendingAction === "restart") {
      beginSession();
      return;
    }

    const endedSession = confirmGroupExit(game.session);
    const identity = sessionIdentity.current;
    if (!identity) return;
    const record: SoloSessionRecord = {
      id: identity.id,
      startedAt: identity.startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      activeDurationMs: Math.round(endedSession.activeSeconds * 1000),
      score: game.lane.score,
      catches: game.lane.catches,
      escapes: game.lane.escapes,
      maxStreak: game.lane.maxStreak,
    };
    setGame({ ...game, session: endedSession });
    setSummary(record);
    setPendingAction(null);
    setScreen("summary");
    void saveSummary(record);
  };

  const showHistory = () => {
    void loadHistory();
    setScreen("history");
  };

  const navHome = () => {
    if (screen === "game") {
      askTo("finish");
    } else if (screen === "multiplayer-game") {
      setMultiplayerPendingAction("finish");
      setMultiplayerGame((current) =>
        current
          ? { ...current, session: requestGroupExit(current.session) }
          : current,
      );
    } else {
      setScreen("home");
    }
  };

  const askMultiplayerTo = (action: Exclude<PendingAction, null>) => {
    setMultiplayerPendingAction(action);
    setMultiplayerGame((current) =>
      current
        ? { ...current, session: requestGroupExit(current.session) }
        : current,
    );
  };

  const cancelMultiplayerConfirmation = () => {
    setMultiplayerPendingAction(null);
    setMultiplayerGame((current) =>
      current
        ? { ...current, session: cancelGroupExit(current.session) }
        : current,
    );
  };

  const confirmMultiplayerAction = () => {
    if (!multiplayerGame || !multiplayerPendingAction) return;
    if (multiplayerPendingAction === "restart") {
      beginMultiplayerSession();
      return;
    }
    pressedKeys.current.clear();
    setMultiplayerGame(null);
    setMultiplayerPendingAction(null);
    setScreen("home");
  };

  const navItems = [
    { id: "home" as const, label: tr("Home", "首页"), action: navHome },
    {
      id: "setup" as const,
      label: tr("Solo Fishing", "单人钓鱼"),
      action: () =>
        screen === "game"
          ? askTo("restart")
          : screen === "multiplayer-game"
            ? askMultiplayerTo("finish")
            : setScreen("setup"),
    },
    {
      id: "multiplayer-setup" as const,
      label: tr("Multiplayer", "多人模式"),
      action: () =>
        screen === "game"
          ? askTo("finish")
          : screen === "multiplayer-game"
            ? askMultiplayerTo("restart")
            : setScreen("multiplayer-setup"),
    },
    {
      id: "history" as const,
      label: tr("History", "历史"),
      action: () =>
        screen === "game"
          ? askTo("finish")
          : screen === "multiplayer-game"
            ? askMultiplayerTo("finish")
            : showHistory(),
    },
  ];

  const activeNav =
    screen === "summary"
      ? "setup"
      : screen === "multiplayer-game"
        ? "multiplayer-setup"
        : screen;
  const lane = game?.lane;
  const overlap = lane ? isFishOverlappingBar(lane) : false;
  const catchPercent = lane ? Math.round(lane.catchProgress * 100) : 0;

  return (
    <main className="tide-shell">
      <aside className="tide-rail">
        <button className="brand-lockup" onClick={navHome} aria-label="Rise & Reel">
          <span className="brand-mark">R</span>
          <span><strong>Rise & Reel</strong><small>{tr("Tide Map", "潮汐地图")}</small></span>
        </button>
        <nav aria-label={tr("Primary navigation", "主导航")}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={activeNav === item.id ? "active" : ""}
              onClick={item.action}
            >
              <span />{item.label}
            </button>
          ))}
        </nav>
        <div className="rail-note">
          <span>{tr("LOCAL WATERS", "本地水域")}</span>
          <p>{tr("Your sessions stay in this browser.", "你的钓鱼会话仅保存在当前浏览器。")}</p>
          <a
            href="https://github.com/huggon1/rise-and-reel"
            target="_blank"
            rel="noreferrer"
          >
            {tr("GitHub repository ↗", "GitHub 仓库 ↗")}
          </a>
        </div>
      </aside>

      <section className="tide-main">
        <header className="topline">
          <div className="status-dot">{tr("LOCAL WATERS OPEN", "本地水域开放")}</div>
          <div className="language-switch" aria-label={tr("Language", "语言")}>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
            <button className={language === "zh" ? "active" : ""} onClick={() => setLanguage("zh")}>中文</button>
          </div>
        </header>

        {screen === "home" && (
          <section className="content home-view">
            <div className="hero-copy">
              <p className="eyebrow">{tr("YOUR TIDE, YOUR PACE", "跟随自己的潮汐")}</p>
              <h1>{tr("Settle in. Keep the line moving.", "坐稳，抛线，慢慢钓。")}</h1>
              <p>{tr("One key. No clock. Catch what you can, then end the session when you are ready.", "一个按键，不限时间。想钓多久就钓多久，准备好时再结束会话。")}</p>
              <div className="action-row">
                <button className="primary-action" onClick={() => setScreen("setup")}>{tr("Set up Solo Fishing", "设置单人钓鱼")} <span>→</span></button>
                <button className="secondary-action" onClick={() => setScreen("multiplayer-setup")}>{tr("Play with 2–4 people", "2–4 人一起玩")}</button>
                <button className="quiet-action" onClick={showHistory}>{tr("View history", "查看历史")}</button>
              </div>
            </div>
            <div className="tide-cards">
              <article><span>01</span><strong>{tr("Bind one key", "绑定一个按键")}</strong><p>{tr("Hold to rise. Release to fall.", "按住上升，松开下落。")}</p></article>
              <article><span>02</span><strong>{tr("Fish without a limit", "不限时钓鱼")}</strong><p>{tr("Pause whenever the water needs to wait.", "需要离开时，随时暂停。")}</p></article>
              <article><span>03</span><strong>{tr("Leave together", "整组离开")}</strong><p>{tr("Confirm the end and keep a local summary.", "确认结束，并在本地保存总结。")}</p></article>
            </div>
          </section>
        )}

        {screen === "setup" && (
          <section className="content setup-view">
            <div className="page-heading"><p className="eyebrow">{tr("SOLO SETUP", "单人设置")}</p><h1>{tr("Choose your reel key.", "选择你的收线按键。")}</h1><p>{tr("This setting stays in your browser for the next session.", "此设置会保存在当前浏览器，供下次使用。")}</p></div>
            <div className="setup-grid">
              <button className={`key-binding ${isBinding ? "listening" : ""}`} onClick={() => setIsBinding(true)}>
                <span>{tr("REEL CONTROL", "收线控制")}</span>
                <kbd>{isBinding ? tr("PRESS A KEY", "请按键") : formatKeyCode(keyCode)}</kbd>
                <small>{tr("Click to change", "点击更改")}</small>
              </button>
              <article className="how-card"><strong>{tr("How the line moves", "鱼线如何移动")}</strong><p>{tr("Hold your key to lift the catch zone. Release it and gravity pulls the zone down.", "按住按键让捕获区上升；松开后，重力会让捕获区下落。")}</p><span>{tr("A short preparation count appears before the water starts.", "水域开始前会显示短暂准备倒计时。")}</span></article>
            </div>
            <div className="action-row"><button className="primary-action" onClick={beginSession}>{tr("Start fishing", "开始钓鱼")} <span>→</span></button><button className="secondary-action" onClick={() => setScreen("home")}>{tr("Back home", "返回首页")}</button></div>
          </section>
        )}

        {screen === "multiplayer-setup" && (
          <section className="content setup-view">
            <div className="page-heading">
              <p className="eyebrow">{tr("MULTIPLAYER SETUP", "多人设置")}</p>
              <h1>{tr("Bring everyone to the dock.", "叫上大家，一起来码头。")}</h1>
              <p>{tr("Choose 2–4 players, then press one unique reel key for each person.", "选择 2–4 名玩家，然后依次为每个人按下一个不同的收线键。")}</p>
            </div>
            <div className="multiplayer-setup-card">
              <div className="player-count-picker" aria-label={tr("Player count", "玩家人数")}>
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    className={multiplayerCount === count ? "selected" : ""}
                    onClick={() => selectMultiplayerCount(count)}
                  >
                    <strong>{count}</strong>
                    <span>{tr(count === 2 ? "players" : "players", "人")}</span>
                  </button>
                ))}
              </div>
              <div className="multiplayer-bindings">
                {multiplayerBindings.map((binding, index) => {
                  const nextBinding = multiplayerBindings.findIndex(
                    (value) => value === null,
                  );
                  return (
                    <button
                      key={index}
                      className={index === nextBinding ? "listening" : ""}
                      style={{ "--player-color": PLAYER_COLORS[index] } as CSSProperties}
                      onClick={() => {
                        setMultiplayerBindings((current) =>
                          current.map((value, itemIndex) =>
                            itemIndex === index ? null : value,
                          ),
                        );
                        setMultiplayerBindingError("");
                      }}
                    >
                      <span>{tr(`Player ${index + 1}`, `玩家 ${index + 1}`)}</span>
                      <kbd>{binding ? formatKeyCode(binding) : index === nextBinding ? tr("PRESS A KEY", "请按键") : tr("WAITING", "等待中")}</kbd>
                      <small>{binding ? tr("Click to rebind", "点击重新绑定") : tr("One unique key each", "每人使用不同按键")}</small>
                    </button>
                  );
                })}
              </div>
              <p className={`binding-feedback ${multiplayerBindingError ? "error" : ""}`} role="status">
                {multiplayerBindingError ||
                  (multiplayerBindings.every(Boolean)
                    ? tr("Everyone is ready.", "所有人都准备好了。")
                    : tr(
                        `Waiting for Player ${multiplayerBindings.findIndex((binding) => binding === null) + 1}.`,
                        `等待玩家 ${multiplayerBindings.findIndex((binding) => binding === null) + 1} 按键。`,
                      ))}
              </p>
            </div>
            <div className="action-row">
              <button className="primary-action" disabled={multiplayerBindings.some((binding) => binding === null)} onClick={beginMultiplayerSession}>{tr("Start multiplayer", "开始多人游戏")} <span>→</span></button>
              <button className="secondary-action" onClick={() => setScreen("home")}>{tr("Back home", "返回首页")}</button>
            </div>
          </section>
        )}

        {screen === "multiplayer-game" && multiplayerGame && (
          <section className="game-view multiplayer-game-view">
            <div className="game-toolbar">
              <div><p className="eyebrow">{tr("MULTIPLAYER", "多人模式")}</p><strong>{formatDuration(multiplayerGame.session.activeSeconds * 1000)}</strong><small>{tr("active time", "有效时长")}</small></div>
              <div className="game-actions">
                <button onClick={() => setMultiplayerGame({ ...multiplayerGame, session: multiplayerGame.session.phase === "paused" ? resumeFishingSession(multiplayerGame.session) : pauseFishingSession(multiplayerGame.session) })}>{multiplayerGame.session.phase === "paused" ? tr("Resume", "继续") : tr("Pause", "暂停")}</button>
                <button onClick={() => askMultiplayerTo("restart")}>{tr("Restart", "重新开始")}</button>
                <button className="danger" onClick={() => askMultiplayerTo("finish")}>{tr("End match", "结束比赛")}</button>
              </div>
            </div>
            <div className={`multiplayer-board players-${multiplayerGame.lanes.length}`}>
              {multiplayerGame.lanes.map((multiplayerLane, index) => (
                <MultiplayerLane
                  key={multiplayerLane.id}
                  lane={multiplayerLane}
                  keyCode={multiplayerBindings[index]!}
                  language={language}
                />
              ))}
            </div>
            {multiplayerGame.session.phase === "countdown" && <div className="modal-backdrop countdown" role="status"><div className="countdown-card"><p>{tr("GET READY", "准备")}</p><strong>{Math.max(1, Math.ceil(multiplayerGame.session.countdownSeconds))}</strong><span>{tr("Every lane opens when the count reaches zero.", "倒计时归零后，所有赛道同时开始。")}</span></div></div>}
            {multiplayerGame.session.phase === "paused" && <div className="modal-backdrop"><div className="modal-card"><p className="eyebrow">{tr("LINES HELD", "鱼线已停")}</p><h2>{multiplayerGame.session.pauseReason === "manual" ? tr("Match paused", "比赛已暂停") : tr("Welcome back", "欢迎回来")}</h2><p>{tr("Every lane and the active timer are stopped.", "所有赛道和有效计时均已暂停。")}</p><button className="primary-action" onClick={() => setMultiplayerGame({ ...multiplayerGame, session: resumeFishingSession(multiplayerGame.session) })}>{tr("Resume match", "继续比赛")}</button></div></div>}
            {multiplayerGame.session.phase === "confirming-exit" && <div className="modal-backdrop"><div className="modal-card"><p className="eyebrow">{tr("CONFIRM ACTION", "确认操作")}</p><h2>{multiplayerPendingAction === "restart" ? tr("Start over?", "重新开始？") : tr("End this match?", "结束本场比赛？")}</h2><p>{multiplayerPendingAction === "restart" ? tr("Every player's current score will be discarded.", "所有玩家的当前得分都会被放弃。") : tr("The match ends for everyone. Multiplayer results are not saved to Solo History.", "比赛将为所有玩家结束；多人结果不会保存到单人历史。")}</p><div className="action-row"><button className="primary-action" onClick={confirmMultiplayerAction}>{multiplayerPendingAction === "restart" ? tr("Restart now", "立即重新开始") : tr("End match", "结束比赛")}</button><button className="secondary-action" onClick={cancelMultiplayerConfirmation}>{tr("Keep fishing", "继续钓鱼")}</button></div></div></div>}
          </section>
        )}

        {screen === "game" && game && lane && (
          <section className="game-view">
            <div className="game-toolbar">
              <div><p className="eyebrow">{tr("SOLO FISHING", "单人钓鱼")}</p><strong>{formatDuration(game.session.activeSeconds * 1000)}</strong><small>{tr("active time", "有效时长")}</small></div>
              <div className="game-actions">
                <button onClick={() => game.session.phase === "paused" ? setGame({ ...game, session: resumeFishingSession(game.session) }) : setGame({ ...game, session: pauseFishingSession(game.session) })}>{game.session.phase === "paused" ? tr("Resume", "继续") : tr("Pause", "暂停")}</button>
                <button onClick={() => askTo("restart")}>{tr("Restart", "重新开始")}</button>
                <button className="danger" onClick={() => askTo("finish")}>{tr("End session", "结束会话")}</button>
              </div>
            </div>
            <div className="solo-board">
              <aside className="session-stats">
                <div><span>{tr("Session score", "会话得分")}</span><strong>{lane.score}</strong></div>
                <div><span>{tr("Caught", "捕获")}</span><strong>{lane.catches}</strong></div>
                <div><span>{tr("Escaped", "逃脱")}</span><strong>{lane.escapes}</strong></div>
                <div><span>{tr("Best streak", "最佳连击")}</span><strong>{lane.maxStreak}</strong></div>
                <div className="fish-now"><span>{tr("In the water", "当前鱼种")}</span><strong>{fishNames[lane.fish.id][language]}</strong><i style={{ background: lane.fish.color }} /></div>
              </aside>
              <div className="water-wrap">
                <div className="water-column" style={{ "--fish-color": lane.fish.color } as CSSProperties}>
                  <div className="water-lines" />
                  <div className={`catch-zone ${overlap ? "overlap" : ""}`} style={{ top: `${lane.barY * 100}%`, height: `${GAME_CONFIG.bar.height * 100}%` }}><span /></div>
                  <div className={`fish-marker ${overlap ? "overlap" : ""}`} style={{ top: `${lane.fishY * 100}%` }} aria-label={fishNames[lane.fish.id][language]}>{lane.fish.symbol}</div>
                  {lane.phase !== "fishing" && <div className={`round-callout ${lane.phase}`}><strong>{lane.phase === "caught" ? tr(`Caught! +${lane.lastReward}`, `捕获！+${lane.lastReward}`) : tr("Escaped", "逃脱")}</strong></div>}
                </div>
                <div className="catch-meter"><div><span>{tr("Catch meter", "捕获进度")}</span><strong>{catchPercent}%</strong></div><div className="meter-track"><span style={{ width: `${catchPercent}%` }} /></div><small><kbd>{formatKeyCode(keyCode)}</kbd> {tr("hold to rise · release to fall", "按住上升 · 松开下落")}</small></div>
              </div>
            </div>
            {game.session.phase === "countdown" && <div className="modal-backdrop countdown" role="status"><div className="countdown-card"><p>{tr("GET READY", "准备")}</p><strong>{Math.max(1, Math.ceil(game.session.countdownSeconds))}</strong><span>{tr("The water opens when the count reaches zero.", "倒计时归零后水域开启。")}</span></div></div>}
            {game.session.phase === "paused" && <div className="modal-backdrop"><div className="modal-card"><p className="eyebrow">{tr("LINES HELD", "鱼线已停")}</p><h2>{game.session.pauseReason === "manual" ? tr("Session paused", "会话已暂停") : tr("Welcome back", "欢迎回来")}</h2><p>{tr("Fishing and active time are stopped. Resume when you are ready.", "钓鱼进度和有效时长均已停止，准备好后再继续。")}</p><button className="primary-action" onClick={() => setGame({ ...game, session: resumeFishingSession(game.session) })}>{tr("Resume fishing", "继续钓鱼")}</button></div></div>}
            {game.session.phase === "confirming-exit" && <div className="modal-backdrop"><div className="modal-card"><p className="eyebrow">{tr("CONFIRM ACTION", "确认操作")}</p><h2>{pendingAction === "restart" ? tr("Start over?", "重新开始？") : tr("End this session?", "结束本次会话？")}</h2><p>{pendingAction === "restart" ? tr("Current progress will be discarded and a fresh preparation count will begin.", "当前进度将被放弃，并重新开始准备倒计时。") : tr("We will save this session and show its summary, even if no fish were caught.", "我们会保存本次会话并显示总结，即使没有捕获任何鱼。")}</p><div className="action-row"><button className="primary-action" onClick={confirmAction}>{pendingAction === "restart" ? tr("Restart now", "立即重新开始") : tr("End and save", "结束并保存")}</button><button className="secondary-action" onClick={cancelConfirmation}>{tr("Keep fishing", "继续钓鱼")}</button></div></div></div>}
          </section>
        )}

        {screen === "summary" && summary && (
          <section className="content summary-view">
            <div className="page-heading"><p className="eyebrow">{tr("SESSION SUMMARY", "会话总结")}</p><h1>{isBest ? tr("A new personal best.", "新的个人最佳。") : tr("The tide settles.", "潮水渐平。")}</h1><p>{tr("Your completed Solo Fishing session is ready.", "你的单人钓鱼会话已经完成。")}</p></div>
            <div className="summary-grid">
              <article><span>{tr("Active time", "有效时长")}</span><strong>{formatDuration(summary.activeDurationMs)}</strong></article>
              <article><span>{tr("Session score", "会话得分")}</span><strong>{summary.score}</strong></article>
              <article><span>{tr("Caught", "捕获")}</span><strong>{summary.catches}</strong></article>
              <article><span>{tr("Escaped", "逃脱")}</span><strong>{summary.escapes}</strong></article>
              <article><span>{tr("Best streak", "最佳连击")}</span><strong>{summary.maxStreak}</strong></article>
            </div>
            <div className={`save-notice ${saveState}`} role="status">{saveState === "saving" ? tr("Saving locally…", "正在保存到本地…") : saveState === "saved" ? tr("Saved in this browser.", "已保存到当前浏览器。") : saveState === "error" ? tr("Could not save. Your summary is still here.", "保存失败，但总结仍保留在这里。") : ""}{saveState === "error" && <button onClick={() => void saveSummary(summary)}>{tr("Retry save", "重试保存")}</button>}</div>
            <div className="action-row"><button className="primary-action" onClick={beginSession}>{tr("Play again", "再次游玩")} <span>→</span></button><button className="secondary-action" onClick={showHistory}>{tr("View history", "查看历史")}</button><button className="quiet-action" onClick={() => setScreen("home")}>{tr("Home", "首页")}</button></div>
          </section>
        )}

        {screen === "history" && (
          <section className="content history-view">
            <div className="page-heading"><p className="eyebrow">{tr("SOLO HISTORY", "单人历史")}</p><h1>{tr("Your local waters.", "你的本地水域。")}</h1><p>{tr("Completed sessions saved in this browser. Latest 100 shown.", "当前浏览器保存的已完成会话，显示最近 100 条。")}</p></div>
            <div className="history-totals"><article><span>{tr("Personal best", "个人最佳")}</span><strong>{history.bestScore}</strong></article><article><span>{tr("Lifetime score", "累计得分")}</span><strong>{history.lifetimeScore}</strong></article><article><span>{tr("Sessions kept", "保留会话")}</span><strong>{history.sessions.length}</strong></article></div>
            {history.sessions.length === 0 ? <div className="empty-state"><strong>{tr("No completed sessions yet.", "还没有已完成会话。")}</strong><p>{tr("Finish a Solo Fishing session and it will appear here.", "完成一次单人钓鱼后，它会出现在这里。")}</p><button className="primary-action" onClick={() => setScreen("setup")}>{tr("Set up Solo Fishing", "设置单人钓鱼")}</button></div> : <div className="history-list">{history.sessions.map((item) => <article key={item.id}><time>{new Intl.DateTimeFormat(language === "en" ? "en" : "zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.endedAt))}</time><strong>{item.score}</strong><span>{formatDuration(item.activeDurationMs)}</span><span>{tr(`${item.catches} caught`, `捕获 ${item.catches}`)}</span><span>{tr(`Streak ${item.maxStreak}`, `连击 ${item.maxStreak}`)}</span></article>)}</div>}
          </section>
        )}
      </section>
    </main>
  );
}
