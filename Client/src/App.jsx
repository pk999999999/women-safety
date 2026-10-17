import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FamilyDashboard from './components/FamilyDashboard';
import Layout from './components/Layout';
import Home from './components/Home';
import Services from './components/Services';
import Report from './components/Report';
import Assist from './components/Assist';
import StealthNotes from './components/StealthNotes';

function readSavedUser() {
  try {
    return JSON.parse(sessionStorage.getItem('sakhi-user') || 'null');
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState(readSavedUser);

  const handleLogin = (userData) => {
    sessionStorage.setItem('sakhi-user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sakhi-user');
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/notes" element={<StealthNotes />} />
        <Route
          path="/login"
          element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
        />
        <Route element={<Layout user={user} onLogout={handleLogout} />}>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/services" element={<Services />} />
          <Route path="/report" element={<Report />} />
          <Route path="/assist" element={<Assist />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/family" element={<FamilyDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
