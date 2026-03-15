import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Transactions() {
  const [tab, setTab]           = useState('sales');
  const [sales, setSales]       = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({search,startDate,endDate});
    Promise.all([api.get(`/api/sales?${params}`), api.get(`/api/purchases?${params}`)])
      .then(([s,p]) => { setSales(s.data); setPurchases(p.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const delSale = async id => {
    if (!window.confirm('Delete this sale? Stock will be restored.')) return;
    try { await api.delete(`/api/sales/${id}`); setSales(p=>p.filter(s=>s._id!==id)); toast.success('Sale deleted — stock restored!'); }
    catch { toast.error('Delete failed'); }
  };

  const delPurchase = async id => {
    if (!window.confirm('Delete this entry? Stock will be reduced.')) return;
    try { await api.delete(`/api/purchases/${id}`); setPurchases(p=>p.filter(x=>x._id!==id)); toast.success('Entry deleted — stock adjusted'); }
    catch { toast.error('Delete failed'); }
  };

  const totalUnits = sales.reduce((s,x) => s+(x.quantity||0), 0);

  const tabBtn = t => ({
    padding:'8px 18px', borderRadius:9, fontSize:'0.84rem', fontWeight:700,
    cursor:'pointer', border:'1px solid', fontFamily:'DM Sans, sans-serif',
    background: tab===t ? 'var(--accent)' : 'var(--bg3)',
    color: tab===t ? '#fff' : 'var(--text3)',
    borderColor: tab===t ? 'var(--accent)' : 'var(--border2)',
    transition:'all 0.15s',
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2>Transaction History</h2>
          <p>Full log of all sales and stock additions</p>
        </div>
        <div className="page-header-actions">
          <button style={tabBtn('sales')} onClick={() => setTab('sales')}>💰 Sales ({sales.length})</button>
          <button style={tabBtn('purchases')} onClick={() => setTab('purchases')}>📥 Stock-In ({purchases.length})</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <span className="si">🔍</span>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <label>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          {(startDate||endDate) && <button className="btn btn-secondary btn-sm" onClick={()=>{setStartDate('');setEndDate('');}}>Clear</button>}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:18 }}>
        {[
          { label:'Sale Orders', val:sales.length, color:'var(--green)' },
          { label:'Stock-In Entries', val:purchases.length, color:'var(--yellow)' },
          { label:'Units Sold', val:totalUnits, color:'var(--accent2)' },
        ].map(s => (
          <div key={s.label} style={{ padding:'14px 16px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12 }}>
            <div style={{ fontSize:'0.68rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:5 }}>{s.label}</div>
            <div style={{ fontSize:'1.5rem', fontWeight:800, color:s.color, fontFamily:'Syne, sans-serif', lineHeight:1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div className="loading-box"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            {tab === 'sales' ? (
              <table>
                <thead>
                  <tr><th>Date</th><th>Product</th><th>Qty</th><th>Customer</th><th>Invoice</th><th>Materials Used</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {sales.length===0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><span className="ei">💰</span><p>No sales found</p></div></td></tr>
                  ) : sales.map(s => (
                    <tr key={s._id}>
                      <td className="text-muted" style={{ whiteSpace:'nowrap' }}>{new Date(s.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight:700 }}>{s.product?.name}</td>
                      <td><span style={{ fontWeight:800, fontSize:'1rem' }}>{s.quantity}</span> <span className="text-muted" style={{ fontSize:'0.76rem' }}>units</span></td>
                      <td className="text-muted">{s.customer||'—'}</td>
                      <td>{s.invoiceNumber?<span className="pill">{s.invoiceNumber}</span>:<span className="text-muted">—</span>}</td>
                      <td>
                        <div className="consumed-list">
                          {(s.materialsConsumed||[]).slice(0,2).map((m,i)=>(
                            <span key={i} className="consumed-chip">-{m.quantity} {m.unit} {m.materialName}</span>
                          ))}
                          {(s.materialsConsumed||[]).length>2 && <span className="consumed-chip">+{s.materialsConsumed.length-2}</span>}
                        </div>
                      </td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => delSale(s._id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr><th>Date</th><th>Material</th><th>Qty Added</th><th>Supplier</th><th>Reference</th><th>Added By</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {purchases.length===0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><span className="ei">📥</span><p>No stock-in entries found</p></div></td></tr>
                  ) : purchases.map(p => (
                    <tr key={p._id}>
                      <td className="text-muted" style={{ whiteSpace:'nowrap' }}>{new Date(p.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight:700 }}>{p.material?.name}</td>
                      <td><span style={{ fontWeight:800, color:'var(--green)', fontSize:'1rem' }}>+{p.quantity}</span> <span className="text-muted" style={{ fontSize:'0.76rem' }}>{p.material?.unit}</span></td>
                      <td className="text-muted">{p.supplier||'—'}</td>
                      <td>{p.invoiceNumber?<span className="pill">{p.invoiceNumber}</span>:<span className="text-muted">—</span>}</td>
                      <td className="text-muted" style={{ fontSize:'0.8rem' }}>{p.createdBy?.name||'—'}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => delPurchase(p._id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
