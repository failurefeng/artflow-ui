export function isRunningInCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as unknown as { Capacitor?: unknown }).Capacitor !== undefined;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function getPlatform(): 'capacitor' | 'web' {
  if (isRunningInCapacitor()) return 'capacitor';
  return 'web';
}
