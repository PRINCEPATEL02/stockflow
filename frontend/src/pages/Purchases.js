import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/api/purchases?${new URLSearchParams({search,startDate,endDate})}`)
      .then(r => setPurchases(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async id => {
    if (!window.confirm('Delete this entry? Stock will be reduced.')) return;
    try {
      await api.delete(`/api/purchases/${id}`);
      setPurchases(prev => prev.filter(p => p._id!==id));
      toast.success('Entry deleted — stock adjusted');
    } catch { toast.error('Delete failed'); }
  };

  const uniqueMaterials = new Set(purchases.map(p => p.material?._id)).size;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2>Stock-In History</h2>
          <p>Complete log of all stock additions</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <span className="si">🔍</span>
          <input placeholder="Search material or supplier…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <label>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          {(startDate||endDate) && <button className="btn btn-secondary btn-sm" onClick={() => {setStartDate('');setEndDate('');}}>Clear</button>}
        </div>
      </div>

      {purchases.length > 0 && (
        <div className="summary-bar">
          <span className="s-item"><span className="s-label">Entries:</span> <span className="s-val">{purchases.length}</span></span>
          <span className="s-sep">·</span>
          <span className="s-item"><span className="s-label">Materials:</span> <span className="s-val text-accent">{uniqueMaterials}</span></span>
        </div>
      )}

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div className="loading-box"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Date</th><th>Material</th><th>Qty Added</th><th>Supplier</th><th>Reference</th><th>Added By</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <span className="ei">📥</span>
                      <p>No stock entries yet. Use "Add Stock" on the Materials page.</p>
                    </div>
                  </td></tr>
                ) : purchases.map(p => (
                  <tr key={p._id}>
                    <td className="text-muted" style={{ whiteSpace:'nowrap' }}>{new Date(p.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight:700 }}>{p.material?.name}</td>
                    <td>
                      <span style={{ fontWeight:800, color:'var(--green)', fontSize:'1rem' }}>+{p.quantity}</span>{' '}
                      <span className="text-muted" style={{ fontSize:'0.78rem' }}>{p.material?.unit}</span>
                    </td>
                    <td className="text-muted">{p.supplier||'—'}</td>
                    <td>{p.invoiceNumber?<span className="pill">{p.invoiceNumber}</span>:<span className="text-muted">—</span>}</td>
                    <td className="text-muted" style={{ fontSize:'0.8rem' }}>{p.createdBy?.name||'—'}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
