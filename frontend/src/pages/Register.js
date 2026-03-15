import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Fill all fields');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">⚡</div>
          <div>
            <h1>StockFlow</h1>
            <span>Manufacturing ERP</span>
          </div>
        </div>

        <h2 className="auth-title">Create account</h2>
        <p className="auth-sub">Set up your StockFlow workspace</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input placeholder="John Smith" value={form.name} onChange={e => setForm({...form, name:e.target.value})} autoComplete="name" />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm({...form, email:e.target.value})} autoComplete="email" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Min 6 chars" value={form.password} onChange={e => setForm({...form, password:e.target.value})} autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" placeholder="Repeat password" value={form.confirm} onChange={e => setForm({...form, confirm:e.target.value})} autoComplete="new-password" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop:4 }} disabled={loading}>
            {loading ? '⏳ Creating…' : 'Create Account →'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
