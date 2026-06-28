import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { Button } from "../shadcn/button";
import { cn } from "../cn";

type FileDropZoneProps = {
  title?: string;
  hint?: string;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  inputId?: string;
  selectedFileName?: string;
  className?: string;
  showPickButton?: boolean;
  footer?: ReactNode;
  onDragStateChange?: (isDragging: boolean) => void;
};

export function FileDropZone({
  title = "Загрузите файл отчета",
  hint = "Перетащите CSV/XLS/XLSX сюда или выберите файл вручную.",
  onFileSelect,
  accept = ".csv,.xls,.xlsx",
  inputId,
  selectedFileName,
  className,
  showPickButton = true,
  footer,
  onDragStateChange,
}: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    onDragStateChange?.(false);
    onFileSelect(event.dataTransfer.files?.item(0) ?? null);
  }

  return (
    <section
      className={cn(
        "cursor-pointer rounded-card border-2 border-dashed border-raport-border bg-raport-surface p-6 text-center shadow-card transition-colors hover:border-raport-primary/50",
        dragActive && "raport-dropzone-active border-raport-primary bg-raport-action-bg",
        className,
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
        onDragStateChange?.(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        setDragActive(false);
        onDragStateChange?.(false);
      }}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          onFileSelect(event.target.files?.item(0) ?? null);
          event.currentTarget.value = "";
        }}
      />
      <UploadCloud className="mx-auto mb-3 h-10 w-10 text-raport-primary" strokeWidth={2} />
      <h2 className="text-xl font-bold text-raport-text">{title}</h2>
      <p className="mt-2 text-sm text-raport-muted">{hint}</p>
      {selectedFileName ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-raport-border bg-raport-surface-soft px-3 py-1 text-xs font-semibold text-raport-muted">
          <FileSpreadsheet className="h-4 w-4" strokeWidth={2} />
          {selectedFileName}
        </p>
      ) : null}
      {showPickButton ? (
        <div className="mt-4 flex justify-center">
          <Button onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Выбрать файл</Button>
        </div>
      ) : null}
      {footer ? <div className="mt-4 text-sm text-raport-muted">{footer}</div> : null}
    </section>
  );
}
