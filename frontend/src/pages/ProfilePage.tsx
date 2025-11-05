import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

type Profile = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  totalScore: number;
  quizzesTaken: number;
  favoriteSign: string;
  rank: number | null;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('aq_user');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    async function load() {
      setError('');
      setLoading(true);
      try {
        const stored = localStorage.getItem('aq_user');
        const parsed = stored ? JSON.parse(stored) : null;
        if (!parsed?.id) {
          setError('Not logged in');
          setLoading(false);
          return;
        }
        const res = await fetch(`${API_BASE}/api/user/${parsed.id}`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || 'Failed to load profile');
          return;
        }
        setProfile(data as Profile);
      } catch (e) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const initials = profile ? (profile.firstName[0] + profile.lastName[0]).toUpperCase() : '??';
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : 'Unknown User';

  async function handleUsernameUpdate() {
    if (!profile || !newUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (newUsername.trim() === profile.username) {
      setEditingUsername(false);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/user/${profile.id}/username`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() })
      });
      
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to update username');
        return;
      }
      
      // Update local state
      setProfile({ ...profile, username: data.username });
      setEditingUsername(false);
      
      // Update localStorage if needed
      try {
        const stored = localStorage.getItem('aq_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.username = data.username;
          localStorage.setItem('aq_user', JSON.stringify(parsed));
        }
      } catch {}
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function startEditingUsername() {
    if (profile) {
      setNewUsername(profile.username);
      setEditingUsername(true);
      setError('');
    }
  }

  function cancelEditingUsername() {
    setEditingUsername(false);
    setNewUsername('');
    setError('');
  }

  return (
    <div>
      <nav className="navbar">
        <div className="nav">
          <div className="logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>AstroQuizzer</div>
          <div className="btns">
            <button className="btn apod" onClick={() => navigate('/apod')}>Today's Picture</button>
            <button className="btn leaderboard" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
            <button className="btn profile active">Profile</button>
            {isLoggedIn ? (
              <button
                className="btn sign-in"
                onClick={() => { try { localStorage.removeItem('aq_user'); } catch {}; navigate('/login'); }}
              >
                Logout
              </button>
            ) : (
              <>
                <button className="btn sign-in" onClick={() => navigate('/login')}>Sign In</button>
                <button className="btn sign-up" onClick={() => navigate('/signup')}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </nav>
      <div className="content">
        {error && <div style={{ color: '#e33', marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="card">
            <div className="header">
              <div className="avatar">{initials}</div>
              <h2>{fullName}</h2>
            </div>
            
            <div className="stats">
              <div className="stat">
                <div className="val">{profile?.totalScore ?? 0}</div>
                <div className="lbl">Total Score</div>
              </div>
              <div className="stat">
                <div className="val">{profile?.quizzesTaken ?? 0}</div>
                <div className="lbl">Quizzes Taken</div>
              </div>
              <div className="stat">
                <div className="val">{profile?.rank ? `#${profile.rank}` : '-'}</div>
                <div className="lbl">Rank</div>
              </div>
            </div>

            <div className="section">
              <h3>Account Settings</h3>
              <div className="list">
                <div className="item">
                  {editingUsername ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background: '#020617',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#e2e8f0',
                          fontSize: '0.95rem'
                        }}
                        autoFocus
                        disabled={saving}
                      />
                      <button
                        className="edit"
                        onClick={handleUsernameUpdate}
                        disabled={saving}
                        style={{ opacity: saving ? 0.5 : 1 }}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="edit"
                        onClick={cancelEditingUsername}
                        disabled={saving}
                        style={{ 
                          background: 'transparent',
                          color: '#94a3b8',
                          border: '1px solid #334155'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{profile?.username || ''}</span>
                      <button className="edit" onClick={startEditingUsername}>Edit</button>
                    </>
                  )}
                </div>
              </div>
              {error && <div style={{ color: '#e33', marginTop: '0.75rem', fontSize: '0.875rem' }}>{error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

