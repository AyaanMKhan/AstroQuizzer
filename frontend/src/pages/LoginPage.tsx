import './LoginPage.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginPageProps {
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
}

export default function LoginPage({ onSignUpClick, onForgotPasswordClick }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = 'http://localhost:5001';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Login failed');
        return;
      }
      try {
        localStorage.setItem('aq_user', JSON.stringify({
          id: data.id,
          email,
          firstName: data.firstName || '',
          lastName: data.lastName || ''
        }));
      } catch {}
      navigate('/home');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <div className="tabs">
          <div className="tab active" onClick={onSignUpClick}>
            Sign in
          </div>
          <div className="tab" onClick={onSignUpClick}>
            Sign up
          </div>
        </div>
        
        <div className="content">
          <form className="form" onSubmit={handleSubmit}>
            <input type="email" placeholder="Email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <div style={{ color: '#e33', marginTop: 8 }}>{error}</div>}
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
          <div className="forgot">
            <button type="button" onClick={onForgotPasswordClick}>
              Forgot Password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

