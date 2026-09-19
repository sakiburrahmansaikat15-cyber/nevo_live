import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiChatCircleFill as MessageCircle, PiPlusBold as Plus, PiMagnifyingGlassBold as Search, PiVideoCameraFill as Video, PiCaretLeftBold as ChevronLeft } from 'react-icons/pi';
import { chatApi, callApi } from '../api';
import { optional } from '../api/pending';
import { useSocketStore, useAuthStore, useUIStore } from '../stores';
import { ActiveUserStrip, ChatListRow, OfficialRow, type ChatRow } from '../components/chat';
import { CallScreen, MemberPicker, CallInviteBanner, type IncomingGroupInvite } from '../components/call';
import { Modal, Loading } from '../components/ui';
import type { ActiveChatUser, OfficialChatKey, OfficialChatRow } from '../api/chat.api';

/**
 * Requirement #16 / #65 — Message page.
 *
 * Layout: title bar → active-user strip → official rows → private chats.
 *
 * The strip and the official rows come from endpoints that are specified but
 * not built yet (see API-SPEC.md). `optional()` turns their 404 into an empty
 * list, so those sections simply don't render until the backend ships them —
 * no error, and no frontend change needed later.
 */
export const Chats = () => {
  const navigate = useNavigate();
  const socket = useSocketStore((s) => s.socket);
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [official, setOfficial] = useState<OfficialChatRow[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveChatUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPicker, setShowPicker] = useState(false);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [call, setCall] = useState<{
    outgoing?: {
      callId: string;
      channel: string;
      type: 'audio' | 'video';
      token: string;
      callee?: { nickname: string; avatar?: string } | null;
    };
    incoming?: IncomingGroupInvite;
  } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [invite, setInvite] = useState<IncomingGroupInvite | null>(null);

  const callRef = useRef(call);
  callRef.current = call;
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    const [list, officialRows, active] = await Promise.all([
      chatApi.getChats({ limit: 50 }).then(({ data }) => (data.success ? data.data || [] : [])).catch(() => []),
      optional(chatApi.getOfficialRows()).then((r) => r?.data || []),
      optional(chatApi.getActiveUsers()).then((r) => r?.data || []),
    ]);
    setChats(list);
    setOfficial(officialRows);
    setActiveUsers(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live refresh — new messages and read receipts both reorder the list.
  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(load, 400);
    };
    socket.on('chat:message', refresh);
    socket.on('chat:read', refresh);
    return () => {
      socket.off('chat:message', refresh);
      socket.off('chat:read', refresh);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [socket, load]);

  const loadActiveCalls = () => {
    callApi
      .getActive()
      .then(({ data }) => {
        if (data.success) setActiveCalls(data.data || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadActiveCalls();
    const t = setInterval(loadActiveCalls, 15000);
    return () => clearInterval(t);
  }, []);

  /* ── Group calls (unchanged behaviour) ──────────────────────────── */

  const startGroupCall = async (users: { _id: string; nickname: string; avatar?: string }[]) => {
    setShowPicker(false);
    try {
      const { data } = await callApi.create(users.map((u) => u._id), 'video');
      if (data.success && data.data) {
        setCallAccepted(false);
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: users.length === 1 ? { nickname: users[0].nickname, avatar: users[0].avatar } : null,
          },
        });
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not start the group call', 'error');
    }
  };

  const joinCall = async (callId: string) => {
    try {
      const { data } = await callApi.join(callId);
      if (data.success && data.data) {
        setCallAccepted(true);
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
          },
        });
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not join the call', 'error');
    }
  };

  useEffect(() => {
    if (!socket) return;
    const onInvite = (payload: any) => {
      if (!payload?.callId || !payload?.participantCount || payload.participantCount <= 2) return;
      if (currentUser && payload.initiatorId === currentUser._id) return;
      setInvite({
        callId: payload.callId,
        channel: payload.channel,
        type: payload.type,
        initiatorId: payload.initiatorId,
        token: payload.token,
        participantCount: payload.participantCount,
        maxParticipants: payload.maxParticipants,
      });
    };
    const onAccept = (payload: any) => {
      if (payload?.callId && callRef.current?.outgoing?.callId === payload.callId) setCallAccepted(true);
    };
    socket.on('call:invite', onInvite);
    socket.on('call:accept', onAccept);
    return () => {
      socket.off('call:invite', onInvite);
      socket.off('call:accept', onAccept);
    };
  }, [socket, currentUser]);

  const acceptInvite = async (inv: IncomingGroupInvite) => {
    setInvite(null);
    try {
      const { data } = await callApi.accept(inv.callId);
      if (data.success && data.data) {
        setCallAccepted(true);
        setCall({ incoming: { ...inv, initiator: inv.initiator || null } });
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not accept the call', 'error');
    }
  };

  const declineInvite = async (inv: IncomingGroupInvite) => {
    setInvite(null);
    await callApi.end(inv.callId, 'rejected').catch(() => {});
  };

  /* ── Row actions ────────────────────────────────────────────────── */

  const handleMute = async (chatId: string, muted: boolean) => {
    // Optimistic — the badge style changes immediately.
    setChats((rows) => rows.map((c) => (c._id === chatId ? { ...c, muted } : c)));
    const result = await optional(chatApi.muteChat(chatId, muted)).catch(() => null);
    if (result === null) {
      setChats((rows) => rows.map((c) => (c._id === chatId ? { ...c, muted: !muted } : c)));
      showToast('Mute is not available yet', 'info');
    }
  };

  const handleDelete = async (chatId: string) => {
    const previous = chats;
    setChats((rows) => rows.filter((c) => c._id !== chatId));
    const result = await optional(chatApi.deleteChat(chatId)).catch(() => null);
    if (result === null) {
      setChats(previous);
      showToast('Deleting a chat is not available yet', 'info');
    }
  };

  const openOfficial = (key: OfficialChatKey) => {
    // Until the dedicated screen exists, the notification centre holds the same items.
    optional(chatApi.markOfficialRead(key)).catch(() => {});
    navigate(key === 'new_followers' ? '/notifications' : '/official-notifications');
  };

  return (
    <div className="min-h-screen bg-surface-soft">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-[26px] font-bold text-ink">Message</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/search')}
              aria-label="Search"
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowPicker(true)}
              aria-label="New chat or group"
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <Loading className="pt-24" size="lg" />
      ) : (
        <>
          {/* #16B — live / online strip */}
          <ActiveUserStrip users={activeUsers} />

          {/* Active group calls */}
          {activeCalls.length > 0 && (
            <div className="mt-3 bg-white">
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" /> Active calls
              </p>
              {activeCalls.map((c: any) => (
                <button
                  key={c.callId}
                  onClick={() => joinCall(c.callId)}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-surface-sunken transition-colors"
                >
                  <span className="w-12 h-12 rounded-full bg-[#E9F9EE] flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-[#22A45D]" />
                  </span>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm text-ink">
                      {c.type === 'video' ? 'Video' : 'Audio'} call
                    </p>
                    <p className="text-xs text-ink-muted truncate">
                      {c.participants?.map((p: any) => p.nickname).slice(0, 3).join(', ') || 'Members'}
                      {c.participants?.length > 3 ? ` +${c.participants.length - 3}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-ink-muted shrink-0">
                    {c.participants?.length}/{c.maxParticipants || 10}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* #16C — official rows */}
          {official.length > 0 && (
            <div className="mt-3 bg-white divide-y divide-line">
              {official.map((row) => (
                <OfficialRow key={row.key} row={row} onClick={() => openOfficial(row.key)} />
              ))}
            </div>
          )}

          {/* Private conversations */}
          {chats.length === 0 ? (
            <div className="text-center pt-20 px-8">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-ink-ghost" />
              </div>
              <p className="text-base font-semibold text-ink mb-1">No messages yet</p>
              <p className="text-sm text-ink-muted">
                Find people on Discover and tap Message to start a conversation.
              </p>
            </div>
          ) : (
            <div className="mt-3 bg-white divide-y divide-line">
              {chats.map((chat) => (
                <ChatListRow
                  key={chat._id}
                  chat={chat}
                  onOpen={() => navigate(`/chat/${chat._id}`)}
                  onMute={(muted) => handleMute(chat._id, muted)}
                  onDelete={() => handleDelete(chat._id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} title="New group call">
        <MemberPicker onConfirm={startGroupCall} onClose={() => setShowPicker(false)} />
      </Modal>

      <CallInviteBanner invite={invite} onAccept={acceptInvite} onDecline={declineInvite} />

      {call && (
        <CallScreen
          incoming={call.incoming as any}
          outgoing={call.outgoing as any}
          accepted={callAccepted}
          onClose={() => {
            setCall(null);
            setCallAccepted(false);
            loadActiveCalls();
          }}
        />
      )}
    </div>
  );
};
