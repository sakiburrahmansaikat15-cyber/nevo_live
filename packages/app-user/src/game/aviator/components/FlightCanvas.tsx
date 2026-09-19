import React, { useEffect, useMemo, useState } from 'react';
import type { AviatorState } from '../../../types/aviator';
import { Plane } from './Plane';

const TICKS = [1.0, 1.5, 2.0, 2.5];

// The flight area: server-driven multiplier, plane position, live counter,
// BET countdown bar and CRASHED state. No client-side simulation.
export const FlightCanvas: React.FC<{ state: AviatorState | null }> = ({ state }) => {
  const [countdown, setCountdown] = useState(0);

  const phase = state?.phase ?? 'BET';
  const multiplier = state?.multiplier ?? 0;

  // Countdown during the BET phase (driven by server endsAt, not local time)
  useEffect(() => {
    if (phase !== 'BET' || !state?.endsAt) {
      setCountdown(0);
      return;
    }
    const update = () => setCountdown(Math.max(0, (state.endsAt - Date.now()) / 1000));
    update();
    const t = setInterval(update, 100);
    return () => clearInterval(t);
  }, [phase, state?.endsAt]);

  const pct = useMemo(() => {
    if (phase === 'BET') return 0;
    if (phase === 'CRASHED') return Math.min(1, ((state?.crashPoint ?? 1) - 1) / 1.5);
    return Math.max(0, Math.min(1, (multiplier - 1) / 1.5));
  }, [phase, multiplier, state?.crashPoint]);

  const displayMultiplier =
    phase === 'CRASHED' ? (state?.crashPoint ?? multiplier) : multiplier;

  return (
    <div className="aviator-flight">
      {/* Multiplier axis ticks */}
      <div className="aviator-flight__ticks">
        {TICKS.map((t) => (
          <span
            key={t}
            className="aviator-flight__tick"
            style={{ bottom: `${((t - 1) / 1.5) * 100}%` }}
          >
            {t.toFixed(1)}x
          </span>
        ))}
      </div>

      {/* Flight path baseline */}
      <div className="aviator-flight__baseline" />

      {/* The plane climbs with the multiplier */}
      <div
        className="aviator-flight__plane"
        style={{ bottom: `calc(${pct * 100}% + 10px)` }}
      >
        <Plane multiplier={multiplier} crashed={phase === 'CRASHED'} waiting={phase === 'BET'} />
      </div>

      {/* Big live multiplier */}
      <div
        className={`aviator-flight__counter ${
          phase === 'CRASHED' ? 'aviator-flight__counter--crashed' : ''
        }`}
      >
        {phase === 'BET' ? (
          <>
            <div className="aviator-flight__waiting-text">WAITING FOR NEXT ROUND</div>
            <div className="aviator-flight__countdown-bar">
              <div style={{ width: `${(countdown / 8) * 100}%` }} />
            </div>
          </>
        ) : (
          <>
            {phase === 'CRASHED' && <div className="aviator-flight__flew-away">FLEW AWAY!</div>}
            <div className="aviator-flight__multiplier">
              {displayMultiplier.toFixed(2)} <span className="aviator-flight__x">x</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
