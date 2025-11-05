import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ApodPage.css';

type ApodData = {
  date: string;
  title: string;
  url: string;
  explanation: string;
  media_type: 'image' | 'video';
  additionalResources: string[];
} | null;

export default function ApodPage() {
  const navigate = useNavigate();
  const [apod, setApod] = useState<ApodData>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('aq_user');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    async function loadApod() {
      setError('');
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/apod/today`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || 'Failed to load APOD');
          return;
        }
        setApod(data as ApodData);
      } catch (e) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadApod();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div>
      <nav className="navbar">
        <div className="nav">
          <div className="logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>AstroQuizzer</div>
          <div className="btns">
            <button className="btn apod active">Today's Picture</button>
            <button className="btn leaderboard" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
            <button className="btn profile" onClick={() => navigate('/profile')}>Profile</button>
            {isLoggedIn ? (
              <button
                className="btn sign-in"
                onClick={() => { try { localStorage.removeItem('aq_user'); } catch {}; navigate('/login'); }}
              >
                Logout
              </button>
            ) : (
              <>
                <button className="btn sign-in" onClick={() => navigate('/login')}>Sign In</button>
                <button className="btn sign-up" onClick={() => navigate('/signup')}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </nav>
      <div className="apod-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading today's cosmic wonder...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p>{error}</p>
            <button className="retry-btn" onClick={() => window.location.reload()}>Try Again</button>
          </div>
        ) : apod ? (
          <>
            <div className="apod-header">
              <div className="header-badge">
                <span className="badge-icon">🌌</span>
                <span>NASA's Picture of the Day</span>
              </div>
              <h1 className="apod-title">{apod.title}</h1>
              <p className="apod-date">{formatDate(apod.date)}</p>
            </div>

            <div className="apod-main">
              <div className="media-container">
                {apod.media_type === 'image' ? (
                  <div className="image-wrapper">
                    <img 
                      src={apod.url} 
                      alt={apod.title}
                      className="apod-image"
                      loading="lazy"
                    />
                    <div className="image-overlay"></div>
                  </div>
                ) : (
                  <div className="video-wrapper">
                    <iframe
                      src={apod.url}
                      title={apod.title}
                      className="apod-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
              </div>

              <div className="apod-info">
                <div className="explanation-card">
                  <h2 className="section-title">
                    <span className="title-icon">📖</span>
                    Explanation
                  </h2>
                  <p className="explanation-text">{apod.explanation}</p>
                </div>

                {apod.additionalResources && apod.additionalResources.length > 0 && (
                  <div className="resources-card">
                    <h2 className="section-title">
                      <span className="title-icon">🔗</span>
                      Additional Resources
                    </h2>
                    <p className="resources-subtitle">Explore more about this cosmic phenomenon:</p>
                    <div className="resources-list">
                      {apod.additionalResources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="resource-link"
                        >
                          <span className="link-icon">🌐</span>
                          <span className="link-text">{resource}</span>
                          <span className="external-icon">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

