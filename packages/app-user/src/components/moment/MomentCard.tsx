import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiHeartFill as Heart, PiChatCircleFill as MessageCircle, PiFlagFill as Flag } from 'react-icons/pi';
import { Avatar, LevelBadge, VerifiedBadge } from '../user';
import { momentsApi } from '../../api';
import { useAuthStore } from '../../stores';
import { ReportModal } from '../report/ReportModal';
import type { Moment } from '../../types';

interface MomentCardProps {
  moment: Moment;
  onUpdate: () => void;
}

export const MomentCard = ({ moment, onUpdate }: MomentCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showReport, setShowReport] = useState(false);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleLike = async () => {
    await momentsApi.toggleLike(moment._id);
    onUpdate();
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await momentsApi.addComment(moment._id, commentText.trim());
    setCommentText('');
    onUpdate();
  };

  const isLiked = user ? moment.likes.includes(user._id) : false;

  const openProfile = () => {
    if (moment.userId?._id) navigate(`/user/${moment.userId._id}`);
  };

  return (
    <div className="bg-surface-sunken rounded-xl overflow-hidden">
      {/* Header — clickable to the author's profile */}
      <button
        onClick={openProfile}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-dark-700/50 transition-colors"
        aria-label={`View ${moment.userId?.nickname || 'user'}'s profile`}
      >
        <Avatar src={moment.userId?.avatar} nickname={moment.userId?.nickname} size="md" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{moment.userId?.nickname}</span>
            <VerifiedBadge verification={moment.userId?.verification} />
            <LevelBadge level={moment.userId?.level} />
          </div>
          <span className="text-xs text-ink-muted">
            {new Date(moment.createdAt).toLocaleDateString()}
          </span>
        </div>
      </button>

      {/* Content */}
      {moment.content && <p className="px-3 pb-2 text-sm">{moment.content}</p>}

      {moment.media.length > 0 && (
        <div className="max-h-80 overflow-hidden">
          {moment.media[0].match(/\.(mp4|webm)$/) ? (
            <video src={moment.media[0]} controls className="w-full" />
          ) : (
            <img src={moment.media[0]} alt="" className="w-full object-cover" />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-3 py-2 border-t border-line-strong">
        <button onClick={handleLike} className={`flex items-center gap-1 text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-ink-muted'}`}>
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          {moment.likes.length}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 text-sm text-ink-muted">
          <MessageCircle className="w-4 h-4" />
          {moment.comments.length}
        </button>
        <button onClick={() => setShowReport(true)} className="ml-auto text-ink-faint hover:text-red-400 transition-colors" aria-label="Report">
          <Flag className="w-4 h-4" />
        </button>
      </div>

      {showReport && (
        <ReportModal targetType="moment" targetId={moment._id} onClose={() => setShowReport(false)} />
      )}

      {/* Comments */}
      {showComments && (
        <div className="border-t border-line-strong p-3">
          <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
            {moment.comments.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="font-medium text-accent-500 shrink-0">{c.userId?.nickname || 'User'}</span>
                <span className="text-dark-200">{c.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Write a comment..."
              className="flex-1 bg-dark-700 rounded-lg px-3 py-1.5 text-sm text-ink placeholder-dark-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
