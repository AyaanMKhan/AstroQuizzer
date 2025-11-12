import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './VerifyEmailPage.css';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already' | 'missing'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) {
      setStatus('missing');
      setMessage('Missing verification token.');
      return;
    }

    async function verify() {
      setStatus('loading');
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const res = await fetch(`${API_BASE}/api/verify-email?token=${encodeURIComponent(String(token))}`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may be invalid or expired.');
          return;
        }
        // success or already verified
        if (data.message && data.message.toLowerCase().includes('already')) {
          setStatus('already');
          setMessage(data.message);
        } else {
          setStatus('success');
          setMessage(data.message || 'Your email has been verified.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.message || 'Network error while verifying your account.');
      }
    }

    verify();
  }, [location.search]);

  return (
    <div className="verify-page">
      <div className="verify-card">
        {status === 'loading' && <h2>Verifying your account…</h2>}
        {status === 'success' && (
          <>
            <h2>Account verified ✅</h2>
            <p>{message}</p>
            <button className="btn" onClick={() => navigate('/login')}>Go to Login</button>
          </>
        )}
        {status === 'already' && (
          <>
            <h2>Already verified</h2>
            <p>{message}</p>
            <button className="btn" onClick={() => navigate('/login')}>Go to Login</button>
          </>
        )}
        {status === 'error' && (
          <>
            <h2>Verification failed</h2>
            <p>{message}</p>
            <button className="btn" onClick={() => navigate('/signup')}>Create account</button>
          </>
        )}
        {status === 'missing' && (
          <>
            <h2>Invalid link</h2>
            <p>{message}</p>
            <button className="btn" onClick={() => navigate('/signup')}>Create account</button>
          </>
        )}
      </div>
    </div>
  );
}
