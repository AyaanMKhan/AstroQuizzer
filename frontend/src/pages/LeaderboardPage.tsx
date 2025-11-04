import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LeaderboardPage.css';

type LeaderboardRow = {
  _id?: string;
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

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    async function load() {
      setError('');
      setLoading(true);
      try {
        const stored = localStorage.getItem('aq_user');
        const parsed = stored ? JSON.parse(stored) : null;
        const body = parsed?.id ? { _id: parsed.id } : {};
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

        {error && <div style={{ color: '#e33', marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="table">
            <div className="table-header">
              <span className="col">Rank</span>
              <span className="col">Player</span>
              <span className="col">Score</span>
            </div>
            {rows.map((player) => {
              const isCurrentUser = currentUser && currentUser.username === player.username;
              const medal = player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : null;
              return (
                <div 
                  key={player.rank} 
                  className={`row ${isCurrentUser ? 'highlight' : ''}`}
                >
                  <span className="col rank-col">
                    {medal ? <span className="medal">{medal}</span> : player.rank}
                  </span>
                  <span className="col">{player.username}</span>
                  <span className="col">{player.totalScore}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

