import { useState, useCallback } from "react";
import {
  generateWallet,
  fundWithFriendbot,
  getBalance,
  sendPayment,
  getTransactions,
} from "./stellar";
import "./App.css";

const TABS = ["Wallet", "Fund", "Send", "History"];

export default function App() {
  const [activeTab, setActiveTab] = useState("Wallet");
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState("");
  const [toast, setToast] = useState(null);
  const [sendForm, setSendForm] = useState({ destination: "", amount: "", memo: "" });
  const [showSecret, setShowSecret] = useState(false);
  const [importSecret, setImportSecret] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = () => {
    const newWallet = generateWallet();
    setWallet(newWallet);
    setBalance(null);
    setTransactions([]);
    showToast("New wallet generated! Fund it with Friendbot to activate.");
  };

  const handleImport = () => {
    try {
      const { Keypair } = window.__stellarSdk || {};
      // Use SDK directly for import
      import("@stellar/stellar-sdk").then(({ Keypair }) => {
        const kp = Keypair.fromSecret(importSecret.trim());
        setWallet({ publicKey: kp.publicKey(), secretKey: importSecret.trim() });
        setBalance(null);
        setTransactions([]);
        setImportSecret("");
        showToast("Wallet imported successfully!");
      });
    } catch {
      showToast("Invalid secret key.", "error");
    }
  };

  const handleFund = async () => {
    if (!wallet) return showToast("Generate a wallet first.", "error");
    setLoading("fund");
    try {
      await fundWithFriendbot(wallet.publicKey);
      const bal = await getBalance(wallet.publicKey);
      setBalance(bal);
      showToast("Funded with 10,000 XLM from Friendbot!");
    } catch (e) {
      showToast(e.message || "Funding failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleRefreshBalance = useCallback(async () => {
    if (!wallet) return;
    setLoading("balance");
    try {
      const bal = await getBalance(wallet.publicKey);
      setBalance(bal);
    } catch {
      showToast("Could not fetch balance. Account may not be activated.", "error");
    } finally {
      setLoading("");
    }
  }, [wallet]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!wallet) return showToast("No wallet loaded.", "error");
    if (!sendForm.destination || !sendForm.amount) return showToast("Fill all fields.", "error");
    setLoading("send");
    try {
      const result = await sendPayment(
        wallet.secretKey,
        sendForm.destination,
        sendForm.amount,
        sendForm.memo
      );
      const bal = await getBalance(wallet.publicKey);
      setBalance(bal);
      setSendForm({ destination: "", amount: "", memo: "" });
      showToast(`Sent! Tx: ${result.hash.slice(0, 16)}...`);
    } catch (e) {
      showToast(e.message || "Transaction failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleHistory = async () => {
    if (!wallet) return showToast("No wallet loaded.", "error");
    setLoading("history");
    try {
      const txs = await getTransactions(wallet.publicKey);
      setTransactions(txs);
      if (txs.length === 0) showToast("No transactions found.", "info");
    } catch {
      showToast("Could not fetch transactions.", "error");
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="app">
      {toast && (
        <div className={`toast toast--${toast.type}`}>{toast.message}</div>
      )}

      <header className="header">
        <div className="header__logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="url(#g)" />
            <path d="M7 14h14M14 7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C3AED" />
                <stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          <span>Stellar Wallet</span>
        </div>
        <span className="badge">Testnet</span>
      </header>

      <main className="main">
        {/* Wallet Card */}
        <div className="card wallet-card">
          {wallet ? (
            <>
              <div className="wallet-card__balance">
                <span className="wallet-card__label">Balance</span>
                <span className="wallet-card__amount">
                  {balance !== null ? `${parseFloat(balance).toLocaleString()} XLM` : "—"}
                  <button
                    className="icon-btn"
                    onClick={handleRefreshBalance}
                    disabled={loading === "balance"}
                    title="Refresh"
                  >
                    {loading === "balance" ? <Spinner size={14} /> : "↻"}
                  </button>
                </span>
              </div>
              <div className="wallet-card__key">
                <span className="wallet-card__label">Public Key</span>
                <code className="wallet-card__addr">
                  {wallet.publicKey.slice(0, 12)}…{wallet.publicKey.slice(-8)}
                </code>
                <button
                  className="icon-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(wallet.publicKey);
                    showToast("Copied!");
                  }}
                >⎘</button>
              </div>
              <div className="wallet-card__key">
                <span className="wallet-card__label">Secret Key</span>
                <code className="wallet-card__addr secret">
                  {showSecret ? wallet.secretKey : "S••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                </code>
                <button className="icon-btn" onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? "🙈" : "👁"}
                </button>
              </div>
            </>
          ) : (
            <div className="wallet-card__empty">
              <p>No wallet loaded</p>
              <p className="muted">Generate a new wallet or import an existing one</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`tab ${activeTab === t ? "tab--active" : ""}`}
              onClick={() => {
                setActiveTab(t);
                if (t === "History") handleHistory();
                if (t === "Wallet") handleRefreshBalance();
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="panel">
          {activeTab === "Wallet" && (
            <div className="section">
              <h2>Manage Wallet</h2>
              <button className="btn btn--primary" onClick={handleGenerate}>
                Generate New Wallet
              </button>
              <div className="divider"><span>or import</span></div>
              <div className="input-row">
                <input
                  type="password"
                  placeholder="Enter secret key (S...)"
                  value={importSecret}
                  onChange={(e) => setImportSecret(e.target.value)}
                  className="input"
                />
                <button className="btn btn--secondary" onClick={handleImport}>
                  Import
                </button>
              </div>
            </div>
          )}

          {activeTab === "Fund" && (
            <div className="section">
              <h2>Fund with Friendbot</h2>
              <p className="muted">Get free Testnet XLM to activate your account. Works only on Testnet.</p>
              {wallet && (
                <div className="info-box">
                  <span className="info-box__label">Funding address</span>
                  <code>{wallet.publicKey}</code>
                </div>
              )}
              <button
                className="btn btn--primary"
                onClick={handleFund}
                disabled={loading === "fund" || !wallet}
              >
                {loading === "fund" ? <><Spinner /> Funding…</> : "Fund with Friendbot (10,000 XLM)"}
              </button>
            </div>
          )}

          {activeTab === "Send" && (
            <div className="section">
              <h2>Send XLM</h2>
              <form onSubmit={handleSend} className="form">
                <label className="label">Destination Address</label>
                <input
                  className="input"
                  type="text"
                  placeholder="G..."
                  value={sendForm.destination}
                  onChange={(e) => setSendForm({ ...sendForm, destination: e.target.value })}
                  required
                />
                <label className="label">Amount (XLM)</label>
                <input
                  className="input"
                  type="number"
                  step="0.0000001"
                  min="1"
                  placeholder="e.g. 100"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                  required
                />
                <label className="label">Memo (optional)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Optional message"
                  value={sendForm.memo}
                  onChange={(e) => setSendForm({ ...sendForm, memo: e.target.value })}
                />
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={loading === "send" || !wallet}
                >
                  {loading === "send" ? <><Spinner /> Sending…</> : "Send XLM →"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "History" && (
            <div className="section">
              <h2>Transaction History</h2>
              <button
                className="btn btn--secondary"
                onClick={handleHistory}
                disabled={loading === "history"}
              >
                {loading === "history" ? <><Spinner /> Loading…</> : "Refresh"}
              </button>
              {transactions.length > 0 ? (
                <div className="tx-list">
                  {transactions.map((tx) => {
                    const isOutgoing = tx.from === wallet?.publicKey;
                    return (
                      <div key={tx.id} className={`tx-item ${isOutgoing ? "tx-item--out" : "tx-item--in"}`}>
                        <div className="tx-item__direction">{isOutgoing ? "↑ Sent" : "↓ Received"}</div>
                        <div className="tx-item__amount">{parseFloat(tx.amount).toLocaleString()} XLM</div>
                        <div className="tx-item__addr muted">
                          {isOutgoing ? `To: ${tx.to.slice(0, 8)}…${tx.to.slice(-6)}` : `From: ${tx.from.slice(0, 8)}…${tx.from.slice(-6)}`}
                        </div>
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${tx.transaction_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="tx-item__link"
                        >
                          View on Explorer ↗
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !loading && <p className="muted">No transactions yet.</p>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        Built on <strong>Stellar Testnet</strong> · White Belt Level 1 · Rise In Challenge
      </footer>
    </div>
  );
}

function Spinner({ size = 16 }) {
  return (
    <svg
      className="spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
