import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const emptyForm = { name:'', sellingPrice:'', category:'', description:'', materials:[] };

export default function Products() {
  const [products, setProducts]       = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [modal, setModal]             = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get(`/api/products?search=${search}`), api.get('/api/materials')])
      .then(([p, m]) => { setProducts(p.data); setAllMaterials(m.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = p => {
    setEditing(p);
    setForm({
      name:p.name, sellingPrice:p.sellingPrice, category:p.category||'', description:p.description||'',
      materials: p.materials.map(m => ({ material:m.material?._id||m.material, quantity:m.quantity, unit:m.unit||m.material?.unit||'' })),
    });
    setModal(true);
  };

  const addBomRow = () => setForm(f => ({...f, materials:[...f.materials, {material:'',quantity:'',unit:''}]}));
  const removeBomRow = i => setForm(f => ({...f, materials:f.materials.filter((_,idx)=>idx!==i)}));
  const updateBom = (i, field, value) => {
    const updated = [...form.materials];
    updated[i] = {...updated[i], [field]:value};
    if (field==='material') {
      const mat = allMaterials.find(m => m._id===value);
      if (mat) updated[i].unit = mat.unit;
    }
    setForm(f => ({...f, materials:updated}));
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!form.name || form.sellingPrice==='') return toast.error('Name and selling price required');
    const validMats = form.materials.filter(m => m.material && m.quantity>0);
    setSaving(true);
    try {
      const payload = {...form, materials:validMats};
      if (editing) {
        const { data } = await api.put(`/api/products/${editing._id}`, payload);
        setProducts(prev => prev.map(p => p._id===editing._id ? data : p));
        toast.success('Product updated');
      } else {
        const { data } = await api.post('/api/products', payload);
        setProducts(prev => [data, ...prev]);
        toast.success('Product added');
      }
      setModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts(prev => prev.filter(p => p._id!==id));
      toast.success('Product deleted');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h2>Products</h2>
          <p>Manage products and their bill of materials</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAdd}>＋ Add Product</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <span className="si">🔍</span>
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="badge badge-gray">{products.length} products</span>
      </div>

      {loading ? (
        <div className="loading-box"><div className="spinner" /></div>
      ) : (
        <div className="product-grid">
          {products.length === 0 ? (
            <div className="card" style={{ gridColumn:'1/-1' }}>
              <div className="empty-state"><span className="ei">📦</span><p>No products yet. Add your first product.</p></div>
            </div>
          ) : products.map(p => (
            <div key={p._id} className="product-card">
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:'1rem', marginBottom:4 }}>{p.name}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    <span className="pill">{p.code}</span>
                    {p.category && <span className="pill">{p.category}</span>}
                  </div>
                </div>
                <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--green)', whiteSpace:'nowrap', marginTop:2 }}>
                  ₹{p.sellingPrice?.toLocaleString()}
                </div>
              </div>

              {/* BOM */}
              <div>
                <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
                  Bill of Materials
                </div>
                {p.materials.length === 0 ? (
                  <div style={{ fontSize:'0.8rem', color:'var(--text3)', fontStyle:'italic' }}>No materials defined</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {p.materials.map((m,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.83rem', padding:'5px 8px', background:'var(--bg3)', borderRadius:7 }}>
                        <span style={{ color:'var(--text2)' }}>{m.material?.name||'Unknown'}</span>
                        <span style={{ fontWeight:700, color:'var(--accent2)' }}>{m.quantity} {m.unit||m.material?.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex:1 }} onClick={() => openEdit(p)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal modal-xl">
            <div className="modal-header">
              <div>
                <h3>{editing ? 'Edit Product' : 'Add Product'}</h3>
                <p>Define product details and its bill of materials</p>
              </div>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Product Name <span>*</span></label>
                    <input placeholder="e.g. Chocolate Cake" value={form.name} onChange={e => setForm({...form,name:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Selling Price (₹) <span>*</span></label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={form.sellingPrice} onChange={e => setForm({...form,sellingPrice:e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input placeholder="e.g. Bakery, Electronics…" value={form.category} onChange={e => setForm({...form,category:e.target.value})} />
                </div>

                <hr className="divider" />

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div>
                    <div style={{ fontWeight:700 }}>Bill of Materials</div>
                    <div style={{ fontSize:'0.78rem', color:'var(--text3)', marginTop:2 }}>Raw materials consumed per unit sold</div>
                  </div>
                </div>

                {form.materials.map((row, i) => (
                  <div key={i} className="bom-item">
                    <select value={row.material} onChange={e => updateBom(i,'material',e.target.value)}>
                      <option value="">-- Select Material --</option>
                      {allMaterials.map(m => <option key={m._id} value={m._id}>{m.name} ({m.unit})</option>)}
                    </select>
                    <input type="number" min="0" step="0.001" placeholder="Qty" value={row.quantity} onChange={e => updateBom(i,'quantity',e.target.value)} />
                    <div className="bom-unit" style={{ fontSize:'0.8rem', color:'var(--text3)', textAlign:'center' }}>{row.unit}</div>
                    <button type="button" className="btn btn-danger btn-icon" onClick={() => removeBomRow(i)}>✕</button>
                  </div>
                ))}

                <button type="button" className="add-bom-btn" onClick={addBomRow}>
                  ＋ Add Raw Material
                </button>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
