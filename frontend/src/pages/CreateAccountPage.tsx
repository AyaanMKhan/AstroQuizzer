import './CreateAccountPage.css';

interface CreateAccountPageProps {
  onSignInClick: () => void;
}

export default function CreateAccountPage({ onSignInClick }: CreateAccountPageProps) {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="tabs">
          <div className="tab" onClick={onSignInClick}>
            Sign in
          </div>
          <div className="tab active">
            Sign up
          </div>
        </div>
        
        <div className="content">
          <form className="form fade-in">
            <div className="row">
              <input type="text" placeholder="First Name" className="input" />
              <input type="text" placeholder="Last Name" className="input" />
            </div>
            <input type="text" placeholder="Username" className="input" />
            <input type="email" placeholder="Email" className="input" />
            <input type="password" placeholder="Password" className="input" />
            <input type="password" placeholder="Confirm Password" className="input" />
            <button type="submit" className="btn">
              Create account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

