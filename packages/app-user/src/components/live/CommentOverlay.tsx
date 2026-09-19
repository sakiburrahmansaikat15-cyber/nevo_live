import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PiGiftFill as GiftIcon, PiStarFill as Star, PiSpeakerHighFill as Speaker } from 'react-icons/pi';
import { Avatar, LevelBadge } from '../user';
import type { RoomMessage } from './types';

interface CommentOverlayProps {
  messages: RoomMessage[];
  currentUserId?: string;
}

const isGiftMsg = (m: RoomMessage) => m.isGift || !!m.gift;

const CommentBubble = ({ msg, isOwn }: { msg: RoomMessage; isOwn: boolean }) => {
  const nickname = msg.nickname || 'Guest';
  const message = msg.message || '';
  const isJoined = msg.kind === 'join';
  if (isJoined) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -24, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 shadow-md mb-1 max-w-[85%]"
      >
        <Star className="w-3.5 h-3.5 text-white/90" />
        <span className="text-[12px] font-bold text-white leading-snug truncate">
          {nickname}... Joined
        </span>
      </motion.div>
    );
  }

  return (
  <motion.div
    layout
    initial={{ opacity: 0, x: -24, scale: 0.96 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className={`flex items-start gap-1 w-full ${isOwn ? 'flex-row-reverse' : ''}`}
  >
    <div
      className={`rounded-xl px-2 py-1.5 backdrop-blur-md ${
        isGiftMsg(msg)
          ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 shadow-lg'
          : 'bg-[#1a172c]/60'
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5 inline-block text-[12px] leading-tight">
        {!isGiftMsg(msg) && (
          <span className="inline-flex items-center gap-1 bg-pink-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">
            ALLY <span className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center">{msg.level || 1}</span>
          </span>
        )}
        <span className="font-bold text-[#6be3f0] whitespace-nowrap">{nickname}:</span>
        <span className="text-white/95 break-words">{message}</span>
        {isGiftMsg(msg) && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-pink-300">
            <GiftIcon className="w-3 h-3" />
            sent a gift ×{msg.count || 1}
          </span>
        )}
      </div>
    </div>
  </motion.div>
  );
};

export const CommentOverlay = ({ messages, currentUserId }: CommentOverlayProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="absolute bottom-[4.5rem] left-2 z-20 w-[min(340px,78vw)] pointer-events-none flex gap-2 items-end">
      {/* ── Left vertical tabs ── */}
      <div className="flex flex-col gap-1 mb-2 pointer-events-auto">
        <div className="bg-[#5b5cff] rounded-full py-3 px-1 flex items-center justify-center writing-vertical-lr rotate-180">
           <span className="text-[10px] font-bold text-white tracking-widest uppercase">All</span>
        </div>
        <div className="bg-black/40 rounded-full py-4 px-1 flex items-center justify-center writing-vertical-lr rotate-180">
           <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Room</span>
        </div>
        <div className="bg-black/40 rounded-full py-4 px-1 flex items-center justify-center writing-vertical-lr rotate-180">
           <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Chat</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end">
        {/* Floating Broadcast Message */}
        <div className="mb-2 bg-[#d13df5] rounded-full px-2 py-1 flex items-center gap-1.5 shadow-md w-fit pointer-events-auto max-w-full">
           <Speaker className="w-3.5 h-3.5 text-white shrink-0" />
           <span className="text-[10px] font-bold text-white truncate">R.S... box box box box box</span>
        </div>

        <div
          ref={listRef}
          className="no-scrollbar flex flex-col gap-1.5 overflow-y-auto max-h-[35vh] pr-1 pb-1"
          aria-live="polite"
          aria-label="Live chat messages"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <CommentBubble key={`${msg.userId}-${msg.message}-${i}`} msg={msg} isOwn={msg.userId === currentUserId} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
