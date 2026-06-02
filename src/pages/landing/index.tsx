import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Button } from "../../shared/ui/shadcn/button";
import { Badge } from "../../shared/ui/shadcn/badge";
import { DashboardHeader, ErrorState, FileDropZone, FilterStatusBar, IconLabel, PageShell } from "../../shared/ui";
import { readWorkbookFile } from "../../features/ssz/import/readWorkbook";
import type { ImportedReport } from "../../features/ssz/import/types";
import { readTessaReportFile } from "../../features/tessa/import/readReportFile";
import type { TessaImportResult } from "../../features/tessa/types";
import { readPrintReportFile } from "../../features/print/import/readReportFile";
import type { PrintImportResult } from "../../features/print/types";
import { setPendingDashboardData, type DashboardRoute } from "../../shared/pendingDashboardFile";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = [".csv", ".xls", ".xlsx"];
const LANDING_FILE_INPUT_ID = "landing-file-input";

type LandingStatus = "idle" | "dragging" | "reading" | "detecting" | "matched" | "ambiguous" | "error";
type ReportMatch = "ССЗ" | "Tessa" | "Print";

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
  if (status === "dragging") return "Перетаскивание";
  if (status === "reading") return "Чтение файла";
  if (status === "detecting") return "Определение отчета";
  if (status === "matched") return "Отчет найден";
  if (status === "ambiguous") return "Отчет не определен";
  if (status === "error") return "Ошибка";
  return "Ожидание файла";
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

    return [{ label: statusText(status) }];
  }, [status, statusNotice]);

  function clearTimers() {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }

  function openFilePicker() {
    const input = document.getElementById(LANDING_FILE_INPUT_ID) as HTMLInputElement | null;
    input?.click();
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

    const completeMatch = (nextMatch: ReportMatch, targetPath: DashboardRoute) => {
      setSelectedFile((current) => (current ? { ...current, match: nextMatch } : current));
      setStatus("matched");
      timersRef.current = [window.setTimeout(() => navigate(targetPath), 180)];
    };

    try {
      const tessaParsed = await readTessaReportFile(file);
      const sszParsed = await readWorkbookFile(file);
      const printParsed = await readPrintReportFile(file);

      const isTessa = tessaParsed.quality.missingRequiredColumns.length === 0;
      const isSsz = sszParsed.errors.length === 0 && sszParsed.operationRows.length > 0;
      const isPrint = printParsed.quality.missingRequiredColumns.length === 0 && printParsed.jobs.length > 0;

      if (isTessa && !isSsz && !isPrint) {
        setPendingDashboardData("/tessa", tessaParsed as TessaImportResult);
        completeMatch("Tessa", "/tessa");
        return;
      }

      if (isSsz && !isTessa && !isPrint) {
        setPendingDashboardData("/ssz", sszParsed as ImportedReport);
        completeMatch("ССЗ", "/ssz");
        return;
      }

      if (isPrint && !isSsz && !isTessa) {
        setPendingDashboardData("/print", printParsed as PrintImportResult);
        completeMatch("Print", "/print");
        return;
      }

      setStatus("ambiguous");
    } catch {
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
              <span className="mt-1 block text-sm font-bold text-[var(--raport-primary)]">Excel докладывает главное</span>
            </div>
          </div>
        }
        description="Загрузите Excel или CSV-отчет — Рапорт построит дашборд и покажет ключевые показатели, отклонения и зоны внимания."
        actions={<Button onClick={openFilePicker}>Загрузить отчет</Button>}
      />

      <div className="grid gap-4">
        <FilterStatusBar title="Текущий статус" chips={statusChips} />

        <FileDropZone
          title="Загрузите файл отчета"
          hint="Перетащите CSV/XLS/XLSX сюда."
          accept=".csv,.xls,.xlsx"
          inputId={LANDING_FILE_INPUT_ID}
          selectedFileName={selectedFile?.name}
          onFileSelect={handleFileSelect}
          onDragStateChange={(isDragging) => setStatus(isDragging ? "dragging" : "idle")}
          showPickButton={false}
          className="min-h-[280px]"
          footer={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <IconLabel Icon={ShieldCheck}>Файл обрабатывается локально в браузере</IconLabel>
              <Badge variant="secondary">CSV</Badge>
              <Badge variant="secondary">XLS</Badge>
              <Badge variant="secondary">XLSX</Badge>
              <Badge variant="secondary">до 20 Мб</Badge>
            </div>
          }
        />

        {errorMessage ? <ErrorState message={errorMessage} /> : null}
      </div>
    </PageShell>
  );
}

