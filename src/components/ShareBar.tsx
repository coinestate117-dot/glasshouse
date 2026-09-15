"use client";

import { useState } from "react";
import { Download, Copy, Link2, X as XIcon } from "lucide-react";

interface ShareBarProps {
  ogUrl: string;
  pageUrl: string;
  tweetText: string;
}

export default function ShareBar({ ogUrl, pageUrl, tweetText }: ShareBarProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const flash = (label: string) => {
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleSaveImage = async () => {
    try {
      const res = await fetch(ogUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "glasshouse-share.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
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
      /* fallback: copy link instead */
      await navigator.clipboard.writeText(pageUrl);
      flash("link");
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(pageUrl);
    flash("link");
  };

  const handleTweet = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      tweetText
    )}&url=${encodeURIComponent(pageUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 16,
        marginBottom: 16,
      }}
    >
      <ShareButton onClick={handleSaveImage} icon={<Download size={14} />} label="Save image" />
      <ShareButton
        onClick={handleCopyImage}
        icon={<Copy size={14} />}
        label={copied === "image" ? "Copied!" : "Copy image"}
      />
      <ShareButton
        onClick={handleCopyLink}
        icon={<Link2 size={14} />}
        label={copied === "link" ? "Copied!" : "Copy link"}
      />
      <ShareButton onClick={handleTweet} icon={<XIcon size={14} />} label="X" />
    </div>
  );
}

function ShareButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--text-secondary)",
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "border-color 0.15s ease, color 0.15s ease",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
