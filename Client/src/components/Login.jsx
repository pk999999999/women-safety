import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    userName: '',
    userPhone: '',
    userPassword: '',
    emergencyName: '',
    emergencyPhone: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (formData.userName && formData.userPhone && formData.userPassword) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const path = mode === 'login' ? 'login' : 'signup';
      const resp = await axios.post(`${API_BASE}/${path}`, formData);
      if (resp.data.success) {
        onLogin(resp.data.user);
        navigate('/dashboard');
      } else {
        setErrorMsg(resp.data.msg || 'Could not continue');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.response?.data?.msg || 'Could not reach the server. You can still browse help without signing in.');
    }
  };

  return (
    <div className="login-page">
      <div className="auth-card glass">
        <ShieldCheck size={48} color="#1c140c" style={{ margin: '0 auto 12px' }} />
        <p className="eyebrow">optional sticker</p>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>sakhi sahayak</h1>
        <p className="muted" style={{ marginBottom: '18px' }}>
          Needed only for live SOS, Sarthi and family tracking. Trusted help and place reports work without this.
        </p>
        <Link to="/" className="ghost-btn" style={{ textDecoration: 'none', marginBottom: '16px' }}>
          Continue without signing in
        </Link>

        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setStep(1); setErrorMsg(''); }}>Login</button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setStep(1); setErrorMsg(''); }}>Sign up</button>
        </div>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        {mode === 'login' && (
          <form onSubmit={handleSubmit} className="auth-form">
            <label>Registered phone</label>
            <input type="text" name="userPhone" value={formData.userPhone} onChange={handleChange} placeholder="9876543210" required />
            <label>Password</label>
            <input type="password" name="userPassword" value={formData.userPassword} onChange={handleChange} placeholder="Enter password" required />
            <button type="submit" className="btn">Open SOS dashboard</button>
          </form>
        )}

        {mode === 'signup' && step === 1 && (
          <form onSubmit={handleNext} className="auth-form">
            <p className="tiny">Step 1 of 2 · Personal details</p>
            <label>Full name</label>
            <input type="text" name="userName" value={formData.userName} onChange={handleChange} placeholder="Priya Sharma" required />
            <label>Phone</label>
            <input type="text" name="userPhone" value={formData.userPhone} onChange={handleChange} placeholder="9876543210" required />
            <label>Password</label>
            <input type="password" name="userPassword" value={formData.userPassword} onChange={handleChange} placeholder="Create a password" required />
            <button type="submit" className="btn">Next</button>
          </form>
        )}

        {mode === 'signup' && step === 2 && (
          <form onSubmit={handleSubmit} className="auth-form">
            <p className="tiny">Step 2 of 2 · Emergency contact (used only if you trigger SOS)</p>
            <label>Contact name</label>
            <input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleChange} placeholder="Papa / trusted person" required />
            <label>Contact number</label>
            <input type="text" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} placeholder="9999988888" required />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ghost-btn" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="btn" style={{ marginTop: 0 }}>Complete signup</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
