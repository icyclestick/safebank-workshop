"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="page">
      <div className="animate-in" style={{ textAlign: "center" }}>
        <h1>🏦 SecureBank</h1>
        <p className="subtitle">
          Online Banking Portal — Manage your finances with confidence
        </p>

        <div className="action-grid">
          <Link href="/login" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔐</div>
            <h2 style={{ fontSize: "1.2rem" }}>Login</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
              Sign in to your account
            </p>
          </Link>

          <Link href="/dashboard" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💸</div>
            <h2 style={{ fontSize: "1.2rem", color: "var(--accent-green)" }}>
              Transfer Funds
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
              Send money instantly
            </p>
          </Link>
        </div>

        <div className="warning-banner" style={{ maxWidth: "600px", marginTop: "2rem" }}>
          ⚠️ <strong>WORKSHOP NOTICE:</strong> This application is intentionally
          vulnerable. It is designed for educational purposes in the Network
          Security Workshop. Do not enter real credentials.
        </div>
      </div>
    </div>
  );
}
