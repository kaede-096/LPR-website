// src/components/LoadingScreen.jsx

import React from "react";
import "../styles/LoadingScreen.css";
import carsBg from "../assets/cars-bg.png";
import driverLicense from "../assets/driver-license.png";

const LoadingScreen = () => {
  return (
    <div
      className="loader-root"
      role="status"
      aria-live="polite"
      aria-label="Loading car selections"
    >
      <div
        className="loader-scene"
        style={{
          backgroundImage: `url(${carsBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="center-card" aria-hidden="true">
          <div className="card-lines" aria-hidden="true">
            <span className="line short" />
            <span className="line long" />
          </div>

          {/* driver-license logo centered with three animated dots to the right */}
          <div
            className="center-license-wrap right-side"
            aria-hidden="true"
            aria-label="driver license area"
          >
            <div
              className="center-license"
              role="img"
              aria-label="driver license"
              style={{ backgroundImage: `url(${driverLicense})` }}
            />
            <div
              className="license-side-dots"
              aria-hidden="true"
              aria-label="loading dots"
            >
              <span className="sdot" />
              <span className="sdot" />
              <span className="sdot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
