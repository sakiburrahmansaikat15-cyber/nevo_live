import { useRef, useState, useCallback, useEffect } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalVideoTrack,
  ILocalAudioTrack,
  ICameraVideoTrack,
  UID,
} from 'agora-rtc-sdk-ng';

interface UseAgoraOptions {
  appId: string;
  channel: string;
  token: string;
  uid?: number;
  role: 'host' | 'audience';
  /** Host captures/publishes the camera only when true (false = audio-only room). */
  videoEnabled?: boolean;
  /** Called when the RTC connection is lost (network drop). */
  onNetworkLost?: () => void;
  /** Called when the RTC connection recovers. */
  onNetworkRecover?: () => void;
}

export const useAgora = () => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioRef = useRef<ILocalAudioTrack | null>(null);
  const cameraOnRef = useRef(true);
  const micOnRef = useRef(true);
  const joiningRef = useRef(false);
  const networkLostRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState<UID[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  const joinChannel = useCallback(async ({ appId, channel, token, uid, role, videoEnabled = true, onNetworkLost, onNetworkRecover }: UseAgoraOptions) => {
    // Re-entry guard: if a join is already in flight, wait for it rather than
    // starting a second concurrent join (fixes StrictMode double-mount races).
    if (joiningRef.current) return;

    if (clientRef.current) {
      await clientRef.current.leave();
      clientRef.current = null;
    }

    joiningRef.current = true;
    const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
    clientRef.current = client;
    client.setClientRole(role === 'host' ? 'host' : 'audience');

    // Network state tracking — used for the 10s grace period auto-end.
    client.on('connection-state-change', (cur, prev) => {
      if (cur === 'DISCONNECTED' && prev !== 'DISCONNECTED') {
        if (!networkLostRef.current) {
          networkLostRef.current = true;
          setError('Connection lost — reconnecting…');
          onNetworkLost?.();
        }
      } else if (cur === 'CONNECTED') {
        if (networkLostRef.current) {
          networkLostRef.current = false;
          setError('');
          onNetworkRecover?.();
        }
      }
    });

    // Remote user published
    client.on('user-published', async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
          let container = document.getElementById(`remote-container-${user.uid}`);
          if (!container) {
            container = document.createElement('div');
            container.id = `remote-container-${user.uid}`;
            container.className = 'absolute inset-0';
            const videoArea = document.getElementById('agora-video-area');
            if (videoArea) videoArea.appendChild(container);
          }
          user.videoTrack?.play(container);
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
        setRemoteUsers((prev) => (prev.includes(user.uid) ? prev : [...prev, user.uid]));
      } catch (e) {
        console.warn('live subscribe/play error:', e);
      }
    });

    client.on('user-unpublished', (user) => {
      setRemoteUsers((prev) => prev.filter((id) => id !== user.uid));
      document.getElementById(`remote-container-${user.uid}`)?.remove();
    });

    client.on('user-left', (user) => {
      setRemoteUsers((prev) => prev.filter((id) => id !== user.uid));
      document.getElementById(`remote-container-${user.uid}`)?.remove();
    });

    try {
      await client.join(appId, channel, token, uid ?? 0);

      if (role === 'host') {
        // Create tracks separately so each has its own MediaStream — otherwise
        // disabling audio would also disable video (same getUserMedia stream).
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack(
          { AEC: true, ANS: true, AGC: true }
        );
        localAudioRef.current = audioTrack;
        micOnRef.current = true;
        setMicOn(true);

        let videoTrack: ICameraVideoTrack | null = null;
        if (videoEnabled) {
          videoTrack = await AgoraRTC.createCameraVideoTrack(
            { encoderConfig: { width: 640, height: 480, frameRate: 30 } }
          );
          localVideoRef.current = videoTrack;
          cameraOnRef.current = true;
          setCameraOn(true);
        } else {
          // Audio-only room — no camera track, no camera permission request
          localVideoRef.current = null;
          cameraOnRef.current = false;
          setCameraOn(false);
        }

        await client.publish(videoEnabled ? [videoTrack!, audioTrack] : [audioTrack]);
      }

      setJoined(true);
      return client;
    } catch (err) {
      // Leave the channel on any join failure so no half-open session lingers
      try { await client.leave(); } catch { /* noop */ }
      if (clientRef.current === client) clientRef.current = null;
      throw err;
    } finally {
      joiningRef.current = false;
    }
  }, []);

  // Play local video into the container — retries up to 5 times with backoff
  const playLocalVideo = useCallback((containerId: string) => {
    const tryPlay = (attempt: number) => {
      const track = localVideoRef.current;
      if (!track) {
        if (attempt < 5) setTimeout(() => tryPlay(attempt + 1), 300 * attempt);
        return;
      }
      try {
        track.play(containerId);
      } catch (e) {
        console.warn(`playLocalVideo attempt ${attempt + 1} failed:`, e);
        if (attempt < 5) setTimeout(() => tryPlay(attempt + 1), 300 * attempt);
      }
    };
    tryPlay(0);
  }, []);

  const toggleCamera = useCallback(async () => {
    const track = localVideoRef.current;
    if (!track) return;
    const next = !cameraOnRef.current;
    cameraOnRef.current = next;
    setCameraOn(next);
    try {
      await track.setEnabled(next);
    } catch (e) {
      console.warn('live camera toggle error:', e);
    }
  }, []);

  const toggleMic = useCallback(async () => {
    const track = localAudioRef.current;
    if (!track) return;
    const next = !micOnRef.current;
    micOnRef.current = next;
    setMicOn(next);
    try {
      await track.setEnabled(next);
    } catch (e) {
      console.warn('live mic toggle error:', e);
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const track = localVideoRef.current;
    if (!track) return;
    // Enumerate cameras and switch to next
    const devices = await AgoraRTC.getCameras();
    if (devices.length < 2) return;
    const currentLabel = (await track.getTrackLabel()) || '';
    const idx = devices.findIndex((d) => d.label === currentLabel);
    const next = devices[(idx + 1) % devices.length];
    await track.setDevice(next.deviceId);
  }, []);

  const leaveChannel = useCallback(async () => {
    try {
      if (localVideoRef.current) {
        localVideoRef.current.close();
        localVideoRef.current = null;
      }
      if (localAudioRef.current) {
        localAudioRef.current.close();
        localAudioRef.current = null;
      }
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }
    } catch (e) {
      console.warn('leave error:', e);
    }
    setJoined(false);
    cameraOnRef.current = true;
    micOnRef.current = true;
    setCameraOn(true);
    setMicOn(true);
    setRemoteUsers([]);
    setError('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localVideoRef.current) localVideoRef.current.close();
      if (localAudioRef.current) localAudioRef.current.close();
      if (clientRef.current) clientRef.current.leave();
    };
  }, []);

  return {
    clientRef,
    localVideoRef,
    localAudioRef,
    joined,
    cameraOn,
    micOn,
    remoteUsers,
    error,
    joinChannel,
    playLocalVideo,
    toggleCamera,
    toggleMic,
    switchCamera,
    leaveChannel,
  };
};
