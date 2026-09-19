import { useNavigate } from 'react-router-dom';
import { PiLockFill as Lock, PiSealCheckFill as BadgeCheck } from 'react-icons/pi';
import { Modal } from './Modal';

interface VerificationGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

/**
 * Shown when an unverified host/agent taps a restricted action
 * (Go Live, host a Voice Party). CTA jumps to the Verification Center.
 */
export const VerificationGateModal = ({
  isOpen,
  onClose,
  title = 'Verification Required',
  message = 'You need to verify your account before starting a live stream. Verification helps us keep the community safe and trusted.',
}: VerificationGateModalProps) => {
  const navigate = useNavigate();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center space-y-3 py-2">
        <div className="w-14 h-14 rounded-full bg-sky-400/10 border border-sky-400/30 flex items-center justify-center">
          <Lock className="w-6 h-6 text-sky-400" />
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">{message}</p>
        <button
          onClick={() => {
            onClose();
            navigate('/verification');
          }}
          className="w-full py-3 rounded-xl btn-neon font-medium flex items-center justify-center gap-2 mt-2"
        >
          <BadgeCheck className="w-4 h-4" />
          Verify Now
        </button>
      </div>
    </Modal>
  );
};
