// Ball orbit keyframes — counter-rotation + radius decay + settle bounce.

import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, motionValue } from 'framer-motion';
import { generateBallKeyframes } from '../physics/spin';

export interface BallAnimationState {
  angle: ReturnType<typeof motionValue<number>>;
  radius: ReturnType<typeof motionValue<number>>;
  visible: boolean;
  settled: boolean;
}

/**
 * Ball orbits the wheel opposite to its rotation while decaying inward.
 * When the wheel reaches its target, the ball "settles" into the pocket
 * with a tiny elastic bounce.
 */
export function useBallAnimation(spinning: boolean, winningIndex: number | null, roundNumber: number): BallAnimationState {
  const angle = useMemo(() => motionValue(0), []);
  const radius = useMemo(() => motionValue(158), []);
  const [visible, setVisible] = useState(false);
  const [settled, setSettled] = useState(false);
  const lastRound = useRef<number>(-1);

  useEffect(() => {
    if (!spinning || winningIndex === null || lastRound.current === roundNumber) return;
    lastRound.current = roundNumber;
    setVisible(true);
    setSettled(false);

    const frames = generateBallKeyframes(5600);
    const keyframesAngle = frames.map((f) => f.rotation);
    const keyframesRadius = frames.map((f) => f.radius);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setSettled(true);
      // Tiny elastic settle into the pocket.
      animate(radius, 108, { duration: 0.35, ease: 'easeOut' });
      setTimeout(() => setVisible(false), 900);
    };

    const controlsAngle = animate(angle, keyframesAngle, { duration: 5.4, ease: 'easeOut', onComplete: finish });
    const controlsRadius = animate(radius, keyframesRadius, { duration: 5.4, ease: 'easeOut' });

    return () => {
      controlsAngle.stop();
      controlsRadius.stop();
    };
  }, [spinning, winningIndex, roundNumber, angle, radius]);

  return { angle, radius, visible, settled };
}
