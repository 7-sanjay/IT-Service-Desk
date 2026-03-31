const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const isWithinBusinessHoursIst = (date = new Date()) => {
  const t0 = new Date(date).getTime();
  if (!Number.isFinite(t0)) return false;
  const t = t0 + IST_OFFSET_MS;
  const msIntoDay = ((t % DAY_MS) + DAY_MS) % DAY_MS;
  const h = Math.floor(msIntoDay / HOUR_MS);
  const m = Math.floor((msIntoDay % HOUR_MS) / (60 * 1000));
  const minutes = h * 60 + m;
  return minutes >= 8 * 60 && minutes < 22 * 60;
};

// Counts only 08:00–22:00 IST time between two instants.
export const businessMsBetweenIst = (start, end) => {
  if (!start || !end) return 0;
  const s0 = new Date(start).getTime();
  const e0 = new Date(end).getTime();
  if (!Number.isFinite(s0) || !Number.isFinite(e0)) return 0;
  if (e0 <= s0) return 0;

  const s = s0 + IST_OFFSET_MS;
  const e = e0 + IST_OFFSET_MS;

  let total = 0;
  let dayStart = Math.floor(s / DAY_MS) * DAY_MS;
  while (dayStart < e) {
    const businessStart = dayStart + 8 * HOUR_MS;
    const businessEnd = dayStart + 22 * HOUR_MS;
    const overlapStart = Math.max(s, businessStart);
    const overlapEnd = Math.min(e, businessEnd);
    if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
    dayStart += DAY_MS;
  }
  return total;
};

export const formatMsShort = (ms) => {
  const abs = Math.max(0, Math.floor(ms));
  const totalMin = Math.floor(abs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
};

