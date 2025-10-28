import { useNavigate } from 'react-router-dom';
import './LeaderboardPage.css';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const leaderboardData = [
    { rank: 1, name: 'John Doe', score: 980 },
    { rank: 2, name: 'Jane Smith', score: 950 },
    { rank: 3, name: 'Bob Johnson', score: 920 },
    { rank: 4, name: 'Alice Williams', score: 890 },
    { rank: 5, name: 'Charlie Brown', score: 870 },
  ];

  return (
    <div>
      <nav className="navbar">
        <div className="nav">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>AstroQuizzer</div>
          <div className="btns">
            <button className="btn leaderboard active">Leaderboard</button>
            <button className="btn profile" onClick={() => navigate('/profile')}>Profile</button>
            <button className="btn sign-in">Sign In</button>
            <button className="btn sign-up">Sign Up</button>
          </div>
        </div>
      </nav>
      <div className="content">
        <h1>Leaderboard</h1>
        <div className="table">
          <div className="header">
            <span className="col">Rank</span>
            <span className="col">Player</span>
            <span className="col">Score</span>
          </div>
          {leaderboardData.map((player) => (
            <div key={player.rank} className="row">
              <span className="col">{player.rank}</span>
              <span className="col">{player.name}</span>
              <span className="col">{player.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

