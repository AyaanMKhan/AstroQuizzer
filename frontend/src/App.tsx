import { Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ApodPage from './pages/ApodPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CreateAccountPage from './pages/CreateAccountPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <Routes>
        <Route path="/" element={
          <LoginPage 
            onSignUpClick={() => navigate('/signup')}
            onForgotPasswordClick={() => navigate('/forgot-password')}
          />
        } />
        <Route path="/home" element={
          <HomePage 
            onSignInClick={() => navigate('/login')}
            onSignUpClick={() => navigate('/signup')}
            onLeaderboardClick={() => navigate('/leaderboard')}
            onProfileClick={() => navigate('/profile')}
            onApodClick={() => navigate('/apod')}
          />
        } />
        <Route path="/apod" element={<ApodPage />} />
        <Route path="/login" element={
          <LoginPage 
            onSignUpClick={() => navigate('/signup')}
            onForgotPasswordClick={() => navigate('/forgot-password')}
          />
        } />
        <Route path="/signup" element={<CreateAccountPage onSignInClick={() => navigate('/login')} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage onForgotPasswordClick={() => navigate('/login')}/>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </div>
  );
}
