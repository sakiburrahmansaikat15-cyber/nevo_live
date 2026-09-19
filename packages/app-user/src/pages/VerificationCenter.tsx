import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiShieldCheckFill as ShieldCheck, PiSealCheckFill as BadgeCheck, PiSpinnerBold as Loader2, PiUploadSimpleBold as Upload, PiCameraFill as Camera, PiCreditCardFill as CreditCard, PiBuildingsFill as Building2, PiCheckCircleFill as CheckCircle2, PiXCircleFill as XCircle, PiClockFill as Clock } from 'react-icons/pi';
import { useAuthStore } from '../stores';
import { verificationApi, uploadApi } from '../api';
import type { VerificationRequest } from '../types';

type Step = 'status' | 'type' | 'identity' | 'documents';

const UPLOAD_FOLDER = 'verification';

export const VerificationCenter = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [step, setStep] = useState<Step>('status');
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Step 1 — account type
  const [accountType, setAccountType] = useState<'host' | 'agency'>('host');

  // Step 2 — identity info
  const [fullName, setFullName] = useState('');
  const [olaId, setOlaId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [documentType, setDocumentType] = useState<'nid' | 'olaid'>('nid');

  // Step 3 — documents
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [uploading, setUploading] = useState<null | 'front' | 'back' | 'selfie'>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const verification = user?.verification;

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await verificationApi.getMyRequest();
        if (data.success && data.data) setRequest(data.data);
      } catch {
        // no request yet — fine
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUpload = async (file: File, kind: 'front' | 'back' | 'selfie') => {
    setUploading(kind);
    setError('');
    try {
      const url = await uploadApi.upload(file, UPLOAD_FOLDER);
      if (kind === 'front') setFrontUrl(url);
      else if (kind === 'back') setBackUrl(url);
      else setSelfieUrl(url);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Upload failed. Try a different image.');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async () => {
    if (!frontUrl || !backUrl || !selfieUrl) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await verificationApi.submit({
        accountType,
        fullName: fullName.trim(),
        olaId: olaId.trim(),
        dateOfBirth: dateOfBirth.trim(),
        documentType,
        documentFrontUrl: frontUrl,
        documentBackUrl: backUrl,
        selfieUrl,
      });
      if (data.success && data.data) {
        setRequest(data.data);
        // Refresh persisted user state so the profile badge/status update.
        try {
          const profile = await (await import('../api')).usersApi.getProfile();
          if (profile.data.success && profile.data.data) updateUser(profile.data.data);
        } catch {
          // non-fatal
        }
        setStep('status');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    fullName.trim().length >= 2 &&
    olaId.trim().length >= 4 &&
    dateOfBirth.trim().length >= 4;

  // ── Status screen (also shown after submit) ─────────────────────────────
  if (step === 'status') {
    const status = verification?.status || 'NOT_SUBMITTED';
    return (
      <div className="min-h-screen p-4 bg-mesh">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mb-6">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Verification Center</h1>
            <p className="text-xs text-ink-muted">Verify your account to unlock creator features</p>
          </div>
        </div>

        {status === 'NOT_SUBMITTED' && (
          <div className="card-glass p-5 space-y-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-ink-muted" />
              <span className="font-semibold">Not Verified</span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Hosts and Agencies must verify their identity before going live or hosting a voice
              party. Normal users can watch live, play games and send gifts without verification.
            </p>
            <button
              onClick={() => setStep('type')}
              className="w-full py-3 rounded-xl btn-neon font-medium"
            >
              Start Verification
            </button>
          </div>
        )}

        {status === 'PENDING' || status === 'UNDER_REVIEW' ? (
          <div className="card-glass p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="font-semibold">Verification Submitted</span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Your verification request is currently under review. You will receive an update once
              the review is completed.
            </p>
            {verification?.submittedAt && (
              <p className="text-xs text-ink-muted">
                Submitted: {new Date(verification.submittedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : null}

        {status === 'VERIFIED' && (
          <div className="card-glass p-5 space-y-4 border border-sky-400/30">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-sky-400" />
              <span className="font-semibold text-sky-300">Account Verified</span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Congratulations! You can now go Live and host Voice Parties. Your verified badge is
              visible across the platform.
            </p>
            {verification?.verifiedAt && (
              <p className="text-xs text-ink-muted">
                Verified: {new Date(verification.verifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="card-glass p-5 space-y-4 border border-red-400/30">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="font-semibold text-red-300">Verification Rejected</span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Reason: {verification?.rejectionReason || 'Your documents did not match the criteria.'}
            </p>
            <button
              onClick={() => setStep('type')}
              className="w-full py-3 rounded-xl bg-black text-white font-medium hover:bg-black text-white transition-colors"
            >
              Submit Again
            </button>
          </div>
        )}

        <div className="mt-6 space-y-2">
          {[
            'Normal users can watch Live, play games and send gifts — no verification needed',
            'Hosts must be verified to Go Live or host a Voice Party',
            'Agencies must be verified for agency features',
          ].map((line) => (
            <p key={line} className="text-xs text-ink-faint flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              {line}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 1 — account type ───────────────────────────────────────────────
  if (step === 'type') {
    const eligibleTypes: { value: 'host' | 'agency'; label: string; desc: string; icon: any }[] = [];
    if (user?.role === 'agent' || user?.role === 'user') {
      eligibleTypes.push({ value: 'agency', label: 'Agency', desc: 'For agency owners / agents', icon: Building2 });
    }
    if (user?.role === 'host' || user?.role === 'user') {
      eligibleTypes.push({ value: 'host', label: 'Host', desc: 'To go live and host voice parties', icon: Camera });
    }

    return (
      <div className="min-h-screen p-4 bg-mesh">
        <button onClick={() => setStep('status')} className="p-2 -ml-2 mb-6">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold mb-1">Choose Verification Type</h1>
        <p className="text-sm text-ink-muted mb-6">Select the account type you want to verify</p>

        <div className="space-y-3">
          {eligibleTypes.map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                setAccountType(value);
                setStep('identity');
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                accountType === value
                  ? 'border-brand-primary bg-brand-primary/20'
                  : 'border-line-strong bg-surface-sunken hover:border-dark-500'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-primary/30 to-brand-secondary/30 flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-ink-muted">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 2 — identity information ───────────────────────────────────────
  if (step === 'identity') {
    return (
      <div className="min-h-screen p-4 bg-mesh">
        <button onClick={() => setStep('type')} className="p-2 -ml-2 mb-6">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold mb-1">Identity Information</h1>
        <p className="text-sm text-ink-muted mb-6">Your details must match your identity documents</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-ink-muted mb-2">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As shown on your documents"
              className="w-full bg-surface-sunken rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-2">OLAID</label>
            <input
              value={olaId}
              onChange={(e) => setOlaId(e.target.value)}
              placeholder="Your OLAID number"
              className="w-full bg-surface-sunken rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-2">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full bg-surface-sunken rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-2">Document Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['nid', 'olaid'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDocumentType(t)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm transition-all ${
                    documentType === t
                      ? 'border-brand-primary bg-brand-primary/20'
                      : 'border-line-strong bg-surface-sunken hover:border-dark-500'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={() => setStep('documents')}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl btn-neon font-medium disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3 — document upload ────────────────────────────────────────────
  const uploadCell = (kind: 'front' | 'back' | 'selfie', label: string, url: string, ref: any) => (
    <div>
      <label className="block text-sm text-ink-muted mb-2">{label}</label>
      <button
        onClick={() => ref.current?.click()}
        disabled={!!uploading}
        className={`w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50 ${
          url ? 'border-emerald-400/50 bg-emerald-400/5' : 'border-dark-600 bg-surface-sunken hover:border-brand-primary'
        }`}
      >
        {uploading === kind ? (
          <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        ) : url ? (
          <>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span className="text-xs text-ink-muted">Uploaded</span>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-ink-muted" />
            <span className="text-xs text-ink-muted">Tap to upload</span>
          </>
        )}
      </button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 underline mt-1 inline-block">
          View
        </a>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, kind); e.target.value = ''; }} />
    </div>
  );

  return (
    <div className="min-h-screen p-4 bg-mesh">
      <button onClick={() => setStep('identity')} className="p-2 -ml-2 mb-6">
        <ArrowLeft className="w-6 h-6" />
      </button>
      <h1 className="text-xl font-bold mb-1">Document Upload</h1>
      <p className="text-sm text-ink-muted mb-6">
        Upload clear photos. Your documents are only visible to our review team.
      </p>

      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-dark-200 mb-3">Identity Document — {documentType.toUpperCase()}</p>
          <div className="space-y-4">
            {uploadCell('front', 'Front Side', frontUrl, frontRef)}
            {uploadCell('back', 'Back Side', backUrl, backRef)}
          </div>
        </div>
        {uploadCell('selfie', 'Selfie / Identity Confirmation', selfieUrl, selfieRef)}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!frontUrl || !backUrl || !selfieUrl || submitting}
          className="w-full py-3 rounded-xl btn-neon font-medium disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {submitting ? 'Submitting…' : 'Submit Verification'}
        </button>
      </div>
    </div>
  );
};
