import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PiGiftFill as Gift, PiHeartFill as Heart, PiStarFill as Star, PiUsersFill as Users, PiXBold as X } from 'react-icons/pi';
import { partyApi, type PartyRoomDetail, type RoomSeat } from '../api/party.api';
import { optional } from '../api/pending';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import { SeatBoard } from '../components/party/SeatBoard';
import { HostToolsSheet, PARTY_BOTTOM_ICONS } from '../components/party/HostToolsSheet';
import { PkTypesSheet } from '../components/party/PkTypesSheet';
import { Loading } from '../components/ui';
import { MessageInput, GiftOverlay } from '../components/live';
import { GiftPanel } from '../components/stream';
import type { GiftBurst } from '../components/live/GiftOverlay';
import { compactNumber, initial } from '../lib/time';

/**
 * Party room — requirements #17 and #18.
 *
 * Deliberately dark: it is a live room, the same way the video live room is.
 *
 * **#18 is satisfied structurally**, not by a setting: the host circle and every
 * seat render that user's own avatar (`ownerId.avatar`, `seats[i].userId.avatar`)
 * with a letter fallback. There is no fixed `[HM]` asset anywhere in this screen
 * or in `SeatBoard`.
 *
 * Seat actions are specified in BACKEND-GUIDE.md §4.9 and not built yet, so
 * tapping a seat reports that rather than appearing to work.
 */

type ChatFilter = 'all' | 'room' | 'chat';

interface RoomMessage {
  id: string;
  kind: 'join' | 'chat' | 'win';
  nickname: string;
  level?: number;
  text?: string;
  amount?: number;
}

export const PartyRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [room, setRoom] = useState<PartyRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [pkOpen, setPkOpen] = useState(false);
  const [giftPanelOpen, setGiftPanelOpen] = useState(false);
  const [giftBurst, setGiftBurst] = useState<GiftBurst | null>(null);

  const isHost = !!room && !!user && room.ownerId?._id === user._id;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    optional(partyApi.getRoom(id))
      .then((res) => {
        if (!cancelled && res?.success) setRoom(res.data ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    partyApi.joinRoom(id).catch(() => {});
    return () => {
      cancelled = true;
      partyApi.leaveRoom(id).catch(() => {});
    };
  }, [id]);

  /* Live room events — #17.4 win bar, #17.7 join highlight, room chat. */
  useEffect(() => {
    if (!socket || !id) return;

    const push = (msg: RoomMessage) =>
      setMessages((prev) => [...prev.slice(-40), msg]);

    const onJoin = (p: any) =>
      push({ id: `${Date.now()}-j`, kind: 'join', nickname: p?.nickname ?? 'Someone', level: p?.level });
    const onMessage = (p: any) =>
      push({
        id: `${Date.now()}-m`,
        kind: 'chat',
        nickname: p?.nickname ?? 'Someone',
        level: p?.level,
        text: p?.message,
      });
    const onWin = (p: any) =>
      push({ id: `${Date.now()}-w`, kind: 'win', nickname: p?.nickname ?? 'Someone', amount: p?.amount });
    const onSeat = (p: any) => {
      if (p?.roomId !== id || !p?.seats) return;
      setRoom((prev) => (prev ? { ...prev, seats: p.seats } : prev));
    };
    const onGift = (p: any) => {
      push({ id: `${Date.now()}-g`, kind: 'chat', nickname: p?.senderName ?? 'Someone', text: `Sent a ${p?.gift?.name}!` });
      if (p?.gift?.animation) {
         setGiftBurst({
           url: p.gift.animation,
           key: Date.now(),
         });
      }
    };

    socket.on('room:join:highlight', onJoin);
    socket.on('room:message', onMessage);
    socket.on('room:win', onWin);
    socket.on('room:seat:update', onSeat);
    socket.on('room:gift', onGift);

    return () => {
      socket.off('room:join:highlight', onJoin);
      socket.off('room:message', onMessage);
      socket.off('room:win', onWin);
      socket.off('room:seat:update', onSeat);
      socket.off('room:gift', onGift);
    };
  }, [socket, id]);

  const visibleMessages = useMemo(() => {
    if (filter === 'room') return messages.filter((m) => m.kind !== 'chat');
    if (filter === 'chat') return messages.filter((m) => m.kind === 'chat');
    return messages;
  }, [messages, filter]);

  const latestWin = useMemo(
    () => [...messages].reverse().find((m) => m.kind === 'win'),
    [messages]
  );

  const handleSeatPress = async (seat: RoomSeat) => {
    if (!id) return;
    if (seat.isLocked) {
      showToast('This seat is locked', 'info');
      return;
    }
    const occupant = seat.userId && typeof seat.userId === 'object' ? seat.userId : null;
    if (occupant) {
      if (occupant._id === user?._id) {
        const res = await optional(partyApi.stand(id, seat.index)).catch(() => null);
        if (!res?.success) showToast(res?.error || 'Failed to leave seat', 'error');
        return;
      }
      navigate(`/user/${occupant._id}`);
      return;
    }
    const res = await optional(partyApi.sit(id, seat.index)).catch(() => null);
    if (!res?.success) {
      showToast(res?.error || 'Failed to take seat', 'error');
      return;
    }
  };

  const handleTool = (key: string, label: string) => {
    setToolsOpen(false);
    if (key === 'pk') {
      setPkOpen(true);
      return;
    }
    if (key === 'store') {
      navigate('/store');
      return;
    }
    if (key === 'rewards') {
      navigate('/rewards');
      return;
    }
    if (key === 'rank') {
      navigate('/rankings?board=gift');
      return;
    }
    if (key === 'fan_club') {
      navigate('/fan-club');
      return;
    }
    if (key === 'gift' || key === 'gift_center') {
      setGiftPanelOpen(true);
      return;
    }
    showToast(`${label} is not connected yet`, 'info');
  };

  const handleSendMessage = (text: string) => {
    if (!id || !socket) return;
    socket.emit('room:message', { roomId: id, message: text });
    setMessages((prev) => [...prev.slice(-40), {
      id: `${Date.now()}-self`,
      kind: 'chat',
      nickname: user?.nickname ?? 'Me',
      text
    }]);
  };

  const handleSendGift = (gift: any) => {
    if (!id || !socket) return;
    socket.emit('room:gift', { roomId: id, giftId: gift._id, receiverId: room?.ownerId?._id });
    setGiftPanelOpen(false);
    
    // Show local animation for sender
    setMessages((prev) => [...prev.slice(-40), { id: `${Date.now()}-self-g`, kind: 'chat', nickname: user?.nickname ?? 'Me', text: `Sent a ${gift.name}!` }]);
    if (gift.animation) {
       setGiftBurst({
         url: gift.animation,
         key: Date.now(),
       });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A0E38]">
        <Loading className="pt-32" size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#150B2E] flex flex-col">
      {/* ── Header (#17.1) ─────────────────────────────────────── */}
      <header className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {/* #18 — the host's own picture, never a fixed logo */}
          <span className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
            {room?.ownerId?.avatar ? (
              <img src={room.ownerId.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">
                {initial(room?.ownerId?.nickname)}
              </span>
            )}
          </span>

          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">
              {room?.ownerId?.nickname ?? room?.name ?? 'Party'}
            </p>
            <p className="text-[10px] text-white/60 flex items-center gap-1">
              <Heart className="w-3 h-3" /> 0
            </p>
          </div>

          <button
            onClick={() => setGiftPanelOpen(true)}
            className="ml-auto h-8 px-3 rounded-full bg-[#FF3B7F]/90 text-white text-xs font-bold flex items-center gap-1 shrink-0"
          >
            <Gift className="w-3.5 h-3.5" /> Gift
          </button>

          <span className="h-8 px-2.5 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center gap-1 shrink-0">
            <Users className="w-3.5 h-3.5" />
            {compactNumber(room?.viewerCount ?? 0)}
          </span>

          <button
            onClick={() => navigate(-1)}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Second line — hour progress + rule + id */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-[8%] rounded-full bg-gradient-to-r from-[#F5C518] to-[#FF8A2A]" />
          </div>
          <button className="h-6 px-2 rounded-full bg-white/10 text-white/80 text-[10px] font-semibold">
            Rule
          </button>
          <span className="text-[10px] text-white/50">ID {room?._id?.slice(-8) ?? '—'}</span>
        </div>
      </header>

      {/* ── Promo banner (#17.2) ───────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <button className="h-8 px-3 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-[#F5C518]" /> Make A Wish
        </button>
        <div className="flex-1 h-8 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] flex items-center px-3">
          <p className="text-[11px] text-white font-semibold truncate">
            {room?.announcement || '#Share Your Glory Moments'}
          </p>
        </div>
      </div>

      {/* ── 16-seat board (#17.3) ──────────────────────────────── */}
      <div className="px-3">
        <SeatBoard
          host={room?.ownerId}
          seats={room?.seats ?? []}
          seatCount={room?.seatCount ?? 16}
          onSeatPress={handleSeatPress}
          onHostPress={() => room?.ownerId?._id && navigate(`/user/${room.ownerId._id}`)}
        />
      </div>

      {/* ── Win bar (#17.4) ────────────────────────────────────── */}
      {latestWin && (
        <div className="mx-3 mt-3 h-9 rounded-full bg-gradient-to-r from-[#F5C518] to-[#FF8A2A] flex items-center px-3 gap-2 overflow-hidden">
          <span className="text-sm">🎉</span>
          <p className="text-[12px] font-bold text-[#2A1655] truncate">
            {latestWin.nickname} won {compactNumber(latestWin.amount ?? 0)}
          </p>
        </div>
      )}

      {/* ── Warning (#17.5) ────────────────────────────────────── */}
      <p className="px-4 pt-3 text-[10px] text-[#5EE7F0]/80 leading-relaxed">
        Pornography, violence and other illegal content are strictly prohibited in this room.
      </p>

      {/* ── Chat filter + messages (#17.6, #17.7) ──────────────── */}
      <div className="flex-1 flex gap-2 px-3 pt-2 pb-2 min-h-[120px]">
        <div className="flex flex-col gap-1 shrink-0">
          {(['all', 'room', 'chat'] as ChatFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`h-7 px-2 rounded-lg text-[10px] font-bold capitalize ${
                filter === key ? 'bg-[#8B5CF6] text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar">
          {visibleMessages.length === 0 ? (
            <p className="text-[11px] text-white/40 pt-2">Say hello to the room…</p>
          ) : (
            visibleMessages.map((msg) => (
              <p key={msg.id} className="text-[12px] leading-snug">
                {msg.kind === 'join' ? (
                  <span className="text-[#F5C518]">
                    {msg.level != null && (
                      <span className="mr-1 px-1 rounded bg-white/15 text-white text-[10px]">
                        Lv.{msg.level}
                      </span>
                    )}
                    {msg.nickname} joined
                  </span>
                ) : msg.kind === 'win' ? (
                  <span className="text-[#FFB020]">
                    🎉 {msg.nickname} won {compactNumber(msg.amount ?? 0)}
                  </span>
                ) : (
                  <span className="text-white/90">
                    <span className="text-[#9BB4FF] font-semibold">{msg.nickname}: </span>
                    {msg.text}
                  </span>
                )}
              </p>
            ))
          )}
        </div>
      </div>

      {/* ── Bottom bar, Chat & icons (#17.8) ────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-3 safe-bottom border-t border-white/10">
        <MessageInput onSend={handleSendMessage} onOpenGift={() => setGiftPanelOpen(true)} />
        <div className="flex items-center gap-1 shrink-0">
          {PARTY_BOTTOM_ICONS.filter(i => ['mic', 'tools'].includes(i.key)).map(({ key, label, Icon, dot }) => (
            <button
              key={key}
              onClick={() =>
                key === 'tools'
                  ? setToolsOpen(true)
                  : showToast(`${label} is not connected yet`, 'info')
              }
              aria-label={label}
              className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
            >
              <Icon className="w-[18px] h-[18px] text-white" />
              {dot && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-status-live" />}
            </button>
          ))}
        </div>
      </div>

      <HostToolsSheet
        isOpen={toolsOpen}
        onClose={() => setToolsOpen(false)}
        isHost={isHost}
        onAction={handleTool}
      />
      <PkTypesSheet isOpen={pkOpen} onClose={() => setPkOpen(false)} roomId={id} />

      {/* Gift Panel Overlay */}
      {giftPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setGiftPanelOpen(false)} />
          <div className="relative w-full max-w-md bg-[#1A1A1A] rounded-t-sheet max-h-[80vh] flex flex-col animate-slide-up pb-safe">
             <div className="flex items-center justify-between px-4 h-14 shrink-0">
                <h3 className="text-base font-bold text-white">Send Gift</h3>
                <button onClick={() => setGiftPanelOpen(false)} aria-label="Close" className="text-white/60 p-1"><X className="w-5 h-5" /></button>
             </div>
             <div className="flex-1 overflow-y-auto">
               <GiftPanel receiverId={room?.ownerId?._id ?? ''} onSend={handleSendGift} />
             </div>
          </div>
        </div>
      )}

      {/* Full screen gift animation overlay */}
      <GiftOverlay burst={giftBurst} onBurstComplete={() => setGiftBurst(null)} />
    </div>
  );
};
