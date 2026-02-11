// src/components/AdminDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import "../styles/AdminDashboard.css";

// --- RESTORED LOGO IMPORT ---
import driverLicense from "../assets/driver-license.png"; 

import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell
} from "recharts"; 

const GATES = [
  { id: "front", name: "Front Gate (Entry)", cam: "/assets/cam1.mp4" },
  { id: "back", name: "Back Gate (Exit)", cam: "/assets/cam2.mp4" },
];

const STORAGE = {
  VEHICLES: "lp_vehicles_v3",
  LOGS: "lp_logs_v3",
  THEME: "lp_theme_v1",
  ALERTS: "lp_alerts_v1",
  USERS: "lp_users_v3", 
  SIDEBAR_COLLAPSED: "lp_sidebar_collapsed_v1",
};

// --- Helpers ---
function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function saveJSON(key, v) { localStorage.setItem(key, JSON.stringify(v)); }
function nowIso() { return new Date().toISOString(); }

function randomPlate() {
  const letters = () => String.fromCharCode(65+Math.random()*26) + String.fromCharCode(65+Math.random()*26) + String.fromCharCode(65+Math.random()*26);
  const nums = () => String(Math.floor(10 + Math.random() * 990));
  return `${String(Math.floor(Math.random()*99)).padStart(2,"0")} ${letters()} ${nums()}`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  // --- SECURITY CHECK ---
  useEffect(() => {
    if (localStorage.getItem("mockAuth") !== "1" && !auth.currentUser) {
        // navigate("/admin-login");
    }
  }, [navigate]);

  // --- STATE ---
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE.THEME) || "dark");
  
  const [vehicles, setVehicles] = useState(() => loadJSON(STORAGE.VEHICLES, [
      { id: "v1", plate: "09 ABC 878", type: "Car", tag: "Employee" },
      { id: "v2", plate: "EMP007", type: "Car", tag: "Student" },
  ]));

  const [users, setUsers] = useState(() => loadJSON(STORAGE.USERS, [
      { id: 1, name: "System Administrator", email: "admin@lpr-system.com", role: "Admin", login: nowIso(), logout: null }
  ]));

  const [logs, setLogs] = useState(() => loadJSON(STORAGE.LOGS, []));
  const [alertHistory, setAlertHistory] = useState(() => loadJSON(STORAGE.ALERTS, []));
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadJSON(STORAGE.SIDEBAR_COLLAPSED, false));
  // --- NEW: MOBILE MENU STATE ---
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // UI State
  const [activeGate, setActiveGate] = useState("front");
  const [overlayPlates, setOverlayPlates] = useState([]);
  const [activeTab, setActiveTab] = useState("monitoring");
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Editors
  const [vehicleEditor, setVehicleEditor] = useState(null);
  const [logEditor, setLogEditor] = useState(null);

  // Alerts
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [alert, setAlert] = useState(null);
  const alertTimerRef = useRef(null);
  
  // Selection & Reports
  const [selectedLogIds, setSelectedLogIds] = useState([]);
  const [reportTimeframe, setReportTimeframe] = useState("daily");

  // Refs for Simulation
  const logsRef = useRef(logs);
  logsRef.current = logs; 

  // --- AUTO-UPDATE LISTENER ---
  useEffect(() => {
    const handleStorageChange = () => {
        const updatedVehicles = loadJSON(STORAGE.VEHICLES, []);
        
        // --- SYNC LOGS ---
        const updatedLogsExternal = loadJSON(STORAGE.LOGS, []);
        if (updatedLogsExternal.length !== logs.length) {
             setLogs(updatedLogsExternal);
             logsRef.current = updatedLogsExternal;
        }

        if (updatedVehicles.length > vehicles.length) {
             const newVehicle = updatedVehicles[0];
             setVehicles(updatedVehicles);

             setAlert({ 
                id: "sys-" + Date.now(), 
                message: `📢 New Registration: ${newVehicle.plate}`, 
                type: "info", 
                time: nowIso() 
            });
            setTimeout(() => setAlert(null), 5000);

        } else {
             setVehicles(updatedVehicles);
        }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [vehicles, logs]); 

  // --- EFFECTS ---
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem(STORAGE.THEME, theme); }, [theme]);
  useEffect(() => saveJSON(STORAGE.VEHICLES, vehicles), [vehicles]);
  useEffect(() => saveJSON(STORAGE.LOGS, logs), [logs]);
  useEffect(() => saveJSON(STORAGE.ALERTS, alertHistory), [alertHistory]);
  useEffect(() => saveJSON(STORAGE.USERS, users), [users]);
  useEffect(() => saveJSON(STORAGE.SIDEBAR_COLLAPSED, sidebarCollapsed), [sidebarCollapsed]);
  
  useEffect(() => { 
        setCurrentPage(1); 
        setSelectedLogIds([]); 
  }, [searchQuery, filterFrom, filterTo, activeTab]);

  const vehiclesMap = useMemo(() => {
    const m = new Map();
    vehicles.forEach((v) => m.set(v.plate.toUpperCase(), v));
    return m;
  }, [vehicles]);

  // --- SIMULATION LOOP ---
  useEffect(() => {
    let running = true;
    async function tick() {
      if (!running) return;
      const delay = 800 + Math.floor(Math.random() * 1500); 
      await new Promise((r) => setTimeout(r, delay));
      if (!running) return;

      const vehiclesInside = logsRef.current.filter(l => l.timeOut === null);
      const shouldExit = vehiclesInside.length > 0 && Math.random() > 0.4;
      let plate, status, type;
      const x = 30 + Math.random() * 40; 
      const y = 30 + Math.random() * 40;

      if (shouldExit) {
        const activeLog = vehiclesInside[Math.floor(Math.random() * vehiclesInside.length)];
        plate = activeLog.plate; status = activeLog.status; type = activeLog.type;
        const exitTime = nowIso();

        setLogs(prevLogs => prevLogs.map(l => l.id === activeLog.id ? { ...l, timeOut: exitTime } : l));
        setOverlayPlates((s) => [{ id: "overlay-exit-" + Date.now(), plate, type, gate: "back", status, x, y, createdAt: Date.now() }, ...s].slice(0, 6));

      } else {
        const isRegisteredReturn = Math.random() > 0.4; 
        if (isRegisteredReturn && vehicles.length > 0) {
            const v = vehicles[Math.floor(Math.random() * vehicles.length)];
            const isInside = vehiclesInside.find(l => l.plate === v.plate);
            plate = !isInside ? v.plate : randomPlate();
        } else {
            plate = randomPlate(); 
        }

        const existingLogs = logsRef.current.filter(l => l.plate === plate);
        const visitCount = existingLogs.length + 1;
        const registered = vehiclesMap.has(plate.toUpperCase());
        status = registered ? "registered" : "unregistered";
        type = registered ? vehiclesMap.get(plate.toUpperCase()).type : "Car";
        const newEntry = { id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5), plate, type, gate: "front", time: nowIso(), timeOut: null, status, visitCount, x, y };

        setLogs((s) => [newEntry, ...s].slice(0, 2000));
        setOverlayPlates((s) => [{ ...newEntry, gate: "front", createdAt: Date.now() }, ...s].slice(0, 6));

        let message = "", alertType = "";
        if (visitCount > 1) { message = `🔄 Return: ${plate} (#${visitCount})`; alertType = "info"; } 
        else if (!registered) { message = `⚠️ Unregistered: ${plate}`; alertType = "warn"; }

        if (message) {
            setAlertHistory((s) => [{ id: "a-" + Date.now(), plate, gate: "front", time: newEntry.time, message, type: alertType }, ...s].slice(0, 100));
            setAlert({ id: "f-" + Date.now(), message, time: newEntry.time, plate, gate: "front", type: alertType });
            if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
            alertTimerRef.current = setTimeout(() => setAlert(null), 4000); 
        }
      }
      setTimeout(() => { setOverlayPlates((s) => s.filter((p) => Date.now() - p.createdAt < 3000)); }, 3000);
      if (running) tick();
    }
    tick();
    return () => { running = false; if (alertTimerRef.current) clearTimeout(alertTimerRef.current); };
  }, [vehiclesMap]); 

  // --- ACTIONS ---
  const handleSignOut = async () => { 
      try { await signOut(auth); localStorage.removeItem("mockAuth"); localStorage.removeItem("rememberedEmail"); navigate("/admin-login"); } 
      catch { localStorage.removeItem("mockAuth"); navigate("/admin-login"); }
  }

  // --- VEHICLE ACTIONS ---
  function addVehicle(v) { setVehicles((s) => [{ ...v, id: "v-" + Math.random().toString(36).slice(2, 9) }, ...s]); }
  function updateVehicle(id, patch) { setVehicles((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x))); }
  function deleteVehicle(v) { if(window.confirm(`Delete vehicle ${v.plate}?`)) { setVehicles((s) => s.filter((x) => x.id !== v.id)); } }
  function openAddVehicle() { setVehicleEditor({ mode: "add", vehicle: { plate: "", type: "Car", tag: "Visitor" } }); }
  function openEditVehicle(v) { setVehicleEditor({ mode: "edit", vehicle: { ...v } }); }
  function closeVehicleEditor() { setVehicleEditor(null); }
  function submitVehicleEditor() {
    const v = vehicleEditor.vehicle;
    if (!v.plate) return alert("Enter plate");
    if (!/[a-zA-Z]/.test(v.plate) || !/[0-9]/.test(v.plate)) return alert("Invalid Plate Number.");
    if (vehicleEditor.mode === "add") addVehicle(v);
    else updateVehicle(v.id || vehicles.find(x => x.plate === v.plate)?.id, v);
    closeVehicleEditor();
  }

  // --- LOG ACTIONS ---
  function deleteLog(id) {
    if(window.confirm("Are you sure you want to delete this log entry?")) {
        setLogs(prevLogs => prevLogs.filter(log => log.id !== id));
        setSelectedLogIds(prev => prev.filter(sid => sid !== id));
    }
  }

  function toggleSelectLog(id) {
    if (selectedLogIds.includes(id)) { setSelectedLogIds(prev => prev.filter(sid => sid !== id)); } else { setSelectedLogIds(prev => [...prev, id]); }
  }

  function toggleSelectAll(currentVisibleLogs) {
    const allSelected = currentVisibleLogs.every(log => selectedLogIds.includes(log.id));
    if (allSelected) {
        const visibleIds = currentVisibleLogs.map(l => l.id);
        setSelectedLogIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
        const visibleIds = currentVisibleLogs.map(l => l.id);
        const combined = new Set([...selectedLogIds, ...visibleIds]);
        setSelectedLogIds(Array.from(combined));
    }
  }

  function deleteSelectedLogs() {
    if (selectedLogIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedLogIds.length} items?`)) {
        setLogs(prevLogs => prevLogs.filter(log => !selectedLogIds.includes(log.id)));
        setSelectedLogIds([]); 
    }
  }

  function saveLogChanges() {
    if(!logEditor) return;
    setLogs(prevLogs => prevLogs.map(log => log.id === logEditor.id ? logEditor : log));
    setLogEditor(null);
  }

  function exportCSV() {
      const headers = ["Plate", "Type", "Entry Gate", "Time In", "Exit Gate", "Time Out", "Visit Count", "Status"];
      const rows = logs.map((r) => [r.plate, r.type, r.gate === 'front' ? 'Front Gate' : r.gate, new Date(r.time).toLocaleString(), r.timeOut ? "Back Gate" : "—", r.timeOut ? new Date(r.timeOut).toLocaleString() : "ACTIVE", r.visitCount, r.status]);
      const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `logs.csv`; a.click();
  }

  const filteredLogs = useMemo(() => {
    let rows = logs;
    if (searchQuery && activeTab === 'logs') rows = rows.filter(r => r.plate.toUpperCase().startsWith(searchQuery.toUpperCase()));
    if (filterFrom) rows = rows.filter(r => r.time >= filterFrom);
    if (filterTo) rows = rows.filter(r => r.time <= filterTo);
    return rows;
  }, [logs, searchQuery, filterFrom, filterTo, activeTab]);

  const totalLogPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const currentVehicles = useMemo(() => {
    let list = vehicles;
    if (searchQuery && activeTab === 'vehicles') list = list.filter(v => v.plate.toUpperCase().includes(searchQuery.toUpperCase()));
    const start = (currentPage - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  }, [vehicles, searchQuery, currentPage, activeTab]);
  const totalVehiclePages = Math.ceil(vehicles.length / itemsPerPage);

  const barChartData = useMemo(() => {
    if (reportTimeframe === 'daily') {
        const data = Array.from({ length: 24 }, (_, i) => {
            let label = i === 0 ? "12AM" : i < 12 ? `${i}AM` : i === 12 ? "12PM" : `${i-12}PM`;
            return { name: label, count: 0 };
        });

        logs.forEach(log => {
            const entryDate = new Date(log.time);
            if (!isNaN(entryDate)) { 
                const h = entryDate.getHours();
                if(data[h]) data[h].count += 1;
            }
            if (log.timeOut) { 
                const exitDate = new Date(log.timeOut); 
                if (!isNaN(exitDate)) { 
                    const h = exitDate.getHours();
                    if(data[h]) data[h].count += 1;
                } 
            }
        });
        return data;
    } else if (reportTimeframe === 'weekly') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const data = days.map(d => ({ name: d, count: 0 }));
        
        logs.forEach(log => {
            const entryDate = new Date(log.time);
            if (!isNaN(entryDate)) { 
                const d = days[entryDate.getDay()];
                const dayObj = data.find(item => item.name === d);
                if(dayObj) dayObj.count += 1;
            }
            if (log.timeOut) { 
                const exitDate = new Date(log.timeOut); 
                if (!isNaN(exitDate)) { 
                    const d = days[exitDate.getDay()];
                    const dayObj = data.find(item => item.name === d);
                    if(dayObj) dayObj.count += 1;
                } 
            }
        });
        return data;

    } else if (reportTimeframe === 'monthly') {
        const data = Array.from({ length: 31 }, (_, i) => ({ name: `${i+1}`, count: 0 }));
        
        logs.forEach(log => {
            const entryDate = new Date(log.time);
            if (!isNaN(entryDate)) { 
                const d = entryDate.getDate() - 1; 
                if(data[d]) data[d].count += 1;
            }
            if (log.timeOut) { 
                const exitDate = new Date(log.timeOut); 
                if (!isNaN(exitDate)) { 
                    const d = exitDate.getDate() - 1;
                    if(data[d]) data[d].count += 1;
                } 
            }
        });
        return data;
    }
    return [];
  }, [logs, reportTimeframe]); 

  const registrationStatsData = useMemo(() => {
    const totalRegistered = vehicles.length;
    const registeredPlates = new Set(vehicles.map(v => v.plate));
    const pending = new Set(logs.filter(l => !registeredPlates.has(l.plate)).map(l => l.plate)).size;
    return [{ name: 'Registered', value: totalRegistered, color: '#00e676' }, { name: 'Pending', value: pending > 0 ? pending : 0, color: '#ff1744' }];
  }, [vehicles, logs]);

  const vehicleStatusStatsData = useMemo(() => {
    const reg = vehicles.length;
    const unreg = new Set(logs.filter(l => l.status === 'unregistered').map(l => l.plate)).size;
    return [{ name: 'Registered', value: reg, color: '#2b8cff' }, { name: 'Unregistered', value: unreg, color: '#ff0000' } ];
  }, [vehicles, logs]);

  const totalVehiclesInside = useMemo(() => logs.filter(l => l.timeOut === null).length, [logs]);

  return (
    <div className={`gate-admin ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* --- ADDED: Mobile Backdrop --- */}
      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - NOW HANDLES 'mobile-open' CLASS */}
      <aside className={`ga-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`} onMouseEnter={() => setSidebarCollapsed(false)} onMouseLeave={() => setSidebarCollapsed(true)}>
        
        {/* --- ADDED: Close Button for Mobile --- */}
        <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>×</button>

        <div className="sidebar-top">
          <img src={driverLicense} alt="Logo" className="brand-logo-img" style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }} />
          <div className="brand-text"><div className="gs-title">Dashboard</div><div className="gs-sub">Admin Panel</div></div>
        </div>
        <div className="gs-menu">
          {[
            { id: "monitoring", label: "Live Monitoring Panel", icon: "📺" },
            { id: "logs", label: "Access Log Table", icon: "📋" },
            { id: "vehicles", label: "Vehicle Management", icon: "🚗" },
            { id: "reports", label: "Reporting & Analytics", icon: "📊" },
            { id: "users", label: "System Management", icon: "👥" },
          ].map(m => (
            <button key={m.id} className={activeTab === m.id ? "active" : ""} onClick={() => { setActiveTab(m.id); setMobileMenuOpen(false); }}>
              <span style={{ fontSize: '20px', display: 'grid', placeItems: 'center' }}>{m.icon}</span>
              {/* WRAPPED IN SPAN with class 'menu-label' */}
              <span className="menu-label">{m.label}</span>
            </button>
          ))}
        </div>
        <div className="gs-controls">
            <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
            <button className="sidebar-signout" onClick={handleSignOut}>Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ga-main">
        <div className="ga-header">
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             {/* --- ADDED: Hamburger Button --- */}
             <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)}>☰</button>
             <h1 className="app-title">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
           </div>

           <div className="top-slider">
             <div className="top-controls">
                <button 
                  className="primary" 
                  style={{ marginRight: '10px', background: 'var(--accent)', color: 'white', border:'none' }} 
                  onClick={() => window.open('/qr-display', '_blank')}
                >
                    📱 Show QR Code
                </button>
                <button onClick={() => setShowAlertsPanel(!showAlertsPanel)}>🔔 Alerts <span className="badge-count">{alertHistory.length}</span></button>
             </div>
           </div>
        </div>

        {alert && (
          <div className={`alert-floating show ${alert.type === 'info' ? 'alert-info' : 'alert-warn'}`}>
              <div className="alert-content">
               <div className="alert-body">
                <div className="alert-row-main">
                    <strong style={{color: alert.type === 'info' ? '#2b8cff' : '#ff1744'}}>{alert.message}</strong>
                    <button className="alert-dismiss" onClick={() => setAlert(null)}>Dismiss</button>
                </div>
                 <div style={{fontSize:'12px', opacity:0.7, marginTop:'4px'}}>{new Date(alert.time).toLocaleTimeString()}</div>
               </div>
              </div>
          </div>
        )}

        <div className={`ga-body ${activeTab === 'monitoring' ? '' : 'full-width'}`}>
          {activeTab === "monitoring" && (
            <>
              <div className="feeds">
                {GATES.map((gate) => (
                  <div key={gate.id} className={`gate-card ${activeGate === gate.id ? "active" : ""}`} onClick={() => setActiveGate(gate.id)}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}><strong>{gate.name}</strong></div>
                    <div className="gate-feed">
                      <video className="gate-video" src={gate.cam} autoPlay muted loop playsInline />
                      <div className="overlay">
                        {overlayPlates.filter(p => p.gate === gate.id).map(d => (
                           <div key={d.id} className={`bounding-box ${d.status === 'registered' ? 'ok' : 'warn'} animate-detect`} style={{ left: `${d.x}%`, top: `${d.y}%` }}>
                             <div className="box-plate">{d.plate}</div><div className="box-status">{d.status}</div>
                           </div>
                        ))}
                        <div className="gate-overlay-label">Gate: {gate.name}</div>
                      </div>
                    </div>
                    <div className="gate-summary">
                        <div className="plate-large">{overlayPlates.find(v => v.gate === gate.id)?.plate || '—'}</div>
                        <div className={`pill ${overlayPlates.find(v => v.gate === gate.id) ? 'ok' : 'neutral'}`}>{overlayPlates.find(v => v.gate === gate.id)?.status || 'Monitoring'}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="side-panel">
                <div className="card" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px'}}>
                    <div><div style={{fontSize:'12px', color:'var(--muted)', fontWeight:'bold', textTransform:'uppercase'}}>Vehicles Inside</div><div style={{fontSize:'28px', fontWeight:'800', color:'var(--accent)'}}>{totalVehiclesInside}</div></div>
                    <div style={{fontSize:'24px'}}>🚗</div>
                </div>
                <div className="card">
                    <h4>Alert History</h4>
                    {alertHistory.slice(0, 8).map(a => (
                        <div key={a.id} className="alert-row">
                            <span style={{fontWeight:'bold', color: a.message.includes('Return') ? '#2b8cff' : 'inherit'}}>{a.plate}</span>
                            <span style={{fontSize:'11px', color:'var(--muted)'}}>{a.message.includes('Return') ? 'Double Entry' : 'Unregistered'}</span>
                            <span style={{fontSize:'12px', color:'var(--muted)'}}>{new Date(a.time).toLocaleTimeString()}</span>
                        </div>
                    ))}
                </div>
              </div>
            </>
           )}

          {activeTab === "logs" && (
             <div className="table-card">
                 <div className="logs-controls">
                     <div className="search-box"><input className="search-input" placeholder="Search plates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                     <div className="date-filters">
                        <div className="date-group"><span className="date-label">From:</span><input type="date" className="date-input" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} /></div>
                         <div className="date-group"><span className="date-label">To:</span><input type="date" className="date-input" value={filterTo} onChange={e => setFilterTo(e.target.value)} /></div>
                        {selectedLogIds.length > 0 && (
                            <button className="primary" onClick={deleteSelectedLogs} style={{backgroundColor: '#ff1744', marginRight:'8px', borderColor:'#ff1744'}}>
                                Delete Selected ({selectedLogIds.length})
                            </button>
                        )}
                        <button className="primary" onClick={exportCSV}>Export CSV</button>
                     </div>
                 </div>
                 <table className="table modern">
                     <thead>
                       <tr>
                         <th style={{width: '40px'}}><input type="checkbox" checked={currentLogs.length > 0 && currentLogs.every(l => selectedLogIds.includes(l.id))} onChange={() => toggleSelectAll(currentLogs)} /></th>
                         <th>Plate</th><th>Gate</th><th>Visit #</th><th>Entry Time</th><th>Exit Gate</th><th>Exit Time</th><th>Previous Time</th><th>Status</th><th>Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                         {currentLogs.map(l => {
                            const visitNum = logs.filter(item => item.plate === l.plate && item.time <= l.time).length;
                            const previousLogs = logs.filter(item => item.plate === l.plate && new Date(item.time) < new Date(l.time) && item.timeOut);
                            previousLogs.sort((a,b) => new Date(b.timeOut) - new Date(a.timeOut));
                            const lastVisit = previousLogs.length > 0 ? new Date(previousLogs[0].timeOut).toLocaleTimeString() : "N/A (First Entry)";
                            return (
                              <tr key={l.id} className={selectedLogIds.includes(l.id) ? "selected-row" : ""}>
                                  <td><input type="checkbox" checked={selectedLogIds.includes(l.id)} onChange={(e) => { e.stopPropagation(); toggleSelectLog(l.id); }} /></td>
                                  <td><b>{l.plate}</b></td><td style={{fontSize:'13px'}}>{l.gate === 'front' ? 'Front Gate' : l.gate}</td>
                                  <td style={{fontWeight:'bold', color:'var(--accent)'}}>#{visitNum}</td>
                                  <td style={{color: '#2b8cff'}}>{new Date(l.time).toLocaleTimeString()}</td>
                                  <td style={{fontSize:'13px'}}>{l.timeOut ? "Back Gate" : <span style={{opacity:0.3}}>—</span>}</td>
                                  <td style={{color: l.timeOut ? '#d946ef' : 'inherit'}}>{l.timeOut ? new Date(l.timeOut).toLocaleTimeString() : <span className="chip chip-warn" style={{fontSize:'11px'}}>INSIDE</span>}</td>
                                  <td style={{fontSize:'12px', color:'var(--muted)'}}>{lastVisit}</td>
                                  <td><span className={`chip ${l.status==='registered'?'chip-ok':'chip-warn'}`}>{l.status}</span></td>
                                  <td>
                                      <button className="btn-ghost" onClick={() => setLogEditor({...l})} style={{marginRight:'8px'}}>Edit</button>
                                      <button className="btn-ghost" onClick={() => deleteLog(l.id)} style={{color:'var(--warn)'}}>Delete</button>
                                  </td>
                              </tr>
                           )})}
                           {currentLogs.length === 0 && <tr><td colSpan={10} style={{textAlign:'center', padding:'20px', color:'var(--muted)'}}>No records found.</td></tr>}
                     </tbody>
                 </table>
                 <div className="pagination">
                    <div className="page-info">Showing {currentLogs.length} of {filteredLogs.length} entries</div>
                    <div className="page-actions">
                        <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(s => Math.max(1, s - 1))}>Previous</button>
                        <span style={{fontSize:'13px', margin:'0 8px'}}>Page {currentPage} of {totalLogPages || 1}</span>
                        <button className="page-btn" disabled={currentPage === totalLogPages || totalLogPages === 0} onClick={() => setCurrentPage(s => Math.min(totalLogPages, s + 1))}>Next</button>
                    </div>
                 </div>
             </div>
          )}

          {activeTab === "vehicles" && (
              <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <input placeholder="Search Registered Vehicle..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{padding:'10px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.1)', color:'inherit', width:'300px'}} />
                    <button className="primary" onClick={openAddVehicle}>+ Add Vehicle</button>
                  </div>
                  <div className="table-card">
                    <table className="table modern">
                        <thead><tr><th>Plate</th><th>Owner</th><th>Type</th><th>Actions</th></tr></thead>
                        <tbody>
                            {currentVehicles.map(v => (
                                <tr key={v.id}>
                                     <td><b>{v.plate}</b></td><td>{v.tag || 'Visitor'}</td><td>{v.type}</td>
                                     <td>
                                          <button className="btn-ghost" onClick={() => openEditVehicle(v)} style={{marginRight:'8px'}}>Edit</button>
                                          <button className="btn-ghost" onClick={() => deleteVehicle(v)} style={{color:'var(--warn)'}}>Del</button>
                                     </td>
                                </tr>
                            ))}
                            {currentVehicles.length === 0 && <tr><td colSpan={4} style={{textAlign:'center', padding:'20px', color:'var(--muted)'}}>No registered vehicles found.</td></tr>}
                        </tbody>
                    </table>
                    <div className="pagination">
                        <div className="page-info">Showing {currentVehicles.length} of {vehicles.length} registered vehicles</div>
                        <div className="page-actions">
                            <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(s => Math.max(1, s - 1))}>Previous</button>
                            <span style={{fontSize:'13px', margin:'0 8px'}}>Page {currentPage} of {totalVehiclePages || 1}</span>
                            <button className="page-btn" disabled={currentPage === totalVehiclePages || totalVehiclePages === 0} onClick={() => setCurrentPage(s => Math.min(totalVehiclePages, s + 1))}>Next</button>
                        </div>
                    </div>
                  </div>
              </div>
          )}
           
          {activeTab === "reports" && (
             <div className="reports-grid">
                 <div className="chart-card">
                     <div className="chart-header">
                        <h3>Time Distribution</h3>
                        <div style={{fontSize: '12px', color: 'var(--muted)', marginTop: '-8px', marginBottom: '8px'}}>Frequency of plate sightings by time of day (24h)</div>
                        <div style={{display:'flex', gap:'8px', background:'rgba(255,255,255,0.05)', padding:'4px', borderRadius:'6px'}}>
                            {['daily', 'weekly', 'monthly'].map(tf => (
                                <button key={tf} onClick={() => setReportTimeframe(tf)} style={{background: reportTimeframe === tf ? 'var(--accent)' : 'transparent', color: reportTimeframe === tf ? '#fff' : 'var(--muted)', border: 'none', borderRadius: '4px', padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'capitalize'}}>{tf}</button>
                            ))}
                        </div>
                     </div>
                     <div style={{height:'400px', width:'100%', padding:'20px 20px 10px 0'}}>
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.08} vertical={false} />
                                <XAxis dataKey="name" stroke="var(--muted)" tickLine={false} axisLine={false} dy={10} interval={0} style={{ fontSize: '11px' }} />
                                <YAxis stroke="var(--muted)" tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: 'var(--panel)', borderColor: 'rgba(255,255,255,0.1)', borderRadius:'8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'}} itemStyle={{color:'var(--text)', fontSize:'13px'}} labelStyle={{color:'var(--muted)', marginBottom:'8px'}} />
                                <Bar dataKey="count" fill="#2b8cff" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                         </ResponsiveContainer>
                     </div>
                 </div>

                 <div className="chart-card">
                     <div className="chart-header"><h3>Total Registration Status</h3></div>
                     <div style={{height:'350px', width:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                        <ResponsiveContainer width="100%" height="70%">
                             <PieChart>
                                <Pie data={registrationStatsData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {registrationStatsData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}
                               </Pie>
                                <Tooltip contentStyle={{backgroundColor: 'var(--panel)', borderColor: 'rgba(255,255,255,0.1)', borderRadius:'8px'}} itemStyle={{color:'var(--text)'}} />
                            </PieChart>
                         </ResponsiveContainer>
                        <div style={{display:'flex', gap:'16px', marginTop:'-20px'}}>
                            {registrationStatsData.map((item) => (<div key={item.name} style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'var(--muted)'}}><div style={{width:'10px', height:'10px', borderRadius:'50%', background: item.color}}></div>{item.name}: <strong style={{color:'var(--text)'}}>{item.value}</strong></div>))}
                        </div>
                      </div>
                 </div>

                 <div className="chart-card span-full">
                     <div className="chart-header"><h3>Total Vehicle Status Overview</h3></div>
                      <div style={{display:'flex', gap:'24px', alignItems:'center', padding:'24px'}}>
                          <div style={{ height: '140px', width: '140px' }}>
                               <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={vehicleStatusStatsData} innerRadius={40} outerRadius={55} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                                          {vehicleStatusStatsData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card)" strokeWidth={2} />))}
                                    </Pie>
                                </PieChart>
                               </ResponsiveContainer>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex:1 }}>
                              {vehicleStatusStatsData.map((item) => (
                              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></div><span style={{ color: 'var(--muted)' }}>{item.name}</span></div>
                                 <div style={{ fontWeight: '600' }}>{item.value} <span style={{fontSize:'12px', color:'var(--muted)', fontWeight:'400'}}></span></div>
                              </div>
                            ))}
                          </div>
                       </div>
                 </div>
             </div>
          )}

          {activeTab === "users" && (
            <div className="table-card">
               <div className="chart-header"><h3>User Management</h3></div>
               <table className="table modern">
                 <thead><tr><th>Full Name</th><th>Email</th><th>Role</th><th>Last Login</th><th>Last Logout</th></tr></thead>
                 <tbody>
                   {users.map(user => (
                     <tr key={user.id}>
                       <td><b>{user.name}</b></td><td>{user.email}</td><td><span className="chip chip-ok">{user.role}</span></td>
                       <td style={{color:'#2b8cff'}}>{user.login ? new Date(user.login).toLocaleString() : '-'}</td>
                       <td style={{color:'var(--muted)'}}>{user.logout ? new Date(user.logout).toLocaleString() : 'Active'}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          )}
        </div>
      </main>
      
      {/* Vehicle Edit Modal */}
      {vehicleEditor && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'grid', placeItems:'center', zIndex:500}}>
            <div className="card" style={{width:'350px', display:'flex', flexDirection:'column', gap:'16px', padding:'24px'}}>
                <h3>{vehicleEditor.mode === 'add' ? 'Add' : 'Edit'} Vehicle</h3>
                <div className="form-group"><span className="form-label">Plate Number</span><input className="form-input" value={vehicleEditor.vehicle.plate} onChange={e => setVehicleEditor({...vehicleEditor, vehicle: {...vehicleEditor.vehicle, plate: e.target.value.toUpperCase()}})} placeholder="e.g. 09 ABC 123" /></div>
                <div className="form-group"><span className="form-label">Owner Type</span><select className="form-select" value={vehicleEditor.vehicle.tag || 'Visitor'} onChange={e => setVehicleEditor({...vehicleEditor, vehicle: {...vehicleEditor.vehicle, tag: e.target.value}})}><option value="Student">Student</option><option value="Employee">Employee</option><option value="Visitor">Visitor</option></select></div>
                <div className="form-group"><span className="form-label">Vehicle Type</span><select className="form-select" value={vehicleEditor.vehicle.type || 'Car'} onChange={e => setVehicleEditor({...vehicleEditor, vehicle: {...vehicleEditor.vehicle, type: e.target.value}})}><option value="Car">Car</option><option value="Van">Van</option><option value="Tricycle">Tricycle</option><option value="Bus">Bus</option><option value="Jeep">Jeep</option><option value="Motorcycle">Motorcycle</option><option value="Truck">Truck</option></select></div>
                <div style={{display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'10px'}}><button className="btn-ghost" onClick={closeVehicleEditor}>Cancel</button><button className="primary" onClick={submitVehicleEditor}>Save</button></div>
            </div>
        </div>
      )}

      {/* Access Log Editor Modal */}
      {logEditor && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'grid', placeItems:'center', zIndex:500}}>
            <div className="card" style={{width:'350px', display:'flex', flexDirection:'column', gap:'16px', padding:'24px'}}>
                <h3>Edit Log Entry</h3>
                <div className="form-group"><span className="form-label">Plate Number</span><input className="form-input" value={logEditor.plate} onChange={e => setLogEditor({...logEditor, plate: e.target.value.toUpperCase()})} /></div>
                <div className="form-group"><span className="form-label">Gate (Entry Point)</span><select className="form-select" value={logEditor.gate} onChange={e => setLogEditor({...logEditor, gate: e.target.value})}><option value="front">Front Gate</option><option value="back">Back Gate</option></select></div>
                <div className="form-group"><span className="form-label">Time Out (Manual Entry)</span><input type="datetime-local" className="form-input" value={logEditor.timeOut ? new Date(logEditor.timeOut).toISOString().slice(0,16) : ""} onChange={e => setLogEditor({...logEditor, timeOut: e.target.value ? new Date(e.target.value).toISOString() : null})} /></div>
                <div className="form-group"><span className="form-label">Status</span><select className="form-select" value={logEditor.status} onChange={e => setLogEditor({...logEditor, status: e.target.value})}><option value="registered">Registered</option><option value="unregistered">Unregistered</option></select></div>
                <div style={{display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'10px'}}><button className="btn-ghost" onClick={() => setLogEditor(null)}>Cancel</button><button className="primary" onClick={saveLogChanges}>Save Changes</button></div>
            </div>
        </div>
      )}
    </div>
  );
}