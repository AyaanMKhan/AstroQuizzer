import './ForgotPasswordPage.css';

export default function ForgotPasswordPage() {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="tabs">
          <div className="tab">
            Sign in
          </div>
          <div className="tab">
            Sign up
          </div>
        </div>
        
        <div className="content">
          <div className="text">
            <h2>Forgot Password</h2>
            <p>Enter your email address and we'll send you a link to reset your password.</p>
          </div>
          
          <form className="form">
            <input type="email" placeholder="Email" className="input" />
            <button type="submit" className="btn">
              Send Reset Link
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

