"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", data });
        // Redirect to dashboard after 1.5s
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setResult({ type: "error", message: data.error });
      }
    } catch {
      setResult({ type: "error", message: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card-static animate-in" style={{ width: "100%", maxWidth: "400px" }}>
        <h2>🔐 Login</h2>
        <p className="subtitle">Sign in to your SecureBank account</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {result && (
          <div className={`result ${result.type === "success" ? "result-success" : "result-error"}`}>
            {result.type === "success" ? (
              <>
                ✅ Login successful! Welcome, <strong>{result.data.user}</strong>
                <br />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                  Session: {result.data.session}
                </span>
              </>
            ) : (
              <>❌ {result.message}</>
            )}
          </div>
        )}

        <div className="warning-banner">
          ⚠️ <strong>VULNERABLE:</strong> Session cookie set without HttpOnly,
          Secure, or SameSite flags. Credentials: admin / password123
        </div>
      </div>
    </div>
  );
}
