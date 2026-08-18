export function calculateScheduleTimes(
  leadCount: number,
  startTime: Date,
  delaySeconds: number,
  hourlyLimit: number
): Date[] {
  const scheduleTimes: Date[] = [];
  const delayMs = Math.max(delaySeconds, 1) * 1000;
  const limit = Math.max(hourlyLimit, 1);

  const initialStartMs = Math.max(startTime.getTime(), Date.now());
  let currentHourStartMs = initialStartMs;
  let sentInCurrentHour = 0;
  let lastAssignedMs = initialStartMs;

  for (let i = 0; i < leadCount; i++) {
    if (sentInCurrentHour >= limit) {
      // Advance to the next 1-hour boundary from currentHourStartMs
      currentHourStartMs += 3600 * 1000;
      lastAssignedMs = currentHourStartMs;
      sentInCurrentHour = 0;
    }

    const targetMs = Math.max(
      lastAssignedMs,
      currentHourStartMs + sentInCurrentHour * delayMs
    );

    scheduleTimes.push(new Date(targetMs));
    lastAssignedMs = targetMs + delayMs;
    sentInCurrentHour++;
  }

  return scheduleTimes;
}
