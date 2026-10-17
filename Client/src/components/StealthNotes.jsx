import { useState } from 'react';

const NOTES = [
  { title: 'Groceries', body: 'Milk, bread, tomatoes, rice' },
  { title: 'School pickup', body: 'Thursday 3:40 pm, gate 2' },
  { title: 'WiFi', body: 'Ask building office for the new password' }
];

export default function StealthNotes() {
  const [open, setOpen] = useState(0);
  const [taps, setTaps] = useState(0);

  const secretReturn = () => {
    const next = taps + 1;
    setTaps(next);
    if (next >= 5) window.location.replace('/');
  };

  return (
    <div className="stealth-root">
      <header className="stealth-bar">
        <strong onClick={secretReturn}>Notes</strong>
        <span>All iCloud</span>
      </header>
      <div className="stealth-layout">
        <aside>
          {NOTES.map((n, i) => (
            <button key={n.title} className={open === i ? 'on' : ''} onClick={() => setOpen(i)}>
              <b>{n.title}</b>
              <small>{n.body}</small>
            </button>
          ))}
        </aside>
        <section>
          <h1>{NOTES[open].title}</h1>
          <p>{NOTES[open].body}</p>
        </section>
      </div>
    </div>
  );
}
