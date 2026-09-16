export function toIsoUtcString(date: Date = new Date()): string {
  return date.toISOString();
}

export function isDateOverdue(targetDate: Date | string, currentDate: Date = new Date()): boolean {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  return target.getTime() < currentDate.getTime();
}

export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
