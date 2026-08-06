"use client";

import { FileText, LayoutList, ScanLine, ShieldCheck } from "lucide-react";

interface Stat {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

interface Props {
  documents: number;
  pages: number;
  aadhaarFound: number;
  masked: number;
}

export function StatsRow({ documents, pages, aadhaarFound, masked }: Props) {
  const stats: Stat[] = [
    {
      label: "Documents",
      value: documents,
      icon: <FileText size={20} />,
      color: "#D95F00",
      bg: "#FFF0E6",
    },
    {
      label: "Pages",
      value: pages,
      icon: <LayoutList size={20} />,
      color: "#7C3AED",
      bg: "#F5F3FF",
    },
    {
      label: "Aadhaar Found",
      value: aadhaarFound,
      icon: <ScanLine size={20} />,
      color: "#B45309",
      bg: "#FFFBEB",
    },
    {
      label: "Masked",
      value: masked,
      icon: <ShieldCheck size={20} />,
      color: "#15803D",
      bg: "#F0FDF4",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
      }}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #E5E7EB",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -6px rgba(0,0,0,0.07)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#64748B",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {stat.label}
            </span>
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: stat.bg,
                color: stat.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </span>
          </div>
          <span
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#0F172A",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
