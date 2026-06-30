import { useState, useCallback, useEffect } from "react";
import {
  checkFreighterInstalled,
  connectFreighterWallet,
  sendPaymentWithFreighter,
} from "./freighter";
import { fundWithFriendbot, getBalance, getTransactions } from "./stellar";
import "./App.css";

const TABS = ["Wallet", "Fund", "Send", "History"];

export default function App() {
  const [activeTab, setActiveTab] = useState("Wallet");
  const [publicKey, setPublicKey] = useState(null);
  const [freighterInstalled, setFreighterInstalled] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState("");
  const [toast, setToast] = useState(null);
  const [sendForm, setSendForm] = useState({ destination: "", amount: "", memo: "" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    checkFreighterInstalled().then(setFreighterInstalled);
  }, []);

  const handleConnect = async () => {
    setLoading("connect");
    try {
      const address = await connectFreighterWallet();
      setPublicKey(address);
      setBalance(null);
      setTransactions([]);
      showToast("Freighter wallet connected!");
    } catch (e) {
      showToast(e.message || "Failed to connect wallet.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleDisconnect = () => {
    setPublicKey(null);
    setBalance(null);
    setTransactions([]);
    showToast("Wallet disconnected.");
  };

  const handleFund = async () => {
    if (!publicKey) return showToast("Connect your Freighter wallet first.", "error");
    setLoading("fund");
    try {
      await fundWithFriendbot(publicKey);
      const bal = await getBalance(publicKey);
      setBalance(bal);
      showToast("Funded with 10,000 XLM from Friendbot!");
    } catch (e) {
      showToast(e.message || "Funding failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleRefreshBalance = useCallback(async () => {
    if (!publicKey) return;
    setLoading("balance");
    try {
      const bal = await getBalance(publicKey);
      setBalance(bal);
    } catch {
      showToast("Could not fetch balance. Fund your account with Friendbot first.", "error");
    } finally {
      setLoading("");
    }
  }, [publicKey]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!publicKey) return showToast("Connect your Freighter wallet first.", "error");
    if (!sendForm.destination || !sendForm.amount) return showToast("Fill all fields.", "error");
    setLoading("send");
    try {
      const result = await sendPaymentWithFreighter(
        publicKey,
        sendForm.destination,
        sendForm.amount,
        sendForm.memo
      );
      const bal = await getBalance(publicKey);
      setBalance(bal);
      setSendForm({ destination: "", amount: "", memo: "" });
      showToast(`Transaction signed and submitted! Tx: ${result.hash.slice(0, 16)}...`);
    } catch (e) {
      showToast(e.message || "Transaction failed.", "error");
    } finally {
      setLoading("");
    }
  };

  const handleHistory = async () => {
    if (!publicKey) return showToast("Connect your Freighter wallet first.", "error");
    setLoading("history");
    try {
      const txs = await getTransactions(publicKey);
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
        <div className="card wallet-card">
          {publicKey ? (
            <>
              <div className="wallet-card__status">
                <span className="status-dot" />
                Connected via Freighter
              </div>
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
                  {publicKey.slice(0, 12)}…{publicKey.slice(-8)}
                </code>
                <button
                  className="icon-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(publicKey);
                    showToast("Copied!");
                  }}
                >⎘</button>
              </div>
            </>
          ) : (
            <div className="wallet-card__empty">
              <p>No wallet connected</p>
              <p className="muted">Connect your Freighter extension to get started</p>
            </div>
          )}
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`tab ${activeTab === t ? "tab--active" : ""}`}
              onClick={() => {
                setActiveTab(t);
                if (t === "History") handleHistory();
                if (t === "Wallet" && publicKey) handleRefreshBalance();
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="panel">
          {activeTab === "Wallet" && (
            <div className="section">
              <h2>Connect Wallet</h2>
              {freighterInstalled === false && (
                <div className="info-box info-box--warning">
                  <span className="info-box__label">Freighter not detected</span>
                  <p className="muted">
                    Install the{" "}
                    <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                      Freighter browser extension
                    </a>{" "}
                    and set the network to Testnet.
                  </p>
                </div>
              )}
              {!publicKey ? (
                <>
                  <p className="muted">
                    Click below to request permission via Freighter&apos;s{" "}
                    <code>setAllowed</code> API, then retrieve your public key.
                  </p>
                  <button
                    className="btn btn--primary"
                    onClick={handleConnect}
                    disabled={loading === "connect" || freighterInstalled === false}
                  >
                    {loading === "connect" ? (
                      <>
                        <Spinner /> Connecting…
                      </>
                    ) : (
                      "Connect Wallet"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="info-box">
                    <span className="info-box__label">Connected address</span>
                    <code>{publicKey}</code>
                  </div>
                  <button className="btn btn--secondary" onClick={handleDisconnect}>
                    Disconnect Wallet
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === "Fund" && (
            <div className="section">
              <h2>Fund with Friendbot</h2>
              <p className="muted">Get free Testnet XLM to activate your account. Works only on Testnet.</p>
              {publicKey && (
                <div className="info-box">
                  <span className="info-box__label">Funding address</span>
                  <code>{publicKey}</code>
                </div>
              )}
              <button
                className="btn btn--primary"
                onClick={handleFund}
                disabled={loading === "fund" || !publicKey}
              >
                {loading === "fund" ? <><Spinner /> Funding…</> : "Fund with Friendbot (10,000 XLM)"}
              </button>
            </div>
          )}

          {activeTab === "Send" && (
            <div className="section">
              <h2>Send XLM</h2>
              <p className="muted">
                Transactions are signed in Freighter via <code>signTransaction</code>.
              </p>
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
                  disabled={loading === "send" || !publicKey}
                >
                  {loading === "send" ? <><Spinner /> Signing in Freighter…</> : "Sign & Send XLM →"}
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
                    const isOutgoing = tx.from === publicKey;
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
        Built on <strong>Stellar Testnet</strong> · Freighter Wallet · White Belt Level 1 · Rise In Challenge
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
