import { useEffect, useState } from 'react';
import { Search, BadgeCheck, Coins } from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

const SELLER_TYPES = [
  { value: 'none', label: 'None', icon: null },
  { value: 'official', label: 'Official', icon: BadgeCheck, cls: 'text-sky-400' },
  { value: 'paylor', label: 'Paylor', icon: Coins, cls: 'text-amber-400' },
];

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const load = async (p: number, s: string) => {
    setLoading(true);
    const { data } = await adminApi.getUsers({ page: p, limit: 20, search: s });
    if (data.success) { setUsers(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    setLoading(false);
  };

  useEffect(() => { load(page, search); }, [page]);

  const handleSearch = () => { setPage(1); load(1, search); };

  const handleSellerType = async (id: string, sellerType: 'none' | 'official' | 'paylor') => {
    await adminApi.setSellerType(id, sellerType);
    load(page, search);
  };

  const columns = [
    { key: 'uid', label: 'UID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'phone', label: 'Phone' },
    { key: 'level', label: 'Level' },
    { key: 'diamonds', label: 'Diamonds' },
    { key: 'isAgent', label: 'Agent', render: (r: any) => r.isAgent ? '✓' : '—' },
    { key: 'isBanned', label: 'Banned', render: (r: any) => <span className={r.isBanned ? 'text-red-400' : 'text-green-400'}>{r.isBanned ? 'Yes' : 'No'}</span> },
    {
      key: 'sellerType',
      label: 'Seller Badge',
      render: (r: any) => (
        <select
          value={r.sellerType || 'none'}
          onChange={(e) => handleSellerType(r._id, e.target.value as any)}
          className={`bg-dark-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none ${r.sellerType === 'official' ? 'text-sky-400' : r.sellerType === 'paylor' ? 'text-amber-400' : 'text-dark-300'}`}
          aria-label={`Seller badge for ${r.nickname}`}
        >
          {SELLER_TYPES.map(({ value, label }) => (
            <option key={value} value={value} className="text-white">{label}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'actions', label: 'Actions',
      render: (r: any) => <button onClick={() => adminApi.toggleBan(r._id).then(() => load(page, search))} className={`text-xs px-2 py-1 rounded ${r.isBanned ? 'bg-green-600' : 'bg-red-600'}`}>{r.isBanned ? 'Unban' : 'Ban'}</button>,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Users</h2>
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search..." className="bg-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 focus:outline-none w-48" />
          <button onClick={handleSearch} className="p-2 bg-dark-700 rounded-lg"><Search className="w-4 h-4" /></button>
        </div>
      </div>
      <DataTable columns={columns} data={users} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
