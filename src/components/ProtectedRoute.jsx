// src/components/ProtectedRoute.jsx

import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, children }) {
  if (!user) {
    // Kapag walang user, redirect sa login
    return <Navigate to="/admin-login" replace />;
  }
  // Kapag meron, render ang dashboard
  return children;
}