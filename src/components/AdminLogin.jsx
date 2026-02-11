// src/components/AdminLogin.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AdminLogin.css";
import driverLicense from "../assets/driver-license.png";
import bgVideo from "../assets/bg-loop.mp4";

// --- FIREBASE IMPORTS ---
import { auth, db } from "../firebase"; 
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  onAuthStateChanged,
  signOut 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore"; 

export default function AdminLogin() {
  const navigate = useNavigate();
  
  // --- 1. INITIALIZATION ---
  const savedPass = localStorage.getItem("savedPassword");
  const savedEmail = localStorage.getItem("lastEmail");
  
  const initialEmail = savedPass ? (savedEmail || "") : "";
  const initialPass = savedPass || "";
  const initialRemember = !!savedPass;

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPass); 
  const [remember, setRemember] = useState(initialRemember);
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  // REAL-TIME CHECK STATES
  const [isCheckingDb, setIsCheckingDb] = useState(false); 
  
  // FIX: Start false. Wag mag-assume na registered kahit may saved data.
  // Hahayaan nating ang useEffect sa baba ang mag-confirm sa DB.
  const [userExistsInDb, setUserExistsInDb] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem("lp_theme_v1") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("lp_theme_v1", theme);
  }, [theme]);

  // --- 2. REAL-TIME FIRESTORE CHECKER (STRICT MODE) ---
  useEffect(() => {
    // Kung walang email, reset at exit
    if (!email) {
        setUserExistsInDb(false);
        setIsCheckingDb(false); 
        return;
    }

    // Determine delay: Instant (0ms) kung galing sa saved, Delay (500ms) kung typing
    const isSameAsSaved = email === savedEmail;
    const delayTime = isSameAsSaved ? 0 : 500;

    // Set checking state true habang naghihintay
    setIsCheckingDb(true);

    const checkTimer = setTimeout(async () => {
      try {
        // IMPORTANT: Gamitin ang "admin" (lowercase) base sa screenshot mo.
        // Siguraduhing pareho ito sa ginagamit mo sa pag-save.
        const docRef = doc(db, "admin", email); 
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log("User found in DB:", email);
          setUserExistsInDb(true); 
        } else {
          console.log("User NOT found in DB:", email);
          setUserExistsInDb(false); // Ito ang magpapalabas ng Sign Up button
        }
      } catch (err) {
        console.error("Error checking DB:", err);
        // Fallback: Kung may error (e.g. permission), assume not registered para safe
        setUserExistsInDb(false);
      } finally {
        setIsCheckingDb(false);
      }
    }, delayTime); 

    return () => clearTimeout(checkTimer); 
  }, [email, savedEmail]); // Tinanggal na natin ang dependency sa savedPass para laging mag-check

  // --- 3. AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !isSigningUp) {
        navigate("/admin-dashboard", { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate, isSigningUp]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  // --- 4. HANDLE LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!email || !password) {
      setMsg("Please enter both email and password.");
      return;
    }
    
    setLoading(true);
    try {
      const persistenceType = remember ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      await signInWithEmailAndPassword(auth, email, password);

      if (remember) {
        localStorage.setItem("lastEmail", email);
        localStorage.setItem("savedPassword", password);
      } else {
        localStorage.removeItem("lastEmail");
        localStorage.removeItem("savedPassword");
      }
      
      setMsg("Login successful. Redirecting...");

    } catch (error) {
      console.error(error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        setMsg("Invalid email or password.");
      } else if (error.code === 'auth/too-many-requests') {
        setMsg("Too many attempts. Try again later.");
      } else {
        setMsg("Login failed: " + error.message);
      }
      setLoading(false);
    }
  };

  // --- 5. HANDLE SIGN UP ---
  const handleSignUpAdmin = async () => {
    setMsg("");
    if (!email || !password) return setMsg("Enter email and password.");
    
    setIsSigningUp(true);
    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);

      // IMPORTANT: Save to "admin" (lowercase) collection
      await setDoc(doc(db, "admin", email), {
        email: email,
        role: "admin",
        createdAt: new Date(),
      });

      if (remember) {
        localStorage.setItem("lastEmail", email);
        localStorage.setItem("savedPassword", password);
      } else {
        localStorage.removeItem("lastEmail");
        localStorage.removeItem("savedPassword");
      }

      setUserExistsInDb(true); 
      await signOut(auth);

      setMsg("Account created! Please click 'Sign In'.");

    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        // Kahit error sa Auth, double check natin sa DB para sigurado
        setUserExistsInDb(true);
        setMsg("Email is already registered. Please Log In.");
      } else if (error.code === 'auth/weak-password') {
        setMsg("Password should be at least 6 characters.");
      } else {
        setMsg("Error: " + error.message);
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        setIsSigningUp(false);
      }, 2000);
    }
  };

  const handleForgotPassword = async () => {
    setMsg("");
    if (!email) {
        setMsg("Please enter your email first.");
        return;
    }
    setLoading(true);
    try {
        await sendPasswordResetEmail(auth, email);
        alert(`Reset link sent to ${email}`);
        setMsg(`Reset link sent.`);
    } catch (error) {
        setMsg("Error: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fullscreen-container">
      <button className="login-theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>

      <div className="login-image">
        {bgVideo && <video className="bg-video" src={bgVideo} autoPlay muted loop playsInline />}
        <div className="video-overlay" />
      </div>

      <div className="login-panel">
        <div className="panel-content">
          <div className="brand">
            <div className="plate-logo"><img src={driverLicense} alt="Admin logo" /></div>
            <div>
              <h3 className="title">Admin Login</h3>
              <div className="subtitle">License plate detection Dashboard</div>
            </div>
          </div>
          
          <form className="form" onSubmit={handleLogin}>
            <div>
              <div className="label">Email Address</div>
              <div className="input-wrapper" style={{position:'relative'}}>
                <input 
                  className="input" 
                  type="email" 
                  placeholder="admin@gmail.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={loading} 
                />
                
                {isCheckingDb && (
                   <span style={{position:'absolute', right:'10px', top:'12px', fontSize:'12px', color:'var(--muted)', fontStyle:'italic'}}>
                     Checking...
                   </span>
                )}
              </div>
            </div>
            <div>
              <div className="label">Password</div>
              <input 
                className="input" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                disabled={loading} 
              />
            </div>
            
            <div className="options">
              <label className="checkbox">
                <input 
                  type="checkbox" 
                  checked={remember} 
                  onChange={(e) => setRemember(e.target.checked)} 
                  disabled={loading} 
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="link" onClick={handleForgotPassword} disabled={loading}>Forgot Password?</button>
            </div>
            
            <div className="split">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Processing..." : "Sign In"}
              </button>
              
              {/* RENDER LOGIC:
                  1. Checking? -> Invisible placeholder
                  2. Registered? -> Show Indicator
                  3. Not found? -> Show Sign Up Button
              */}
              {isCheckingDb ? (
                  <button type="button" className="btn btn-secondary" style={{visibility: 'hidden'}}>
                    Checking
                  </button>
              ) : userExistsInDb ? (
                  <div className="registered-indicator" style={{
                      flex: 1, 
                      textAlign: 'center', 
                      fontSize: '13px', 
                      color: 'var(--ok)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      opacity: 0.7
                  }}>
                      ✓ Registered
                  </div>
              ) : (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleSignUpAdmin} 
                    disabled={loading || !email} 
                    title="Create New Admin Account"
                  >
                    Sign Up Admin
                  </button>
              )}
            </div>
            
            {msg && <div className={`message ${msg.includes("successful") || msg.includes("created") || msg.includes("sent") ? "ok" : "err"}`}>{msg}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}