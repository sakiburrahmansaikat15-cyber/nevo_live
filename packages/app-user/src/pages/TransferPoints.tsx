import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiQuestionFill as HelpCircle, PiUserCircleFill as UserRound } from 'react-icons/pi';
import { transferApi, TRANSFER_MIN_POINTS, TRANSFER_UNIT, validateTransferAmount } from '../api/transfer.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import type { TransferQuote } from '../api/transfer.api';

/**
 * Requirement #24 — transfer points to an agent.
 *
 * Every rule here is also enforced server-side (see API-SPEC.md). Checking in
 * the UI too just means the user finds out before they tap, not after.
 */
export const TransferPoints = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [receiverUid, setReceiverUid] = useState('');
  const [units, setUnits] = useState('');
  const [quote, setQuote] = useState<TransferQuote['receiver'] | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'missing' | 'unavailable'>('idle');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const points = (parseInt(units, 10) || 0) * TRANSFER_UNIT;
  const amountError = units ? validateTransferAmount(points) : null;
  const available = user?.diamonds ?? 0;
  const insufficient = points > available;

  // Look the receiver up as they type, so the nickname appears before confirming.
  useEffect(() => {
    const uid = receiverUid.trim();
    setQuote(null);
    if (uid.length < 4) {
      setLookupState('idle');
      return;
    }

    let cancelled = false;
    setLookupState('loading');
    const timer = setTimeout(async () => {
      try {
        const res = await optional(transferApi.getQuote(uid));
        if (cancelled) return;
        if (res === null) {
          setLookupState('unavailable');
          return;
        }
        if (res.success && res.data?.receiver) {
          setQuote(res.data.receiver);
          setLookupState('idle');
        } else {
          setLookupState('missing');
        }
      } catch {
        if (!cancelled) setLookupState('missing');
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [receiverUid]);

  const canSubmit =
    receiverUid.trim().length >= 4 && points > 0 && !amountError && !insufficient && !submitting;

  const handleTransfer = async () => {
    setSubmitting(true);
    try {
      const res = await optional(transferApi.transfer(receiverUid.trim(), points));
      if (res === null) {
        showToast('Transfers are not available yet', 'info');
        return;
      }
      if (res.success) {
        showToast(`Transferred ${points.toLocaleString()} points`, 'success');
        navigate(-1);
      } else {
        showToast(res.error || 'Transfer failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Transfer failed', 'error');
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-8">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1">Transfer</h1>
          <button onClick={() => navigate('/transfer/history')} className="text-sm font-semibold text-accent-500">
            Details
          </button>
        </div>
      </header>

      {/* Balance (#24.2) */}
      <div className="m-3 rounded-card p-4 bg-[#FFE6E6]">
        <p className="text-[34px] leading-tight font-bold text-ink tabular-nums">
          {available.toLocaleString()}
        </p>
        <p className="text-xs text-ink-muted">Available Points</p>

        <div className="flex items-stretch gap-4 mt-3 pt-3 border-t border-black/5">
          <div className="flex-1">
            <p className="text-base font-bold text-ink tabular-nums">{available.toLocaleString()}</p>
            <p className="text-[11px] text-ink-muted">Total</p>
          </div>
          <div className="w-px bg-black/5" />
          <div className="flex-1">
            <p className="text-base font-bold text-ink tabular-nums">0</p>
            <p className="text-[11px] text-ink-muted flex items-center gap-1">
              Unconfirmed
              <span title="Points under verification">
                <HelpCircle className="w-3 h-3" />
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Inputs (#24.3) */}
      <div className="mx-3 bg-white rounded-card p-4 space-y-5">
        <div>
          <label className="text-sm font-semibold text-ink flex items-center gap-1 mb-1.5">
            Receiver <span className="text-role-host">*</span>
          </label>
          <div className="relative">
            <input
              value={receiverUid}
              onChange={(e) => setReceiverUid(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="ID"
              className="w-full h-12 pl-4 pr-11 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint
                border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors"
            />
            <button
              aria-label="Pick from friends"
              onClick={() => navigate(`/user/${user?._id}/friends`)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-accent-500"
            >
              <UserRound className="w-5 h-5" />
            </button>
          </div>

          {quote ? (
            <div className="flex items-center gap-2 mt-2">
              <Avatar src={quote.avatar} nickname={quote.nickname} size="xs" />
              <span className="text-sm font-semibold text-ink truncate">{quote.nickname}</span>
              {quote.isAgent ? (
                <span className="text-[10px] font-bold text-role-agent bg-role-agent/10 px-1.5 py-0.5 rounded">
                  AGENT
                </span>
              ) : (
                <span className="text-[11px] text-role-host">Only agent accounts can receive</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-faint mt-1.5">
              {lookupState === 'loading' && 'Checking…'}
              {lookupState === 'missing' && <span className="text-role-host">No user with that ID</span>}
              {(lookupState === 'idle' || lookupState === 'unavailable') &&
                "Please confirm the recipient's nickname and ID"}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold text-ink flex items-center gap-1 mb-1.5">
            Transfer <span className="text-role-host">*</span>
          </label>
          <div className="flex items-center h-12 px-4 rounded-xl bg-surface-sunken border border-transparent focus-within:bg-white focus-within:border-accent-500 transition-colors">
            <input
              value={units}
              onChange={(e) => setUnits(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="0"
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none tabular-nums"
            />
            <span className="text-sm text-[#FF8FAB] font-semibold shrink-0">
              × {TRANSFER_UNIT.toLocaleString()}
            </span>
          </div>
          <p className="text-xs mt-1.5 tabular-nums">
            {amountError ? (
              <span className="text-role-host">{amountError}</span>
            ) : insufficient ? (
              <span className="text-role-host">Not enough points</span>
            ) : points > 0 ? (
              <span className="text-ink-muted">= {points.toLocaleString()} points</span>
            ) : (
              <span className="text-ink-faint">1 unit = {TRANSFER_UNIT.toLocaleString()} points</span>
            )}
          </p>
        </div>
      </div>

      {/* Rules (#24.4) */}
      <div className="mx-3 mt-3 bg-white rounded-card p-4">
        <h2 className="font-bold text-ink mb-2">Rule Description</h2>
        <ol className="text-sm text-ink-muted space-y-1.5 list-decimal list-inside">
          <li>Minimum transfer: {TRANSFER_MIN_POINTS.toLocaleString()} points, at a 1:1 rate.</li>
          <li>Points can only be sent to an agent account. Transfers are non-refundable.</li>
        </ol>
      </div>

      {/* Submit (#24.5) */}
      <div className="px-3 mt-4">
        <button
          onClick={() => setConfirming(true)}
          disabled={!canSubmit}
          className={`w-full h-13 py-3.5 rounded-full font-bold text-white transition-colors ${
            canSubmit ? 'bg-[#FF5C8A]' : 'bg-[#FFC9D8]'
          }`}
        >
          Transfer
        </button>
      </div>

      {/* Confirm popup (#24.6.5) */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirming(false)} />
          <div className="relative w-full max-w-xs bg-white rounded-sheet p-5 text-center animate-slide-up">
            <p className="text-base font-bold text-ink mb-1">Confirm transfer</p>
            <p className="text-sm text-ink-muted">
              Transfer <span className="font-semibold text-ink">{points.toLocaleString()}</span> points to{' '}
              <span className="font-semibold text-ink">{quote?.nickname || `ID ${receiverUid}`}</span>?
            </p>
            <p className="text-xs text-role-host mt-2">This cannot be undone.</p>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirming(false)} className="flex-1 h-11 btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={submitting}
                className="flex-1 h-11 btn-primary disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
