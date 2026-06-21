export function createTaskQueue(concurrency = 1) {
  const maxConcurrency = Math.max(1, Math.floor(Number(concurrency) || 1));
  const pending = [];
  let active = 0;

  function drain() {
    while (active < maxConcurrency && pending.length > 0) {
      const next = pending.shift();
      active += 1;
      Promise.resolve()
        .then(next.task)
        .then(next.resolve, next.reject)
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  }

  return {
    run(task) {
      return new Promise((resolve, reject) => {
        pending.push({ task, resolve, reject });
        drain();
      });
    },
    stats() {
      return { concurrency: maxConcurrency, active, pending: pending.length };
    },
  };
}
