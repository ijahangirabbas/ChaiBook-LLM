/**
 * Converts timestamp string (e.g., "01:23:45", "01:23.456", "02:15") into total seconds.
 */
export function timeStringToSeconds(timeStr: string): number {
  if (!timeStr) return 0;

  const normalized = timeStr.trim().replace(',', '.');
  const parts = normalized.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return Math.floor(hours * 3600 + minutes * 60 + seconds);
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Math.floor(minutes * 60 + seconds);
  } else {
    return Math.floor(parseFloat(normalized) || 0);
  }
}

/**
 * Formats total seconds into MM:SS or HH:MM:SS string format.
 */
export function secondsToTimeString(totalSeconds: number): string {
  const sec = Math.floor(totalSeconds % 60);
  const min = Math.floor((totalSeconds / 60) % 60);
  const hrs = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(min)}:${pad(sec)}`;
  }
  return `${pad(min)}:${pad(sec)}`;
}
