"use client";

import { Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Props {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onClearSession: () => void;
  canClear: boolean;
}

export function AppHeader({ theme, onToggleTheme, onClearSession, canClear }: Props) {
  return (
    <header
      style={{
        height: "72px",
        background: "#fff",
        borderBottom: "1px solid #F0D5C0",
        boxShadow: "0 1px 4px rgba(217,95,0,0.06)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 24px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#D95F00",
              color: "#fff",
            }}
          >
            <ShieldCheck size={20} />
          </span>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#1A0A00",
              letterSpacing: "-0.01em",
            }}
          >
            Aadhaar Mask Pro
          </span>
        </div>

        {/* Navigation */}
        <nav
          style={{ display: "flex", alignItems: "center", gap: "4px" }}
          aria-label="Main navigation"
        >
          <Link
            to="/"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#D95F00",
              background: "#FFF0E6",
              textDecoration: "none",
            }}
          >
            Home
          </Link>
          <a
            href="#privacy"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#64748B",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F3F4F6";
              (e.currentTarget as HTMLElement).style.color = "#0F172A";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#64748B";
            }}
          >
            Privacy
          </a>
          <a
            href="#about"
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#64748B",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F3F4F6";
              (e.currentTarget as HTMLElement).style.color = "#0F172A";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#64748B";
            }}
          >
            About
          </a>
        </nav>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              background: "transparent",
              cursor: "pointer",
              color: "#64748B",
            }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={onClearSession}
            disabled={!canClear}
            aria-label="Clear session"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              background: canClear ? "#FFF" : "#F9FAFB",
              cursor: canClear ? "pointer" : "not-allowed",
              fontSize: "13px",
              fontWeight: 500,
              color: canClear ? "#374151" : "#9CA3AF",
              transition: "background 0.15s",
            }}
          >
            <Trash2 size={14} />
            Clear Session
          </button>
        </div>
      </div>
    </header>
  );
}
