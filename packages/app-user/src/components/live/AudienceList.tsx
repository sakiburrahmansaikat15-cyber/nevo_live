import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiXBold as X, PiUsersFill as Users } from 'react-icons/pi';
import { Avatar, LevelBadge } from '../user';

export interface Viewer {
  userId: string;
  nickname: string;
  avatar?: string;
}

interface AudienceListProps {
  open: boolean;
  viewers: Viewer[];
  onClose: () => void;
}

export const AudienceList = ({ open, viewers, onClose }: AudienceListProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Viewers"
            className="absolute bottom-0 inset-x-0 mx-auto max-w-md rounded-t-3xl glass-card !rounded-b-none p-4 pb-8 max-h-[60dvh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-400" />
                Viewers <span className="text-sm text-white/50 font-medium">({viewers.length})</span>
              </h3>
              <button onClick={onClose} aria-label="Close viewers" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5">
              <AnimatePresence>
                {viewers.map((v) => (
                  <motion.div
                    key={v.userId}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <Avatar src={v.avatar} nickname={v.nickname} size="sm" className="!w-8 !h-8 text-xs" />
                    <span className="flex-1 text-sm font-semibold truncate">{v.nickname}</span>
                    <LevelBadge level={1} className="opacity-70" />
                  </motion.div>
                ))}
              </AnimatePresence>
              {viewers.length === 0 && (
                <p className="text-center text-white/40 text-sm py-8">No viewers yet — be the first!</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
