import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const emptyForm = { product:'', quantity:'', customer:'', invoiceNumber:'', date:'', notes:'' };

export default function Sales() {
  const [sales, setSales]       = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]   = useState('');
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [preview, setPreview]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ search, startDate, endDate }).toString();
    Promise.all([api.get(`/api/sales?${params}`), api.get('/api/products')])
      .then(([s, p]) => { setSales(s.data); setProducts(p.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({...emptyForm, date: new Date().toISOString().split('T')[0]});
    setPreview(null); setModal(true);
  };

  const openEdit = s => {
    setEditing(s);
    setForm({ product:s.product?._id, quantity:s.quantity, customer:s.customer||'', invoiceNumber:s.invoiceNumber||'', date:new Date(s.date).toISOString().split('T')[0], notes:s.notes||'' });
    setPreview(null); setModal(true);
  };

  const calcPreview = (productId, qty) => {
    const p = products.find(p => p._id===productId);
    if (!p || !qty) { setPreview(null); return; }
    setPreview(p.materials.map(m => ({
      name: m.material?.name,
      needed: (m.quantity * qty).toFixed(3).replace(/\.?0+$/, ''),
      unit: m.unit || m.material?.unit,
      available: m.material?.currentStock,
      ok: m.material?.currentStock >= m.quantity * qty,
    })));
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!form.product || !form.quantity) return toast.error('Product and quantity required');
    setSaving(true);
    try {
      const payload = {...form, sellingPrice:0};
      if (editing) {
        const { data } = await api.put(`/api/sales/${editing._id}`, payload);
        setSales(prev => prev.map(s => s._id===editing._id ? data : s));
        toast.success('Sale updated');
      } else {
        const { data } = await api.post('/api/sales', payload);
        setSales(prev => [data.sale, ...prev]);
        toast.success('Sale recorded — stock deducted!');
      }
      setModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this sale? Stock will be restored.')) return;
    try {
      await api.delete(`/api/sales/${id}`);
      setSales(prev => prev.filter(s => s._id!==id));
      toast.success('Sale deleted — stock restored!');
    } catch { toast.error('Delete failed'); }
  };

  const totalQty = sales.reduce((s,x) => s+(x.quantity||0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2>Sales</h2>
          <p>Record sales — raw materials auto-deducted from stock</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAdd}>＋ New Sale</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <span className="si">🔍</span>
          <input placeholder="Search product or customer…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <label>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          {(startDate||endDate) && <button className="btn btn-secondary btn-sm" onClick={() => {setStartDate('');setEndDate('');}}>Clear</button>}
        </div>
      </div>

      {sales.length > 0 && (
        <div className="summary-bar">
          <span className="s-item"><span className="s-label">Orders:</span> <span className="s-val">{sales.length}</span></span>
          <span className="s-sep">·</span>
          <span className="s-item"><span className="s-label">Units Sold:</span> <span className="s-val text-green">{totalQty}</span></span>
        </div>
      )}

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div className="loading-box"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Product</th><th>Qty</th><th>Customer</th><th>Invoice</th><th>Consumed</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><span className="ei">💰</span><p>No sales yet. Record your first sale.</p></div></td></tr>
                ) : sales.map(s => (
                  <tr key={s._id}>
                    <td className="text-muted" style={{ whiteSpace:'nowrap' }}>{new Date(s.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight:700 }}>{s.product?.name}</td>
                    <td><span style={{ fontWeight:800, fontSize:'1rem' }}>{s.quantity}</span> <span className="text-muted" style={{ fontSize:'0.78rem' }}>units</span></td>
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
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal modal-xl">
            <div className="modal-header">
              <div>
                <h3>{editing ? 'Edit Sale' : 'Record New Sale'}</h3>
                <p>Stock will be automatically updated</p>
              </div>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Product <span>*</span></label>
                    <select value={form.product} onChange={e => { setForm(f=>({...f,product:e.target.value})); calcPreview(e.target.value,form.quantity); }}>
                      <option value="">-- Select Product --</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity <span>*</span></label>
                    <input type="number" min="1" step="1" placeholder="1" value={form.quantity}
                      onChange={e => { setForm(f=>({...f,quantity:e.target.value})); calcPreview(form.product, e.target.value); }} />
                  </div>
                </div>

                {preview && preview.length > 0 && (
                  <div style={{ marginBottom:16, padding:14, background:'var(--bg3)', borderRadius:11, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:10 }}>
                      📦 Stock that will be deducted
                    </div>
                    {preview.map((m,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7, fontSize:'0.84rem', flexWrap:'wrap', gap:6 }}>
                        <span style={{ color:'var(--text2)', fontWeight:600 }}>{m.name}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                          <span className="text-muted" style={{ fontSize:'0.76rem' }}>Available: {m.available} {m.unit}</span>
                          <span style={{ fontWeight:700, color:'var(--red)' }}>−{m.needed} {m.unit}</span>
                          {m.ok ? <span className="badge badge-green">OK</span> : <span className="badge badge-red">Insufficient!</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input placeholder="Optional" value={form.customer} onChange={e => setForm({...form,customer:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Invoice / Reference</label>
                    <input placeholder="INV-001" value={form.invoiceNumber} onChange={e => setForm({...form,invoiceNumber:e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <input placeholder="Optional notes" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Processing…' : editing ? 'Update Sale' : 'Record Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
