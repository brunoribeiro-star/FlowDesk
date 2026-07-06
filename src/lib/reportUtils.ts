export type ReportPeriod = "30d" | "90d" | "180d" | "365d" | "all";

export function getPeriodWindowStart(period: string): Date | null {
  const now = new Date();
  switch (period as ReportPeriod) {
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d;
    }
    case "180d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 180);
      return d;
    }
    case "365d": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case "all":
    default:
      return null;
  }
}

export function roundHorasToMinuto(horas: number): number {
  return Math.round(horas * 60) / 60;
}

export function secondsToHoras(seconds: number): number {
  return roundHorasToMinuto(seconds / 3600);
}

export function getMonthCountForPeriod(period: string): number {
  switch (period as ReportPeriod) {
    case "30d":  return 2;
    case "90d":  return 3;
    case "180d": return 6;
    case "365d": return 12;
    case "all":  return 24;
    default:     return 12;
  }
}
