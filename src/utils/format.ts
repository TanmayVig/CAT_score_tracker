export function formatAttemptDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function getAnalysedPercentage(items: Array<{ analysed: boolean }>): number {
  if (items.length === 0) {
    return 0;
  }

  const analysedCount = items.filter((item) => item.analysed).length;
  return Math.round((analysedCount / items.length) * 100);
}
