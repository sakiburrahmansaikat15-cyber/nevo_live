import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiAirplaneFill as Plane, PiDiceFiveFill as Dices, PiCircleFill as CircleDot } from 'react-icons/pi';
import { useStreamStore } from '../stores';
import { StreamCard } from '../components/stream';
import { Loading } from '../components/ui';
import { DiamondIcon } from '../components/ui/CurrencyIcon';

export const GameHub = () => {
  const navigate = useNavigate();
  const { streams, isLoading, fetchStreams } = useStreamStore();

  useEffect(() => {
    fetchStreams('newest', 'game');
  }, []);

  const gameStreams = streams.filter((s) => s.type === 'game' || s.category === 'game');

  return (
    <div className="pb-20">
      <div className="p-4 border-b border-line">
        <h1 className="text-lg font-bold">Game Hub</h1>
        <p className="text-xs text-ink-muted mt-1">Play games & watch gaming streams</p>
      </div>

      <div className="p-4">
        {/* Aviator game card */}
        <button
          onClick={() => navigate('/game/aviator')}
          className="w-full bg-gradient-to-br from-primary-600/30 to-dark-800 border border-primary-600/30 rounded-2xl p-5 mb-6 text-left relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-black flex items-center gap-2">
                <Plane className="w-6 h-6 text-accent-500" /> Aviator
              </p>
              <p className="text-xs text-ink-muted mt-1">Bet, watch the plane fly, cash out before it crashes!</p>
              <p className="text-xs text-ink-muted mt-2 flex items-center gap-1"><DiamondIcon /> Play with your wallet balance</p>
            </div>
            <span className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold">PLAY</span>
          </div>
        </button>

        {/* Teen Patti game card */}
        <button
          onClick={() => navigate('/game/teenpatti')}
          className="w-full bg-gradient-to-br from-emerald-600/30 to-dark-800 border border-emerald-600/30 rounded-2xl p-5 mb-6 text-left relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-black flex items-center gap-2">
                <Dices className="w-6 h-6 text-emerald-400" /> Teen Patti
              </p>
              <p className="text-xs text-ink-muted mt-1">Classic 3-card poker. Outplay the table!</p>
              <p className="text-xs text-ink-muted mt-2 flex items-center gap-1"><DiamondIcon /> Play with your wallet balance</p>
            </div>
            <span className="px-4 py-2 bg-emerald-600 rounded-xl text-sm font-bold">PLAY</span>
          </div>
        </button>

        {/* Roulette game card */}
        <button
          onClick={() => navigate('/game/roulette')}
          className="w-full bg-gradient-to-br from-rose-600/30 to-dark-800 border border-rose-600/30 rounded-2xl p-5 mb-6 text-left relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-black flex items-center gap-2">
                <CircleDot className="w-6 h-6 text-rose-400" /> Roulette
              </p>
              <p className="text-xs text-ink-muted mt-1">Bet on red or black. Spin to win!</p>
              <p className="text-xs text-ink-muted mt-2 flex items-center gap-1"><DiamondIcon /> Play with your wallet balance</p>
            </div>
            <span className="px-4 py-2 bg-rose-600 rounded-xl text-sm font-bold">PLAY</span>
          </div>
        </button>

        <h2 className="text-sm font-medium text-ink-muted mb-3">Live Gaming Streams</h2>

        {isLoading ? (
          <Loading className="pt-10" />
        ) : gameStreams.length === 0 ? (
          <div className="text-center pt-10 text-ink-muted">
            <p className="text-lg mb-1">No game streams live</p>
            <p className="text-sm">Start a gaming stream!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {gameStreams.map((stream) => (
              <StreamCard key={stream._id} stream={stream} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
