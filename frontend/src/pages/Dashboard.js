import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '20' }}>{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color }}>{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px', fontSize:'0.8rem' }}>
      <div style={{ color:'var(--text3)', marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display:'flex', justifyContent:'space-between', gap:16 }}>
          <span>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-box">
      <div className="spinner" />
      <span>Loading dashboard…</span>
    </div>
  );
  if (!data) return null;

  const { stats, lowStockItems, recentPurchases, recentSales, salesTrend, purchaseTrend, topProducts } = data;

  // Build trend data
  const trendMap = {};
  (salesTrend || []).forEach(t => {
    const key = `${MONTHS[t._id.month-1]} '${String(t._id.year).slice(2)}`;
    trendMap[key] = { month: key, Sales: t.count || 0 };
  });
  (purchaseTrend || []).forEach(t => {
    const key = `${MONTHS[t._id.month-1]} '${String(t._id.year).slice(2)}`;
    trendMap[key] = { ...(trendMap[key] || { month: key }), 'Stock-In': t.count || 0 };
  });
  const trendData = Object.values(trendMap);

  const topProd = (topProducts || []).map(p => ({ name: p.name?.split(' ').slice(0,2).join(' '), Sold: p.totalQty }));

  return (
    <div>
      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="alert alert-warning">
          <span className="alert-icon">⚠️</span>
          <div>
            <strong>{lowStockItems.length} material{lowStockItems.length > 1 ? 's' : ''}</strong> below minimum stock:{' '}
            {lowStockItems.slice(0, 3).map(m => m.name).join(', ')}{lowStockItems.length > 3 ? ` +${lowStockItems.length-3} more` : ''}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard icon="🧪" label="Raw Materials"    value={stats.totalMaterials}  color="var(--blue)"   sub={`${stats.lowStockCount} low stock`} />
        <StatCard icon="📦" label="Products"         value={stats.totalProducts}   color="var(--accent2)" />
        <StatCard icon="💰" label="Sale Orders"      value={stats.totalSales}      color="var(--green)"  sub="total recorded" />
        <StatCard icon="📥" label="Stock-In Entries" value={stats.totalPurchases}  color="var(--yellow)" sub="stock additions" />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Activity Trend</div>
              <div className="card-sub">Sales orders vs stock-ins (6 months)</div>
            </div>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={trendData} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize:12 }} />
                <Line type="monotone" dataKey="Sales"    stroke="var(--green)"  strokeWidth={2.5} dot={false} activeDot={{ r:4 }} />
                <Line type="monotone" dataKey="Stock-In" stroke="var(--yellow)" strokeWidth={2.5} dot={false} activeDot={{ r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding:'30px 20px' }}>
              <span className="ei">📊</span><p>No trend data yet</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top Products</div>
              <div className="card-sub">By units sold</div>
            </div>
          </div>
          {topProd.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={topProd} layout="vertical" margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Sold" fill="var(--accent)" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding:'30px 20px' }}>
              <span className="ei">📦</span><p>No sales data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2">
        {/* Low stock table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Low Stock Alerts</div>
            <span className="badge badge-red">{lowStockItems.length}</span>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="empty-state" style={{ padding:'28px 20px' }}>
              <span className="ei">✅</span>
              <p>All stock levels are healthy</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Material</th><th>Current</th><th>Min</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {lowStockItems.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight:600 }}>{m.name}</td>
                      <td><span style={{ color:'var(--red)', fontWeight:700 }}>{m.currentStock}</span> <span className="text-muted" style={{ fontSize:'0.78rem' }}>{m.unit}</span></td>
                      <td className="text-muted">{m.minimumStock} {m.unit}</td>
                      <td><span className="badge badge-red">Low</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Activity</div>
          </div>
          <div>
            {[...(recentSales||[]).map(s => ({ type:'sale', ...s })), ...(recentPurchases||[]).map(p => ({ type:'purchase', ...p }))].length === 0 ? (
              <div className="empty-state" style={{ padding:'28px 20px' }}>
                <span className="ei">🕐</span><p>No recent activity</p>
              </div>
            ) : (
              [...(recentSales||[]).map(s => ({ type:'sale', ...s })), ...(recentPurchases||[]).map(p => ({ type:'purchase', ...p }))]
                .sort((a,b) => new Date(b.date) - new Date(a.date))
                .slice(0, 8)
                .map((item, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{item.type === 'sale' ? '💰' : '📥'}</span>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:'0.83rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {item.type === 'sale' ? item.product?.name : item.material?.name}
                        </div>
                        <div style={{ fontSize:'0.72rem', color:'var(--text3)' }}>
                          {item.type === 'sale' ? `Sold × ${item.quantity}` : `Added ${item.quantity} ${item.material?.unit}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginLeft:8 }}>
                      <div style={{ fontSize:'0.8rem', fontWeight:700, color: item.type==='sale' ? 'var(--green)' : 'var(--yellow)' }}>
                        {item.type==='sale' ? `-${item.quantity} units` : `+${item.quantity} ${item.material?.unit}`}
                      </div>
                      <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>{new Date(item.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
