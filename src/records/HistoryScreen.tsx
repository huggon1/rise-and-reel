import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTrendPoints,
  summarizeSingleRuns,
  type TrendMetric,
} from "./analytics";
import type { RunRepository } from "./repository";
import type { GameRun, PersonalBest } from "./types";

type HistoryTab = "single" | "multiplayer";
type PlayerCountFilter = "all" | 2 | 3 | 4;

const METRIC_LABELS: Record<TrendMetric, string> = {
  score: "Score",
  overlapRate: "Overlap",
  catchRate: "Catch rate",
};

const formatPercent = (rate: number) => `${Math.round(rate * 100)}%`;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatMetric = (metric: TrendMetric, value: number) =>
  metric === "score" ? Math.round(value).toString() : formatPercent(value);

function TrendChart({ runs }: { runs: GameRun[] }) {
  const [metric, setMetric] = useState<TrendMetric>("score");
  const points = useMemo(() => getTrendPoints(runs, metric), [metric, runs]);
  const width = 640;
  const height = 220;
  const padding = 28;
  const values = points.map((point) => point.value);
  const maximum = Math.max(...values, 1);
  const minimum = Math.min(...values, 0);
  const range = Math.max(maximum - minimum, 1);
  const coordinates = points.map((point, index) => ({
    ...point,
    x:
      points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2),
    y:
      height -
      padding -
      ((point.value - minimum) / range) * (height - padding * 2),
  }));

  return (
    <section className="trend-panel" aria-labelledby="trend-title">
      <div className="history-section-heading">
        <div>
          <span>Recent form</span>
          <h3 id="trend-title">Last {Math.min(20, runs.length)} matches</h3>
        </div>
        <div className="metric-picker" aria-label="Trend metric">
          {(Object.keys(METRIC_LABELS) as TrendMetric[]).map((item) => (
            <button
              className={metric === item ? "selected" : ""}
              key={item}
              onClick={() => setMetric(item)}
            >
              {METRIC_LABELS[item]}
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <p className="history-empty compact">Finish a solo score match to start your trend.</p>
      ) : (
        <>
          <div className="trend-chart-wrap">
            <svg
              className="trend-chart"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`${METRIC_LABELS[metric]} trend for the last ${points.length} solo matches`}
            >
              {[0, 1, 2, 3].map((line) => {
                const y = padding + (line / 3) * (height - padding * 2);
                return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} />;
              })}
              {coordinates.length > 1 && (
                <polyline
                  points={coordinates.map(({ x, y }) => `${x},${y}`).join(" ")}
                />
              )}
              {coordinates.map(({ runId, x, y }) => (
                <circle key={runId} cx={x} cy={y} r="5" />
              ))}
            </svg>
          </div>
          <ol className="trend-data-list" aria-label="Trend data points">
            {points.map((point) => (
              <li key={point.runId}>
                <span>{formatDate(point.endedAt)}</span>
                <strong>{formatMetric(metric, point.value)}</strong>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function SingleHistory({
  runs,
  personalBest,
  onClear,
}: {
  runs: GameRun[];
  personalBest: PersonalBest | null;
  onClear: () => void;
}) {
  const summary = useMemo(() => summarizeSingleRuns(runs), [runs]);

  return (
    <>
      <section className="history-summary" aria-label="Solo summary">
        <div><span>Saved matches</span><strong>{summary.savedRuns}</strong></div>
        <div><span>Personal best</span><strong>{personalBest?.score ?? 0}</strong></div>
        <div><span>Average score</span><strong>{Math.round(summary.averageScore)}</strong></div>
        <div><span>Average overlap</span><strong>{formatPercent(summary.averageOverlapRate)}</strong></div>
        <div><span>Average catch rate</span><strong>{formatPercent(summary.averageCatchRate)}</strong></div>
        <div><span>Highest streak</span><strong>{summary.highestStreak}</strong></div>
      </section>

      {personalBest && !runs.some((run) => run.id === personalBest.runId) && (
        <p className="best-note">
          Your {personalBest.score}-point personal best is preserved, although its full match record has aged out of local history.
        </p>
      )}

      <TrendChart runs={runs} />

      <section className="history-list-section">
        <div className="history-section-heading">
          <div><span>Match log</span><h3>Solo history</h3></div>
          <button className="danger-button" disabled={runs.length === 0 && !personalBest} onClick={onClear}>
            Clear solo records
          </button>
        </div>
        {runs.length === 0 ? (
          <p className="history-empty">No solo score matches saved yet.</p>
        ) : (
          <div className="run-list">
            {runs.map((run) => {
              const result = run.players[0];
              return (
                <article className="run-row" key={run.id}>
                  <div className="run-date"><strong>{formatDate(run.endedAt)}</strong><span>60-second score</span></div>
                  <dl>
                    <div><dt>Score</dt><dd>{result.score}</dd></div>
                    <div><dt>Caught</dt><dd>{result.catches}</dd></div>
                    <div><dt>Escaped</dt><dd>{result.escapes}</dd></div>
                    <div><dt>Best streak</dt><dd>{result.maxStreak}</dd></div>
                    <div><dt>Overlap</dt><dd>{formatPercent(result.overlapRate)}</dd></div>
                    <div><dt>Catch rate</dt><dd>{formatPercent(result.catchRate)}</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function MultiplayerHistory({
  runs,
  hasAnyRuns,
  filter,
  onFilter,
  onClear,
}: {
  runs: GameRun[];
  hasAnyRuns: boolean;
  filter: PlayerCountFilter;
  onFilter: (filter: PlayerCountFilter) => void;
  onClear: () => void;
}) {
  return (
    <section className="history-list-section multiplayer-history">
      <div className="history-section-heading">
        <div><span>Head to head</span><h3>Multiplayer matches</h3></div>
        <button className="danger-button" disabled={!hasAnyRuns} onClick={onClear}>
          Clear multiplayer records
        </button>
      </div>
      <div className="player-filter" aria-label="Filter by player count">
        {(["all", 2, 3, 4] as PlayerCountFilter[]).map((item) => (
          <button className={filter === item ? "selected" : ""} key={item} onClick={() => onFilter(item)}>
            {item === "all" ? "All" : `${item}P`}
          </button>
        ))}
      </div>

      {runs.length === 0 ? (
        <p className="history-empty">No multiplayer matches for this filter.</p>
      ) : (
        <div className="versus-list">
          {runs.map((run) => {
            const winners = run.players.filter((player) => player.rank === 1);
            const winnerCopy = winners.length > 1
              ? `Tie: ${winners.map((player) => player.name).join(" & ")}`
              : `${winners[0].name} wins`;
            return (
              <details className="versus-row" key={run.id}>
                <summary>
                  <div><strong>{winnerCopy}</strong><span>{formatDate(run.endedAt)} · {run.playerCount} players</span></div>
                  <div className="versus-scores">
                    {run.players.map((player) => <span key={player.playerId}>{player.name} <strong>{player.score}</strong></span>)}
                  </div>
                  <span className="details-hint">Details</span>
                </summary>
                <div className="versus-details">
                  {run.players.map((player) => (
                    <article key={player.playerId}>
                      <header><strong>#{player.rank} · {player.name}</strong><span>{player.score} pts</span></header>
                      <dl>
                        <div><dt>Caught</dt><dd>{player.catches}</dd></div>
                        <div><dt>Escaped</dt><dd>{player.escapes}</dd></div>
                        <div><dt>Streak</dt><dd>{player.maxStreak}</dd></div>
                        <div><dt>Overlap</dt><dd>{formatPercent(player.overlapRate)}</dd></div>
                        <div><dt>Catch rate</dt><dd>{formatPercent(player.catchRate)}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function HistoryScreen({
  repository,
  onHome,
}: {
  repository: RunRepository;
  onHome: () => void;
}) {
  const [tab, setTab] = useState<HistoryTab>("single");
  const [filter, setFilter] = useState<PlayerCountFilter>("all");
  const [singleRuns, setSingleRuns] = useState<GameRun[]>([]);
  const [multiplayerRuns, setMultiplayerRuns] = useState<GameRun[]>([]);
  const [personalBest, setPersonalBest] = useState<PersonalBest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [single, multiplayer, best] = await Promise.all([
        repository.listRuns({ category: "single" }),
        repository.listRuns({ category: "multiplayer" }),
        repository.getPersonalBest(),
      ]);
      setSingleRuns(single);
      setMultiplayerRuns(multiplayer);
      setPersonalBest(best);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredMultiplayer = useMemo(
    () => multiplayerRuns.filter((run) => filter === "all" || run.playerCount === filter),
    [filter, multiplayerRuns],
  );

  const clearCategory = async (category: HistoryTab) => {
    const label = category === "single" ? "solo history and personal best" : "multiplayer history";
    if (!window.confirm(`Clear ${label}? This cannot be undone.`)) {
      return;
    }
    try {
      await repository.clear(category);
      await refresh();
    } catch {
      setLoadError(true);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Clear every saved match and personal best? Game settings will be kept.")) {
      return;
    }
    try {
      await repository.clear();
      await refresh();
    } catch {
      setLoadError(true);
    }
  };

  return (
    <main className="history-screen">
      <header className="history-toolbar">
        <button className="text-button" onClick={onHome}>← Home</button>
        <div className="game-brand"><span className="brand-mark">R</span><div><strong>Reel Rivals</strong><small>Local records</small></div></div>
        <button className="danger-button" disabled={singleRuns.length === 0 && multiplayerRuns.length === 0 && !personalBest} onClick={clearAll}>
          Clear all records
        </button>
      </header>

      <section className="history-card">
        <p className="eyebrow">Your waters</p>
        <h2>Match history</h2>
        <p className="history-intro">Records stay in this browser. Solo form and local rivalries remain separate.</p>
        <div className="history-tabs" role="tablist" aria-label="History type">
          <button role="tab" aria-selected={tab === "single"} className={tab === "single" ? "selected" : ""} onClick={() => setTab("single")}>Solo records</button>
          <button role="tab" aria-selected={tab === "multiplayer"} className={tab === "multiplayer" ? "selected" : ""} onClick={() => setTab("multiplayer")}>Multiplayer matches</button>
        </div>

        {loading ? (
          <p className="history-empty">Loading local records…</p>
        ) : loadError ? (
          <p className="history-empty">Local records are unavailable. You can still return home and play.</p>
        ) : tab === "single" ? (
          <SingleHistory runs={singleRuns} personalBest={personalBest} onClear={() => void clearCategory("single")} />
        ) : (
          <MultiplayerHistory runs={filteredMultiplayer} hasAnyRuns={multiplayerRuns.length > 0} filter={filter} onFilter={setFilter} onClear={() => void clearCategory("multiplayer")} />
        )}
      </section>
    </main>
  );
}
