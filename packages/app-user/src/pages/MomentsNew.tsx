import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiImageFill as ImageIcon, PiXBold as X, PiPaperPlaneRightFill as Send, PiSpinnerBold as Loader2 } from 'react-icons/pi';
import { uploadApi, momentsApi } from '../api';
import { useUIStore } from '../stores';

export const MomentsNew = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isVideo = file?.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file?.name || '');

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const clearFile = () => {
    setFile(null);
    setPreview('');
  };

  const handlePost = async () => {
    if (!file && !caption.trim()) {
      showToast('Add a caption or choose a photo/video', 'error');
      return;
    }
    setUploading(true);
    setPosting(true);
    try {
      let media: string[] = [];
      if (file) {
        const url = await uploadApi.upload(file, 'moments');
        media = [url];
      }
      const { data } = await momentsApi.create({ content: caption.trim() || undefined, media });
      if (data.success) {
        showToast('Moment shared!', 'success');
        navigate('/moments', { replace: true });
      } else {
        showToast(data.error || 'Could not share your moment', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Upload failed. Please retry.', 'error');
    } finally {
      setUploading(false);
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-line bg-white/70 backdrop-blur-lg sticky top-0 z-10">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">New Moment</h1>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="What's on your mind?"
          className="w-full card-glass p-4 text-sm bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />

        {/* Preview / picker */}
        {preview ? (
          <div className="relative rounded-xl overflow-hidden border border-line-strong">
            {isVideo ? (
              <video src={preview} controls className="w-full max-h-80 bg-black text-white" />
            ) : (
              <img src={preview} alt="preview" className="w-full max-h-80 object-cover" />
            )}
            <button
              onClick={clearFile}
              aria-label="Remove media"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface-sunken backdrop-blur flex items-center justify-center hover:bg-surface-sunken"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="card-glass p-6 text-center space-y-4">
            <p className="text-sm text-ink-muted">Share a photo or video with your followers</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white text-sm font-medium btn-glow mx-auto"
            >
              <ImageIcon className="w-4 h-4" /> Choose Photo / Video
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={pickFile} />

        <button
          onClick={handlePost}
          disabled={posting}
          className="w-full py-3.5 rounded-xl btn-neon text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {posting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> {uploading ? 'Uploading…' : 'Sharing…'}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" /> Share Moment
            </>
          )}
        </button>
        <p className="text-center text-[10px] text-ink-faint">
          {isVideo ? 'Your video will appear in the Moments feed.' : 'Photos and videos are public to your followers.'}
        </p>
      </div>
    </div>
  );
};