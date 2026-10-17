import { useNavigate } from 'react-router-dom';
import { ShieldAlert, MapPinned, Baby, Route, Lock, BadgeCheck } from 'lucide-react';

export default function Home({ user }) {
  const navigate = useNavigate();

  return (
    <div className="page">
      <section className="hero-panel">
        <div className="stamp">CUT<br />&amp; CALL</div>
        <p className="eyebrow">women + child safety, no cap</p>
        <h1>find real help.<br />skip the creepy forms.</h1>
        <p className="hero-lead">
          Verified helplines, anonymous place reports, and the right number in two taps.
          SOS, Sarthi and safe routing still live in the back pocket.
        </p>
        <div className="hero-pills">
          <span><Lock size={14} /> no login to browse</span>
          <span><BadgeCheck size={14} /> verified stickers</span>
          <span>hi · mr · en</span>
        </div>
        <p className="scrap-note" style={{ marginTop: 16 }}>tape this number: 112 · 181 · 1098</p>
      </section>

      <section className="triage-grid">
        <button className="triage-card urgent" onClick={() => window.dispatchEvent(new Event('open-help'))}>
          <ShieldAlert size={28} />
          <h3>unsafe rn</h3>
          <p>Call 112 / 181 / 1098. Live SOS if you already signed in.</p>
        </button>
        <button className="triage-card" onClick={() => navigate('/assist')}>
          <BadgeCheck size={28} />
          <h3>need the right people</h3>
          <p>Tiny quiz → helpline, shelter, legal aid or counsellor.</p>
        </button>
        <button className="triage-card" onClick={() => navigate('/report')}>
          <MapPinned size={28} />
          <h3>this street is a no</h3>
          <p>Drop a lighting / isolated-path report. Name not required.</p>
        </button>
        <button className="triage-card" onClick={() => navigate('/services?audience=child')}>
          <Baby size={28} />
          <h3>a kid needs backup</h3>
          <p>Childline 1098, CWC, railway child desks.</p>
        </button>
      </section>

      <section className="split-row">
        <div className="info-card">
          <h3>what we actually keep</h3>
          <ul>
            <li>Directory is public. No account.</li>
            <li>Reports never save a name or phone.</li>
            <li>GPS stays fuzzy unless you opt in.</li>
            <li>Live tracking is opt-in after sign-in.</li>
          </ul>
        </div>
        <div className="info-card">
          <p className="scrap-note">the extra toolkit</p>
          <h3>Sarthi + Whisper + SOS</h3>
          <p className="muted">Stop-detection, voice SOS, safe routing and police dispatch are still on the map page.</p>
          <button className="btn compact" onClick={() => navigate(user ? '/dashboard' : '/login')}>
            <Route size={18} /> peel this open
          </button>
        </div>
      </section>
    </div>
  );
}
