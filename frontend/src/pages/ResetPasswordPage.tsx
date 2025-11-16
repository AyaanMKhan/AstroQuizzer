import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ForgotPasswordPage.css';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_BASE = 'https://astroquizzer.xyz';

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('Invalid reset link');
        setVerifying(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/reset-password/${token}`);
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setError('Invalid or expired reset link');
        }
      } catch (e) {
        setError('Failed to verify reset link');
      } finally {
        setVerifying(false);
      }
    }
    verifyToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to reset password');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="overlay">
        <div className="modal">
          <div className="content">
            <div>Verifying reset link...</div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="overlay">
        <div className="modal">
          <div className="content">
            <div className="text">
              <h2>Password Reset Successful!</h2>
              <p>Redirecting to login...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay">
      <div className="modal">
        <div className="tabs">
          <div className="tab">
            Sign in
          </div>
          <div className="tab">
            Sign up
          </div>
        </div>
        
        <div className="content">
          <div className="text">
            <h2>Reset Password</h2>
            <p>Enter your new password below.</p>
          </div>
          
          {error && <div style={{ color: '#e33', marginBottom: 12 }}>{error}</div>}
          
          <form className="form" onSubmit={handleSubmit}>
            <input 
              type="password" 
              placeholder="New Password" 
              className="input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Confirm New Password" 
              className="input" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

