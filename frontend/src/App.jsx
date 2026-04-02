import { Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ClanPage from './pages/ClanPage';
import ProfilePage from './pages/ProfilePage';
import MapView from './MapView';
import BottomNav from './components/BottomNav';

function App() {
  const location = useLocation();
  const hideNav = location.pathname === '/' || location.pathname === '/auth';

  return (
    <div className={hideNav ? "" : "pb-16" /* Add padding for the sticky bottom nav */}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/clans" element={<ClanPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default App;