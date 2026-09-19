import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretRightBold as ChevronRight, PiCaretUpBold as ChevronUp, PiGiftFill as Gift, PiSparkleFill as Sparkles, PiXBold as X } from 'react-icons/pi';
import { taskApi, type TaskBoard, type TaskGroup, type TaskItem, type TaskReward } from '../api/progress.api';
import { referralApi, type ReferralTask } from '../api/social.api';
import { optional } from '../api/pending';
import { useUIStore } from '../stores';
import {
  ScreenHeader,
  TabBar,
  PillTabs,
  CountdownPill,
  EmptyState,
  HelpButton,
  SectionCard,
  PendingApiNotice,
} from '../components/common';
import { Loading } from '../components/ui';
import { CoinIcon, DiamondIcon } from '../components/ui/CurrencyIcon';

/**
 * Reward / daily tasks — requirements #30, #31, #32 and #69.
 *
 * Four screens in the documents, one task engine behind them
 * (BACKEND-GUIDE.md §4.3), so one screen here with a group switch.
 *
 * Rewards are credited on **claim**, never on progress — the button only
 * appears once the server says `state: 'claimable'`.
 */

const GROUPS: { key: TaskGroup; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'interactive', label: 'Interactive' },
  { key: 'fan_club', label: 'Fan Club' },
  { key: 'pk_mission', label: 'PK Mission' },
  { key: 'games', label: 'Games' },
];

const CURRENCY_ICON: Record<string, string> = {
  coin: '🪙',
  diamond: '💎',
  ticket: '🎟️',
  pk_flag: '🚩',
};

const RewardPill = ({ reward }: { reward: TaskReward }) => (
  <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full bg-surface-sunken text-[11px] font-bold text-ink-soft tabular-nums">
    <span>{CURRENCY_ICON[reward.currency] ?? '🎁'}</span>+{reward.amount.toLocaleString()}
  </span>
);

export const Rewards = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<'regular' | 'activity'>('regular');
  const [group, setGroup] = useState<TaskGroup>('daily');
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [claiming, setClaiming] = useState<string | null>(null);

  // #30 — the "How to invite" sheet behind the ? icon
  const [howToOpen, setHowToOpen] = useState(false);
  const [howTo, setHowTo] = useState<{ rules: { maxDailyLiveHoursCounted: number }; tasks: ReferralTask[] } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    optional(taskApi.getBoard(tab === 'activity' ? 'activity' : group))
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data?.sections)) {
          setBoard(res.data);
          setLive(true);
        } else {
          setBoard(null);
          setLive(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBoard(null);
          setLive(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, group]);

  const openHowTo = async () => {
    setHowToOpen(true);
    if (howTo) return;
    const res = await optional(referralApi.getTasks()).catch(() => null);
    if (res?.success && res.data) setHowTo(res.data);
  };

  const claim = async (task: TaskItem) => {
    setClaiming(task.key);
    try {
      const res = await optional(taskApi.claim(task.key));
      if (res === null) {
        showToast('Claiming is not available yet', 'info');
        return;
      }
      if (res.success) {
        showToast('Reward claimed', 'success');
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) => ({
                  ...s,
                  tasks: s.tasks.map((t) => (t.key === task.key ? { ...t, state: 'claimed' } : t)),
                })),
              }
            : prev
        );
      } else {
        showToast(res.error || 'Could not claim', 'error');
      }
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-24">
      <ScreenHeader title="Reward" right={<HelpButton onClick={openHowTo} />}>
        <div className="px-4">
          <TabBar
            tabs={[
              { key: 'regular', label: 'Regular' },
              { key: 'activity', label: 'Activity' },
            ]}
            active={tab}
            onChange={(k) => setTab(k as 'regular' | 'activity')}
          />
        </div>
      </ScreenHeader>

      {/* Today's earnings (#31.2) */}
      <SectionCard className="m-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-ink-muted">Today's Task Earnings</p>
          {/* Reset countdown (#31.6) — in the card, not floating over the list. */}
          {board?.resetsAt && <CountdownPill to={board.resetsAt} />}
        </div>
        <div className="flex items-stretch">
          <div className="flex-1 flex items-center gap-1.5">
            <DiamondIcon className="w-5 h-5 text-primary-500" />
            <span className="text-lg font-bold text-ink tabular-nums">
              {(board?.todayEarnings.points ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="w-px bg-line" />
          <div className="flex-1 flex items-center gap-1.5 pl-4">
            <CoinIcon className="w-5 h-5 text-coin" />
            <span className="text-lg font-bold text-ink tabular-nums">
              {(board?.todayEarnings.coins ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </SectionCard>

      {tab === 'regular' && (
        <PillTabs
          tabs={GROUPS.map((g) => ({ key: g.key, label: g.label }))}
          active={group}
          onChange={setGroup}
          className="px-4 pb-1"
        />
      )}

      {loading ? (
        <Loading className="pt-16" size="lg" />
      ) : !board || board.sections.length === 0 ? (
        <>
          <EmptyState
            icon={<Gift className="w-6 h-6" />}
            title={live ? 'No tasks right now' : 'Tasks not connected'}
            hint={live ? 'New tasks appear after the daily reset.' : undefined}
          />
          {!live && <PendingApiNotice section="§4.3" what="Daily tasks and rewards" />}
        </>
      ) : (
        <div className="px-3 pt-2 space-y-3">
          {board.sections.map((section) => {
            const isCollapsed = collapsed[section.key];
            return (
              <div key={section.key} className="bg-white rounded-card overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <span className="w-10 h-10 rounded-full bg-accent-50 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-accent-500" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-[15px] leading-snug">{section.title}</p>
                    {section.note && (
                      <p className="text-[11px] text-ink-muted mt-0.5">{section.note}</p>
                    )}
                    {section.totals && section.totals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {section.totals.map((t, i) => (
                          <RewardPill key={i} reward={t} />
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [section.key]: !c[section.key] }))
                    }
                    className="text-sm font-semibold text-accent-500 shrink-0 flex items-center gap-0.5"
                  >
                    {isCollapsed ? 'Show' : 'Hide'}
                    <ChevronUp className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {!isCollapsed && (
                  /* Dotted connector down the left, as in the reference */
                  <div className="pl-[38px] pr-4 pb-3 space-y-3 border-l-2 border-dashed border-accent-100 ml-[22px]">
                    {section.tasks.map((task) => (
                      <div key={task.key} className="flex items-start gap-3 -ml-[7px]">
                        <span className="w-3 h-3 rounded-full bg-accent-500 ring-4 ring-white mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink leading-snug">
                            {task.label}{' '}
                            <span className="text-ink-faint tabular-nums">
                              ({task.progress}/{task.target})
                            </span>
                          </p>
                          {task.note && (
                            <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">{task.note}</p>
                          )}
                          <div className="mt-1.5">
                            <RewardPill reward={task.reward} />
                          </div>
                        </div>

                        {task.state === 'claimed' ? (
                          <span className="h-8 px-3 rounded-full bg-surface-sunken text-ink-faint text-xs font-semibold flex items-center shrink-0">
                            Done
                          </span>
                        ) : task.state === 'claimable' ? (
                          <button
                            onClick={() => claim(task)}
                            disabled={claiming === task.key}
                            className="h-8 px-4 rounded-full bg-black text-white text-xs font-bold shrink-0 disabled:opacity-50"
                          >
                            {claiming === task.key ? '…' : 'Claim'}
                          </button>
                        ) : (
                          <button
                            onClick={() => task.goTo && navigate(task.goTo)}
                            className="h-8 px-3.5 rounded-full bg-accent-50 text-accent-600 text-xs font-bold shrink-0 flex items-center gap-0.5"
                          >
                            GO <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* #30 — How to Invite bottom sheet */}
      {howToOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHowToOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-sheet max-h-[85vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
              <h3 className="text-base font-bold text-ink">How to Invite</h3>
              <button onClick={() => setHowToOpen(false)} aria-label="Close" className="text-ink-muted p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <div>
                <h4 className="font-bold text-[#F97316] mb-1.5">How to Invite</h4>
                <ul className="text-sm text-ink-soft space-y-1 list-disc list-inside leading-relaxed">
                  <li>Your friend downloads the app using your link and registers.</li>
                  <li>They enter your User ID during registration.</li>
                  <li>Only first-time registered users count.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#F97316] mb-1.5">How to earn rewards</h4>
                <ul className="text-sm text-ink-soft space-y-1 list-disc list-inside leading-relaxed">
                  <li>You earn once the invitee completes face authentication and the tasks.</li>
                  <li>
                    A new host's live time counts at most{' '}
                    <strong>{howTo?.rules.maxDailyLiveHoursCounted ?? 2} hours per day</strong> toward
                    these tasks — going live for 5 hours still counts as 2.
                  </li>
                </ul>
              </div>

              {howTo?.tasks?.length ? (
                <div className="rounded-card overflow-hidden border border-line">
                  <div className="flex items-center h-10 px-3 bg-[#FFF8E0] text-xs font-bold text-ink">
                    <span className="flex-1">Task</span>
                    <span>Reward</span>
                  </div>
                  {howTo.tasks.map((task, i) => (
                    <div
                      key={task.key}
                      className={`flex items-center h-11 px-3 text-sm ${i % 2 ? 'bg-surface-soft' : 'bg-white'}`}
                    >
                      <span className="flex-1 text-ink-soft">{task.label}</span>
                      <span className="font-bold text-ink tabular-nums flex items-center gap-1">
                        🪙 {task.reward.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <PendingApiNotice section="§4.4" what="The task and reward table" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
