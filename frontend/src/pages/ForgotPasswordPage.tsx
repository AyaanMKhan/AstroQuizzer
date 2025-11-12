import './ForgotPasswordPage.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CreateAccountPageProps {
  onForgotPasswordClick: () => void;
}

export default function ForgotPasswordPage({ onForgotPasswordClick }: CreateAccountPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = /*import.meta.env.VITE_API_URL ||*/ 'http://localhost:5001';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to send reset link');
      }
      // Success: route to login
      navigate('/login');
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

//export default function ForgotPasswordPage() {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="tabs">
          <div className="tab" onClick={onForgotPasswordClick}>
            Sign in
          </div>
          <div className="tab">
            Sign up
          </div>
        </div>
        
        <div className="content">
          <form className="form fade-in" onSubmit={handleSubmit}>
            <div className="text">
              <h2>Forgot Password</h2>
              <p>Enter your email address and we'll send you a link to reset your password.</p>
            </div>

            <input
              type="email"
              placeholder="Email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && <div style={{ color: '#e33', marginTop: 8 }}>{error}</div>}

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}