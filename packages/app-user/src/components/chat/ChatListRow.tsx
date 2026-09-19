import { useRef, useState } from 'react';
import { PiBellSlashFill as BellOff, PiTrashFill as Trash2 } from 'react-icons/pi';
import { Avatar } from '../user';
import { LevelBadge } from '../user/LevelBadge';
import { flagEmoji } from '../../lib/countries';
import { timeAgo } from '../../lib/time';

export interface ChatRow {
  _id: string;
  other?: {
    _id?: string;
    nickname?: string;
    avatar?: string;
    level?: number;
    country?: string;
    online?: boolean;
    liveStreamId?: string | null;
  };
  lastMessage?: string;
  lastMessageType?: 'text' | 'voice' | 'gift' | 'image';
  lastMessageAt?: string;
  unread?: number;
  muted?: boolean;
  /** "Activating 1/3" — chat-streak progress (requirement #16C.4). */
  streak?: { current: number; target: number };
}

interface ChatListRowProps {
  chat: ChatRow;
  onOpen: () => void;
  onMute?: (muted: boolean) => void;
  onDelete?: () => void;
}

const ACTION_WIDTH = 144; // two 72px buttons

/**
 * One conversation row, with swipe-left to reveal Mute / Delete
 * (requirement #16E.3).
 *
 * The swipe is pointer-based rather than a library: it only starts once the
 * horizontal movement clearly beats the vertical, so it never steals a scroll.
 */
export const ChatListRow = ({ chat, onOpen, onMute, onDelete }: ChatListRowProps) => {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<'none' | 'x' | 'y'>('none');

  const other = chat.other || {};
  const unread = chat.unread || 0;

  const preview =
    chat.lastMessageType === 'voice'
      ? 'Voice message'
      : chat.lastMessageType === 'gift'
        ? 'Sent a gift'
        : chat.lastMessageType === 'image'
          ? 'Photo'
          : chat.lastMessage || 'No messages yet';

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = 'none';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    if (axis.current === 'none') {
      // Wait for a clear direction before committing, so vertical scroll wins ties.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (axis.current !== 'x') return;

    const base = open ? -ACTION_WIDTH : 0;
    setOffset(Math.min(0, Math.max(-ACTION_WIDTH, base + dx)));
  };

  const onPointerUp = () => {
    if (axis.current === 'x') {
      const shouldOpen = offset < -ACTION_WIDTH / 2;
      setOpen(shouldOpen);
      setOffset(shouldOpen ? -ACTION_WIDTH : 0);
    }
    start.current = null;
    axis.current = 'none';
  };

  const close = () => {
    setOpen(false);
    setOffset(0);
  };

  return (
    <div className="relative overflow-hidden bg-surface-sunken">
      {/* Actions revealed behind the row */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => {
            onMute?.(!chat.muted);
            close();
          }}
          className="w-[72px] flex flex-col items-center justify-center gap-1 bg-ink-faint text-white"
        >
          <BellOff className="w-5 h-5" />
          <span className="text-[11px] font-semibold">{chat.muted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button
          onClick={() => {
            onDelete?.();
            close();
          }}
          className="w-[72px] flex flex-col items-center justify-center gap-1 bg-role-host text-white"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Delete</span>
        </button>
      </div>

      <div
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => (open ? close() : onOpen())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen();
        }}
        style={{ transform: `translateX(${offset}px)` }}
        className="relative flex items-center gap-3 px-4 py-3 bg-white active:bg-surface-sunken
          transition-transform duration-150 ease-out touch-pan-y cursor-pointer"
      >
        <Avatar src={other.avatar} nickname={other.nickname || '?'} size="md" online={other.online} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-ink truncate">{other.nickname || 'User'}</span>
            {other.country && <span className="shrink-0 leading-none">{flagEmoji(other.country)}</span>}
            {typeof other.level === 'number' && <LevelBadge level={other.level} />}
            {chat.muted && <BellOff className="w-3.5 h-3.5 text-ink-ghost shrink-0" />}
          </div>

          {chat.streak && chat.streak.current < chat.streak.target && (
            <span className="inline-flex items-center gap-1 mt-1 h-[18px] px-1.5 rounded bg-surface-sunken text-[10px] font-semibold text-ink-muted">
              ⭐ Activating {chat.streak.current}/{chat.streak.target}
            </span>
          )}

          <p className="text-sm text-ink-muted truncate mt-0.5">{preview}</p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[11px] text-ink-faint">{timeAgo(chat.lastMessageAt)}</span>
          {unread > 0 && !chat.muted && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-status-live text-white text-[11px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
          {unread > 0 && chat.muted && <span className="w-2 h-2 rounded-full bg-ink-ghost" />}
        </div>
      </div>
    </div>
  );
};
