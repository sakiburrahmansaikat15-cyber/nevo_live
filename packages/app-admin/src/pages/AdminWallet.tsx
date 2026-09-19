import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { adminApi } from '../api';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const AdminWallet = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'diamond' | 'coin'>('diamond');
  const [amount, setAmount] = useState('');
  const [agentId, setAgentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [w, a] = await Promise.all([adminApi.getWallet(), adminApi.getAgents()]);
      if (w.data.success) {
        setWallet(w.data.data?.wallet);
        setHistory(w.data.data?.history || []);
      }
      if (a.data.success) setAgents(a.data.data?.agents || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleTransfer = async () => {
    if (!agentId || !amount || parseInt(amount) <= 0) { setErr('Select an agent and enter an amount'); return; }
    setSaving(true); setMsg(''); setErr('');
    try {
      await adminApi.transferToAgent({ agentId, currency, amount: parseInt(amount) });
      setMsg(`${amount} ${currency} transferred`);
      setAmount('');
      load();
    } catch (err: any) {
      setErr(err.response?.data?.error || 'Transfer failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Platform Wallet</h2>

      {/* Inventory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-dark-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-dark-700"><DiamondIcon className="w-8 h-8 text-cyan-400" /></div>
          <div>
            <p className="text-3xl font-bold">{wallet?.diamonds?.toLocaleString() ?? '...'}</p>
            <p className="text-xs text-dark-400">Diamond Inventory</p>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-dark-700"><CoinIcon className="w-8 h-8 text-yellow-400" /></div>
          <div>
            <p className="text-3xl font-bold">{wallet?.coins?.toLocaleString() ?? '...'}</p>
            <p className="text-xs text-dark-400">Coin Inventory</p>
          </div>
        </div>
      </div>

      {/* Transfer form */}
      <div className="bg-dark-800 rounded-xl p-6 space-y-4">
        <h3 className="font-bold">Transfer to Agent</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-dark-400 mb-1 block">Agent</label>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm">
              <option value="">Select agent</option>
              {agents.map((a: any) => (
                <option key={a._id} value={a._id}>{a.nickname} (UID: {a.uid})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">Currency</label>
            <div className="flex gap-1 bg-dark-700 rounded-lg p-1">
              {(['diamond', 'coin'] as const).map((c) => (
                <button key={c} onClick={() => setCurrency(c)} className={`flex-1 py-1.5 rounded-md text-sm capitalize ${currency === c ? 'bg-primary-600' : ''}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">Amount</label>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        {err && <div className="bg-red-600/20 border border-red-600/50 text-red-400 text-sm p-3 rounded-lg">{err}</div>}
        {msg && <div className="bg-green-600/20 border border-green-600/50 text-green-400 text-sm p-3 rounded-lg">{msg}</div>}
        <button onClick={handleTransfer} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary-600 rounded-lg text-sm disabled:opacity-50">
          <ArrowRight className="w-4 h-4" /> {saving ? 'Transferring...' : 'Transfer'}
        </button>
      </div>

      {/* History */}
      <div className="bg-dark-800 rounded-xl overflow-hidden">
        <h3 className="font-medium p-4 border-b border-dark-700">Transfer History</h3>
        {history.length === 0 ? <p className="p-4 text-sm text-dark-400">No transfers yet</p> : (
          <table className="w-full">
            <thead><tr className="border-b border-dark-700"><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Agent</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Amount</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Date</th></tr></thead>
            <tbody>
              {history.map((t: any) => (
                <tr key={t._id} className="border-b border-dark-700/50">
                  <td className="px-4 py-3 text-sm">{typeof t.userId === 'object' ? t.userId?.nickname : '—'}</td>
                  <td className="px-4 py-3 text-sm">{t.amount?.toLocaleString()} {t.currency}</td>
                  <td className="px-4 py-3 text-sm text-dark-400">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
