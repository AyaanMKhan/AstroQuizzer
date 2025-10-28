import './LoginPage.css';

interface LoginPageProps {
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
}

export default function LoginPage({ onSignUpClick, onForgotPasswordClick }: LoginPageProps) {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="tabs">
          <div className="tab active" onClick={onSignUpClick}>
            Sign in
          </div>
          <div className="tab" onClick={onSignUpClick}>
            Sign up
          </div>
        </div>
        
        <div className="content">
          <form className="form">
            <input type="email" placeholder="Email" className="input" />
            <input type="password" placeholder="Password" className="input" />
            <button type="submit" className="btn">
              Login
            </button>
          </form>
          <div className="forgot">
            <button type="button" onClick={onForgotPasswordClick}>
              Forgot Password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

