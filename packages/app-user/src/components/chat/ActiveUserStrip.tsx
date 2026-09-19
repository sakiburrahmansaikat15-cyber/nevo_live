import { useNavigate } from 'react-router-dom';
import { PiRadioFill as Radio } from 'react-icons/pi';
import type { ActiveChatUser } from '../../api/chat.api';
import { Avatar } from '../user';

interface ActiveUserStripProps {
  users: ActiveChatUser[];
}

/**
 * Requirement #16B / #65 — the horizontal strip above the chat list.
 *
 * Live → purple broadcast badge, tapping opens the live room.
 * Online (not live) → green dot, tapping opens the chat.
 */
export const ActiveUserStrip = ({ users }: ActiveUserStripProps) => {
  const navigate = useNavigate();

  if (users.length === 0) return null;

  return (
    <div className="bg-white pt-3 pb-2">
      <div className="flex gap-4 px-4 overflow-x-auto no-scrollbar">
        {users.map((user) => {
          const isLive = !!user.liveStreamId;

          return (
            <button
              key={user._id}
              onClick={() => navigate(isLive ? `/live/${user.liveStreamId}` : `/user/${user._id}`)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[62px]"
            >
              <span className="relative">
                <Avatar
                  src={user.avatar}
                  nickname={user.nickname}
                  size="lg"
                  className={isLive ? 'ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-white rounded-full' : ''}
                />
                {isLive ? (
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#8B5CF6] ring-2 ring-white flex items-center justify-center">
                    <Radio className="w-3 h-3 text-white" />
                  </span>
                ) : (
                  user.online && (
                    <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-status-online ring-2 ring-white" />
                  )
                )}
              </span>
              <span className="text-[11px] text-ink-soft truncate w-full text-center">{user.nickname}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
