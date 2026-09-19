import { vipInfo } from '../../lib/levels';

interface VipBadgeProps {
  noble?: { type: string; expiry: string } | null;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Requirement #3A — `[VIP3]` next to the level badge.
 * Renders nothing when the user has no noble tier or it has expired.
 */
export const VipBadge = ({ noble, size = 'sm', className = '' }: VipBadgeProps) => {
  const vip = vipInfo(noble);
  if (!vip) return null;

  const dims = size === 'sm' ? 'h-[18px] px-1.5 text-[10px]' : 'h-6 px-2 text-xs';

  return (
    <span
      title={`VIP level ${vip.rank}`}
      className={`inline-flex items-center justify-center rounded-md font-bold leading-none shrink-0 ${dims} ${vip.pill} ${className}`}
    >
      {vip.label}
    </span>
  );
};
