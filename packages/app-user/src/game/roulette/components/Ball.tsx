// White metallic SVG ball — positioned by the ball animation motion values.
// It visibly rolls on its own axis as it orbits (self-rotation derived from
// the orbit angle), with a soft motion trail while in flight and a bounce
// when it settles into the pocket.

import React, { memo } from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';
import { WHEEL_CENTER } from './Wheel';

interface BallProps {
  angle: MotionValue<number>;
  radius: MotionValue<number>;
  visible: boolean;
  settled: boolean;
}

const BallInner = ({ angle, radius, visible, settled }: BallProps) => {
  // All hooks run unconditionally (Rules of Hooks) — the transforms are
  // computed even when the ball is hidden, and cheap when idle.
  const cos = useTransform(angle, (a) => Math.cos(((a as number) - 90) * (Math.PI / 180)));
  const sin = useTransform(angle, (a) => Math.sin(((a as number) - 90) * (Math.PI / 180)));
  const x = useTransform([cos, radius] as MotionValue<number>[], ([c, r]) => WHEEL_CENTER + (r as number) * (c as number));
  const y = useTransform([sin, radius] as MotionValue<number>[], ([s, r]) => WHEEL_CENTER + (r as number) * (s as number));
  const offsetX = useTransform(x, (v) => v - 7.5);
  const offsetY = useTransform(y, (v) => v - 7.5);
  // Self-rotation: the ball rolls ~3.5x per orbit (its own spin), slowing as
  // it decays inward. Negative so it visibly rolls against the wheel spin.
  const roll = useTransform(angle, (a) => ((a as number) * 3.5) % 360);

  if (!visible) return null;

  return (
    <svg viewBox="0 0 420 420" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      <defs>
        <radialGradient id="ball-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#d4d4d8" />
          <stop offset="100%" stopColor="#71717a" />
        </radialGradient>
        <filter id="ball-shadow" x="-100%" y="-100%" width="300%" height="300%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>
      <motion.g style={{ x: offsetX, y: offsetY }}>
        {/* Motion trail — fades as the ball slows */}
        <motion.circle
          r={7.5}
          fill="rgba(255,255,255,0.18)"
          filter="url(#ball-shadow)"
          animate={{ scale: settled ? 0.6 : 1, opacity: settled ? 0 : 0.5 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <motion.g
          style={{ rotate: roll, originX: '7.5px', originY: '7.5px' }}
        >
          <motion.g
            animate={settled ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            <circle r={7.5} fill="url(#ball-grad)" filter="url(#ball-shadow)" />
            {/* Highlight + rolling marker so the self-rotation is visible */}
            <circle cx={-2} cy={-2.5} r={2} fill="rgba(255,255,255,0.9)" />
            <circle cx={2.5} cy={3.5} r={1} fill="rgba(255,255,255,0.35)" />
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  );
};

export const Ball = memo(BallInner);
