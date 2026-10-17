import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShieldCheck, PhoneCall } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Layout({ user, onLogout }) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const open = () => setHelpOpen(true);
    window.addEventListener('open-help', open);
    return () => window.removeEventListener('open-help', open);
  }, []);

  const quickExit = () => {
    window.location.replace('/notes');
  };

  return (
    <div className="shell">
      <header className="topnav">
        <button className="brand" onClick={() => navigate('/')}>
          <ShieldCheck size={18} />
          <span>sakhi ✂</span>
        </button>

        <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">Menu</button>
        <nav className={`topnav-links ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/assist">Get the right help</NavLink>
          <NavLink to="/services">Trusted help</NavLink>
          <NavLink to="/report">Report a place</NavLink>
          <NavLink to="/dashboard">Safe route & SOS</NavLink>
          <NavLink to="/family">Family</NavLink>
        </nav>

        <div className="topnav-actions">
          <button className="ghost-btn danger-ghost" onClick={quickExit}>Quick exit</button>
          {user ? (
            <>
              <span className="nav-user">{user.name || user.phone}</span>
              <button className="ghost-btn" onClick={onLogout}>Log out</button>
            </>
          ) : (
            <button className="ghost-btn" onClick={() => navigate('/login')}>Sign in</button>
          )}
        </div>
      </header>

      <main className="shell-main">
        <Outlet />
      </main>

      <button className="fab-help" onClick={() => setHelpOpen(true)} aria-label="Emergency help">
        <PhoneCall size={22} />
        Help
      </button>

      {helpOpen && (
        <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">rip this open</p>
            <h2>get help now</h2>
            <p className="muted">These numbers work without an account. Your name is not shared by this app.</p>
            <div className="help-grid">
              <a className="help-call" href="tel:112">112 · Emergency</a>
              <a className="help-call" href="tel:181">181 · Women</a>
              <a className="help-call" href="tel:1098">1098 · Childline</a>
              <a className="help-call" href="tel:1091">1091 · Women police</a>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => { setHelpOpen(false); navigate(user ? '/dashboard' : '/login'); }}>
                Open live SOS tracking
              </button>
              <button className="ghost-btn" onClick={() => setHelpOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
