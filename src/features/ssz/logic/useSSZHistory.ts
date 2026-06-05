import { useEffect, useMemo, useState } from "react";
import { getSnapshots, type DashboardSnapshot } from "../../../shared/lib/historyDB";

type SszHistoryState = {
  history: DashboardSnapshot[];
  isLoading: boolean;
};

function isSszTrendSnapshot(snapshot: DashboardSnapshot): boolean {
  return snapshot.grain === "month" && snapshot.coverage?.isTrendReady === true;
}

export function useSSZHistory(currentPeriodStart?: string): {
  history: DashboardSnapshot[];
  previousSnapshot: DashboardSnapshot | null;
  isLoading: boolean;
} {
  const [state, setState] = useState<SszHistoryState>({
    history: [],
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    setState((current) => ({ ...current, isLoading: true }));

    getSnapshots("ssz")
      .then((snapshots) => {
        if (!isMounted) return;
        const history = snapshots
          .filter(isSszTrendSnapshot)
          .sort((left, right) => left.period.from.localeCompare(right.period.from));

        setState({
          history,
          isLoading: false,
        });
      })
      .catch((error) => {
        console.error("Не удалось загрузить локальную историю ССЗ", error);
        if (!isMounted) return;
        setState({ history: [], isLoading: false });
      });

    return () => {
      isMounted = false;
    };
  }, [currentPeriodStart]);

  const previousSnapshot = useMemo(() => {
    if (!currentPeriodStart) return null;
    return (
      state.history
        .filter((snapshot) => snapshot.period.from < currentPeriodStart)
        .sort((left, right) => right.period.from.localeCompare(left.period.from))[0] ?? null
    );
  }, [currentPeriodStart, state.history]);

  return {
    history: state.history,
    previousSnapshot,
    isLoading: state.isLoading,
  };
}