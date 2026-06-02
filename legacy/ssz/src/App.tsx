import { useState, type DragEvent } from "react";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ImportPanel } from "./features/import/ImportPanel";
import { readWorkbookFile } from "./features/import/readWorkbook";
import type { ImportedReport } from "./features/import/types";
import { brandAssetPath } from "./shared/brandAssets";

export function App() {
  const [report, setReport] = useState<ImportedReport | null>(null);
  const [importError, setImportError] = useState("");
  const [emptyDropActive, setEmptyDropActive] = useState(false);

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setImportError("");
    try {
      const parsed = await readWorkbookFile(file);
      if (parsed.errors.length > 0) {
        setImportError(parsed.errors.join(" "));
        return;
      }
      setReport(parsed);
    } catch {
      setImportError("Не удалось прочитать XLS-файл.");
    }
  }

  function handleEmptyDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setEmptyDropActive(true);
  }

  function handleEmptyDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setEmptyDropActive(false);
    handleFileSelected(event.dataTransfer.files.item(0));
  }

  return (
    <main className="app-shell raport-shell">
      <header className="topbar raport-header">
        <div className="raport-brand">
          <img className="raport-logo" src={brandAssetPath("assets/brand/raport-logo-mark.png")} alt="" />
          <div>
            <h1>Рапорт: качество оформления ССЗ</h1>
            <p className="raport-slogan">Excel докладывает главное</p>
            <p className="raport-description">
              Загрузите Excel-файл с данными по ССЗ — «Рапорт» покажет долю работ по технологии, заказы, цеха, мастеров и операции, требующие внимания.
            </p>
          </div>
        </div>
        <ImportPanel report={report} importError={importError} onFileSelected={handleFileSelected} />
      </header>

      {report ? (
        <DashboardPage activeReport={report} />
      ) : (
        <section
          className={`empty-state raport-upload ${emptyDropActive ? "drag-active" : ""}`}
          onDragEnter={() => setEmptyDropActive(true)}
          onDragLeave={() => setEmptyDropActive(false)}
          onDragOver={handleEmptyDragOver}
          onDrop={handleEmptyDrop}
        >
          <div className="empty-card">
            <h2>Загрузите Excel-файл</h2>
            <p className="raport-drop-hint">Перетащите .xls или .xlsx сюда либо нажмите «Выбрать Excel».</p>
          </div>
        </section>
      )}
    </main>
  );
}
