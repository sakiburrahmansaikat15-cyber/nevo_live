import { useEffect, useState, useCallback } from 'react';
import { PiPlusBold as Plus } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { momentsApi } from '../api';
import { MomentCard } from '../components/moment';
import { Loading } from '../components/ui';
import { useAuthStore } from '../stores';
import type { Moment } from '../types';

export const MomentsPage = () => {
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMoments = useCallback(async () => {
    try {
      const { data } = await momentsApi.getFeed();
      if (data.success) setMoments(data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuth) { navigate('/login'); return; }
    loadMoments();
  }, [isAuth]);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-line bg-white sticky top-0 z-10">
        <h1 className="text-[26px] font-bold text-ink">Moments</h1>
        <button
          onClick={() => navigate('/moments/new')}
          className="w-9 h-9 bg-white text-black border border-line rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {loading ? (
        <Loading className="pt-20" />
      ) : moments.length === 0 ? (
        <div className="text-center pt-20 text-ink-muted">
          <p>No moments yet</p>
          <p className="text-sm mt-1">Share your first moment!</p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {moments.map((moment) => (
            <MomentCard key={moment._id} moment={moment} onUpdate={loadMoments} />
          ))}
        </div>
      )}
    </div>
  );
};
