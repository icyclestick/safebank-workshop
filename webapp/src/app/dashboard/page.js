"use client";

import { useState, useEffect, useCallback } from "react";

export default function DashboardPage() {
  const [result, setResult] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState("user2");
  const [amount, setAmount] = useState("500");
  const [hasSession, setHasSession] = useState(false);

  // Check if session cookie exists
  useEffect(() => {
    const cookies = document.cookie;
    setHasSession(cookies.includes("session_token="));
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/transfer");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (hasSession) fetchTransactions();
  }, [hasSession, fetchTransactions]);

  async function handleTransfer(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient, amount: Number(amount) }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", data });
        await fetchTransactions();
      } else {
        setResult({ type: "error", message: data.error });
      }
    } catch {
      setResult({ type: "error", message: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  const totalLost = transactions.reduce((sum, t) => sum + t.amount, 0);
  const balance = 12450 - totalLost;

  return (
    <div className="page">
      <div className="animate-in" style={{ width: "100%", maxWidth: "500px" }}>
        {!hasSession && (
          <div className="result result-error" style={{ marginBottom: "1rem" }}>
            ⚠️ No session cookie found.{" "}
            <a href="/login" style={{ color: "var(--accent-cyan)" }}>
              Login first
            </a>{" "}
            to get a session token.
          </div>
        )}

        <div className="card-static" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>💸 Transfer Funds</h2>
            <span className="badge badge-danger">NO CSRF</span>
          </div>

          <div className="balance-display">
            <div className="label">Available Balance</div>
            <div className="amount">${balance.toLocaleString()}.00</div>
          </div>

          <form onSubmit={handleTransfer}>
            <div className="form-group">
              <label htmlFor="recipient">Recipient</label>
              <input
                id="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Recipient username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="amount">Amount ($)</label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max="10000"
                placeholder="0.00"
              />
            </div>
            <button
              id="transfer-submit"
              type="submit"
              className="btn btn-success btn-full"
              disabled={loading}
            >
              {loading ? "Processing..." : "Send Transfer"}
            </button>
          </form>

          {result && (
            <div className={`result ${result.type === "success" ? "result-success" : "result-error"}`}>
              {result.type === "success" ? (
                <>
                  ✅ {result.data.message}
                  <br />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                    {result.data.transaction.id} | Total TXs: {result.data.totalTransactions}
                  </span>
                </>
              ) : (
                <>❌ {result.message}</>
              )}
            </div>
          )}

          <div className="warning-banner">
            ⚠️ <strong>VULNERABLE:</strong> No CSRF token, no nonce, no
            timestamp validation. Replay the same POST request to transfer
            funds infinitely.
          </div>
        </div>

        {/* Transaction Log */}
        {transactions.length > 0 && (
          <div className="card-static">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1rem" }}>📋 Transaction Log</h2>
              <span className="badge badge-warning">
                {transactions.length} TXs — ${totalLost.toLocaleString()} sent
              </span>
            </div>
            <div className="tx-log">
              {transactions.map((tx, i) => (
                <div className="tx-entry" key={i}>
                  <div>
                    <span className="tx-id">{tx.id}</span>
                    <span style={{ marginLeft: "0.5rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      → {tx.to}
                    </span>
                  </div>
                  <span className="tx-amount">-${tx.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
