import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPasswordPage.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_BASE = 'http://localhost:5001';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to send reset link');
        return;
      }
      setSuccess(true);
      // In development, show the reset link
      if (data.resetLink) {
        console.log('Reset link:', data.resetLink);
      }
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
          <div className="tab" onClick={() => navigate('/login')}>
            Sign in
          </div>
          <div className="tab" onClick={() => navigate('/signup')}>
            Sign up
          </div>
        </div>
        
        <div className="content">
          <div className="text">
            <h2>Forgot Password</h2>
            {success ? (
              <p style={{ color: '#4ade80' }}>If that email exists, a reset link has been sent. Please check your email.</p>
            ) : (
              <p>Enter your email address and we'll send you a link to reset your password.</p>
            )}
          </div>
          
          {error && <div style={{ color: '#e33', marginBottom: 12 }}>{error}</div>}
          
          {!success && (
            <form className="form" onSubmit={handleSubmit}>
              <input 
                type="email" 
                placeholder="Email" 
                className="input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

