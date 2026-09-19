import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Config from './pages/Config';
import { OraclePage } from './pages/OraclePage';
import { TeamImages } from './pages/TeamImages';
import { HookahTriggers } from './pages/HookahTriggers';
import { OracleToggle } from './pages/OracleToggle';

function App() {
  const location = useLocation();

  const navItems = [
    { path: '/oracle/nba', label: 'NBA Oracle' },
    { path: '/oracle/football', label: 'Football Oracle' },
    { path: '/team-images', label: 'Team Images' },
    { path: '/hookah', label: 'Hookah Triggers' },
    { path: '/oracle-control', label: 'Oracle Control' },
    { path: '/config', label: 'Config' },
  ];

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <h1>radix.bet</h1>
          <span>Admin</span>
          {import.meta.env.VITE_RADIX_NETWORK === 'mainnet' ? (
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 4 }}>MAINNET</span>
          ) : (
            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>STOKENET</span>
          )}
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link to={item.path} className={location.pathname === item.path ? 'active' : ''}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/oracle/nba" replace />} />
          <Route path="/oracle/nba" element={<OraclePage oracleId="nba" title="NBA Oracle" />} />
          <Route
            path="/oracle/football"
            element={
              <OraclePage
                oracleId="football"
                title="Football Oracle"
                leagues={['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'uefa.champions', 'usa.1']}
              />
            }
          />
          <Route path="/team-images" element={<TeamImages />} />
          <Route path="/hookah" element={<HookahTriggers />} />
          <Route path="/oracle-control" element={<OracleToggle />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
