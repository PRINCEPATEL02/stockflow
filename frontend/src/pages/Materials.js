import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const UNITS = ['kg','gram','liter','ml','piece','meter','box'];
const emptyForm = { name:'', unit:'kg', currentStock:'', minimumStock:'', supplier:'', description:'' };

export default function Materials() {
  const [materials, setMaterials]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showLow, setShowLow]       = useState(false);

  // Add/Edit modal
  const [modal, setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Bulk Add Stock modal
  const [stockModal, setStockModal]   = useState(false);
  const [stockQtys, setStockQtys]     = useState({});
  const [stockSearch, setStockSearch] = useState('');
  const [stockMeta, setStockMeta]     = useState({ supplier:'', invoiceNumber:'', date: new Date().toISOString().split('T')[0], notes:'' });
  const [stockSaving, setStockSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/api/materials?search=${search}&lowStock=${showLow}`)
      .then(r => setMaterials(r.data))
      .catch(() => toast.error('Failed to load materials'))
      .finally(() => setLoading(false));
  }, [search, showLow]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = m => {
    setEditing(m);
    setForm({ name:m.name, unit:m.unit, currentStock:m.currentStock, minimumStock:m.minimumStock, supplier:m.supplier||'', description:m.description||'' });
    setModal(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!form.name || !form.unit) return toast.error('Name and unit are required');
    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.put(`/api/materials/${editing._id}`, form);
        setMaterials(prev => prev.map(m => m._id === editing._id ? data : m));
        toast.success('Material updated');
      } else {
        const { data } = await api.post('/api/materials', form);
        setMaterials(prev => [data, ...prev]);
        toast.success('Material added');
      }
      setModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await api.delete(`/api/materials/${id}`);
      setMaterials(prev => prev.filter(m => m._id !== id));
      toast.success('Material deleted');
    } catch { toast.error('Delete failed'); }
  };

  const openStockModal = () => {
    const init = {};
    materials.forEach(m => { init[m._id] = ''; });
    setStockQtys(init);
    setStockSearch('');
    setStockMeta({ supplier:'', invoiceNumber:'', date: new Date().toISOString().split('T')[0], notes:'' });
    setStockModal(true);
  };

  const handleBulkSubmit = async e => {
    e.preventDefault();
    const items = Object.entries(stockQtys)
      .filter(([, q]) => q !== '' && Number(q) > 0)
      .map(([material, quantity]) => ({ material, quantity: Number(quantity) }));
    if (items.length === 0) return toast.error('Enter quantity for at least one material');
    setStockSaving(true);
    try {
      const { data } = await api.post('/api/purchases/bulk', { items, ...stockMeta });
      toast.success(data.message);
      setMaterials(prev => prev.map(m => {
        const r = data.results.find(r => r.materialName === m.name);
        return r ? { ...m, currentStock: r.newStock } : m;
      }));
      setStockModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    } finally { setStockSaving(false); }
  };

  const stockStatus = m => {
    if (m.currentStock <= m.minimumStock) return { label:'Low', cls:'badge-red' };
    if (m.currentStock <= m.minimumStock * 1.5) return { label:'Warning', cls:'badge-yellow' };
    return { label:'OK', cls:'badge-green' };
  };

  const barPct = m => {
    if (!m.minimumStock) return 80;
    return Math.min((m.currentStock / (m.minimumStock * 3)) * 100, 100);
  };

  const barColor = m => {
    if (m.currentStock <= m.minimumStock) return 'var(--red)';
    if (m.currentStock <= m.minimumStock * 1.5) return 'var(--yellow)';
    return 'var(--green)';
  };

  const filteredForStock = materials.filter(m =>
    !stockSearch || m.name.toLowerCase().includes(stockSearch.toLowerCase())
  );
  const totalAdding = Object.values(stockQtys).filter(q => q !== '' && Number(q) > 0).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2>Raw Materials</h2>
          <p>Manage inventory and stock levels</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-success" onClick={openStockModal}>📥 Add Stock</button>
          <button className="btn btn-primary" onClick={openAdd}>＋ New Material</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrap">
          <span className="si">🔍</span>
          <input placeholder="Search materials…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'0.83rem', color:'var(--text2)', userSelect:'none' }}>
          <input type="checkbox" checked={showLow} onChange={e => setShowLow(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div className="loading-box"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Code</th>
                  <th>Unit</th>
                  <th>Stock</th>
                  <th>Min</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><span className="ei">🧪</span><p>No materials yet. Add your first one.</p></div>
                  </td></tr>
                ) : materials.map(m => {
                  const st = stockStatus(m);
                  return (
                    <tr key={m._id}>
                      <td style={{ fontWeight:700 }}>{m.name}</td>
                      <td><span className="pill">{m.code}</span></td>
                      <td className="text-muted">{m.unit}</td>
                      <td>
                        <span style={{ fontWeight:700, color: m.currentStock <= m.minimumStock ? 'var(--red)' : 'var(--text)', fontSize:'0.95rem' }}>
                          {m.currentStock.toLocaleString()}
                        </span>
                      </td>
                      <td className="text-muted">{m.minimumStock}</td>
                      <td>
                        <div className="stock-bar-wrap">
                          <div className="stock-bar">
                            <div className="stock-bar-fill" style={{ width:`${barPct(m)}%`, background:barColor(m) }} />
                          </div>
                          <span style={{ fontSize:'0.7rem', color:'var(--text3)', minWidth:28 }}>{Math.round(barPct(m))}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(m)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m._id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h3>{editing ? 'Edit Material' : 'New Raw Material'}</h3>
                <p>{editing ? 'Update material details' : 'Add a new raw material to inventory'}</p>
              </div>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Material Name <span>*</span></label>
                    <input placeholder="e.g. Wheat Flour" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Unit <span>*</span></label>
                    <select value={form.unit} onChange={e => setForm({...form, unit:e.target.value})}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Opening Stock</label>
                    <input type="number" min="0" placeholder="0" value={form.currentStock} onChange={e => setForm({...form, currentStock:e.target.value})} />
                    <div className="input-hint">Current stock quantity</div>
                  </div>
                  <div className="form-group">
                    <label>Minimum Stock Level</label>
                    <input type="number" min="0" placeholder="0" value={form.minimumStock} onChange={e => setForm({...form, minimumStock:e.target.value})} />
                    <div className="input-hint">Alert threshold</div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Default Supplier</label>
                  <input placeholder="Supplier name" value={form.supplier} onChange={e => setForm({...form, supplier:e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea placeholder="Optional notes…" value={form.description} onChange={e => setForm({...form, description:e.target.value})} rows={2} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update Material' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Add Stock Modal ── */}
      {stockModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setStockModal(false)}>
          <div className="modal modal-xl">
            <div className="modal-header">
              <div>
                <h3>📥 Add Stock</h3>
                <p>Enter quantities received for each material. Leave blank or 0 to skip.</p>
              </div>
              <button className="close-btn" onClick={() => setStockModal(false)}>✕</button>
            </div>

            <form onSubmit={handleBulkSubmit}>
              {/* Meta section */}
              <div style={{ padding:'14px 22px', borderBottom:'1px solid var(--border)', background:'var(--bg3)' }}>
                <div className="form-row-3" style={{ marginBottom:0 }}>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label>Supplier</label>
                    <input placeholder="Optional" value={stockMeta.supplier} onChange={e => setStockMeta(p=>({...p,supplier:e.target.value}))} />
                  </div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label>Reference / Invoice</label>
                    <input placeholder="INV-001" value={stockMeta.invoiceNumber} onChange={e => setStockMeta(p=>({...p,invoiceNumber:e.target.value}))} />
                  </div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label>Date</label>
                    <input type="date" value={stockMeta.date} onChange={e => setStockMeta(p=>({...p,date:e.target.value}))} />
                  </div>
                </div>
              </div>

              {/* Search in modal */}
              <div style={{ padding:'12px 22px 4px' }}>
                <div className="search-wrap" style={{ maxWidth:'100%' }}>
                  <span className="si">🔍</span>
                  <input placeholder="Search material…" value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
                </div>
              </div>

              {/* List */}
              <div style={{ padding:'8px 22px 4px', maxHeight:380, overflowY:'auto' }}>
                {/* Header */}
                <div className="stock-list-header">
                  <span>Material</span>
                  <span style={{ textAlign:'center' }}>Current</span>
                  <span style={{ textAlign:'center' }}>Add Quantity</span>
                </div>

                {filteredForStock.length === 0 ? (
                  <div className="empty-state" style={{ padding:'28px 20px' }}>
                    <p>No materials match your search</p>
                  </div>
                ) : filteredForStock.map(m => {
                  const qty = stockQtys[m._id] || '';
                  const hasVal = qty !== '' && Number(qty) > 0;
                  return (
                    <div key={m._id} className={`stock-list-row ${hasVal ? 'has-value' : ''}`}>
                      {/* Name */}
                      <div>
                        <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{m.name}</div>
                        <div style={{ fontSize:'0.7rem', color:'var(--text3)', marginTop:2 }}>
                          Unit: <strong>{m.unit}</strong> · Min: {m.minimumStock}
                        </div>
                      </div>

                      {/* Current stock */}
                      <div className="s-current" style={{ textAlign:'center' }}>
                        <div style={{ fontWeight:700, fontSize:'0.95rem', color: m.currentStock<=m.minimumStock?'var(--red)':'var(--text)' }}>
                          {m.currentStock}
                        </div>
                        <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>{m.unit}</div>
                      </div>

                      {/* Qty input + new value preview */}
                      <div className="s-input stock-qty-input">
                        <input
                          type="number" min="0" step="0.001" placeholder="0"
                          value={qty}
                          onChange={e => setStockQtys(prev => ({...prev, [m._id]: e.target.value}))}
                          style={{
                            border: hasVal ? '1px solid var(--accent)' : '1px solid var(--border2)',
                            color: hasVal ? 'var(--accent2)' : 'var(--text)',
                          }}
                        />
                        {hasVal && (
                          <div className="stock-new-val">
                            → {(Number(m.currentStock) + Number(qty)).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="modal-footer" style={{ justifyContent:'space-between' }}>
                <div style={{ fontSize:'0.82rem', color:'var(--text3)' }}>
                  {totalAdding > 0
                    ? <span style={{ color:'var(--accent2)', fontWeight:700 }}>✓ {totalAdding} material{totalAdding>1?'s':''} will be updated</span>
                    : 'Enter quantities above'}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStockModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success" disabled={stockSaving || totalAdding===0}>
                    {stockSaving ? 'Updating…' : `Add Stock (${totalAdding})`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
