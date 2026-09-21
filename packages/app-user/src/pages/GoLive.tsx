import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiVideoCameraFill as Video, PiMicrophoneFill as Mic, PiGameControllerFill as Gamepad2 } from 'react-icons/pi';
import { Button, Input, VerificationGateModal } from '../components/ui';
import { streamsApi } from '../api';
import { useAuthStore, useUIStore } from '../stores';
import { canUseCreatorFeatures } from '../services/verification';

const streamTypes = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'voice', label: 'Voice', icon: Mic },
  { value: 'game', label: 'Game', icon: Gamepad2 },
] as const;

export const GoLive = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'video' | 'voice' | 'game'>('video');
  const [loading, setLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);

  const handleGoLive = async () => {
    if (!title.trim()) return;

    // Creator gate — unverified hosts/agents are blocked (backend enforces too).
    if (!canUseCreatorFeatures(user?.verification, user?.role)) {
      setShowGate(true);
      return;
    }

    // Check if Agency Quit Request is pending
    if (localStorage.getItem('agencyQuitStatus') === 'pending') {
      showToast('You cannot go live while your agency quit request is pending', 'error');
      return;
    }

    setLoading(true);
    try {
      // One user = one active live session. Check before creating a new one.
      const active = await streamsApi.getMyActiveStream();
      if (active.data.success && active.data.data?._id) {
        showToast('You are already live on another session', 'info');
        navigate(`/live/${active.data.data._id}`, { replace: true });
        return;
      }

      const { data } = await streamsApi.createStream({
        title: title.trim(),
        type,
        category: type === 'game' ? 'game' : 'talk',
      });
      if (data.success && data.data) {
        navigate(`/live/${data.data._id}`, { replace: true });
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to start stream', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-mesh">
      <button onClick={() => navigate(-1)} className="p-2 -ml-2 mb-6">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <h1 className="text-2xl font-bold mb-2">Go Live</h1>
      <p className="text-ink-muted mb-8">Start broadcasting to your audience</p>

      <div className="space-y-6">
        <Input
          label="Stream Title"
          placeholder="What's your stream about?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-sm text-ink-muted mb-2">Stream Type</label>
          <div className="grid grid-cols-3 gap-3">
            {streamTypes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  type === value
                    ? 'border-brand-primary bg-brand-primary/20 shadow-glow-sm'
                    : 'border-line-strong bg-surface-sunken hover:border-dark-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          fullWidth
          size="lg"
          onClick={handleGoLive}
          loading={loading}
          disabled={!title.trim()}
        >
          <Video className="w-4 h-4" />
          Start Live Stream
        </Button>
      </div>

      <VerificationGateModal isOpen={showGate} onClose={() => setShowGate(false)} />
    </div>
  );
};
