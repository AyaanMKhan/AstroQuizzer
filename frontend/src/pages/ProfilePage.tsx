import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  return (
    <div>
      <nav className="navbar">
        <div className="nav">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>AstroQuizzer</div>
          <div className="btns">
            <button className="btn leaderboard" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
            <button className="btn profile active">Profile</button>
            <button className="btn sign-in">Sign In</button>
            <button className="btn sign-up">Sign Up</button>
          </div>
        </div>
      </nav>
      <div className="content">
        <div className="card">
          <div className="header">
            <div className="avatar">JD</div>
            <h2>John Doe</h2>
          </div>
          
          <div className="stats">
            <div className="stat">
              <div className="val">980</div>
              <div className="lbl">Total Score</div>
            </div>
            <div className="stat">
              <div className="val">15</div>
              <div className="lbl">Quizzes Taken</div>
            </div>
            <div className="stat">
              <div className="val">#3</div>
              <div className="lbl">Rank</div>
            </div>
          </div>

          <div className="section">
            <h3>Account Settings</h3>
            <div className="list">
              <div className="item">
                <span>Username</span>
                <button className="edit">Edit</button>
              </div>
              <div className="item">
                <span>Password</span>
                <button className="edit">Change</button>
              </div>
              <div className="item">
                <span>Email</span>
                <button className="edit">Edit</button>
              </div>
            </div>
          </div>

          <div className="section">
            <h3>Recent Activity</h3>
            <div className="list">
              <div className="item">
                <span className="type">Quiz Completed</span>
                <span className="date">2 days ago</span>
              </div>
              <div className="item">
                <span className="type">High Score</span>
                <span className="date">5 days ago</span>
              </div>
              <div className="item">
                <span className="type">Quiz Completed</span>
                <span className="date">1 week ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

