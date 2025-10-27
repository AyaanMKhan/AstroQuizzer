import './HomePage.css';

interface HomePageProps {
  onSignInClick: () => void;
  onSignUpClick: () => void;
}

export default function HomePage({ onSignInClick, onSignUpClick }: HomePageProps) {
  return (
    <div>
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">AstroQuizzer</div>
          <div className="nav-buttons">
            <button className="nav-btn signin-btn" onClick={onSignInClick}>Sign In</button>
            <button className="nav-btn signup-btn" onClick={onSignUpClick}>Sign Up</button>
          </div>
        </div>
      </nav>
      <div className="home-content">
        <h1>Welcome to AstroQuizzer</h1>
        <p>Test your astronomical knowledge with our interactive quizzes!</p>
      </div>
    </div>
  );
}

