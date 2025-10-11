// A simple utility to format millisecond durations into a human-readable string.
export const formatDuration = (ms: number): string => {
    if (ms < 0) return '—';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    if (parts.length === 0 && totalSeconds > 0) {
        return '< 1m';
    }
    
    if (parts.length === 0) {
        return '0m';
    }

    return parts.join(' ');
};