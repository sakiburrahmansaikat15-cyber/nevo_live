import { AnimatePresence, motion } from 'framer-motion';
import { PiUserPlusFill as UserPlus, PiHeartFill as Heart, PiGiftFill as GiftIcon } from 'react-icons/pi';
import { Avatar } from '../user';
import type { RoomNotification } from './types';

interface NotificationOverlayProps {
  notifications: RoomNotification[];
}

const iconFor = (kind: RoomNotification['kind']) => {
  switch (kind) {
    case 'join':
      return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />;
    case 'follow':
      return <Heart className="w-3.5 h-3.5 text-pink-400" />;
    case 'gift':
      return <GiftIcon className="w-3.5 h-3.5 text-yellow-300" />;
  }
};

export const NotificationOverlay = ({ notifications }: NotificationOverlayProps) => {
  const visible = notifications.slice(-3);

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-2 w-[min(360px,92vw)]">
      <AnimatePresence>
        {visible.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            role="status"
            className="glass-card flex items-center gap-2.5 px-3 py-2"
          >
            {n.avatar && <Avatar src={n.avatar} nickname={n.text} size="sm" className="!w-7 !h-7 text-[10px]" />}
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              {iconFor(n.kind)}
            </span>
            <p className="text-[12px] text-white/90 leading-snug">
              <span className="font-bold">{n.text}</span>
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
