import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileSpreadsheet } from "lucide-react";
import { DashboardHeader, ErrorState, FileDropZone, PageShell } from "../../shared/ui";
import { readWorkbookFile } from "../../features/ssz/import/readWorkbook";
import type { ImportedReport } from "../../features/ssz/import/types";
import { readTessaReportFile } from "../../features/tessa/import/readReportFile";
import type { TessaImportResult } from "../../features/tessa/types";
import { readPrintReportFile } from "../../features/print/import/readReportFile";
import type { PrintImportResult } from "../../features/print/types";
import { readSupportReportFile } from "../../features/support/import/readReportFile";
import type { SupportImportResult } from "../../features/support/supportTypes";
import { setPendingDashboardData, type DashboardRoute } from "../../shared/pendingDashboardFile";
import { detectReportType, type DetectedReportType } from "../../shared/reportDetection";
import { putSnapshot } from "../../shared/lib/historyDB";
import { buildSnapshotData, type SnapshotInput, type SnapshotReportMatch } from "../../shared/lib/snapshotBuilder";
import { areTrendsEnabled } from "../../shared/lib/trendSettings";
import { HistoryManager } from "./components/HistoryManager";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = [".csv", ".xls", ".xlsx"];
const LANDING_FILE_INPUT_ID = "landing-file-input";

type LandingStatus = "idle" | "dragging" | "reading" | "detecting" | "matched" | "ambiguous" | "error";
type ReportMatch = SnapshotReportMatch;

type SelectedFileState = {
  name: string;
  size: number;
  extension: string;
  match: ReportMatch | null;
};

function fileExtension(fileName: string) {
  const normalized = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.find((extension) => normalized.endsWith(extension)) ?? "";
}

function statusText(status: LandingStatus) {
  if (status === "dragging") return "Можно отпускать файл";
  if (status === "reading") return "Читаем файл";
  if (status === "detecting") return "Определяем тип отчета";
  if (status === "matched") return "Открываем дашборд";
  if (status === "ambiguous") return "Отчет не определен";
  if (status === "error") return "Ошибка";
  return "Ожидание файла";
}

function reportLabel(type: DetectedReportType): ReportMatch {
  if (type === "ssz") return "ssz";
  if (type === "tessa") return "tessa";
  if (type === "print") return "print";
  return "support";
}

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<LandingStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<SelectedFileState | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    const nextNotice = (location.state as { statusNotice?: string } | null)?.statusNotice;
    if (!nextNotice) return;
    setStatus("idle");
    setStatusNotice(nextNotice);
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.state, navigate]);

  const statusChips = useMemo(() => {
    if (status === "idle" && statusNotice) {
      return [
        { label: statusNotice },
        { label: "Ожидание файла", tone: "secondary" as const },
      ];
    }

    if (status === "idle") {
      return [{ label: "Ожидание файла", tone: "secondary" as const }];
    }

    if (status === "ambiguous") {
      return [{ label: statusText(status), tone: "warning" as const }];
    }
    
    if (status === "error") {
      return [{ label: statusText(status), tone: "danger" as const }];
    }

    const isLoading = status === "reading" || status === "detecting" || status === "matched";
    return [{ label: statusText(status), isLoading }];
  }, [status, statusNotice]);

  function clearTimers() {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }


  async function handleFileSelect(file: File | null) {
    clearTimers();
    setErrorMessage("");
    setStatusNotice("");

    if (!file) {
      setStatus("idle");
      setSelectedFile(null);
      return;
    }

    const extension = fileExtension(file.name);
    setSelectedFile({
      name: file.name,
      size: file.size,
      extension,
      match: null,
    });

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatus("error");
      setErrorMessage("Размер файла больше 20 Мб.");
      return;
    }

    setStatus("reading");
    setStatus("detecting");

    const persistSnapshot = (nextMatch: ReportMatch, parsedData: SnapshotInput) => {
      if (!areTrendsEnabled()) return;

      void (async () => {
        try {
          const snapshots = buildSnapshotData(nextMatch, parsedData);
          for (const snapshot of snapshots) {
            await putSnapshot(snapshot);
          }
        } catch (error) {
          console.error("Не удалось сохранить снимок в локальную историю", error);
        }
      })();
    };

    const completeMatch = (nextMatch: ReportMatch, targetPath: DashboardRoute, parsedData: SnapshotInput) => {
      setSelectedFile((current) => (current ? { ...current, match: nextMatch } : current));
      setStatus("matched");
      persistSnapshot(nextMatch, parsedData);
      timersRef.current = [window.setTimeout(() => navigate(targetPath), 180)];
    };

    try {
      const detected = await detectReportType(file);
      if (detected.type === "unknown" || detected.type === "ambiguous") {
        setStatus("ambiguous");
        return;
      }

      if (detected.type === "tessa") {
        const tessaParsed = await readTessaReportFile(file);
        if (tessaParsed.quality.missingRequiredColumns.length > 0) {
          setStatus("ambiguous");
          return;
        }
        setPendingDashboardData("/tessa", tessaParsed as TessaImportResult);
        completeMatch(reportLabel(detected.type), "/tessa", tessaParsed as TessaImportResult);
        return;
      }

      if (detected.type === "ssz") {
        const sszParsed = await readWorkbookFile(file);
        if (sszParsed.errors.length > 0 || sszParsed.operationRows.length === 0) {
          setStatus("ambiguous");
          return;
        }
        setPendingDashboardData("/ssz", sszParsed as ImportedReport);
        completeMatch(reportLabel(detected.type), "/ssz", sszParsed as ImportedReport);
        return;
      }

      if (detected.type === "print") {
        const printParsed = await readPrintReportFile(file);
        if (printParsed.quality.missingRequiredColumns.length > 0 || printParsed.jobs.length === 0) {
          setStatus("ambiguous");
          return;
        }
        setPendingDashboardData("/print", printParsed as PrintImportResult);
        completeMatch(reportLabel(detected.type), "/print", printParsed as PrintImportResult);
        return;
      }

      const supportParsed = await readSupportReportFile(file);
      if (supportParsed.quality.missingRequiredColumns.length > 0 || supportParsed.tickets.length === 0) {
        setStatus("ambiguous");
        return;
      }
      setPendingDashboardData("/support", supportParsed as SupportImportResult);
      completeMatch(reportLabel(detected.type), "/support", supportParsed as SupportImportResult);
    } catch (error) {
      console.error("Не удалось обработать файл отчета", error);
      setStatus("error");
      setErrorMessage("Не удалось обработать файл. Проверьте формат и структуру отчета.");
    }
  }

  return (
    <PageShell>
      <DashboardHeader
        className="mb-3"
        title={
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <FileSpreadsheet className="h-6 w-6" strokeWidth={2.3} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-slate-900 md:text-3xl">Рапорт</span>
              <span className="mt-1 block text-sm font-bold text-raport-primary">Excel докладывает главное</span>
            </div>
          </div>
        }
        description="Загрузите Excel или CSV-отчет — Рапорт определит тип, откроет нужный дашборд и покажет ключевые показатели, отклонения и зоны внимания."
      />

      <div className="grid gap-4">
        <FileDropZone
          title="Перетащите отчет сюда"
          hint="Нажмите на область, чтобы выбрать файл."
          accept=".csv,.xls,.xlsx"
          inputId={LANDING_FILE_INPUT_ID}
          selectedFileName={selectedFile?.name}
          onFileSelect={handleFileSelect}
          onDragStateChange={(isDragging) => setStatus(isDragging ? "dragging" : "idle")}
          showPickButton={false}
          className="raport-dropzone-pulse flex min-h-[430px] flex-col justify-center p-8 md:min-h-[470px] md:p-10 [&>h2]:text-3xl md:[&>h2]:text-4xl [&>p]:mx-auto [&>p]:max-w-2xl [&>p]:text-base [&>svg:first-of-type]:mb-5 [&>svg:first-of-type]:h-16 [&>svg:first-of-type]:w-16 hover:bg-raport-primary/5 hover:border-raport-primary transition-colors duration-300"
          footer={
            <div className="mt-6 grid justify-items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {statusChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex min-h-7 items-center rounded-full border border-raport-action-border bg-raport-action-bg px-3 py-1 text-xs font-bold text-raport-primary"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
              <div className="grid justify-items-center gap-1 text-sm font-semibold text-raport-muted">
                <p>Подходит для Excel и CSV-файлов до 20 Мб, обработка идет в браузере</p>
                <p>Рапорт сам определит отчет: ССЗ, Tessa, Печать или Техподдержка</p>
              </div>
            </div>
          }
        />

        <HistoryManager />

        {errorMessage ? <ErrorState message={errorMessage} /> : null}
      </div>
    </PageShell>
  );
}

