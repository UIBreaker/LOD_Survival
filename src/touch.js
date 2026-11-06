export function joystickVector(x, y, radius = 38) {
  const distance = Math.hypot(x, y);
  const scale = Math.min(1, distance / radius);
  return distance ? { x: x / distance * scale, y: y / distance * scale } : { x: 0, y: 0 };
}
