import './LoginPage.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginPageProps {
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
}

export default function LoginPage({ onSignUpClick, onForgotPasswordClick }: LoginPageProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = 'http://localhost:5001';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Login failed');
        return;
      }
      // Optionally store minimal user info; for now just navigate
      navigate('/profile');
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
            <input type="text" placeholder="Username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
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

