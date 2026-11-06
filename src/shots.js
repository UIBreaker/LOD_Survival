export function makeVolley(player, angle, count, pierce, speed = 1, duration = 1) {
  return Array.from({ length: count }, (_, i) => {
    const offset = i - (count - 1) / 2;
    const shotAngle = angle + offset * 0.18;
    const forwardX = Math.cos(shotAngle), forwardY = Math.sin(shotAngle);
    const sideX = -Math.sin(angle) * offset * 6, sideY = Math.cos(angle) * offset * 6;
    return { x: player.x + forwardX * 10 + sideX, y: player.y + forwardY * 10 + sideY,
      vx: forwardX * 190 * speed, vy: forwardY * 190 * speed, life: 1.45 * duration, age: 0, hits: new Set(), pierce };
  });
}
