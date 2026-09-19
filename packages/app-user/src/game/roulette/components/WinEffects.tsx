// Win effects — gold particles + confetti burst around the winning number.

import React, { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParticles } from '../hooks/useParticles';
import { WHEEL_CENTER } from './Wheel';

interface WinEffectsProps {
  active: boolean;
}

const COLORS = ['#F5C451', '#FFD97A', '#FFF3C4', '#FFB84C', '#FFFFFF'];

const EffectsInner = ({ active }: WinEffectsProps) => {
  const { particles, burst, start, stop, clear } = useParticles(70);

  useEffect(() => {
    if (active) {
      start();
      burst(WHEEL_CENTER, WHEEL_CENTER, 40, 60);
      const t = setTimeout(clear, 2000);
      return () => {
        clearTimeout(t);
        stop();
      };
    }
    stop();
  }, [active, start, stop, burst, clear]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
            initial={{ opacity: 1, scale: 0.5 }}
            animate={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export const WinEffects = memo(EffectsInner);
