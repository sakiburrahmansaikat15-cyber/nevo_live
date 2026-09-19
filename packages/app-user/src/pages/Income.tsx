import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiCaretDownBold as ChevronDown, PiCaretRightBold as ChevronRight, PiQuestionFill as HelpCircle } from 'react-icons/pi';
import { incomeApi } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { Loading } from '../components/ui';
import { DiamondIcon } from '../components/ui/CurrencyIcon';
import type { IncomeRange, IncomeSource, IncomeSummary } from '../api/income.api';

/**
 * Requirement #15 — tapping the Diamond opens the last-30-days income dashboard.
 *
 * `/income/summary` is specified but not built yet (API-SPEC.md). Until it
 * ships, the five source rows are derived client-side from the existing
 * `/transactions` ledger, so the screen shows real numbers rather than zeros.
 * The moment the endpoint lands it takes over — see `loadSummary`.
 */

const RANGES: { key: IncomeRange; label: string }[] = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

const SOURCE_LABELS: Record<string, string> = {
  livestream: 'Livestream',
  party: 'Party',
  commission: 'Commission',
  transfer: 'Transfer Points',
  platform_rewards: 'Platform Rewards',
};

const EMPTY_SOURCES: IncomeSource[] = Object.entries(SOURCE_LABELS).map(([key, label]) => ({
  key: key as IncomeSource['key'],
  label,
  points: 0,
}));

/** Ledger `type` → the doc's five buckets. */
const TYPE_TO_SOURCE: Record<string, IncomeSource['key']> = {
  gift_receive: 'livestream',
  commission: 'commission',
  transfer: 'transfer',
  daily_reward: 'platform_rewards',
  game_win: 'platform_rewards',
};

const rangeStart = (range: IncomeRange): number => {
  const days = range === '24h' ? 1 : range === '7d' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
};

export const Income = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [range, setRange] = useState<IncomeRange>('30d');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  /** True when the numbers came from the ledger fallback, not /income/summary. */
  const [derived, setDerived] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    /**
     * Accept the server's summary only when it actually looks like one.
     * A proxy or a stub can answer 200 with the wrong shape, and taking that
     * at face value would silently render a screen full of zeros — worse than
     * falling back to the ledger.
     */
    const loadSummary = async (): Promise<IncomeSummary | null> => {
      const res = await optional(incomeApi.getSummary(range)).catch(() => null);
      const payload = res?.data as IncomeSummary | undefined;
      if (!payload || typeof payload.available !== 'number' || !Array.isArray(payload.sources)) {
        return null;
      }
      return payload;
    };

    const loadFallback = async (): Promise<IncomeSummary> => {
      const { data } = await incomeApi.getTransactions({ limit: 200 });
      const rows = data.success ? data.data || [] : [];
      const since = rangeStart(range);

      const totals: Record<string, number> = {};
      let unconfirmed = 0;

      for (const row of rows) {
        if (row.currency !== 'diamond') continue;
        if (new Date(row.createdAt).getTime() < since) continue;
        if (row.amount <= 0) continue;

        if (row.status === 'pending') {
          unconfirmed += row.amount;
          continue;
        }
        if (row.status !== 'completed') continue;

        const key = TYPE_TO_SOURCE[row.type];
        if (!key) continue;
        totals[key] = (totals[key] || 0) + row.amount;
      }

      const available = user?.diamonds ?? 0;
      return {
        available,
        unconfirmed,
        total: available + unconfirmed,
        range,
        sources: EMPTY_SOURCES.map((s) => ({ ...s, points: totals[s.key] || 0 })),
      };
    };

    (async () => {
      try {
        const live = await loadSummary();
        if (cancelled) return;
        if (live) {
          setSummary(live);
          setDerived(false);
        } else {
          setSummary(await loadFallback());
          setDerived(true);
        }
      } catch {
        if (!cancelled) {
          setSummary({
            available: user?.diamonds ?? 0,
            unconfirmed: 0,
            total: user?.diamonds ?? 0,
            range,
            sources: EMPTY_SOURCES,
          });
          setDerived(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range, user?.diamonds]);

  const rangeLabel = useMemo(() => RANGES.find((r) => r.key === range)?.label ?? '', [range]);

  const handleExchange = async () => {
    // Needs /income/exchange — tell the user plainly rather than failing silently.
    const res = await optional(incomeApi.exchangePointsForCoins(0)).catch(() => null);
    if (res === null) showToast('Exchanging points is not available yet', 'info');
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-8">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1">Income</h1>
          <button
            onClick={() => navigate('/wallet')}
            className="text-sm font-semibold text-accent-500"
          >
            Details
          </button>
        </div>
      </header>

      {loading ? (
        <Loading className="pt-24" size="lg" />
      ) : (
        <>
          {/* ── Balance (#15A) ─────────────────────────────────────── */}
          <div className="m-3 rounded-card p-4 bg-[#FFE6F0]">
            <p className="text-xs text-ink-muted">Available Points</p>
            <p className="text-[34px] leading-tight font-bold text-ink tabular-nums">
              {(summary?.available ?? 0).toLocaleString()}
            </p>

            <div className="flex items-stretch gap-4 mt-3 pt-3 border-t border-black/5">
              <div className="flex-1">
                <p className="text-[11px] text-ink-muted">Total</p>
                <p className="text-base font-bold text-ink tabular-nums">
                  {(summary?.total ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="w-px bg-black/5" />
              <div className="flex-1">
                <p className="text-[11px] text-ink-muted flex items-center gap-1">
                  Unconfirmed
                  <span title="Points still under verification">
                    <HelpCircle className="w-3 h-3" />
                  </span>
                </p>
                <p className="text-base font-bold text-ink tabular-nums">
                  {(summary?.unconfirmed ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* ── Income by source (#15B) ────────────────────────────── */}
          <div className="mx-3 bg-white rounded-card">
            <div className="flex items-center justify-between px-4 h-14 border-b border-line">
              <h2 className="font-bold text-ink">Income</h2>
              <div className="relative">
                <button
                  onClick={() => setRangeOpen((v) => !v)}
                  className="h-8 px-3 rounded-full bg-surface-sunken text-sm text-ink-soft flex items-center gap-1"
                >
                  {rangeLabel}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {rangeOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
                    <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-xl shadow-card-hover overflow-hidden">
                      {RANGES.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => {
                            setRange(r.key);
                            setRangeOpen(false);
                          }}
                          className={`w-full h-11 px-4 text-left text-sm border-b border-line last:border-0 ${
                            r.key === range ? 'text-accent-500 font-semibold' : 'text-ink'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {(summary?.sources ?? EMPTY_SOURCES).map((source) => (
              <button
                key={source.key}
                onClick={() => navigate(`/income/${source.key}?range=${range}`)}
                className="w-full flex items-center gap-2 px-4 h-14 border-b border-line last:border-0 active:bg-surface-sunken"
              >
                <span className="flex-1 text-left text-ink">{source.label}</span>
                <DiamondIcon className="w-4 h-4 text-diamond" />
                <span className="font-semibold text-ink tabular-nums">
                  {source.points.toLocaleString()}
                </span>
                <span className="text-xs text-ink-muted">Points</span>
                <ChevronRight className="w-4 h-4 text-ink-ghost" />
              </button>
            ))}
          </div>

          {derived && (
            <p className="mx-4 mt-2 text-[11px] text-ink-faint leading-relaxed">
              Totals are calculated from your transaction history. Livestream and Party are
              reported together until the server splits them.
            </p>
          )}

          {/* ── Actions (#15C) ─────────────────────────────────────── */}
          <div className="px-3 mt-4 space-y-2.5">
            <button
              onClick={() => navigate('/withdraw-methods')}
              className="w-full h-13 py-3.5 rounded-full bg-[#FF3B7F] text-white font-bold active:scale-[0.98] transition-transform"
            >
              Withdraw Now
            </button>
            <button
              onClick={handleExchange}
              className="w-full py-3.5 rounded-full bg-white border border-[#FF3B7F] text-[#FF3B7F] font-bold active:scale-[0.98] transition-transform"
            >
              Exchange Points for Coins
            </button>
            <button
              onClick={() => navigate('/transfer')}
              className="w-full py-3.5 rounded-full bg-white border border-[#FF3B7F] text-[#FF3B7F] font-bold active:scale-[0.98] transition-transform"
            >
              Transfer
            </button>
          </div>
        </>
      )}
    </div>
  );
};
