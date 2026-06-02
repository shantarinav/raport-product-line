import { useState, type DragEvent } from "react";
import { brandIconPath } from "../../shared/brandAssets";
import { formatReportPeriod } from "./periodDisplay";
import type { ImportedReport } from "./types";

interface ImportPanelProps {
  report: ImportedReport | null;
  importError: string;
  onFileSelected: (file: File | null) => void;
}

function formatImportedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "не определено";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ImportPanel({ report, importError, onFileSelected }: ImportPanelProps) {
  const [dropActive, setDropActive] = useState(false);

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDropActive(false);
    onFileSelected(event.dataTransfer.files.item(0));
  }

  return (
    <section
      className={`import-panel raport-file-panel ${dropActive ? "drag-active" : ""}`}
      aria-label="Импорт XLS"
      onDragEnter={() => setDropActive(true)}
      onDragLeave={() => setDropActive(false)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <label className="action-button upload-control raport-button">
        <span>{report ? "Заменить файл" : "Выбрать Excel"}</span>
        <input
          aria-label="Загрузить XLS"
          type="file"
          accept=".xls,.xlsx"
          onChange={(event) => onFileSelected(event.currentTarget.files?.[0] ?? null)}
        />
      </label>

      {importError && (
        <p className="error-text">
          <img className="raport-inline-icon" src={brandIconPath("icon-problem.png")} alt="" />
          {importError}
        </p>
      )}

      {report && (
        <article className="import-item raport-file-status">
          <img className="raport-inline-icon" src={brandIconPath("icon-table.png")} alt="" />
          <div>
            <strong title={report.sourceName}>{report.sourceName}</strong>
            <span>Период: {formatReportPeriod(report.period)}</span>
            <small>
              Загружен: {formatImportedAt(report.importedAt)}
              {report.warnings.length > 0 ? ` · ${report.warnings.length.toLocaleString("ru-RU")} предупрежд.` : ""}
            </small>
          </div>
        </article>
      )}
    </section>
  );
}
