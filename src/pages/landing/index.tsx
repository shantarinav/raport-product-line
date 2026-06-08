import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClipboardCheck, ClipboardList, FileSpreadsheet, Headphones, Printer, SearchCheck, ShieldCheck } from "lucide-react";
import { Button } from "../../shared/ui/shadcn/button";
import { Badge } from "../../shared/ui/shadcn/badge";
import { DashboardHeader, ErrorState, FileDropZone, FilterStatusBar, IconLabel, PageShell } from "../../shared/ui";
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
const SUPPORTED_REPORTS = [
  {
    id: "ssz",
    title: "ССЗ",
    subtitle: "Качество оформления сменно-суточных заданий",
    description:
      "Помогает увидеть, насколько работы оформляются по технологии. Показывает общую долю по нормо-часам, проблемные цеха и операции, а также динамику по месяцам.",
    Icon: ClipboardList,
  },
  {
    id: "tessa",
    title: "Tessa",
    subtitle: "Исполнительская дисциплина",
    description:
      "Показывает, где согласования застряли в работе, кто отвечает за просрочки и какие задания требуют внимания в ближайшие дни.",
    Icon: ClipboardCheck,
  },
  {
    id: "print",
    title: "Печать",
    subtitle: "Контроль печати",
    description:
      "Помогает контролировать расходы на печать. Находит цветную и одностороннюю печать, избыточные задания, личные материалы и показывает оценку затрат.",
    Icon: Printer,
  },
  {
    id: "support",
    title: "Техподдержка",
    subtitle: "SLA закрытых заявок",
    description:
      "Показывает выполнение SLA по закрытым заявкам, темы с наибольшими нарушениями, длинный хвост просрочек и проблемы качества данных.",
    Icon: Headphones,
  },
];

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
  if (type === "ssz") return "ССЗ";
  if (type === "tessa") return "Tessa";
  if (type === "print") return "Print";
  return "Техподдержка";
}

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<LandingStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<SelectedFileState | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [activeReportIndex, setActiveReportIndex] = useState(0);
  const timersRef = useRef<number[]>([]);
  const activeReport = SUPPORTED_REPORTS[activeReportIndex] ?? SUPPORTED_REPORTS[0];
  const ActiveReportIcon = activeReport.Icon;

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
              <span className="mt-1 block text-sm font-bold text-[var(--raport-primary)]">Excel докладывает главное</span>
            </div>
          </div>
        }
        description="Загрузите Excel или CSV-отчет — Рапорт определит тип, откроет нужный дашборд и покажет ключевые показатели, отклонения и зоны внимания."
        actions={<Button onClick={openFilePicker}>Загрузить отчет</Button>}
      />

      <div className="grid gap-4">
        <FilterStatusBar title="Готовность" chips={statusChips} />

        <FileDropZone
          title="Перетащите отчет сюда"
          hint="Рапорт сам определит тип отчета и откроет нужный дашборд."
          accept=".csv,.xls,.xlsx"
          inputId={LANDING_FILE_INPUT_ID}
          selectedFileName={selectedFile?.name}
          onFileSelect={handleFileSelect}
          onDragStateChange={(isDragging) => setStatus(isDragging ? "dragging" : "idle")}
          showPickButton={false}
          className="min-h-[260px] md:min-h-[320px]"
          footer={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <IconLabel Icon={ShieldCheck}>Локально: файл не отправляется на сервер</IconLabel>
              <IconLabel Icon={SearchCheck}>Автоматически: тип отчета определяется по структуре</IconLabel>
              <Badge variant="secondary">CSV</Badge>
              <Badge variant="secondary">XLS</Badge>
              <Badge variant="secondary">XLSX</Badge>
              <Badge variant="secondary">до 20 Мб</Badge>
            </div>
          }
        />

        <div className="grid min-w-0 gap-3 overflow-hidden rounded-[var(--raport-radius-card)] border border-[var(--raport-border)] bg-[var(--raport-surface)] p-3 shadow-[var(--raport-shadow-card)] lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
          <div className="grid content-start gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white text-[var(--raport-primary)]">
                <ActiveReportIcon className="h-6 w-6" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--raport-muted)]">Что умеет Рапорт</p>
                <h2 className="mt-1 text-xl font-extrabold text-[var(--raport-text)]">{activeReport.title}</h2>
                <p className="mt-1 text-sm font-bold text-[var(--raport-primary)]">{activeReport.subtitle}</p>
              </div>
            </div>

            <p className="max-w-3xl text-sm font-semibold leading-6 text-[var(--raport-muted)]">{activeReport.description}</p>
          </div>

          <div className="grid min-w-0 gap-2 overflow-hidden rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] p-2">
            {SUPPORTED_REPORTS.map(({ id, title, subtitle, Icon }, index) => (
              <button
                key={id}
                type="button"
                className={`flex min-w-0 items-center gap-3 overflow-hidden rounded-[var(--raport-radius-control)] border px-3 py-2 text-left transition-colors ${
                  activeReportIndex === index
                    ? "border-[var(--raport-primary)] bg-white text-[var(--raport-primary)] shadow-sm"
                    : "border-transparent text-[var(--raport-muted)] hover:bg-white/70 hover:text-[var(--raport-text)]"
                }`}
                onClick={() => setActiveReportIndex(index)}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="block truncate text-sm font-extrabold">{title}</span>
                  <span className="block truncate text-xs font-semibold">{subtitle}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <HistoryManager />

        {errorMessage ? <ErrorState message={errorMessage} /> : null}
      </div>
    </PageShell>
  );
}

