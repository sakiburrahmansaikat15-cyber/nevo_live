import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import client from '../api/client';
import { adminApi } from '../api';
import { DiamondIcon } from '../components/CurrencyIcon';

export const Gifts = () => {
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ giftId: '', name: '', icon: '', priceDiamonds: 0, order: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/gifts');
      if (data.success) setGifts(data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await adminApi.createGift(form);
      setShowForm(false);
      setForm({ giftId: '', name: '', icon: '', priceDiamonds: 0, order: 0 });
      load();
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gifts</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-2 bg-primary-600 rounded-lg text-sm"><Plus className="w-4 h-4" /> Add Gift</button>
      </div>

      {showForm && (
        <div className="bg-dark-800 rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <input value={form.giftId} onChange={(e) => setForm({ ...form, giftId: e.target.value })} placeholder="Gift ID" className="bg-dark-700 rounded px-3 py-2 text-sm focus:outline-none" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="bg-dark-700 rounded px-3 py-2 text-sm focus:outline-none" />
          <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Icon URL" className="bg-dark-700 rounded px-3 py-2 text-sm focus:outline-none" />
          <input value={form.priceDiamonds} onChange={(e) => setForm({ ...form, priceDiamonds: parseInt(e.target.value) || 0 })} type="number" placeholder="Price" className="bg-dark-700 rounded px-3 py-2 text-sm focus:outline-none" />
          <button onClick={handleCreate} className="px-3 py-2 bg-primary-600 rounded-lg text-sm">Save</button>
        </div>
      )}

      {loading ? <p className="text-center text-dark-400 py-8">Loading...</p> : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {gifts.map((g: any) => (
            <div key={g._id} className="bg-dark-800 rounded-xl p-4 text-center">
              <div className="mb-2">{g.icon?.startsWith('http') ? <img src={g.icon} alt={g.name} className="w-10 h-10 mx-auto object-contain" /> : <span className="text-3xl">{g.icon || '🎁'}</span>}</div>
              <p className="text-sm font-medium">{g.name}</p>
              <p className="text-xs text-cyan-400 inline-flex items-center gap-0.5"><DiamondIcon />{g.priceDiamonds}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
