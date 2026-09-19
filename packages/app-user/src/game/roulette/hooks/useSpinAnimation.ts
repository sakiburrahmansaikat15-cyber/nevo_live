// Drives the wheel rotation motion value + pointer tick scheduling.
// The wheel launches fast, decelerates over ~90% of the spin, then lands
// with a tiny elastic wobble into the winning pocket — a much more natural
// roulette feel than a single monotonic ease-out.

import { useEffect, useRef, useState } from 'react';
import { animate, motionValue } from 'framer-motion';
import { EASE_OUT_EXPO, EASE_ELASTIC } from '../physics/easing';
import { wheelTargetRotation, SPIN_TURNS } from '../physics/spin';
import { POCKET_COUNT, POCKET_ANGLE } from '../utils/wheel';
import { audioEngine } from '../audio/engine';

export interface SpinAnimationState {
  rotation: ReturnType<typeof motionValue<number>>;
  spinning: boolean;
}

/** Resting rotation (deg) for a pocket — used to idle at the last result. */
export function restingRotation(winningIndex: number | null): number {
  if (winningIndex === null) return 0;
  return wheelTargetRotation(winningIndex, SPIN_TURNS) % 360;
}

export function useSpinAnimation(
  spinning: boolean,
  winningIndex: number | null,
  roundNumber: number,
  sound: boolean,
  onSpinComplete?: () => void
): SpinAnimationState {
  const rotation = useRef(motionValue(0)).current;
  const [isSpinning, setIsSpinning] = useState(false);
  const lastRound = useRef<number>(-1);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!spinning || winningIndex === null || lastRound.current === roundNumber) return;
    lastRound.current = roundNumber;
    completedRef.current = false;
    setIsSpinning(true);

    const target = wheelTargetRotation(winningIndex, SPIN_TURNS);
    // Spin decel phase (~5.6s), then a short elastic settle (~0.45s) into the pocket.
    const decelDuration = 5600;

    // Pointer ticks — fire as pockets pass the pointer (during the main spin).
    const tickMs = decelDuration / POCKET_COUNT;
    let tick = 0;
    const tickId = setInterval(() => {
      if (sound) audioEngine.tick();
      tick += 1;
      if (tick >= POCKET_COUNT) clearInterval(tickId);
    }, tickMs);

    let settleControls: ReturnType<typeof animate> | null = null;

    const finish = () => {
      clearInterval(tickId);
      setIsSpinning(false);
      if (!completedRef.current) {
        completedRef.current = true;
        onSpinComplete?.();
      }
    };

    const controls = animate(rotation, target, {
      duration: decelDuration,
      ease: EASE_OUT_EXPO,
      onComplete: () => {
        // Elastic settle: a tiny overshoot around the target — a natural
        // "landing" wobble instead of a dead stop.
        settleControls = animate(rotation, target + 6, {
          duration: 450,
          ease: EASE_ELASTIC,
          onComplete: finish,
        });
      },
    });

    return () => {
      clearInterval(tickId);
      controls.stop();
      settleControls?.stop();
      // Don't reset rotation here — the motion value persists across renders.
    };
  }, [spinning, winningIndex, roundNumber, sound, rotation, onSpinComplete]);

  return { rotation, spinning: isSpinning };
}

/** Small helper: motion value for the ball's own rotation (counter-spin). */
export function ballPhaseFromRotation(rotation: number): number {
  const deg = ((rotation % 360) + 360) % 360;
  return Math.floor(deg / POCKET_ANGLE) % POCKET_COUNT;
}
