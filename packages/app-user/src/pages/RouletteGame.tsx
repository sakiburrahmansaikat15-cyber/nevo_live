import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiClockCounterClockwiseFill as History, PiGearFill as Settings, PiUsersFill as Users } from 'react-icons/pi';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores';
import { useRoulette, RouletteProvider } from '../game/roulette/context';
import {
  Wheel,
  Ball,
  Board,
  ChipPicker,
  BettingTimer,
  MyBets,
  ResultOverlay,
  HistoryPanel,
  StatsPanel,
  SettingsPanel,
  FloatingActions,
  WinEffects,
  WinBadge,
  RecentNumbers,
} from '../game/roulette/components';
import type { PlacedBet } from '../game/roulette/components';
import type { RouletteBetType } from '../types/roulette';
import { useSpinAnimation } from '../game/roulette/hooks/useSpinAnimation';
import { useBallAnimation } from '../game/roulette/hooks/useBallAnimation';
import { useKeyboardBetting } from '../game/roulette/hooks/useKeyboardBetting';
import { useSound } from '../game/roulette/hooks/useSound';
import { betKey } from '../game/roulette/components/board/geometry';
import { useSettingsStore } from '../game/roulette/store/settingsStore';
import { lastWinMultiplier } from '../game/roulette/utils/statistics';
import '../game/roulette/index.scss';

const RouletteScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const game = useRoulette();
  const sound = useSound();
  const settings = useSettingsStore();

  const [currency, setCurrency] = useState<'diamond' | 'coin'>('diamond');
  const [chipValue, setChipValue] = useState(10);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [lastRoundBets, setLastRoundBets] = useState<PlacedBet[]>([]);
  const [placing, setPlacing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [showWinBadge, setShowWinBadge] = useState(false);
  const [spinComplete, setSpinComplete] = useState(false);
  const [hasBetThisRound, setHasBetThisRound] = useState(false);
  const placedRound = useRef<number>(-1);

  const state = game.state;
  const phase = state?.phase ?? 'betting';
  const spinning = phase === 'spinning';
  const bettingOpen = phase === 'betting';
  const roundNumber = state?.roundNumber ?? 0;
  const winningIndex = state?.winningIndex ?? null;

  // Join the shared wheel room as soon as connected
  useEffect(() => {
    if (game.connected) game.join();
  }, [game.connected]);

  // Result reveal — the outcome is held back until the ball has stopped
  // rolling. The server emits `roulette:result` the moment the spin begins,
  // so firing on arrival would show the number while the wheel/ball are still
  // animating. We buffer it here and reveal on ball.settled instead.
  const pendingResultRound = useRef<number>(-1);
  const shownResultRound = useRef<number>(-1);

  useEffect(() => {
    if (!game.result) return;
    if (pendingResultRound.current === game.result.roundNumber) return;
    pendingResultRound.current = game.result.roundNumber;
  }, [game.result]);

  // Reset placed chips when a new betting window opens
  useEffect(() => {
    if (bettingOpen && roundNumber > 0) {
      setBets([]);
      setSpinComplete(false);
      setHasBetThisRound(false);
    }
  }, [bettingOpen, roundNumber]);

  // Auto-dismiss the result overlay the moment the next betting window opens,
  // so it never blocks placing bets on the new round.
  useEffect(() => {
    if (showResult && bettingOpen) setShowResult(false);
  }, [showResult, bettingOpen]);

  // Spin + ball animations driven by server state
  const { rotation, spinning: wheelSpinning } = useSpinAnimation(spinning, winningIndex, roundNumber, sound.sound, () => {
    setSpinComplete(true);
  });

  const ball = useBallAnimation(spinning, winningIndex, roundNumber);

  // Result reveal — the outcome is held back until the ball has stopped
  // rolling. The server emits `roulette:result` the moment the spin begins,
  // so firing on arrival would show the number while the wheel/ball are still
  // animating. We buffer the result round above and reveal it only once the
  // wheel has fully stopped AND the ball has settled into the pocket.
  useEffect(() => {
    if (!ball.settled || !spinComplete) return;
    if (!game.result || pendingResultRound.current !== game.result.roundNumber) return;
    if (shownResultRound.current === game.result.roundNumber) return;
    shownResultRound.current = game.result.roundNumber;
    setShowResult(true);
    const mine = user ? game.result.results.filter((r) => r.userId === user._id) : [];
    const total = mine.reduce((s, r) => s + r.winAmount, 0);
    if (total > 0) {
      setWinAmount(total);
      setShowWinBadge(true);
      sound.playWin();
    } else if (hasBetThisRound) {
      sound.playLose();
    }
    setHasBetThisRound(false);
    // Auto-repeat when enabled
    if (settings.autoSpin && lastRoundBets.length > 0) {
      setBets(lastRoundBets.map((b) => ({ ...b, id: `${b.type}:${b.numbers.join(',')}:${Date.now()}` })));
    }
  }, [ball.settled, spinComplete, game.result, user, hasBetThisRound, lastRoundBets, settings.autoSpin, sound]);

  const balance = currency === 'coin' ? (user?.coins ?? 0) : (user?.diamonds ?? 0);
  const totalBet = useMemo(() => bets.reduce((s, b) => s + b.amount, 0), [bets]);

  const addBet = useCallback(
    (type: RouletteBetType, numbers: number[], key: string) => {
      if (!bettingOpen || placing) return;
      const existing = bets.filter((b) => betKey(b.type, b.numbers) === key);
      if (existing.length > 0) {
        // Tap again → remove one chip
        const idx = bets.findIndex((b) => betKey(b.type, b.numbers) === key);
        if (idx >= 0) setBets((prev) => prev.filter((_, i) => i !== idx));
      } else {
        setBets((prev) => [...prev, { id: `${key}:${prev.length}:${Date.now()}`, type, numbers, amount: chipValue }]);
        sound.playChip();
      }
    },
    [bettingOpen, placing, bets, chipValue, sound]
  );

  const handleCellClick = useCallback(
    (type: RouletteBetType, numbers: number[], key: string) => addBet(type, numbers, key),
    [addBet]
  );

  const removeBet = useCallback((id: string) => setBets((prev) => prev.filter((b) => b.id !== id)), []);
  const undo = useCallback(() => setBets((prev) => prev.slice(0, -1)), []);
  const double = useCallback(() => setBets((prev) => prev.map((b) => ({ ...b, id: `${b.id}:d`, amount: b.amount * 2 }))), []);
  const clearBets = useCallback(() => setBets([]), []);
  const repeatLast = useCallback(() => {
    if (lastRoundBets.length === 0) return;
    setBets(lastRoundBets.map((b) => ({ ...b, id: `${b.type}:${b.numbers.join(',')}:${Date.now()}` })));
  }, [lastRoundBets]);

  const placeAll = useCallback(() => {
    if (!bettingOpen || bets.length === 0 || placing) return;
    setPlacing(true);
    const remaining = [...bets];
    const tryNext = () => {
      const bet = remaining.shift();
      if (!bet) {
        setPlacing(false);
        setBets([]);
        setHasBetThisRound(true);
        placedRound.current = roundNumber;
        setLastRoundBets(remaining.length === 0 ? [] : []);
        return;
      }
      game.placeBet({ currency, betType: bet.type, numbers: bet.numbers, amount: bet.amount }, () => {
        tryNext();
      });
    };
    // Snapshot the bets we're about to place for "repeat last round".
    const snapshot = remaining.map((b) => ({ ...b, id: b.id }));
    setLastRoundBets(snapshot);
    tryNext();
  }, [bettingOpen, bets, placing, currency, game, roundNumber]);

  // Keyboard betting over the straight-number cells.
  const { cursor, setCursor, clear: clearCursor } = useKeyboardBetting(36, bettingOpen, (cellIdx) => {
    const r = Math.floor(cellIdx / 12);
    const c = cellIdx % 12;
    const n = 3 - r + 3 * c;
    addBet('straight', [n], betKey('straight', [n]));
  });

  // Keep the winning index visible on the wheel after the result.
  const lastWinning = useMemo(() => winningIndex, [winningIndex]);

  return (
    <div className="min-h-screen bg-dark-950 pb-24 relative overflow-x-hidden" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(245,196,81,0.08), transparent 50%), #050816' }}>
      <ToastContainer theme="dark" position="top-center" />

      {/* Top bar */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800 sticky top-0 z-20 bg-dark-950/90 backdrop-blur-xl">
        <button onClick={() => { game.leave(); navigate(-1); }} aria-label="Back"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold flex-1">Roulette</h1>
        <button onClick={() => setShowHistory(!showHistory)} aria-label="History" className="text-dark-300 hover:text-white"><History size={20} /></button>
        <button onClick={() => setShowSettings(true)} aria-label="Settings" className="text-dark-300 hover:text-white"><Settings size={20} /></button>
        <span className="text-sm font-bold text-yellow-300">{balance?.toLocaleString()} {currency === 'coin' ? '🪙' : '💎'}</span>
        <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
          <button
            onClick={() => setCurrency('diamond')}
            className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1 ${currency === 'diamond' ? 'bg-primary-600' : ''}`}
            aria-label="Use diamonds"
          >💎</button>
          <button
            onClick={() => setCurrency('coin')}
            className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1 ${currency === 'coin' ? 'bg-yellow-600' : ''}`}
            aria-label="Use coins"
          >🪙</button>
        </div>
      </div>

      {/* Round status + countdown */}
      <div className="px-4 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-300 flex items-center gap-1">
            <Users size={12} /> Round #{roundNumber || '—'} · {state?.liveBetCount ?? 0} bets
          </span>
          {spinning ? (
            <span className="roulette-status-chip spinning roulette-pulse">Spinning</span>
          ) : (
            <span className="roulette-status-chip betting">Place your bets</span>
          )}
        </div>
        <BettingTimer endsAt={state?.endsAt ?? null} active={bettingOpen} />
      </div>

      {/* Wheel + ball + effects */}
      <div className="roulette-stage relative w-full max-w-[420px] mx-auto aspect-square mt-2">
        <div className={`roulette-wheel-wrap absolute inset-0 ${wheelSpinning ? 'spinning' : ''}`}>
          <Wheel rotation={rotation} spinning={wheelSpinning} winningIndex={lastWinning} />
        </div>
        <Ball angle={ball.angle} radius={ball.radius} visible={ball.visible} settled={ball.settled} />
        <WinEffects active={spinComplete && winningIndex !== null} />
      </div>

      {/* Main column: board + chips + bets */}
      <div className="px-3 space-y-3">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-4">
          <div className="space-y-3">
            <RecentNumbers />

            <div className="roulette-board-frame">
              <Board bets={bets} onCellClick={handleCellClick} disabled={!bettingOpen} cursor={cursor} />
            </div>

            <div className="roulette-glass p-2">
              <ChipPicker value={chipValue} onChange={setChipValue} disabled={!bettingOpen} />
            </div>

            <div className="roulette-glass p-3">
              <p className="text-xs font-bold text-dark-300 mb-2">My Bets</p>
              <MyBets
                bets={bets}
                total={totalBet}
                onRemove={removeBet}
                onUndo={undo}
                onDouble={double}
                onRepeat={repeatLast}
                onClear={clearBets}
                disabled={!bettingOpen}
                hasLastRound={lastRoundBets.length > 0}
              />
            </div>

            <button
              onClick={placeAll}
              disabled={!bettingOpen || bets.length === 0 || placing}
              className="roulette-cta w-full py-3.5 text-sm"
            >
              {placing ? 'Placing bets…' : spinning ? 'Spinning…' : `Place ${bets.length} bet${bets.length === 1 ? '' : 's'} · ${totalBet.toLocaleString()}`}
            </button>

            {/* Right panel on mobile → collapsible drawer */}
            {showHistory && (
              <div className="space-y-3 lg:hidden">
                <HistoryPanel />
                <StatsPanel />
              </div>
            )}
          </div>

          {/* Right panel (desktop) */}
          <div className="hidden lg:block space-y-3">
            <HistoryPanel />
            <StatsPanel />
            {winAmount > 0 && (
              <div className="roulette-glass p-3">
                <p className="text-xs font-bold text-dark-300 mb-1">Last win multiplier</p>
                <p className="text-2xl font-black text-yellow-300">×{lastWinMultiplier(game.result?.results ?? []).toFixed(1)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingActions onReset={clearBets} />

      {showResult && <ResultOverlay result={game.result} userId={user?._id} onClose={() => setShowResult(false)} />}
      {showSettings && <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />}
      <WinBadge amount={winAmount} visible={showWinBadge} onDone={() => setShowWinBadge(false)} />

      {/* Recharge prompt */}
      {game.rechargeNeeded && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-xl p-6 max-w-sm w-full text-center space-y-4">
            <p className="font-bold">Insufficient balance</p>
            <p className="text-sm text-dark-400">Recharge your wallet to keep playing.</p>
            <button
              onClick={() => { game.setRechargeNeeded(false); navigate('/recharge'); }}
              className="w-full py-2.5 bg-primary-600 rounded-lg text-sm font-medium"
            >Go to Recharge</button>
            <button onClick={() => game.setRechargeNeeded(false)} className="text-sm text-dark-400">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export const RouletteGame = () => (
  <RouletteProvider>
    <RouletteScreen />
  </RouletteProvider>
);

export default RouletteGame;
