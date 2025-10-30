import { useNavigate } from 'react-router-dom';
import './HomePage.css';

interface HomePageProps {
  onSignInClick: () => void;
  onSignUpClick: () => void;
  onLeaderboardClick: () => void;
  onProfileClick: () => void;
}

export default function HomePage({ onSignInClick, onSignUpClick, onLeaderboardClick, onProfileClick }: HomePageProps) {
  const navigate = useNavigate();
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('aq_user');

  return (
    <div>
      <nav className="navbar">
        <div className="nav">
          <div className="logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>AstroQuizzer</div>
          <div className="btns">
            <button className="btn leaderboard" onClick={onLeaderboardClick}>Leaderboard</button>
            <button className="btn profile" onClick={onProfileClick}>Profile</button>
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
        <p>Test your astronomical knowledge with our interactive quizzes!</p>
      </div>
    </div>
  );
}

