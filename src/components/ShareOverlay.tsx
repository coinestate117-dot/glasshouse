"use client";

import { useEffect, useState } from "react";
import { Download, Copy, Link2, Send, X, ExternalLink } from "lucide-react";

interface ShareOverlayProps {
  ogUrl: string;
  pageUrl: string;
  tweetText: string;
  onClose: () => void;
}

export default function ShareOverlay({
  ogUrl,
  pageUrl,
  tweetText,
  onClose,
}: ShareOverlayProps) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const flash = (label: string) => {
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleSave = async () => {
    try {
      const res = await fetch(ogUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "glasshouse-share.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleCopyImage = async () => {
    try {
      const res = await fetch(ogUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      flash("image");
    } catch {
      await navigator.clipboard.writeText(pageUrl);
      flash("link");
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(pageUrl);
    flash("link");
  };

  const handleTweet = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(pageUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(tweetText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const buttons = [
    { label: "Save", icon: <Download size={18} />, action: handleSave },
    {
      label: copied === "image" ? "Copied!" : "Copy",
      icon: <Copy size={18} />,
      action: handleCopyImage,
    },
    {
      label: copied === "link" ? "Copied!" : "Link",
      icon: <Link2 size={18} />,
      action: handleCopyLink,
    },
    { label: "X", icon: <ExternalLink size={18} />, action: handleTweet },
    { label: "Telegram", icon: <Send size={18} />, action: handleTelegram },
  ];

  return (
    <div
      className="share-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="share-content">
        {/* Close button */}
        <button onClick={onClose} className="share-close">
          <X size={22} />
        </button>

        {/* Card preview */}
        <div className="share-card-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogUrl}
            alt="Share card"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 12,
              display: "block",
            }}
          />
        </div>

        {/* Share buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginTop: 24,
          }}
        >
          {buttons.map((b) => (
            <button
              key={b.label}
              onClick={b.action}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "border-color 0.15s ease",
                }}
              >
                {b.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .share-overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease-out;
        }
        .share-content {
          position: relative;
          max-width: 560px;
          width: 100%;
          animation: shareScaleIn 0.2s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .share-close {
          position: absolute;
          top: -44px;
          right: 0;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }
        .share-card-wrap {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(20, 241, 149, 0.1);
        }
        @keyframes shareScaleIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .share-content {
            animation: fadeIn 0.15s ease-out;
          }
        }
      `}</style>
    </div>
  );
}
