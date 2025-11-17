import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LeaderboardPage.css';

type LeaderboardRow = {
  rank: number;
  username: string;
  totalScore: number;
};

type LeaderboardUser = {
  username: string;
  score: number;
  rank: number;
} | null;

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('aq_user');

  const isCurrentUser = (player: LeaderboardRow) => {
    if (!currentUser) return false;
    try {
      if (currentUser.username && player.username && String(currentUser.username) === String(player.username)) return true;
      if (currentUser.rank && player.rank && Number(currentUser.rank) === Number(player.rank)) return true;
    } catch (e) {
      return false;
    }
    return false;
  };

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    async function load() {
      setError('');
      setLoading(true);
      try {
        const stored = localStorage.getItem('aq_user');
        const parsed = stored ? JSON.parse(stored) : null;
        const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('aq_token') : null;
        const body = parsed?.id ? { _id: parsed.id, jwtToken } : { jwtToken };
        const res = await fetch(`${API_BASE}/api/leaderboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || 'Failed to load leaderboard');
          return;
        }
        setRows((data.topHundred || []) as LeaderboardRow[]);
        setCurrentUser((data.user || null) as LeaderboardUser);
      } catch (e) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <nav className="navbar">
        <div className="nav">
          <div className="logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>AstroQuizzer</div>
          <div className="btns">
            <button className="btn apod" onClick={() => navigate('/apod')}>Today's Picture</button>
            <button className="btn leaderboard active">Leaderboard</button>
            <button className="btn profile" onClick={() => navigate('/profile')}>Profile</button>
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
        <h1>Leaderboard</h1>

        {currentUser && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="header">
              <div className="avatar">{currentUser.username.slice(0,2).toUpperCase()}</div>
              <h2>{currentUser.username}</h2>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="val">#{currentUser.rank}</div>
                <div className="lbl">Rank</div>
              </div>
              <div className="stat">
                <div className="val">{currentUser.score}</div>
                <div className="lbl">Score</div>
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#e33', marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div>Loading...</div>
        ) : (
        <div className="table">
          <div className="header">
            <span className="col">Rank</span>
            <span className="col">Player</span>
            <span className="col">Score</span>
          </div>
            {rows.map((player) => (
            <div key={player.rank} className={"row" + (isCurrentUser(player) ? ' highlight' : '')}>
              <span className="col">{player.rank}</span>
                <span className="col">{player.username}</span>
                <span className="col">{player.totalScore}</span>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

