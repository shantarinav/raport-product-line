import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        raport: {
          bg: "var(--raport-bg)",
          surface: {
            DEFAULT: "var(--raport-surface)",
            soft: "var(--raport-surface-soft)",
            elevated: "var(--raport-surface-elevated)",
          },
          text: "var(--raport-text)",
          muted: "var(--raport-muted)",
          border: "var(--raport-border)",
          primary: {
            DEFAULT: "var(--raport-primary)",
            strong: "var(--raport-primary-strong)",
          },
          success: {
            DEFAULT: "var(--raport-success)",
            muted: "var(--raport-success-muted)",
            border: "var(--raport-success-border)",
          },
          warning: {
            DEFAULT: "var(--raport-warning)",
            muted: "var(--raport-warning-muted)",
            border: "var(--raport-warning-border)",
          },
          danger: {
            DEFAULT: "var(--raport-danger)",
            muted: "var(--raport-danger-muted)",
            border: "var(--raport-danger-border)",
          },
          info: {
            muted: "var(--raport-info-muted)",
            border: "var(--raport-info-border)",
          },
          neutral: "var(--raport-neutral)",
          action: {
            bg: "var(--raport-action-bg)",
            "bg-active": "var(--raport-action-bg-active)",
            border: "var(--raport-action-border)",
          },
          progress: {
            track: "var(--raport-progress-track)",
          }
        }
      },
      borderRadius: {
        card: "var(--raport-radius-card)",
        control: "var(--raport-radius-control)",
      },
      boxShadow: {
        card: "var(--raport-shadow-card)",
      }
    },
  },
  plugins: [],
};

export default config;
