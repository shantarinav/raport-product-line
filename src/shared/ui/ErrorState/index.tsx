import { CircleX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../shadcn/alert";

type ErrorStateProps = {
  title?: string;
  message: string;
  className?: string;
};

export function ErrorState({ title = "Ошибка", message, className }: ErrorStateProps) {
  return (
    <Alert className={className}>
      <div className="flex items-start gap-2">
        <CircleX className="mt-0.5 h-4 w-4 text-[var(--raport-danger)]" strokeWidth={2} />
        <div>
          <AlertTitle className="text-[var(--raport-danger)]">{title}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
