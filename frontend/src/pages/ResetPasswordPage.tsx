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
    console.log('ResetPasswordPage: Token from URL:', tokenFromUrl);
    console.log('ResetPasswordPage: All search params:', Object.fromEntries(searchParams));
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      // Try to get token from path if it's in the format /reset-password/passwordtoken-...
      const pathname = window.location.pathname;
      console.log('ResetPasswordPage: Pathname:', pathname);
      if (pathname.includes('passwordtoken-')) {
        const tokenMatch = pathname.match(/passwordtoken-(.+)/);
        if (tokenMatch && tokenMatch[1]) {
          const extractedToken = tokenMatch[1];
          console.log('ResetPasswordPage: Extracted token from path:', extractedToken);
          setToken(extractedToken);
        } else {
          setError('Invalid reset link format');
        }
      } else {
        setError('No reset token found in URL');
      }
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

  console.log('ResetPasswordPage: Rendering, token:', token ? 'present' : 'missing', 'error:', error);
  console.log('ResetPasswordPage: Full URL:', window.location.href);

  return (
    <div className="overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="modal" style={{ minHeight: '300px' }}>
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
                disabled={loading}
              />

              <input
                type="password"
                placeholder="Confirm New Password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />

              {error && <div className="error-message">{error}</div>}

              {!token && !error && (
                <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '1rem' }}>
                  Loading reset token...
                </div>
              )}

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

