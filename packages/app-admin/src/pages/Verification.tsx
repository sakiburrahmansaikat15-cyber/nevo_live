import { useEffect, useState } from 'react';
import { BadgeCheck, XCircle, ExternalLink, Clock, Check, X, ShieldCheck, ArrowLeft } from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

type Row = any;

const statusColors: any = {
  pending: 'bg-yellow-600',
  under_review: 'bg-blue-600',
  verified: 'bg-green-600',
  rejected: 'bg-red-600',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const Verification = () => {
  const [requests, setRequests] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status) params.status = status;
      const { data } = await adminApi.getVerifications(params);
      if (data.success) {
        setRequests(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, status, reloadTick]);

  // Keep the open review panel in sync after actions.
  useEffect(() => {
    if (selected) {
      const fresh = requests.find((r) => r._id === selected._id);
      if (fresh) setSelected(fresh);
    }
  }, [requests]);

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this verification? The user will be marked verified and get the blue badge.')) return;
    setBusy(true);
    try {
      await adminApi.approveVerification(id);
      setSelected(null);
      setReloadTick((t) => t + 1);
    } catch {} finally {
      setBusy(false);
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    const note = reason ?? prompt('Rejection reason:') ?? undefined;
    if (!note) return;
    setBusy(true);
    try {
      await adminApi.rejectVerification(id, note);
      setSelected(null);
      setReloadTick((t) => t + 1);
    } catch {} finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'userId', label: 'User',
      render: (r: Row) => {
        const u = typeof r.userId === 'object' ? r.userId : null;
        return (
          <div className="flex items-center gap-2">
            {u?.avatar ? <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" /> : null}
            <div>
              <p className="text-sm font-medium">{u?.nickname || '—'}</p>
              <p className="text-xs text-dark-400">{u?.uid || '—'}</p>
            </div>
          </div>
        );
      },
    },
    { key: 'accountType', label: 'Type', render: (r: Row) => <span className="capitalize">{r.accountType}</span> },
    {
      key: 'olaId', label: 'OLAID',
      render: (r: Row) => <span className="text-xs text-dark-400">{r.olaId ? '******' : '—'}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (r: Row) => (
        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[r.status] || 'bg-dark-600'}`}>
          {statusLabels[r.status] || r.status}
        </span>
      ),
    },
    { key: 'submittedAt', label: 'Submitted', render: (r: Row) => <span className="text-xs text-dark-400">{new Date(r.submittedAt).toLocaleString()}</span> },
    {
      key: '_id', label: 'Actions',
      render: (r: Row) => (
        <button
          onClick={() => { setSelected(r); setRejectReason(''); }}
          className="text-xs px-2 py-1 bg-primary-600 hover:bg-primary-500 rounded transition-colors"
        >
          Review
        </button>
      ),
    },
  ];

  const selUser = selected && typeof selected.userId === 'object' ? selected.userId : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary-400" /> Verification
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="bg-dark-700 rounded-lg px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={requests} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* ── Review panel ─────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
          <div className="relative bg-dark-800 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700 sticky top-0 bg-dark-800">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="p-1 hover:bg-dark-700 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold">Verification Request</h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${statusColors[selected.status] || 'bg-dark-600'}`}>
                {statusLabels[selected.status] || selected.status}
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Applicant */}
              <div className="flex items-center gap-3">
                {selUser?.avatar ? <img src={selUser.avatar} alt="" className="w-12 h-12 rounded-full object-cover" /> : null}
                <div>
                  <p className="font-bold">{selected.fullName || selUser?.nickname || '—'}</p>
                  <p className="text-xs text-dark-400">
                    {selUser ? `${selUser.nickname} · UID ${selUser.uid} · ${selUser.role}` : 'User'}
                  </p>
                </div>
                <span className="ml-auto text-xs px-2 py-0.5 bg-dark-700 rounded capitalize">{selected.accountType}</span>
              </div>

              {/* Identity info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-dark-700 rounded-lg p-3">
                  <p className="text-[10px] text-dark-400 uppercase mb-1">OLAID</p>
                  <p className="font-medium">{selected.olaId}</p>
                </div>
                <div className="bg-dark-700 rounded-lg p-3">
                  <p className="text-[10px] text-dark-400 uppercase mb-1">Document Type</p>
                  <p className="font-medium uppercase">{selected.documentType}</p>
                </div>
                <div className="bg-dark-700 rounded-lg p-3">
                  <p className="text-[10px] text-dark-400 uppercase mb-1">Date of Birth</p>
                  <p className="font-medium">{selected.dateOfBirth}</p>
                </div>
                <div className="bg-dark-700 rounded-lg p-3">
                  <p className="text-[10px] text-dark-400 uppercase mb-1">Submitted</p>
                  <p className="font-medium">{new Date(selected.submittedAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Documents */}
              <div>
                <p className="text-sm font-semibold mb-2">Documents</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Front', url: selected.documentFrontUrl },
                    { label: 'Back', url: selected.documentBackUrl },
                    { label: 'Selfie', url: selected.selfieUrl },
                  ].map((d) => (
                    <div key={d.label} className="bg-dark-700 rounded-lg overflow-hidden">
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="block relative group">
                          <img src={d.url} alt={d.label} className="w-full h-24 object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
                            <ExternalLink className="w-4 h-4" />
                          </span>
                        </a>
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center text-xs text-dark-500">—</div>
                      )}
                      <p className="text-center text-[10px] text-dark-400 py-1">{d.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection reason (existing) */}
              {selected.status === 'rejected' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
                  <p className="text-red-300 font-medium mb-1">Rejection reason</p>
                  <p className="text-dark-200">{selected.rejectionReason || '—'}</p>
                </div>
              )}

              {/* Audit history */}
              <div>
                <p className="text-sm font-semibold mb-2">History</p>
                <div className="space-y-1.5">
                  {selected.auditLog?.length ? (
                    [...selected.auditLog].reverse().map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Clock className="w-3 h-3 text-dark-500 shrink-0" />
                        <span className="text-dark-300">{a.action}</span>
                        <span className="text-dark-500">{a.from} → {a.to}</span>
                        <span className="ml-auto text-dark-500">{new Date(a.timestamp).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-dark-500">No history</p>
                  )}
                </div>
              </div>

              {/* Admin decision */}
              {selected.status === 'pending' || selected.status === 'under_review' ? (
                <div className="border-t border-dark-700 pt-4 space-y-3">
                  <p className="text-sm font-semibold">Admin Decision</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (required to reject)"
                    rows={2}
                    className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none placeholder-dark-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(selected._id)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(selected._id, rejectReason.trim() || undefined)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium disabled:opacity-40"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-dark-400 border-t border-dark-700 pt-4">
                  {selected.status === 'verified' ? (
                    <>
                      <BadgeCheck className="w-4 h-4 text-green-400" />
                      <span>Approved</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span>Rejected</span>
                    </>
                  )}
                  {typeof selected.reviewedBy === 'object' && selected.reviewedBy && (
                    <span className="ml-auto text-xs">by {selected.reviewedBy.nickname}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
