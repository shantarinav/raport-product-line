const textCache = new WeakMap<File, Promise<string>>();
const arrayBufferCache = new WeakMap<File, Promise<ArrayBuffer>>();

export function readFileText(file: File): Promise<string> {
  const cached = textCache.get(file);
  if (cached) return cached;

  const next = file.text();
  textCache.set(file, next);
  return next;
}

export function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  const cached = arrayBufferCache.get(file);
  if (cached) return cached;

  const next =
    typeof file.arrayBuffer === "function"
      ? file.arrayBuffer()
      : new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(file);
        });

  arrayBufferCache.set(file, next);
  return next;
}
