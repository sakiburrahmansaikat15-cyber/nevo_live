import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCheckBold as Check, PiCaretRightBold as ChevronRight, PiCoinsFill as Coins, PiCopyFill as Copy, PiCrownFill as Crown, PiGameControllerFill as Gamepad2, PiGiftFill as Gift, PiHeadphonesFill as Headphones, PiHeartFill as Heart, PiSquaresFourFill as LayoutGrid, PiSignOutBold as LogOut, PiMedalFill as Medal, PiRadioFill as Radio, PiPaperPlaneRightFill as Send, PiGearFill as SettingsIcon, PiShareNetworkFill as Share2, PiShieldCheckFill as ShieldCheck, PiStorefrontFill as Store, PiTrophyFill as Trophy, PiUserGearFill as UserCog, PiUserPlusFill as UserPlus, PiUsersFill as Users, PiWalletFill as WalletIcon } from 'react-icons/pi';
import { PiTelevision, PiLightbulb, PiPlanet, PiClock, PiBackpack, PiSealCheck, PiYoutubeLogoFill, PiFacebookLogoFill, PiTiktokLogoFill, PiUsersFill } from 'react-icons/pi';
import { useAuthStore } from '../stores';
import { Avatar, EditProfileSheet, ProfileStatsRow, UserNameplate } from '../components/user';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';
import { ContactUsModal } from '../components/contact/ContactUsModal';
import { usersApi } from '../api';
import { countryLabel } from '../lib/countries';
import { levelTier, tierProgress, nextTierAt } from '../lib/levels';
import type { ProfileStats } from '../types';

/** Requirement #22G — the 8-tile VIP grid. Every tile points at a real screen. */
const QUICK_ACTIONS = [
  { to: '/rewards', label: 'Reward', Icon: Gift, tint: 'bg-[#FFECEC] text-[#FF4D4D]' },
  { to: '/rankings', label: 'Rank', Icon: Trophy, tint: 'bg-[#FFF3E0] text-role-seller' },
  { to: '/games', label: 'Fun Island', Icon: Gamepad2, tint: 'bg-[#E9F9EE] text-[#22A45D]' },
  { to: '/store', label: 'Store', Icon: Store, tint: 'bg-[#E6FAF6] text-[#00BFA5]' },
  { to: '/invite', label: 'Invite', Icon: Send, tint: 'bg-[#FFECF3] text-[#FF6EA6]' },
  { to: '/levels', label: 'Honor Level', Icon: Crown, tint: 'bg-[#F3EDFF] text-[#8B5CF6]' },
  { to: '/fan-club', label: 'Fan Club', Icon: Heart, tint: 'bg-[#FDEBF3] text-[#EC4899]' },
  { to: '/achievements', label: 'Medal Wall', Icon: Medal, tint: 'bg-[#FFECEC] text-[#E5342F]' },
];

/** Requirement #22H — the Agent section. */
const AGENT_ACTIONS = [
  { to: '/agent', label: 'Agent', Icon: UserCog, tint: 'bg-[#E8F4FF] text-role-agent' },
  { to: '/agent/invite-hosts', label: 'Add Host', Icon: UserPlus, tint: 'bg-[#F3EDFF] text-[#8B5CF6]' },
  { to: '/referral', label: 'Invite Agent', Icon: Users, tint: 'bg-[#E6FAF6] text-[#00BFA5]' },
  { to: '/transfer', label: 'Coins Trading', Icon: Coins, tint: 'bg-[#FFF3E0] text-role-seller' },
];

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();

  const [showContact, setShowContact] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Requirement #2 — the four counts come from the server, not from the
  // locally cached follow arrays (which go stale as soon as someone follows).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    usersApi
      .getStats()
      .then(({ data }) => {
        if (!cancelled && data.success && data.data) setStats(data.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-ink-muted mb-4">Sign in to view your profile</p>
        <button onClick={() => navigate('/login')} className="h-11 px-6 btn-primary">
          Sign In
        </button>
      </div>
    );
  }

  const tier = levelTier(user.level);
  const progress = tierProgress(user.level);
  const nextAt = nextTierAt(user.level);

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/user/${user._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${user.nickname} on Navo Live`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="bg-surface-soft min-h-screen">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-wash px-4 pt-3 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[26px] font-bold text-ink">Me</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              aria-label="Share profile"
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-black/5"
            >
              {shared ? <Check className="w-5 h-5 text-status-online" /> : <Share2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => navigate('/settings')}
              aria-label="Settings"
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-black/5"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Identity row — tapping it opens the editor */}
        <button onClick={() => setEditing(true)} className="w-full flex items-center gap-3 text-left">
          <Avatar src={user.avatar} nickname={user.nickname} size="xl" online />
          <div className="flex-1 min-w-0">
            <UserNameplate user={user as any} size="lg" showOnline={false} />
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-xs text-ink-muted">ID: {user.uid}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  copyUid();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    copyUid();
                  }
                }}
                className="text-ink-faint active:text-ink"
                aria-label="Copy your ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-status-online" /> : <Copy className="w-3.5 h-3.5" />}
              </span>
            </div>
            {user.country && <p className="text-xs text-ink-muted mt-1">{countryLabel(user.country)}</p>}
          </div>
          <ChevronRight className="w-5 h-5 text-ink-ghost shrink-0" />
        </button>

        {/* Requirement #3C — level tier progress */}
        <div className="mt-4 bg-white/70 rounded-card p-3 space-y-3">
          {/* Main User Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${tier.text}`}>
                {tier.label} · Lv.{user.level}
              </span>
              <span className="text-[11px] text-ink-muted">
                {nextAt ? `Next tier at Lv.${nextAt}` : 'Top tier reached'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-line overflow-hidden">
              <div
                className={`h-full rounded-full ${tier.pill}`}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
          
          {/* Game/Stream Level */}
          <div className="pt-2 border-t border-line/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <img src="https://api.dicebear.com/7.x/shapes/svg?seed=game&backgroundColor=FF6B6B" alt="Level Icon" className="w-4 h-4 rounded-full" />
                <span className="text-xs font-bold text-[#FF6B6B]">
                  Creator · Lv.{Math.floor(user.level / 2) || 1}
                </span>
              </div>
              <span className="text-[11px] text-ink-muted">
                Next tier at Lv.{(Math.floor(user.level / 2) || 1) + 1}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-line overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53]"
                style={{ width: '45%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Requirement #2 — Friends / Following / Followers / Visitors ── */}
      <div className="bg-white px-2 py-3">
        <ProfileStatsRow userId={user._id} stats={stats} loading={statsLoading} />
      </div>

      {/* ── Balances ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        {/* #22F — Coins opens Top-Up, Points opens the income dashboard. */}
        <button
          onClick={() => navigate('/top-up')}
          className="relative overflow-hidden rounded-card p-3.5 text-left bg-[#FFF8E5]"
        >
          <p className="text-xs text-ink-muted">Coins</p>
          <p className="text-xl font-bold text-ink mt-0.5 tabular-nums">
            {(user.coins ?? 0).toLocaleString()}
          </p>
          <CoinIcon className="w-12 h-12 text-coin/25 absolute -right-1 top-1/2 -translate-y-1/2" />
        </button>
        <button
          onClick={() => navigate('/income')}
          className="relative overflow-hidden rounded-card p-3.5 text-left bg-[#FDEBF3]"
        >
          <p className="text-xs text-ink-muted">Points</p>
          <p className="text-xl font-bold text-ink mt-0.5 tabular-nums">
            {(user.diamonds ?? 0).toLocaleString()}
          </p>
          <DiamondIcon className="w-12 h-12 text-accent-500/25 absolute -right-1 top-1/2 -translate-y-1/2" />
        </button>
      </div>

      {/* ── Quick actions ──────────────────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-card p-3">
        <div className="grid grid-cols-4 gap-y-4">
          {QUICK_ACTIONS.map(({ to, label, Icon, tint }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1.5 active:opacity-60 transition-opacity"
            >
              <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tint}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-[11px] text-ink-soft">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent section (#22H) ───────────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-card p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-ink">Agent</h2>
          <button
            onClick={() => navigate('/agent')}
            className="text-sm text-ink-muted flex items-center gap-0.5"
          >
            All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-y-4">
          {AGENT_ACTIONS.map(({ to, label, Icon, tint }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1.5 active:opacity-60 transition-opacity"
            >
              <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tint}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-[11px] text-ink-soft text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => navigate('/rewards')}
            className="h-11 rounded-xl bg-surface-soft text-sm font-medium text-ink-soft"
          >
            Agent Rewards
          </button>
          <button
            onClick={() => navigate('/rankings?board=agent_count')}
            className="h-11 rounded-xl bg-surface-soft text-sm font-medium text-ink-soft"
          >
            Agent Ranking
          </button>
        </div>
      </div>

      {/* ── Centers ────────────────────────────────────────────── */}
      <div className="mx-4 mt-3 list-group">
        <MenuRow
          icon={<PiTelevision className="w-5 h-5" />}
          label="Streamer Center"
          onClick={() => navigate('/streamer-center')}
        />
        <MenuRow
          icon={<PiLightbulb className="w-5 h-5" />}
          label="Video Creator Center"
          onClick={() => navigate('/me/center')}
        />
        <MenuRow
          icon={<PiPlanet className="w-[22px] h-[22px] text-[#5b8cff]" />}
          label="Builder Center"
          onClick={() => navigate('/me/center')}
        />
      </div>

      {/* ── Menu ───────────────────────────────────────────────── */}
      <div className="mx-4 mt-3 list-group">
        <MenuRow
          icon={<WalletIcon className="w-[22px] h-[22px] text-[#f5a623]" />}
          label="Wallet"
          onClick={() => navigate('/wallet')}
        />
        <MenuRow
          icon={<Coins className="w-[22px] h-[22px] text-[#f5a623]" />}
          label="Withdraw Method"
          onClick={() => navigate('/withdraw-methods')}
        />
        <MenuRow
          icon={<Store className="w-[22px] h-[22px] text-[#22A45D]" />}
          label="Sell Coin"
          onClick={() => navigate('/sell')}
        />
        <MenuRow
          icon={<Headphones className="w-[22px] h-[22px] text-orange-400" />}
          label="Help Center"
          rightNode={<span className="text-[13px] text-ink-muted mr-1">24h</span>}
          onClick={() => setShowContact(true)}
        />
        <MenuRow
          icon={<PiClock className="w-5 h-5" />}
          label="Watch History"
          onClick={() => {}}
        />
        <MenuRow
          icon={<ShieldCheck className="w-5 h-5" />}
          label="Guardian"
          onClick={() => {}}
        />
        <MenuRow
          icon={<Crown className="w-5 h-5" />}
          label="Level"
          onClick={() => navigate('/levels')}
        />
        <MenuRow
          icon={<Medal className="w-5 h-5" />}
          label="Achievement Poster"
          onClick={() => navigate('/achievements')}
        />
        <MenuRow
          icon={<PiBackpack className="w-5 h-5" />}
          label="Bag"
          rightNode={<div className="w-1.5 h-1.5 rounded-full bg-status-danger mr-1" />}
          onClick={() => {}}
        />
        <MenuRow
          icon={<PiUsersFill className="w-5 h-5 text-indigo-500" />}
          label="My Agency"
          onClick={() => navigate('/my-agency')}
        />
        <MenuRow
          icon={<PiSealCheck className="w-5 h-5" />}
          label="Authentication"
          onClick={() => navigate('/verification')}
        />
        <MenuRow
          icon={<Heart className="w-5 h-5" />}
          label="Follow Us"
          rightNode={
            <div className="flex items-center gap-1 text-[18px] mr-1">
              <PiYoutubeLogoFill className="text-[#FF0000]" />
              <PiFacebookLogoFill className="text-[#1877F2]" />
              <PiTiktokLogoFill className="text-black" />
            </div>
          }
          onClick={() => {}}
        />
      </div>

      <div className="mx-4 mt-3 mb-6 list-group">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="list-row w-full text-role-host font-semibold"
        >
          <LogOut className="w-5 h-5" />
          <span className="flex-1 text-left">Logout</span>
        </button>
      </div>

      {showContact && <ContactUsModal onClose={() => setShowContact(false)} />}
      <EditProfileSheet isOpen={editing} onClose={() => setEditing(false)} />
    </div>
  );
};

function MenuRow({
  icon,
  label,
  value,
  rightNode,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  rightNode?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="list-row w-full">
      <span className="text-ink-muted flex items-center justify-center w-6">{icon}</span>
      <span className="flex-1 text-left text-[15px]">{label}</span>
      {value && <span className="text-[13px] text-ink-muted mr-1">{value}</span>}
      {rightNode}
      <ChevronRight className="w-[18px] h-[18px] text-[#D3D3D3] shrink-0" />
    </button>
  );
}
