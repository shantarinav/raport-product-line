import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage, PrintPage, SszPage, TessaPage } from "./pages";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/ssz" element={<SszPage />} />
      <Route path="/tessa" element={<TessaPage />} />
      <Route path="/print" element={<PrintPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
