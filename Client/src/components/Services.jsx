import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { BadgeCheck, Phone, Clock, Languages, Shield } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { API_BASE } from '../config';

const CATEGORIES = [
  { id: '', label: 'All types' },
  { id: 'helpline', label: 'Helpline' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'shelter', label: 'Shelter / OSC' },
  { id: 'legal', label: 'Legal aid' },
  { id: 'medical', label: 'Medical' },
  { id: 'counselling', label: 'Counselling' },
  { id: 'child-protection', label: 'Child protection' }
];

export default function Services() {
  const [params, setParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');
  const audience = params.get('audience') || '';
  const category = params.get('category') || '';
  const anonymous = params.get('anonymous') === 'true';
  const open24 = params.get('open24') === 'true';

  useEffect(() => {
    const query = new URLSearchParams();
    if (audience) query.set('audience', audience);
    if (category) query.set('category', category);
    if (q) query.set('q', q);
    if (anonymous) query.set('anonymous', 'true');
    if (open24) query.set('open24', 'true');
    axios.get(`${API_BASE}/trusted-services?${query.toString()}`)
      .then(res => setServices(res.data.services || []))
      .catch(() => setServices([]));
  }, [audience, category, q, anonymous, open24]);

  const mapped = useMemo(() => services.filter(s => s.lat && s.lng), [services]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">verified cutouts</p>
          <h1>trusted support, stickered</h1>
          <p className="muted">National helplines plus Nagpur partners. Each card explains how to contact them without putting yourself at further risk.</p>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search shelter, legal, Childline..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={audience} onChange={(e) => update('audience', e.target.value)}>
          <option value="">Women & child</option>
          <option value="women">Women</option>
          <option value="child">Child</option>
        </select>
        <select value={category} onChange={(e) => update('category', e.target.value)}>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <label className="chip-toggle">
          <input type="checkbox" checked={anonymous} onChange={(e) => update('anonymous', e.target.checked ? 'true' : '')} />
          Anonymous OK
        </label>
        <label className="chip-toggle">
          <input type="checkbox" checked={open24} onChange={(e) => update('open24', e.target.checked ? 'true' : '')} />
          24/7
        </label>
      </div>

      {mapped.length > 0 && (
        <div className="mini-map">
          <MapContainer center={[21.1458, 79.0882]} zoom={12} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {mapped.map(s => (
              <Marker key={s.id} position={[s.lat, s.lng]}>
                <Popup><strong>{s.name}</strong><br />{s.phone}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="service-grid">
        {services.map(s => (
          <article key={s.id} className="service-card">
            <div className="service-top">
              <span className="tag">{s.category}</span>
              {s.verified && (
                <span className="verified">
                  <BadgeCheck size={14} /> Verified · {s.verifiedBy}
                </span>
              )}
            </div>
            <h3>{s.name}</h3>
            <p className="muted">{s.whatTheyDo}</p>
            <ul className="meta-list">
              <li><Phone size={14} /> {s.phone}</li>
              <li><Clock size={14} /> {s.hours}</li>
              <li><Languages size={14} /> {(s.languages || []).join(', ')}</li>
              <li><Shield size={14} /> {s.anonymousOk ? 'You can stay unnamed' : 'ID usually required'}</li>
            </ul>
            <div className="access-box">
              <strong>How to access safely</strong>
              <p>{s.accessSafely}</p>
            </div>
            <div className="service-actions">
              <a className="btn compact" href={`tel:${s.phone}`}>Call {s.phone}</a>
              <span className="tiny">{s.city} · updated {s.verifiedDate}</span>
            </div>
          </article>
        ))}
        {services.length === 0 && <p className="muted">No services match those filters.</p>}
      </div>
    </div>
  );
}
