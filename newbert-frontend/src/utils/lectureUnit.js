export function lectureUnit(title) {
  const units = [...String(title || '').matchAll(/\bunit\s*(?:-|:|#|\.)?\s*([1-5])\b/gi)].map(m=>Number(m[1]));
  return units.length && new Set(units).size === 1 ? units[0] : null;
}
