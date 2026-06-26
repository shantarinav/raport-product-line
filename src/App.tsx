import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/landing";

const SszPage = lazy(() => import("./pages/ssz").then((module) => ({ default: module.SszPage })));
const TessaPage = lazy(() => import("./pages/tessa").then((module) => ({ default: module.TessaPage })));
const PrintPage = lazy(() => import("./pages/print").then((module) => ({ default: module.PrintPage })));
const SupportPage = lazy(() => import("./pages/support").then((module) => ({ default: module.SupportPage })));
const LocalA3Page = lazy(() => import("./pages/local-a3").then((module) => ({ default: module.LocalA3Page })));

function PageFallback() {
  return (
    <div className="min-h-screen bg-[var(--raport-bg)] px-4 py-6 text-[var(--raport-text)]">
      <div className="mx-auto flex min-h-[320px] w-full max-w-7xl items-center justify-center rounded-[var(--raport-radius-card)] border border-[var(--raport-border)] bg-[var(--raport-surface)] text-sm font-semibold text-[var(--raport-muted)] shadow-[var(--raport-shadow-card)]">
        Загружаем дашборд...
      </div>
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/ssz" element={<SszPage />} />
        <Route path="/tessa" element={<TessaPage />} />
        <Route path="/print" element={<PrintPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/a3" element={<LocalA3Page />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
