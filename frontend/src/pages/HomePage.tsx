import { useNavigate } from 'react-router-dom';
import './HomePage.css';

interface HomePageProps {
  onSignInClick: () => void;
  onSignUpClick: () => void;
  onLeaderboardClick: () => void;
  onProfileClick: () => void;
  onApodClick?: () => void;
}

export default function HomePage({ onSignInClick, onSignUpClick, onLeaderboardClick, onProfileClick, onApodClick }: HomePageProps) {
  const navigate = useNavigate();
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('aq_user');

  return (
    <div>
      <nav className="navbar">
        <div className="nav">
          <div className="logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>AstroQuizzer</div>
          <div className="btns">
            {onApodClick && <button className="btn apod" onClick={onApodClick}>Today's Picture</button>}
            <button className="btn leaderboard" onClick={onLeaderboardClick}>Leaderboard</button>
            <button className="btn profile" onClick={(isLoggedIn ? onProfileClick : () => navigate('/login'))}>Profile</button>
            {isLoggedIn ? (
              <button
                className="btn sign-in"
                onClick={() => { try { localStorage.removeItem('aq_user'); } catch {}; navigate('/login'); }}
              >
                Logout
              </button>
            ) : (
              <>
                <button className="btn sign-in" onClick={onSignInClick}>Sign In</button>
                <button className="btn sign-up" onClick={onSignUpClick}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </nav>
      <div className="content">
        <h1>Welcome to AstroQuizzer</h1>
        <p>Explore the cosmos with daily astronomy pictures and compete with fellow enthusiasts!</p>
        <div className="feature-grid">
          <div className="feature-card top">
            <h2>Today's Picture</h2>
            <p>Discover NASA's Astronomy Picture of the Day with detailed explanations and resources</p>
            {onApodClick && <button className="feature-btn" onClick={onApodClick}>View Picture</button>}
          </div>
          <div className="feature-card left">
            <h2>Leaderboard</h2>
            <p>See where you rank among fellow astronomy enthusiasts</p>
            <button className="feature-btn" onClick={onLeaderboardClick}>View Leaderboard</button>
          </div>
          <div className="feature-card right">
            <h2>Profile</h2>
            <p>Track your progress and view your achievements</p>
            <button className="feature-btn" onClick={(isLoggedIn ? onProfileClick : () => navigate('/login'))}>View Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
}

