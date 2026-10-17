import { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { API_BASE } from '../config';

const CATEGORIES = [
  { id: 'poor-lighting', label: 'Poor lighting' },
  { id: 'isolated-stretch', label: 'Isolated / deserted stretch' },
  { id: 'harassment-hotspot', label: 'Harassment hotspot' },
  { id: 'broken-cctv', label: 'Broken CCTV / no cameras' },
  { id: 'school-route', label: 'Unsafe school route' },
  { id: 'other', label: 'Other environmental concern' }
];

export default function Report() {
  const [reports, setReports] = useState([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    category: 'poor-lighting',
    locality: '',
    description: '',
    lat: '',
    lng: '',
    shareExact: false
  });

  const load = () => {
    axios.get(`${API_BASE}/safety-reports`)
      .then(res => setReports(res.data.reports || []))
      .catch(() => setReports([]));
  };

  useEffect(() => { load(); }, []);

  const useApproxGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm(f => ({
        ...f,
        lat: pos.coords.latitude.toFixed(4),
        lng: pos.coords.longitude.toFixed(4)
      }));
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const resp = await axios.post(`${API_BASE}/safety-reports`, form);
      setMsg(resp.data.msg);
      setForm({ category: 'poor-lighting', locality: '', description: '', lat: '', lng: '', shareExact: false });
      load();
    } catch (err) {
      setMsg(err.response?.data?.msg || 'Could not save report.');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">pin it, don’t sign it</p>
          <h1>report a sketchy place</h1>
          <p className="muted">No name or phone is collected. Pins are shown at area level unless you explicitly share exact GPS.</p>
        </div>
      </div>

      <div className="split-row">
        <form className="panel-form" onSubmit={submit}>
          <label>What is the issue?</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <label>Locality / landmark (no house address)</label>
          <input
            type="text"
            placeholder="e.g. Sitabuldi flyover footpath"
            value={form.locality}
            onChange={(e) => setForm({ ...form, locality: e.target.value })}
          />

          <label>What should others know?</label>
          <textarea
            rows={4}
            required
            placeholder="Lighting, time of day, what felt unsafe..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="gps-row">
            <input type="text" placeholder="Lat (optional)" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            <input type="text" placeholder="Lng (optional)" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            <button type="button" className="ghost-btn" onClick={useApproxGps}>Use GPS</button>
          </div>

          <label className="chip-toggle">
            <input type="checkbox" checked={form.shareExact} onChange={(e) => setForm({ ...form, shareExact: e.target.checked })} />
            Share exact coordinates (off by default)
          </label>

          <button className="btn" type="submit">Submit anonymous report</button>
          {msg && <p className="success-line">{msg}</p>}
        </form>

        <div className="mini-map tall">
          <MapContainer center={[21.1458, 79.0882]} zoom={12} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {reports.filter(r => r.lat && r.lng).map(r => (
              <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={14} pathOptions={{ color: '#e11d48', fillOpacity: 0.35 }}>
                <Popup>
                  <strong>{r.category}</strong><br />
                  {r.locality}<br />
                  {r.description}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      <h2 className="section-title">Recent area reports</h2>
      <div className="report-list">
        {reports.map(r => (
          <article key={r.id} className="report-item">
            <span className="tag">{r.category}</span>
            <h4>{r.locality}</h4>
            <p>{r.description}</p>
            <span className="tiny">{new Date(r.createdAt).toLocaleDateString()}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
