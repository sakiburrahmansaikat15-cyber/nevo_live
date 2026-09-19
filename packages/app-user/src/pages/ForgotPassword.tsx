import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiPhoneFill as Phone, PiLockFill as Lock, PiShieldCheckFill as ShieldCheck, PiCheckCircleFill as CheckCircle2 } from 'react-icons/pi';
import { Button, Input } from '../components/ui';
import { authApi } from '../api';
import { setupRecaptcha, sendPhoneOtp, verifyPhoneOtp } from '../lib/firebase';

type Step = 'phone' | 'otp' | 'password' | 'done';

const RESEND_COOLDOWN = 60;
const MAX_ATTEMPTS = 5;

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<any>(null);
  const verificationIdRef = useRef<string>('');

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    const t = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const validatePhone = (p: string) => /^\+?[0-9]{7,15}$/.test(p.trim());

  const handleSendOtp = async () => {
    setError('');
    if (!validatePhone(phone)) {
      setError('Enter a valid phone number (e.g. +8801XXXXXXXXX)');
      return;
    }
    setLoading(true);
    try {
      verifierRef.current = setupRecaptcha('forgot-recaptcha-container');
      await verifierRef.current.verify();
      const verificationId = await sendPhoneOtp(phone.trim(), verifierRef.current);
      verificationIdRef.current = verificationId;
      setStep('otp');
      startCooldown();
    } catch {
      setError('Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }
    setLoading(true);
    try {
      const idToken = await verifyPhoneOtp(verificationIdRef.current, otp);
      verificationIdRef.current = idToken; // reuse ref to carry the token to the next step
      setStep('password');
      setAttempts(0);
    } catch {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setError('Too many failed attempts. Please restart.');
        setStep('phone');
      } else {
        setError(`Invalid code. ${MAX_ATTEMPTS - next} attempts left.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(phone.trim(), verificationIdRef.current, newPassword);
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-mesh">
      <div id="forgot-recaptcha-container" ref={recaptchaRef} />
      <button onClick={() => (step === 'done' ? navigate('/login') : navigate(-1))} className="self-start p-2 -ml-2 mb-8">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {step === 'phone' && (
          <>
            <h1 className="text-2xl font-bold mb-1">Forgot Password</h1>
            <p className="text-ink-muted mb-8">Enter your phone number to receive a verification code.</p>
            <div className="space-y-4">
              <Input icon={<Phone className="w-4 h-4" />} placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
              <Button fullWidth onClick={handleSendOtp} loading={loading}>Send OTP</Button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <h1 className="text-2xl font-bold mb-1">Verify OTP</h1>
            <p className="text-ink-muted mb-8">Enter the 6-digit code sent to {phone}</p>
            <div className="space-y-4">
              <Input
                placeholder="Enter OTP code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
              />
              <Button fullWidth onClick={handleVerifyOtp} loading={loading}>Verify Code</Button>
              <button
                onClick={handleSendOtp}
                disabled={cooldown > 0 || loading}
                className="w-full text-center text-sm text-brand-primary disabled:text-ink-faint"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </>
        )}

        {step === 'password' && (
          <>
            <h1 className="text-2xl font-bold mb-1">Set New Password</h1>
            <p className="text-ink-muted mb-8">Choose a strong password for your account.</p>
            <div className="space-y-4">
              <Input icon={<Lock className="w-4 h-4" />} placeholder="New password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" />
              <Input icon={<Lock className="w-4 h-4" />} placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" />
              <Button fullWidth onClick={handleReset} loading={loading}>
                <ShieldCheck className="w-4 h-4" /> Update Password
              </Button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
            <h1 className="text-2xl font-bold">Password Updated!</h1>
            <p className="text-ink-muted">You can now sign in with your new password.</p>
            <Button fullWidth onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        )}

        {error && (
          <div className="bg-red-600/20 border border-red-600/50 text-red-400 text-sm p-3 rounded-lg mt-4">{error}</div>
        )}
      </div>
    </div>
  );
};
