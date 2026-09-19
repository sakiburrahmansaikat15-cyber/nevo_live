import { PiCrownFill as Crown, PiGiftFill as Gift, PiLockFill as Lock, PiMicrophoneSlashFill as MicOff, PiPlusBold as Plus } from 'react-icons/pi';
import type { RoomSeat } from '../../api/party.api';
import type { UserPublic } from '../../types';
import { compactNumber, initial } from '../../lib/time';

interface SeatBoardProps {
  host?: UserPublic | null;
  seats: RoomSeat[];
  seatCount: number;
  onSeatPress: (seat: RoomSeat) => void;
  onHostPress?: () => void;
}

/**
 * Requirement #17.3 — the 16-seat board.
 *
 * The host sits in a large circle in the centre; the other 15 are laid out
 * 2 / 3 / 5 / 5 as in the reference. Crown seats are rows 1–2, gift-box seats
 * are rows 3–4.
 *
 * Requirement #18: every avatar here renders that seat's own user picture —
 * there is no fixed logo anywhere in this component.
 */

const ROWS = [2, 3, 5, 5];

const SeatSlot = ({ seat, onPress }: { seat: RoomSeat; onPress: () => void }) => {
  const occupant = seat.userId && typeof seat.userId === 'object' ? seat.userId : null;

  return (
    <button
      onClick={onPress}
      className="flex flex-col items-center gap-1 w-[54px] shrink-0"
      aria-label={occupant ? `Seat ${seat.index}: ${occupant.nickname}` : `Empty seat ${seat.index}`}
    >
      <span className="relative">
        <span
          className={`w-[46px] h-[46px] rounded-full flex items-center justify-center overflow-hidden ${
            occupant ? 'bg-white/10' : 'bg-white/[0.07] border border-dashed border-white/20'
          }`}
        >
          {occupant ? (
            occupant.avatar ? (
              <img src={occupant.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/80 text-sm font-bold">
                {initial(occupant.nickname)}
              </span>
            )
          ) : seat.isLocked ? (
            <Lock className="w-4 h-4 text-white/40" />
          ) : seat.crown ? (
            <Crown className="w-4 h-4 text-[#F5C518]" />
          ) : (
            <Gift className="w-4 h-4 text-white/40" />
          )}
        </span>

        {!occupant && !seat.isLocked && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </span>
        )}
        {occupant && seat.isMuted && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-status-live flex items-center justify-center">
            <MicOff className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </span>

      <span className="text-[10px] text-white/70 truncate w-full text-center leading-tight">
        {occupant ? occupant.nickname : seat.index}
      </span>

      {!!seat.giftValue && (
        <span className="text-[9px] text-[#F5C518] font-bold tabular-nums leading-none">
          {compactNumber(seat.giftValue)}
        </span>
      )}
    </button>
  );
};

export const SeatBoard = ({ host, seats, seatCount, onSeatPress, onHostPress }: SeatBoardProps) => {
  // Fill gaps so the board always renders a full grid, even before the room loads.
  const filled: RoomSeat[] = Array.from({ length: Math.max(0, seatCount - 1) }, (_, i) => {
    const index = i + 2; // seat 1 is the host's centre circle
    return seats.find((s) => s.index === index) ?? { index, isLocked: false };
  });

  let cursor = 0;

  return (
    <div
      className="relative rounded-sheet px-3 py-5"
      style={{
        background:
          'radial-gradient(70% 55% at 50% 0%, rgba(168,85,247,0.35) 0%, transparent 70%), linear-gradient(180deg,#2A1655 0%,#1A0E38 100%)',
      }}
    >
      {/* Host — centre, large (#17.3, #18) */}
      <div className="flex flex-col items-center gap-1.5 mb-5">
        <button onClick={onHostPress} className="relative" aria-label="Host">
          <span className="w-[76px] h-[76px] rounded-full overflow-hidden bg-white/10 flex items-center justify-center ring-2 ring-[#F5C518]/70">
            {host?.avatar ? (
              <img src={host.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">
                {initial(host?.nickname)}
              </span>
            )}
          </span>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-5 px-2 rounded-full bg-[#F5C518] text-[#2A1655] text-[10px] font-bold flex items-center">
            HOST
          </span>
        </button>
        <span className="text-xs text-white/80 mt-1.5 truncate max-w-[120px]">
          {host?.nickname ?? 'Host'}
        </span>
      </div>

      {/* 15 remaining seats, laid out 2 / 3 / 5 / 5 */}
      <div className="space-y-4">
        {ROWS.map((count, rowIndex) => {
          const rowSeats = filled.slice(cursor, cursor + count);
          cursor += count;
          return (
            <div key={rowIndex} className="flex justify-center gap-2">
              {rowSeats.map((seat) => (
                <SeatSlot key={seat.index} seat={seat} onPress={() => onSeatPress(seat)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
