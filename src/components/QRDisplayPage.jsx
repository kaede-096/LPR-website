// src/components/QRDisplayPage.jsx
import React from "react";
import { QRCodeSVG } from "qrcode.react";
import "../styles/AdminDashboard.css"; 

export default function QRDisplayPage() {
  const registrationLink = `${window.location.origin}/register`;

  return (
    <div style={{ 
      minHeight: "100vh", 
      width: "100vw", 
      background: "var(--bg)", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{ 
        background: "white", 
        padding: "40px", 
        borderRadius: "20px", 
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center",
        maxWidth: "400px",
        width: "100%",
        border: "1px solid #e2e8f0"
      }}>
        <h2 style={{ color: "#1e293b", marginBottom: "10px", textAlign: "center", fontWeight: "800" }}>
          Scan to Register
        </h2>
        <p style={{ color: "#64748b", marginBottom: "30px", textAlign: "center", fontSize: "14px" }}>
          Scan this code to fill up the vehicle registration form.
        </p>

        <div style={{ 
            border: "4px solid #1e293b", 
            padding: "15px", 
            borderRadius: "15px",
            background: "white",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>
            <QRCodeSVG 
              value={registrationLink}
              size={220} 
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"H"} 
              includeMargin={true} 
            />
        </div>

        <div style={{ marginTop: "30px", padding: "15px", background: "#f8fafc", borderRadius: "10px", width: "100%", textAlign: "center", border: "1px dashed #cbd5e1" }}>
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", fontWeight: "bold" }}>Direct Link:</p>
            <code style={{ color: "#3b82f6", fontSize: "12px", wordBreak: "break-all", fontFamily: "monospace" }}>
                {registrationLink}
            </code>
        </div>
        
        <p style={{ marginTop: "20px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
            Take a screenshot or print this page.
        </p>
      </div>
    </div>
  );
}