import { levelTier } from '../../lib/levels';

interface LevelBadgeProps {
  level: number;
  /** `sm` for inline name rows, `md` for headers. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Requirement #3A — `[Lv.15]` next to the nickname.
 * Colour comes from the tier (Beginner / Rising / Popular / Superstar).
 */
export const LevelBadge = ({ level, size = 'sm', className = '' }: LevelBadgeProps) => {
  const tier = levelTier(level);
  const dims = size === 'sm' ? 'h-[18px] px-1.5 text-[10px]' : 'h-6 px-2 text-xs';

  return (
    <span
      title={`${tier.label} · Level ${level}`}
      className={`inline-flex items-center justify-center rounded-md font-bold leading-none shrink-0 ${dims} ${tier.pill} ${className}`}
    >
      Lv.{Math.max(1, Math.floor(level || 1))}
    </span>
  );
};
