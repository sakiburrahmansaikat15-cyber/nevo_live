import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiRadioFill as Radio, PiMagnifyingGlassBold as Search, PiTrophyFill as Trophy, PiVideoCameraFill as Video, PiChartBarFill as ChartBar } from 'react-icons/pi';
import { partyApi, type PartyListItem } from '../api/party.api';
import { optional } from '../api/pending';
import { useCountryStore, useAuthStore, useUIStore } from '../stores';
import { TabBar, EmptyState, PendingApiNotice } from '../components/common';
import { CountryFilterBar } from '../components/filter';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { flagEmoji } from '../lib/countries';
import { compactNumber } from '../lib/time';

/**
 * Party listing — requirement #50.
 *
 * `GET /api/rooms/feed` is specified in BACKEND-GUIDE.md §4.9. It isn't built,
 * but `GET /api/rooms` is — so this falls back to the plain room list and maps
 * it into the same card, rather than showing nothing. The "Following's party is
 * on" tag only appears with the real feed, since the plain list can't know it.
 */

type Tab = 'following' | 'party';

export const PartyList = () => {
  const navigate = useNavigate();
  const selectedCountries = useCountryStore((s) => s.selected);
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('party');
  const [rooms, setRooms] = useState<PartyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const feed = await optional(
        partyApi.getFeed({
          tab,
          country: selectedCountries.length ? selectedCountries.join(',') : undefined,
        })
      ).catch(() => null);

      if (cancelled) return;

      if (feed?.success && Array.isArray(feed.data)) {
        setRooms(feed.data);
        setLive(true);
        return;
      }

      // Fallback: the basic room list that already exists.
      try {
        const { data } = await partyApi.listRooms({ limit: 30 });
        if (cancelled) return;
        const mapped: PartyListItem[] = (data.data || []).map((room: any) => ({
          _id: room._id,
          name: room.name,
          thumbnail: room.ownerId?.avatar,
          owner: room.ownerId,
          memberCount: (room.seats || []).filter((s: any) => s.userId).length,
          viewerCount: room.viewerCount ?? 0,
        }));
        setRooms(mapped);
      } catch {
        if (!cancelled) setRooms([]);
      } finally {
        if (!cancelled) setLive(false);
      }
    };

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tab, selectedCountries.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf2ff] via-[#f5f8ff] to-[#f4f7fa] pb-24 relative">
      <header className="sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 pt-10 pb-2 bg-transparent">
          <div className="flex items-center gap-[18px] text-[16px] text-ink-muted font-medium transition-all">
            <button 
              onClick={() => setTab('following')}
              className={tab === 'following' ? "text-[22px] text-ink font-bold" : ""}
            >Following</button>
            <button 
              onClick={() => setTab('party')}
              className={tab === 'party' ? "text-[22px] text-ink font-bold" : ""}
            >Party</button>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/search')}><Search className="w-6 h-6 text-ink" /></button>
            <button onClick={() => navigate('/rankings')}><Trophy className="w-[26px] h-[26px] text-yellow-500" /></button>
          </div>
        </div>

        <CountryFilterBar className="px-4 py-2" />
      </header>

      {loading ? (
        <Loading className="pt-20" size="lg" />
      ) : rooms.length === 0 ? (
        <>
          <EmptyState
            icon={<Radio className="w-6 h-6" />}
            title={tab === 'following' ? 'No parties from people you follow' : 'No parties right now'}
            hint="Start one from Go Live, or check back in a bit."
          />
          {!live && <PendingApiNotice section="§4.9" what="The party feed with member previews" />}
        </>
      ) : (
        <div className="mt-3 px-4 flex flex-col gap-3">
          {rooms.map((room, index) => (
            <div key={room._id}>
              <button
                onClick={() => {
                  if (user?.verification?.status !== 'VERIFIED' && !user?.verification?.verified) {
                    showToast('You must be verified to enter a Party Room', 'error');
                    return;
                  }
                  navigate(`/party/${room._id}`);
                }}
                className="w-full flex items-center p-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-[84px] h-[84px] rounded-[14px] overflow-hidden bg-surface-sunken shrink-0">
                  {room.thumbnail ? (
                    <img src={room.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-ghost">
                      <Video className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 ml-3 flex flex-col justify-center h-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-ink text-[16px] truncate">{room.name}</span>
                    {room.owner?.country && (
                      <img src={`https://flagcdn.com/w40/${room.owner.country.toLowerCase()}.png`} alt={room.owner.country} className="w-[14px] h-[14px] rounded-full object-cover inline-block shrink-0 shadow-sm" />
                    )}
                  </div>

                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#f6a02d]">
                      <span className="text-[14px]">😎</span> {room.tag?.label ?? 'Chatting'}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <div className="flex -space-x-1.5">
                        {room.memberAvatars?.slice(0, 3).map((src, i) => (
                          <Avatar key={i} src={src} nickname="" size="xs" className="w-5 h-5 ring-2 ring-white" />
                        ))}
                        <div className="w-5 h-5 rounded-full bg-[#8e8e93] ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white z-10">
                          {room.memberCount > 9 ? '9+' : room.memberCount}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[#8e8e93] text-[13px] font-semibold">
                      <ChartBar className="w-4 h-4" />
                      {compactNumber(room.viewerCount || (index + 1) * 450)}
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Fake Banner Ad rendering after 4th item */}
              {index === 3 && (
                <div onClick={() => navigate('/invite')} className="mt-3 w-full h-[84px] rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-r from-[#44177d] via-[#f72e73] to-[#f72e73] flex items-center justify-center text-white shadow-sm">
                   <div className="text-center font-black italic text-2xl drop-shadow-md">
                      Invite Friends
                      <div className="text-sm font-bold mt-1 text-[#ffe270]">Up to 10,500 /invite</div>
                   </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating PARTY button */}
      <div className="fixed z-30 pointer-events-none" style={{ right: 'max(1rem, calc(50vw - 12.5rem + 1rem))', bottom: '5.5rem' }}>
        <button
          onClick={() => navigate('/go-live')}
          className="pointer-events-auto h-11 px-5 rounded-full bg-gradient-to-r from-[#ff9a25] to-[#ff7314] flex items-center justify-center shadow-lg text-white font-bold text-[15px] gap-1.5 active:scale-95 transition-transform"
        >
          <Video className="w-5 h-5 text-white" />
          <span>PARTY</span>
        </button>
      </div>
    </div>
  );
};
