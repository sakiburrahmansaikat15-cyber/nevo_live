import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PiCaretLeftBold as ArrowLeft, PiWaveformBold as AudioLines, PiGiftFill as GiftIcon, PiMicrophoneFill as Mic, PiDotsThreeBold as MoreHorizontal, PiPauseFill as Pause, PiPhoneFill as Phone, PiPlayFill as Play, PiPlusBold as Plus, PiPaperPlaneRightFill as Send, PiSmileyFill as Smile, PiVideoCameraFill as Video, PiXBold as X } from 'react-icons/pi';
import { chatApi, callApi, giftsApi, uploadApi } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { GiftPanel } from '../components/stream';
import { Modal } from '../components/ui';
import { CallScreen } from '../components/call/CallScreen';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type { Gift } from '../types';
import type { ChatStreak } from '../api/chat.api';

interface CallState {
  incoming?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    initiatorId: string;
    token: string;
    initiator: { nickname: string; avatar?: string } | null;
  };
  outgoing?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    token: string;
    callee: { nickname: string; avatar?: string } | null;
  };
}

/** Requirement #21C — chips above the input; tapping one sends it straight away. */
const QUICK_REPLIES = [
  { label: 'Hi', emoji: '👋' },
  { label: 'Love', emoji: '💗' },
  { label: 'For you', emoji: '🎁' },
  { label: 'Starlink', emoji: '⭐' },
];

const dayKey = (iso?: string) => (iso ? new Date(iso).toDateString() : '');

const dayLabel = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
};

const clockTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

/** Voice bubble — `mine` flips the colours for the blue bubble. */
const VoiceBubble = ({ url, duration, mine }: { url: string; duration?: number; mine: boolean }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.ontimeupdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
    };
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-[150px]">
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          mine ? 'bg-white/25' : 'bg-surface-sunken'
        }`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className={`flex-1 h-1 rounded-full overflow-hidden ${mine ? 'bg-white/30' : 'bg-line-strong'}`}>
        <div
          className={`h-full transition-[width] duration-200 ${mine ? 'bg-white' : 'bg-accent-500'}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums opacity-80">{duration ? `${duration}"` : ''}</span>
    </div>
  );
};

export const ChatThread = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [messages, setMessages] = useState<any[]>([]);
  const [other, setOther] = useState<any>(null);
  const [streak, setStreak] = useState<ChatStreak | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [call, setCall] = useState<CallState | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const callRef = useRef<CallState | null>(null);
  callRef.current = call;
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    recording,
    duration,
    error: voiceError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();
  const recordingRef = useRef(false);

  const loadChat = () => {
    if (!chatId) return;
    chatApi
      .getMessages(chatId, { limit: 100 })
      .then(({ data }) => {
        if (data.success) setMessages(data.data || []);
      })
      .finally(() => setLoading(false));
  };

  // Resolve the other participant from the chat list.
  useEffect(() => {
    if (!chatId) return;
    chatApi.getChats({ limit: 50 }).then(({ data }) => {
      if (data.success) {
        const found = (data.data || []).find((x: any) => x._id === chatId);
        if (found) setOther(found.other || null);
      }
    });
  }, [chatId]);

  // Requirement #21E — streak tag. Not built yet; hides until it is.
  useEffect(() => {
    if (!chatId) return;
    optional(chatApi.getStreak(chatId))
      .then((res) => setStreak(res?.data || null))
      .catch(() => {});
  }, [chatId]);

  useEffect(() => {
    loadChat();
  }, [chatId]);

  // Mark read on open — never before the user actually opens the thread.
  useEffect(() => {
    if (!chatId) return;
    chatApi.markRead(chatId).catch(() => {});
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const otherIdRef = useRef<string | undefined>(undefined);
  otherIdRef.current = other?._id;

  useEffect(() => {
    if (!socket || !chatId) return;

    const handler = (payload: any) => {
      if (payload?.chatId !== chatId) return;
      const msg = payload.message;
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      if (msg.senderId !== user?._id) chatApi.markRead(chatId).catch(() => {});
    };
    socket.on('chat:message', handler);

    const onCallInvite = (payload: any) => {
      if (payload?.initiatorId === otherIdRef.current) {
        setCall({
          incoming: {
            callId: payload.callId,
            channel: payload.channel,
            type: payload.type,
            initiatorId: payload.initiatorId,
            token: payload.token,
            initiator: other ? { nickname: other.nickname, avatar: other.avatar } : null,
          },
        });
      }
    };
    socket.on('call:invite', onCallInvite);

    const onCallAccept = (payload: any) => {
      if (payload?.callId && callRef.current?.outgoing?.callId === payload.callId) setCallAccepted(true);
    };
    socket.on('call:accept', onCallAccept);

    return () => {
      socket.off('chat:message', handler);
      socket.off('call:invite', onCallInvite);
      socket.off('call:accept', onCallAccept);
    };
  }, [socket, chatId, user]);

  const sendText = async (text: string) => {
    if (!text.trim() || !chatId) return;
    setSending(true);
    try {
      const { data } = await chatApi.sendMessage(chatId, text.trim());
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        return;
      }
      throw new Error(data.error || 'send failed');
    } catch {
      // Keep the message visible locally rather than losing what they typed.
      setMessages((prev) => [
        ...prev,
        {
          _id: `temp-${Date.now()}`,
          senderId: user?._id,
          message: text.trim(),
          createdAt: new Date().toISOString(),
          read: false,
          failed: true,
        },
      ]);
      showToast('Message could not be sent', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendText(text);
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!other?._id) return;
    setCallAccepted(false);
    try {
      const { data } = await callApi.create([other._id], type);
      if (data.success && data.data) {
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: { nickname: other.nickname, avatar: other.avatar },
          },
        });
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not start the call', 'error');
    }
  };

  const handleSendGift = async (gift: Gift, quantity: number) => {
    if (!other?._id || !chatId) return;
    try {
      const { data } = await giftsApi.send(other._id, gift._id, quantity);
      if (data.success && data.data?.senderBalance != null) {
        updateUser({ diamonds: data.data.senderBalance });
      }
      // Record it as a chat message — the gift itself already went through.
      const { data: msg } = await chatApi.sendMessage(chatId, `Sent ${gift.name} x${quantity}`, {
        kind: 'gift',
        giftId: gift._id,
        giftName: gift.name,
        giftIcon: gift.icon,
        giftCount: quantity,
        giftPrice: gift.priceDiamonds,
      });
      if (msg.success) setMessages((prev) => [...prev, msg.data]);
      showToast(`Sent ${quantity}x ${gift.name}`, 'success');
      setShowGift(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send gift', 'error');
      throw err;
    }
  };

  const handleVoiceStart = async () => {
    recordingRef.current = true;
    await startRecording();
  };

  const handleVoiceStop = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    const result = await stopRecording();
    if (!result || !chatId) return;
    try {
      const url = await uploadApi.upload(result.blob, 'voice-messages');
      const { data } = await chatApi.sendMessage(chatId, 'Voice message', {
        kind: 'voice',
        voiceUrl: url,
        voiceDuration: result.duration,
      });
      if (data.success) setMessages((prev) => [...prev, data.data]);
    } catch {
      showToast('Failed to send voice message', 'error');
    }
  };

  // Group messages by day so a separator can be dropped in between.
  const withSeparators = useMemo(() => {
    const out: { type: 'day'; label: string; key: string }[] | any[] = [];
    let lastDay = '';
    for (const m of messages) {
      const key = dayKey(m.createdAt);
      if (key !== lastDay) {
        out.push({ type: 'day', label: dayLabel(m.createdAt), key: `day-${key}` });
        lastDay = key;
      }
      out.push(m);
    }
    return out;
  }, [messages]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-soft">
      {/* ── Header (#21A) ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-2.5 px-3 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>

          <Avatar src={other?.avatar} nickname={other?.nickname || '?'} size="sm" online={other?.online} />

          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold text-ink truncate leading-tight">
              {other?.nickname || 'Chat'}
            </h1>
            {streak && streak.current < streak.target ? (
              <span className="inline-flex items-center gap-1 mt-0.5 h-[17px] px-1.5 rounded bg-surface-sunken text-[10px] font-semibold text-ink-muted">
                ⭐ Activating {streak.current}/{streak.target}
              </span>
            ) : (
              other?.uid && <p className="text-[11px] text-ink-faint leading-tight">ID: {other.uid}</p>
            )}
          </div>

          <button
            onClick={() => startCall('audio')}
            aria-label="Audio call"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken"
          >
            <Phone className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => startCall('video')}
            aria-label="Video call"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken"
          >
            <Video className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => other?._id && navigate(`/user/${other._id}`)}
            aria-label="More"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Messages (#21B) ────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-3 space-y-2.5 overflow-y-auto">
        {loading ? (
          <p className="text-center text-sm text-ink-muted py-10">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-ink-muted py-10">
            Say hi to {other?.nickname || 'your new friend'} 👋
          </p>
        ) : (
          withSeparators.map((item: any, index: number) => {
            if (item.type === 'day') {
              return (
                <p key={item.key} className="text-center text-[11px] text-ink-faint py-2">
                  {item.label}
                </p>
              );
            }

            const mine = item.senderId === user?._id;
            const isLast = index === withSeparators.length - 1;

            return (
              <div key={item._id || index} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && (
                  <Avatar src={other?.avatar} nickname={other?.nickname || '?'} size="xs" className="mt-auto" />
                )}

                <div className="max-w-[72%]">
                  <div
                    className={`px-3.5 py-2.5 text-sm rounded-2xl ${
                      mine
                        ? 'bg-accent-500 text-white rounded-br-md'
                        : 'bg-white text-ink rounded-bl-md shadow-card'
                    } ${item.failed ? 'opacity-60' : ''}`}
                  >
                    {item.kind === 'voice' ? (
                      <VoiceBubble url={item.voiceUrl} duration={item.voiceDuration} mine={mine} />
                    ) : item.kind === 'gift' ? (
                      <div className="flex items-center gap-2">
                        {item.giftIcon ? (
                          <img src={item.giftIcon} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          <GiftIcon className="w-5 h-5" />
                        )}
                        <span className="font-medium">{item.message}</span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{item.message}</p>
                    )}
                  </div>

                  <div className={`flex items-center gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-ink-faint">{clockTime(item.createdAt)}</span>
                    {mine && isLast && item.read && (
                      <span className="text-[10px] text-ink-faint font-medium">Seen</span>
                    )}
                    {item.failed && <span className="text-[10px] text-role-host font-medium">Not sent</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* #21B.4 — streak nudge in the middle of the thread */}
        {streak && !streak.litUp && streak.current > 0 && (
          <div className="flex justify-center py-2">
            <span className="px-3 py-1.5 rounded-full bg-line text-[11px] text-ink-muted">
              Chat {streak.target} days straight to light up your Starlink{' '}
              <span className="text-accent-500 font-semibold">⭐</span>
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Recording banner */}
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 py-2.5 flex items-center justify-between bg-role-host/10 border-t border-role-host/20"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-role-host animate-pulse" />
              <span className="text-sm text-role-host font-medium">Recording… {duration}s</span>
            </div>
            <button
              onClick={() => {
                recordingRef.current = false;
                cancelRecording();
              }}
              className="flex items-center gap-1 text-xs text-role-host font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {voiceError && <p className="px-4 pb-1 text-xs text-role-host">{voiceError}</p>}

      {/* ── Quick replies (#21C) ───────────────────────────────────── */}
      <div className="flex gap-2 px-3 pb-2 pt-1 overflow-x-auto no-scrollbar bg-surface-soft">
        {QUICK_REPLIES.map(({ label, emoji }) => (
          <button
            key={label}
            onClick={() => sendText(label)}
            disabled={sending}
            className="shrink-0 h-9 px-3.5 rounded-full bg-white border border-line text-sm text-ink
              flex items-center gap-1.5 active:bg-surface-sunken disabled:opacity-50"
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
        <button
          onClick={() => setShowGift(true)}
          className="shrink-0 h-9 px-3.5 rounded-full bg-primary-50 border border-primary-200 text-sm font-medium text-primary-600 flex items-center gap-1.5"
        >
          <GiftIcon className="w-4 h-4" />
          Gift
        </button>
      </div>

      {/* ── Input bar (#21D) ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-t border-line safe-bottom">
        <button
          onPointerDown={handleVoiceStart}
          onPointerUp={handleVoiceStop}
          onPointerLeave={() => {
            if (recordingRef.current) handleVoiceStop();
          }}
          aria-label="Hold to record a voice message"
          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            recording ? 'bg-role-host border-role-host text-white' : 'border-ink text-ink'
          }`}
        >
          <AudioLines className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center gap-1.5 h-11 pl-4 pr-1.5 rounded-full bg-surface-sunken">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Say something"
            className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button aria-label="Emoji" className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted">
            <Smile className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowGift(true)}
            aria-label="More"
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {input.trim() ? (
          <button
            onClick={handleSend}
            disabled={sending}
            aria-label="Send"
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <button
            onClick={() => setShowGift(true)}
            aria-label="Send a gift"
            className="w-10 h-10 rounded-full bg-surface-sunken text-ink flex items-center justify-center shrink-0"
          >
            <Mic className="w-[18px] h-[18px] hidden" />
            <GiftIcon className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      <Modal isOpen={showGift} onClose={() => setShowGift(false)} title="Send a gift">
        {other?._id && <GiftPanel receiverId={other._id} onSend={handleSendGift} />}
      </Modal>

      {call && (
        <CallScreen
          incoming={call.incoming}
          outgoing={call.outgoing}
          accepted={callAccepted}
          onClose={(outcome?: 'ended' | 'rejected') => {
            setCall(null);
            setCallAccepted(false);
            if (outcome === 'rejected') showToast('Call declined', 'info');
          }}
        />
      )}
    </div>
  );
};
