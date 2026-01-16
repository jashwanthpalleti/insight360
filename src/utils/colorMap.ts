// src/utils/colorMap.ts
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Map flowIndex (0–1) to blue→red gradient
export function flowToRGB(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.25) {
    const k = x / 0.25;
    return [0, lerp(0, 1, k), 1]; // blue→cyan
  } else if (x < 0.5) {
    const k = (x - 0.25) / 0.25;
    return [0, 1, lerp(1, 0, k)]; // cyan→green
  } else if (x < 0.75) {
    const k = (x - 0.5) / 0.25;
    return [lerp(0, 1, k), 1, 0]; // green→yellow
  } else {
    const k = (x - 0.75) / 0.25;
    return [1, lerp(1, 0, k), 0]; // yellow→red
  }
}
