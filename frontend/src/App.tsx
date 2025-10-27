import { Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CreateAccountPage from './pages/CreateAccountPage';

export default function App() {
  const navigate = useNavigate();

  return (
    <div>
      <Routes>
        <Route path="/" element={
          <HomePage 
            onSignInClick={() => navigate('/login')}
            onSignUpClick={() => navigate('/signup')}
          />
        } />
        <Route path="/login" element={
          <LoginPage 
            onSignUpClick={() => navigate('/signup')}
            onForgotPasswordClick={() => navigate('/forgot-password')}
          />
        } />
        <Route path="/signup" element={<CreateAccountPage onSignInClick={() => navigate('/login')} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
    </div>
  );
}
