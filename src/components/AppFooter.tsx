"use client";

import { Lock, Server, ShieldCheck } from "lucide-react";

export function AppFooter() {
  return (
    <footer
      style={{
        background: "#1E3A5F",
        color: "#fff",
        marginTop: "64px",
      }}
      id="privacy"
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "40px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {/* Trust badges */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px",
          }}
        >
          {[
            {
              icon: <Lock size={20} />,
              title: "100% Secure",
              desc: "All processing is done locally in your browser using WebAssembly and Canvas APIs.",
            },
            {
              icon: <ShieldCheck size={20} />,
              title: "Private Processing",
              desc: "Your Aadhaar documents are never transmitted to any server or third-party service.",
            },
            {
              icon: <Server size={20} />,
              title: "No Data Stored",
              desc: "No files, no metadata, no identifiable information is retained after your session ends.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#93C5FD",
                }}
              >
                {item.icon}
              </span>
              <div>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  {item.title}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.6)",
                    marginTop: "4px",
                    margin: "4px 0 0 0",
                    lineHeight: "1.5",
                  }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }} />

        {/* Bottom bar */}
        <div
          id="about"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
            © {new Date().getFullYear()} Aadhaar Mask Pro · Built for secure, compliant document handling
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
            UIDAI compliant · First 8 digits masked
          </p>
        </div>
      </div>
    </footer>
  );
}
