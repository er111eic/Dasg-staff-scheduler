function timeRange(value) {
  const matches = [...String(value).matchAll(/(\d{1,2})[:：](\d{2})/g)];
  if (matches.length !== 2) return null;
  const [start, end] = matches.map((match) => Number(match[1]) * 60 + Number(match[2]));
  return end > start ? [start, end] : null;
}

export function findConflictingSlots(assignments, excludedRoles = []) {
  const entries = Object.entries(assignments).filter(([key, person]) =>
    person && !key.startsWith("event__") && !excludedRoles.includes(key.split("__").at(-1)),
  );
  const conflicts = new Set();
  for (let i = 0; i < entries.length; i += 1) {
    const [key, person] = entries[i];
    const [date, time] = key.split("__");
    const range = timeRange(time);
    for (let j = i + 1; j < entries.length; j += 1) {
      const [otherKey, otherPerson] = entries[j];
      const [otherDate, otherTime] = otherKey.split("__");
      if (date !== otherDate || person !== otherPerson) continue;
      const otherRange = timeRange(otherTime);
      const overlaps = range && otherRange
        ? range[0] < otherRange[1] && otherRange[0] < range[1]
        : time === otherTime;
      if (overlaps) {
        conflicts.add(key);
        conflicts.add(otherKey);
      }
    }
  }
  return conflicts;
}
