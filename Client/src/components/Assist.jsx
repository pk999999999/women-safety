import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = {
  start: {
    title: 'What kind of help do you need?',
    options: [
      { label: 'I am in danger right now', next: 'danger' },
      { label: 'Harassment or unsafe public space', next: 'harass' },
      { label: 'A child is at risk', next: 'child' },
      { label: 'Shelter, legal aid or counselling', next: 'support' },
      { label: 'A street / park / school route is unsafe', next: 'place' }
    ]
  },
  danger: {
    title: 'Immediate danger',
    body: 'Call 112 now. If you can talk privately, also call 181 (women) or 1098 (child). Live SOS sharing is optional and needs sign-in.',
    calls: ['112', '181', '1098'],
    extra: { label: 'Open live SOS', to: '/dashboard' }
  },
  harass: {
    title: 'Harassment or unsafe space',
    body: 'You can stay unnamed. 181 and 1091 connect you to women-focused help. If you only want to warn others, file a place report with no name.',
    calls: ['181', '1091'],
    extra: { label: 'See verified services', to: '/services?audience=women' }
  },
  child: {
    title: 'Child protection',
    body: 'Start with Childline 1098. A bystander can call. Do not post the child’s photo or exact home address.',
    calls: ['1098'],
    extra: { label: 'Child services nearby', to: '/services?audience=child' }
  },
  support: {
    title: 'Shelter, legal aid, counselling',
    body: 'One Stop Centres, DLSA 1516 and partner NGOs are listed with “how to access safely” on each card.',
    calls: ['181', '1516'],
    extra: { label: 'Open the directory', to: '/services' }
  },
  place: {
    title: 'Report an environmental concern',
    body: 'Lighting, isolated stretches, school-route risks. No name or phone is stored. Location is area-level unless you opt in.',
    extra: { label: 'File a report', to: '/report' }
  }
};

export default function Assist() {
  const navigate = useNavigate();
  const [key, setKey] = useState('start');
  const step = useMemo(() => STEPS[key], [key]);

  return (
    <div className="page">
      <p className="eyebrow">pick a scrap</p>
      <h1>{step.title}</h1>
      {step.body && <p className="hero-lead">{step.body}</p>}

      {step.options && (
        <div className="assist-options">
          {step.options.map(opt => (
            <button key={opt.next} className="triage-card" onClick={() => setKey(opt.next)}>
              <h3>{opt.label}</h3>
            </button>
          ))}
        </div>
      )}

      {step.calls && (
        <div className="help-grid" style={{ maxWidth: 480, margin: '20px 0' }}>
          {step.calls.map(n => (
            <a key={n} className="help-call" href={`tel:${n}`}>Call {n}</a>
          ))}
        </div>
      )}

      {step.extra && (
        <button className="btn compact" onClick={() => navigate(step.extra.to)}>{step.extra.label}</button>
      )}

      {key !== 'start' && (
        <button className="ghost-btn" style={{ marginTop: 12 }} onClick={() => setKey('start')}>Start over</button>
      )}
    </div>
  );
}
