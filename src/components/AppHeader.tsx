"use client";

import { Moon, ShieldCheck, Sun } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Props {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AppHeader({ theme, onToggleTheme }: Props) {
  return (
    <header
      style={{
        minHeight: "64px",
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
          padding: "0 16px",
          minHeight: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "#D95F00",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} />
          </span>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#1A0A00",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            Aadhaar Mask Pro
          </span>
        </div>

        {/* Navigation — hidden on small screens via CSS class */}
        <nav className="header-nav" aria-label="Main navigation">
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
              (e.currentTarget as HTMLElement).style.background = "#FFF0E6";
              (e.currentTarget as HTMLElement).style.color = "#D95F00";
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
              (e.currentTarget as HTMLElement).style.background = "#FFF0E6";
              (e.currentTarget as HTMLElement).style.color = "#D95F00";
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
              border: "1px solid #F0D5C0",
              background: "transparent",
              cursor: "pointer",
              color: "#7A4A2A",
              flexShrink: 0,
            }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
