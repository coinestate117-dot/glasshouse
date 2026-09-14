"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useRef, useEffect } from "react";
import { Wallet, LogOut } from "lucide-react";

export default function ConnectButton() {
  const { wallets, select, disconnect, connected, publicKey, connecting } =
    useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const installed = wallets.filter((w) => w.readyState === "Installed");

  const handleConnect = async (name: string) => {
    const w = wallets.find((w) => w.adapter.name === name);
    if (!w) return;
    select(w.adapter.name);
    try {
      await w.adapter.connect();
    } catch {
      /* user rejected */
    }
    setOpen(false);
  };

  // Connected state
  if (connected && publicKey) {
    const addr = publicKey.toBase58();
    const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;

    return (
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(!open)}
          className="connect-btn connect-btn-connected"
        >
          <Wallet size={14} />
          {short}
        </button>
        {open && (
          <div className="connect-dropdown">
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="connect-dropdown-item"
            >
              <LogOut size={14} />
              Disconnect
            </button>
          </div>
        )}

        <style jsx>{`
          .connect-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: var(--radius);
            border: 1px solid var(--border);
            background: var(--card);
            color: var(--text);
            font-size: 13px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: border-color 0.15s ease;
          }
          .connect-btn:hover {
            border-color: var(--text-secondary);
          }
          .connect-dropdown {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 4px;
            min-width: 160px;
            z-index: 50;
            opacity: 0;
            transform: translateY(-4px);
            animation: dropIn 0.15s cubic-bezier(0.23, 1, 0.32, 1) forwards;
          }
          .connect-dropdown-item {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: none;
            color: var(--text-secondary);
            font-size: 13px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.1s ease, color 0.1s ease;
          }
          .connect-dropdown-item:hover {
            background: var(--border);
            color: var(--text);
          }
          @keyframes dropIn {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  // Not connected
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => {
          if (installed.length === 1) {
            handleConnect(installed[0].adapter.name);
          } else {
            setOpen(!open);
          }
        }}
        className="connect-btn"
        disabled={connecting}
      >
        <Wallet size={14} />
        {connecting ? "Connecting…" : "Connect"}
      </button>
      {open && installed.length > 1 && (
        <div className="connect-dropdown">
          {installed.map((w) => (
            <button
              key={w.adapter.name}
              onClick={() => handleConnect(w.adapter.name)}
              className="connect-dropdown-item"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={w.adapter.icon}
                alt={w.adapter.name}
                width={20}
                height={20}
                style={{ borderRadius: 4 }}
              />
              {w.adapter.name}
            </button>
          ))}
        </div>
      )}
      {open && installed.length === 0 && (
        <div className="connect-dropdown">
          <div
            style={{
              padding: "12px",
              fontSize: 13,
              color: "var(--text-secondary)",
              textAlign: "center",
            }}
          >
            No wallet found.
            <br />
            Install Phantom or Solflare.
          </div>
        </div>
      )}

      <style jsx>{`
        .connect-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--radius);
          border: 1px solid var(--green);
          background: rgba(20, 241, 149, 0.08);
          color: var(--green);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .connect-btn:hover {
          background: rgba(20, 241, 149, 0.15);
        }
        .connect-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .connect-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 4px;
          min-width: 200px;
          z-index: 50;
          opacity: 0;
          transform: translateY(-4px);
          animation: dropIn 0.15s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        .connect-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: none;
          color: var(--text);
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.1s ease;
        }
        .connect-dropdown-item:hover {
          background: var(--border);
        }
        @keyframes dropIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
