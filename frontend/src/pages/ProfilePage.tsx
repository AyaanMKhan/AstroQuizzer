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
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('aq_user');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const [deleting, setDeleting] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [updatingUsername, setUpdatingUsername] = useState(false);

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
        const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('aq_token') : null;
        const res = await fetch(`${API_BASE}/api/user/${parsed.id}${jwtToken ? `?jwtToken=${encodeURIComponent(jwtToken)}` : ''}`);
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
                {!editingUsername ? (
                  <>
                    <span>Username: {profile?.username}</span>
                    <button
                      className="edit"
                      onClick={() => {
                        setEditingUsername(true);
                        setNewUsername(profile?.username || '');
                      }}
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!newUsername.trim()) {
                            setEditingUsername(false);
                            return;
                          }
                          setUpdatingUsername(true);
                          try {
                            setError('');
                            const stored = localStorage.getItem('aq_user');
                            const parsed = stored ? JSON.parse(stored) : null;
                            const id = parsed?.id || profile?.id;
                            if (!id) { setError('Missing user id'); setUpdatingUsername(false); return; }
                            const res = await fetch(`${API_BASE}/api/user/${id}/username`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ username: newUsername.trim() })
                            });
                            const data = await res.json();
                            if (!res.ok || data.error) {
                              setError(data.error || 'Failed to update username');
                              setUpdatingUsername(false);
                              return;
                            }
                            setProfile(prev => prev ? { ...prev, username: data.username } : prev);
                            try {
                              const userRaw = localStorage.getItem('aq_user');
                              if (userRaw) {
                                const u = JSON.parse(userRaw);
                                u.username = data.username;
                                localStorage.setItem('aq_user', JSON.stringify(u));
                              }
                            } catch (e) {}
                            setEditingUsername(false);
                          } catch (e) {
                            setError('Network error. Please try again.');
                          } finally {
                            setUpdatingUsername(false);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingUsername(false);
                          setNewUsername('');
                        }
                      }}
                      autoFocus
                      disabled={updatingUsername}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#020617',
                        border: '1px solid #2563eb',
                        borderRadius: '4px',
                        color: '#e2e8f0',
                        fontSize: '1rem'
                      }}
                    />
                    <button
                      className="edit"
                      onClick={async () => {
                        if (!newUsername.trim()) {
                          setEditingUsername(false);
                          return;
                        }
                        setUpdatingUsername(true);
                        try {
                          setError('');
                          const stored = localStorage.getItem('aq_user');
                          const parsed = stored ? JSON.parse(stored) : null;
                          const id = parsed?.id || profile?.id;
                          if (!id) { setError('Missing user id'); setUpdatingUsername(false); return; }
                          const res = await fetch(`${API_BASE}/api/user/${id}/username`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: newUsername.trim() })
                          });
                          const data = await res.json();
                          if (!res.ok || data.error) {
                            setError(data.error || 'Failed to update username');
                            setUpdatingUsername(false);
                            return;
                          }
                          setProfile(prev => prev ? { ...prev, username: data.username } : prev);
                          try {
                            const userRaw = localStorage.getItem('aq_user');
                            if (userRaw) {
                              const u = JSON.parse(userRaw);
                              u.username = data.username;
                              localStorage.setItem('aq_user', JSON.stringify(u));
                            }
                          } catch (e) {}
                          setEditingUsername(false);
                        } catch (e) {
                          setError('Network error. Please try again.');
                        } finally {
                          setUpdatingUsername(false);
                        }
                      }}
                      disabled={updatingUsername}
                      style={{ background: '#22c55e' }}
                    >
                      {updatingUsername ? 'Saving...' : 'Confirm'}
                    </button>
                    <button
                      className="edit"
                      onClick={() => {
                        setEditingUsername(false);
                        setNewUsername('');
                      }}
                      disabled={updatingUsername}
                      style={{ background: '#64748b' }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              <div className="item">
                <span>Password</span>
                <button
                  className="edit"
                  onClick={() => {
                    // Navigate to the forgot-password flow so user can request a reset email
                    navigate('/forgot-password');
                  }}
                >
                  Change
                </button>
              </div>

              <div className="item">
                <span style={{ color: '#ef4444' }}>Delete Account</span>
                <button
                  className="edit"
                  style={{ background: '#ef4444', color: 'white' }}
                  onClick={async () => {
                    if (!confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
                    setError('');
                    setDeleting(true);
                    try {
                      const stored = localStorage.getItem('aq_user');
                      const parsed = stored ? JSON.parse(stored) : null;
                      const id = parsed?.id || profile?.id;
                      if (!id) {
                        setError('Missing user id');
                        setDeleting(false);
                        return;
                      }
                      const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('aq_token') : null;
                      const res = await fetch(`${API_BASE}/api/deleteUser`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, jwtToken })
                      });
                      const data = await res.json();
                      if (!res.ok || data.error) {
                        setError(data.error || 'Failed to delete account');
                        setDeleting(false);
                        return;
                      }
                      // Clear local state and storage
                      try { localStorage.removeItem('aq_user'); localStorage.removeItem('aq_token'); } catch (e) {}
                      navigate('/signup');
                    } catch (e) {
                      setError('Network error. Please try again.');
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

