import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./index.css";
import "./shared/styles/theme.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ThemeProvider>
      <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </HashRouter>
    </ThemeProvider>
  </StrictMode>,
);
