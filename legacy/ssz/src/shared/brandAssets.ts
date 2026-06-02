export function brandAssetPath(path: string): string {
  const baseUrl = import.meta.env.BASE_URL || "/";
  return `${baseUrl}${path.replace(/^\/+/, "")}`;
}

export function brandIconPath(name: string): string {
  return brandAssetPath(`assets/brand/icons/${name}`);
}
