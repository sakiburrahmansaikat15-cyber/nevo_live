import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiCheckBold as Check, PiCaretDownBold as ChevronDown, PiCaretUpBold as ChevronUp, PiCopyFill as Copy, PiShieldWarningFill as ShieldAlert } from 'react-icons/pi';
import { paymentApi, type CryptoNetwork, type CryptoOption, type RecentRecharge } from '../api/payment.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { Loading } from '../components/ui';
import { CoinIcon } from '../components/ui/CurrencyIcon';
import { countryName, flagEmoji } from '../lib/countries';
import { timeAgo } from '../lib/time';

/**
 * Requirement #20 — Top-Up Coins (crypto).
 *
 * The existing BDT / agent recharge flow is untouched and still lives at
 * `/recharge`; the "c2c" tab links across to it. The crypto catalogue comes
 * from `/payment/crypto-options`, which is specified but not built yet
 * (API-SPEC.md) — until it ships the screen shows the documented shape with
 * an honest "not connected yet" note instead of fake wallet addresses.
 */

const TABS = [
  { key: 'recharge', label: 'Recharge' },
  { key: 'gpay', label: 'Google Pay' },
  { key: 'c2c', label: 'c2c' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** Documented shape, with no wallet addresses — those must come from the server. */
const FALLBACK_OPTIONS: CryptoOption[] = [
  {
    currency: 'USDT',
    ratio: 9900,
    networks: [
      { code: 'BEP20', name: 'BNB Smart Chain (BEP20)', walletAddress: '', minAmount: 1 },
      { code: 'TRC20', name: 'TRON (TRC20)', walletAddress: '', minAmount: 1 },
      { code: 'ERC20', name: 'Ethereum (ERC20)', walletAddress: '', minAmount: 10 },
    ],
  },
  {
    currency: 'USDC',
    ratio: 9900,
    networks: [
      { code: 'BEP20', name: 'BNB Smart Chain (BEP20)', walletAddress: '', minAmount: 1 },
      { code: 'TRC20', name: 'TRON (TRC20)', walletAddress: '', minAmount: 1 },
    ],
  },
];

const NETWORK_TINT: Record<string, string> = {
  BEP20: 'bg-[#F3BA2F] text-[#181A20]',
  TRC20: 'bg-[#EB0029] text-white',
  ERC20: 'bg-[#627EEA] text-white',
};

export const TopUp = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<TabKey>('recharge');
  const [options, setOptions] = useState<CryptoOption[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState<RecentRecharge[]>([]);

  const [currency, setCurrency] = useState('USDT');
  const [networkOpen, setNetworkOpen] = useState(false);
  const [network, setNetwork] = useState<CryptoNetwork | null>(null);
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      optional(paymentApi.getCryptoOptions()).catch(() => null),
      optional(paymentApi.getRecentRecharges()).catch(() => null),
    ]).then(([opts, recent]) => {
      if (cancelled) return;
      if (opts?.success && opts.data?.length) {
        setOptions(opts.data);
        setLive(true);
      } else {
        setOptions(FALLBACK_OPTIONS);
        setLive(false);
      }
      setTicker(recent?.data || []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => options.find((o) => o.currency === currency) ?? options[0],
    [options, currency]
  );

  // Reset the chosen chain whenever the currency changes — they aren't interchangeable.
  useEffect(() => {
    setNetwork(null);
    setNetworkOpen(false);
  }, [currency]);

  const coins = selected ? Math.floor((parseFloat(amount) || 0) * selected.ratio) : 0;

  const copyAddress = async () => {
    if (!network?.walletAddress) return;
    try {
      await navigator.clipboard.writeText(network.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-10">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1">Top-Up Coins</h1>
          <span className="h-8 px-3 rounded-full bg-surface-sunken text-sm text-ink-soft flex items-center gap-1">
            {flagEmoji(user?.country || 'BD')} {countryName(user?.country || 'BD')}
          </span>
        </div>
      </header>

      {loading ? (
        <Loading className="pt-24" size="lg" />
      ) : (
        <>
          {/* Balance card (#20B) */}
          <div className="m-3 rounded-card p-4 bg-[#FFF9E6]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[30px] leading-tight font-bold text-ink tabular-nums">
                  {(user?.coins ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-ink-muted">Remaining Coins</p>
              </div>
              <button
                onClick={() => navigate('/wallet')}
                className="h-8 px-3.5 rounded-full bg-white text-sm font-semibold text-ink shadow-card"
              >
                Coins Details
              </button>
            </div>

            {ticker.length > 0 && (
              <div className="mt-3 pt-3 border-t border-black/5 overflow-hidden">
                <p className="text-xs text-[#E08A1E] truncate">
                  {ticker[0].maskedUid} · {timeAgo(ticker[0].at)} · ${ticker[0].amountUsd.toFixed(2)} recharged
                </p>
              </div>
            )}
          </div>

          {/* Scam warning (#20C) */}
          <div className="mx-3 rounded-card bg-[#1B2B5B] px-4 py-3 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#F5C518] shrink-0 mt-0.5" />
            <p className="text-[13px] text-white leading-snug">
              <span className="text-[#F5C518] font-semibold">অফিসিয়াল ঘোষণা</span> — কেলেঙ্কারি থেকে
              সাবধান। শুধু এই পেজে দেখানো ঠিকানায় পাঠান।
            </p>
          </div>

          {/* Tabs (#20D) */}
          <div className="flex items-center gap-6 px-4 pt-4">
            {TABS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => (key === 'c2c' ? navigate('/recharge') : setTab(key))}
                  className={`relative pb-2 text-[15px] transition-colors ${
                    active ? 'text-ink font-bold' : 'text-ink-faint font-medium'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-[#F97316]" />
                  )}
                </button>
              );
            })}
          </div>

          {tab === 'gpay' ? (
            <p className="text-center text-sm text-ink-muted py-16 px-8">
              Google Pay top-up isn't enabled for this account yet.
            </p>
          ) : (
            <div className="px-3 pt-3 space-y-3">
              {/* Payment method (#20E) */}
              <div className="bg-white rounded-card p-4">
                <h2 className="font-bold text-ink mb-3">Payment method</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {options.map((option) => {
                    const active = option.currency === currency;
                    return (
                      <button
                        key={option.currency}
                        onClick={() => setCurrency(option.currency)}
                        className={`h-14 rounded-xl border-2 flex items-center gap-2.5 px-3 transition-colors ${
                          active ? 'border-[#F5C518] bg-[#FFFBEB]' : 'border-line bg-white'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            option.currency === 'USDT'
                              ? 'bg-[#26A17B] text-white'
                              : 'bg-[#2775CA] text-white'
                          }`}
                        >
                          {option.currency === 'USDT' ? 'T' : '$'}
                        </span>
                        <span className="font-semibold text-ink">{option.currency}</span>
                        {active && <Check className="w-4 h-4 text-[#E0A83C] ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ratio + network (#20F/#20G) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-card p-4">
                  <p className="text-xs text-ink-muted">Recharge ratio</p>
                  <p className="font-bold text-ink mt-1">
                    1 {selected?.currency} = {(selected?.ratio ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-ink-muted">Coins</p>
                </div>

                <button
                  onClick={() => setNetworkOpen((v) => !v)}
                  className="bg-white rounded-card p-4 text-left"
                >
                  <p className="text-xs text-ink-muted">Network</p>
                  <p className="font-bold text-ink mt-1 flex items-center justify-between gap-1">
                    <span className="truncate">{network ? network.code : 'Select'}</span>
                    {networkOpen ? (
                      <ChevronUp className="w-4 h-4 text-ink-ghost shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-ink-ghost shrink-0" />
                    )}
                  </p>
                </button>
              </div>

              {networkOpen && selected && (
                <div className="bg-white rounded-card divide-y divide-line overflow-hidden">
                  {selected.networks.map((net) => (
                    <div key={net.code} className="flex items-center gap-3 px-4 py-3.5">
                      <span
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          NETWORK_TINT[net.code] || 'bg-surface-sunken text-ink-muted'
                        }`}
                      >
                        {net.code.slice(0, 3)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink text-sm truncate">{net.name}</p>
                        {net.minAmount && (
                          <p className="text-[11px] text-ink-muted">
                            Min {net.minAmount} {selected.currency}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setNetwork(net);
                          setNetworkOpen(false);
                        }}
                        className="h-8 px-4 rounded-full bg-[#F5C518] text-[#181A20] text-xs font-bold shrink-0"
                      >
                        Choose
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Amount + address, once a chain is picked */}
              {network && (
                <div className="bg-white rounded-card p-4 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-ink block mb-1.5">
                      Amount ({selected?.currency})
                    </label>
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                      inputMode="decimal"
                      placeholder={`Min ${network.minAmount ?? 1}`}
                      className="w-full h-12 px-4 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint
                        border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors tabular-nums"
                    />
                    {coins > 0 && (
                      <p className="text-sm text-ink-muted mt-2 flex items-center gap-1.5">
                        You receive
                        <CoinIcon className="w-4 h-4 text-coin" />
                        <span className="font-bold text-ink tabular-nums">{coins.toLocaleString()}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-ink block mb-1.5">
                      {network.code} deposit address
                    </label>
                    {network.walletAddress ? (
                      <>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-sunken">
                          <span className="flex-1 text-xs text-ink break-all font-mono">
                            {network.walletAddress}
                          </span>
                          <button
                            onClick={copyAddress}
                            aria-label="Copy address"
                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-status-online" />
                            ) : (
                              <Copy className="w-4 h-4 text-ink-muted" />
                            )}
                          </button>
                        </div>
                        {network.qrCode && (
                          <img
                            src={network.qrCode}
                            alt={`${network.code} deposit QR`}
                            className="w-40 h-40 object-contain mx-auto mt-3 rounded-xl bg-white"
                          />
                        )}
                        <p className="text-[11px] text-role-host mt-2 leading-relaxed">
                          Send only {selected?.currency} over {network.code} to this address. Coins are
                          credited after the network confirms.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-ink-muted p-3 rounded-xl bg-surface-sunken leading-relaxed">
                        The deposit address will appear here once the crypto top-up API is
                        connected. Use the c2c tab to recharge through an agent in the meantime.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!live && (
                <p className="text-[11px] text-ink-faint text-center leading-relaxed px-4">
                  Ratios and networks shown are the documented defaults. They become live once
                  the crypto top-up API is connected.
                </p>
              )}

              <button
                onClick={() => showToast('Opening customer service…', 'info')}
                className="w-full text-center text-sm font-semibold text-[#F97316] py-3"
              >
                &gt;&gt; Top up customer service &lt;&lt;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
