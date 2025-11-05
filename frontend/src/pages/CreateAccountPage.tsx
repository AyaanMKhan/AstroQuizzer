import './CreateAccountPage.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CreateAccountPageProps {
  onSignInClick: () => void;
}

export default function CreateAccountPage({ onSignInClick }: CreateAccountPageProps) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!firstName || !lastName || !username || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Password length validation
    if (password.length <= 8) {
      setError('Password must be greater than 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, username, email, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Sign up failed');
        return;
      }
      // Success: route to login
      navigate('/login');
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
          <div className="tab" onClick={onSignInClick}>
            Sign in
          </div>
          <div className="tab active">
            Sign up
          </div>
        </div>
        
        <div className="content">
          <form className="form fade-in" onSubmit={handleSubmit}>
            <input type="text" placeholder="First Name" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input type="text" placeholder="Last Name" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input type="text" placeholder="Username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="email" placeholder="Email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input type="password" placeholder="Confirm Password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {error && <div style={{ color: '#e33', marginTop: 8 }}>{error}</div>}
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

