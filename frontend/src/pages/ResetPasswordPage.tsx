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
    try {
      const tokenFromUrl = searchParams.get('token');
      console.log('ResetPasswordPage: Token from URL:', tokenFromUrl);
      console.log('ResetPasswordPage: All search params:', Object.fromEntries(searchParams));
      console.log('ResetPasswordPage: Full URL:', window.location.href);
      
      if (tokenFromUrl) {
        setToken(tokenFromUrl);
        setError(''); // Clear any previous errors
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
            setError('');
          } else {
            setError('Invalid reset link format');
          }
        } else {
          setError('No reset token found in URL. Please check your email link.');
        }
      }
    } catch (err) {
      console.error('ResetPasswordPage: Error in useEffect:', err);
      setError('Error loading reset page. Please try again.');
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

  // Always render something, even if there's an error
  return (
    <div className="overlay" style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      minHeight: '100vh'
    }}>
      <div className="modal" style={{ 
        minHeight: '300px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '450px',
        padding: 0,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
        border: '1px solid #1e3a5f',
        position: 'relative',
        zIndex: 100
      }}>
        <div className="content" style={{ padding: '2rem' }}>
          {success ? (
            <div className="success-message">
              <h2>Password Reset Successful!</h2>
              <p>Your password has been reset. Redirecting to login...</p>
            </div>
          ) : (
            <form className="form fade-in" onSubmit={handleSubmit} style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div className="text" style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#e2e8f0', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Reset Password</h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.5' }}>Enter your new password below.</p>
              </div>

              <input
                type="password"
                placeholder="New Password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#020617',
                  border: '1.5px solid #3b82f6',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />

              <input
                type="password"
                placeholder="Confirm New Password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#020617',
                  border: '1.5px solid #3b82f6',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />

              {error && (
                <div className="error-message" style={{
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}

              {!token && !error && (
                <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '1rem', padding: '1rem' }}>
                  <p>Loading reset token...</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>If you don't see a token, please check your email link.</p>
                </div>
              )}

              <button 
                type="submit" 
                className="btn" 
                disabled={loading || !token}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: token ? '#2563eb' : '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: (loading || !token) ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  opacity: (loading || !token) ? 0.5 : 1
                }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="link-container" style={{ textAlign: 'center', marginTop: '1rem' }}>
                <a href="/login" className="link" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '0.9rem' }}>Back to Login</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

