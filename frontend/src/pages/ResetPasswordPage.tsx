import './ResetPasswordPage.css';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_BASE = 'https://astroquizzer.xyz';

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('No reset token found in URL');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to reset password');
        setLoading(false);
        return;
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <div className="content">
          {success ? (
            <div className="success-message">
              <h2>Password Reset Successful!</h2>
              <p>Your password has been reset. Redirecting to login...</p>
            </div>
          ) : (
            <form className="form fade-in" onSubmit={handleSubmit}>
              <div className="text">
                <h2>Reset Password</h2>
                <p>Enter your new password below.</p>
              </div>

              <input
                type="password"
                placeholder="New Password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading || !token}
              />

              <input
                type="password"
                placeholder="Confirm New Password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || !token}
              />

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="btn" disabled={loading || !token}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="link-container">
                <a href="/login" className="link">Back to Login</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

