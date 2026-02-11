// src/components/PublicRegistration.jsx
import React, { useState } from "react";
import "../styles/AdminDashboard.css";

export default function PublicRegistration() {
  const [form, setForm] = useState({ plate: "", type: "Car", tag: "Visitor", name: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.plate || !form.name) return alert("Please fill in required fields.");

    // --- UPDATED VALIDATION: STRICT PLATE FORMATTING (Based on Image) ---
    const plateInput = form.plate.trim().toUpperCase();
    
    // Regex Patterns based on the image provided
    const validPlateRegex = /^(?:[A-Z]{3} \d{3}|[A-Z]{2} \d{4}|\d{4} [A-Z]{2}|[A-Z]{3} \d{4}|[A-Z]{2} \d{5}|\d{3} [A-Z]{3}|[A-Z] \d{3} [A-Z]{2})$/;

    if (!validPlateRegex.test(plateInput)) {
        return alert(
            "Invalid Plate Format! Follow LTO standards:\n\n" +
            "Examples:\n" +
            "- ABC 123\n" +
            "- ABC 1234\n" +
            "- AB 12345\n" +
            "- 123 ABC\n" +
            "- A 123 BC"
        );
    }
    // -------------------------------------------------------------------

    // Key para sa LocalStorage
    const STORAGE_KEY = "lp_vehicles_v3";
    const existingVehicles = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    // Duplicate Check (Case insensitive)
    if (existingVehicles.some(v => v.plate.toUpperCase() === plateInput)) {
        return alert("Vehicle already registered!");
    }

    // Add Vehicle Object
    const newVehicle = {
      id: "web-reg-" + Date.now(),
      plate: plateInput, // Using the trimmed & uppercased variable
      type: form.type,
      tag: form.tag,
      owner: form.name,
      dateRegistered: new Date().toLocaleString()
    };

    const updatedList = [newVehicle, ...existingVehicles];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

    // --- NEW ADDITION: AUTO-CREATE HISTORY LOG (Para hindi matabunan) ---
    const LOGS_KEY = "lp_logs_v3";
    const existingLogs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    
    const newLogEntry = {
        id: "log-mobile-" + Date.now(),
        plate: plateInput,
        type: form.type,
        gate: "Online Registration", 
        time: new Date().toISOString(),
        timeOut: null,
        status: "registered",
        visitCount: 1,
        x: 50, 
        y: 50
    };

    const updatedLogs = [newLogEntry, ...existingLogs];
    localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
    // -------------------------------------------------------------------

    // Trigger update
    window.dispatchEvent(new Event("storage"));

    setSubmitted(true);
  };

  // --- STYLING CONSTANTS (DARK THEME) ---
  const darkContainer = { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0f172a", padding: "20px" };
  const darkCard = { width: "100%", maxWidth: "450px", background: "#1e293b", padding: "30px", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)", border: "1px solid #334155" };
  const darkInput = { width: "100%", padding: "14px", borderRadius: "8px", border: "1px solid #475569", fontSize: "16px", background: "#334155", color: "#ffffff", outline: "none" };
  const labelStyle = { display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#94a3b8" };

  if (submitted) {
    return (
      <div style={darkContainer}>
        <div style={{ ...darkCard, textAlign: "center" }}>
            <div style={{ fontSize: "60px", marginBottom: "20px" }}>✅</div>
            <h2 style={{ color: "#4ade80", marginBottom: "10px" }}>Success!</h2>
            <p style={{ color: "#94a3b8" }}>Vehicle has been registered.</p>
            
            <div style={{ background: "rgba(74, 222, 128, 0.1)", border: "1px solid #22c55e", padding: "20px", borderRadius: "12px", marginTop: "25px" }}>
                <p style={{ fontSize: "12px", color: "#4ade80", textTransform: "uppercase", letterSpacing: "1px", marginBottom:'5px' }}>Confirmed Plate Number</p>
                <p style={{ fontWeight: '800', fontSize: '32px', color: "#ffffff", margin: "0", letterSpacing:'2px' }}>{form.plate.toUpperCase()}</p>
            </div>

            <button 
                className="primary" 
                style={{ marginTop: "30px", width: "100%", padding: "14px", borderRadius: "8px", background: "#3b82f6", color: "white", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "16px" }} 
                onClick={() => { setForm({ plate: "", type: "Car", tag: "Visitor", name: "" }); setSubmitted(false); }}
            >
                Register Another
            </button>
        </div>
      </div>
    );
  }

  return (
    <div style={darkContainer}>
      <div style={darkCard}>
        <h2 style={{ textAlign: "center", marginBottom: "10px", color: "#ffffff", fontSize: "24px" }}>Vehicle Registration</h2>
        <p style={{ textAlign: "center", marginBottom: "30px", color: "#64748b", fontSize: "14px" }}>Please fill in your details below</p>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {}
          {/* Plate Number */}
          <div className="form-group">
            <label style={labelStyle}>Plate No.</label>
            <input 
                className="form-input" 
                placeholder="ABC 123" 
                value={form.plate} 
                onChange={e => setForm({...form, plate: e.target.value})} 
                style={{ ...darkInput, textTransform: "uppercase", fontSize: "18px", letterSpacing: "1px" }} 
                required 
            />
            <small style={{ color: "#64748b", fontSize: "12px", marginTop: "6px", display: "block" }}>Format: Letters Space Numbers (ABC 123)</small>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            {/* Type */}
            <div className="form-group">
                <label style={labelStyle}>Type</label>
                <select 
                    className="form-select" 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})}
                    style={darkInput}
                >
                    <option value="Car">Car</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                </select>
            </div>

            {/* Purpose */}
            <div className="form-group">
                <label style={labelStyle}>Purpose</label>
                <select 
                    className="form-select" 
                    value={form.tag} 
                    onChange={e => setForm({...form, tag: e.target.value})}
                    style={darkInput}
                >
                    <option value="Visitor">Visitor</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Student">Student</option>
                    <option value="Employee">Employee</option>
                </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="primary" 
            style={{ 
                padding: "16px", 
                marginTop: "10px", 
                background: "#3b82f6", 
                color: "white", 
                fontWeight: "bold", 
                borderRadius: "8px", 
                border: "none", 
                cursor: "pointer",
                fontSize: "16px",
                transition: "background 0.2s"
            }}
          >
            Submit Registration
          </button>
        </form>
      </div>
    </div>
  );
}