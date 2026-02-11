// src/App.jsx
import React, { useEffect } from 'react'; 
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'; 

import AdminDashboard from './components/AdminDashboard';
import QRDisplayPage from './components/QRDisplayPage'; 
import PublicRegistration from './components/PublicRegistration';
import AdminLogin from './components/AdminLogin';

// --- ADDED: Import Loading Screen ---
import LoadingScreen from './components/LoadingScreen';

// --- ADDED: Component para sa Loading Sequence (Loading -> Login) ---
function LandingLoader() {
  const navigate = useNavigate();

  useEffect(() => {
    // Maghihintay ng 5 segundo habang nakikita ang Loading Screen
    const timer = setTimeout(() => {
      navigate('/admin-login'); // Pagkatapos, lipat sa Login
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  // Ipakita ang Loading Screen habang naghihintay
  return <LoadingScreen />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- CHANGED: Ang root ("/") ay didiretso muna sa LandingLoader --- */}
        <Route path="/" element={<LandingLoader />} />

        <Route path="/admin-login" element={<AdminLogin />} />
        
        {/* FIX: Pinalitan ang "/dashboard" ng "/admin-dashboard" para mag-match sa AdminLogin */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} /> 
        
        <Route path="/qr-display" element={<QRDisplayPage />} />
        <Route path="/register" element={<PublicRegistration />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;