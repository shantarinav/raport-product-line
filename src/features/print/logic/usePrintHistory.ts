import { useEffect, useState } from "react";
import { getSnapshots, type DashboardSnapshot } from "../../../shared/lib/historyDB";
import { useTrendsEnabled } from "../../../shared/lib/trendSettings";

type PrintHistoryState = {
  history: DashboardSnapshot[];
  isLoading: boolean;
};

function isPrintTrendSnapshot(snapshot: DashboardSnapshot): boolean {
  return snapshot.grain === "month" && snapshot.coverage?.isTrendReady === true;
}

export function usePrintHistory(): PrintHistoryState {
  const [trendsEnabled] = useTrendsEnabled();
  const [state, setState] = useState<PrintHistoryState>({
    history: [],
    isLoading: false,
  });

  useEffect(() => {
    if (!trendsEnabled) {
      setState({ history: [], isLoading: false });
      return;
    }

    let isMounted = true;

    setState((current) => ({ ...current, isLoading: true }));

    getSnapshots("print")
      .then((snapshots) => {
        if (!isMounted) return;
        setState({
          history: snapshots
            .filter(isPrintTrendSnapshot)
            .sort((left, right) => left.period.from.localeCompare(right.period.from)),
          isLoading: false,
        });
      })
      .catch((error) => {
        console.error("Не удалось загрузить локальную историю Print", error);
        if (!isMounted) return;
        setState({ history: [], isLoading: false });
      });

    return () => {
      isMounted = false;
    };
  }, [trendsEnabled]);

  return state;
}
