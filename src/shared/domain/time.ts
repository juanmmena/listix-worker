const MILLISECONDS_PER_DAY = 86_400_000;

export function earliest(first: Date, second: Date): Date {
  return first.getTime() <= second.getTime() ? first : second;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MILLISECONDS_PER_DAY);
}

export function isAtOrAfter(candidate: Date, reference: Date): boolean {
  return candidate.getTime() >= reference.getTime();
}
