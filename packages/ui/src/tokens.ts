export const EHS_COLORS = {
  primary: "#0F172A", // Slate 900
  brand: "#0284C7", // Sky 600
  success: "#16A34A", // Green 600
  warning: "#D97706", // Amber 600
  danger: "#DC2626", // Red 600
  neutral: "#64748B", // Slate 500
  background: "#F8FAFC", // Slate 50
  card: "#FFFFFF",
} as const;

export const RISK_BADGE_STYLES = {
  LOW: { bg: "#DCFCE7", text: "#15803D", label: "Low Risk (Acceptable)" },
  MODERATE: { bg: "#FEF9C3", text: "#A16207", label: "Moderate Risk (ALARP)" },
  HIGH: {
    bg: "#FFEDD5",
    text: "#C2410C",
    label: "High Risk (Review Required)",
  },
  CRITICAL: {
    bg: "#FEE2E2",
    text: "#B91C1C",
    label: "Critical Risk (Unacceptable)",
  },
} as const;
