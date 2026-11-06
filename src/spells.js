export const BREATH_COOLDOWN = 5;
export const BREATH_RANGE = 175;
export const TORNADO_COOLDOWN = 8;
export const TORNADO_DURATION = 3;
export const TORNADO_RADIUS = 90;
export const RING_COOLDOWN = 10;
export const RING_RADIUS = 95;
export const RING_ACTIVE = 2.5;

export function ringHits(origin, target, age, size = 1) {
  const radius = RING_RADIUS * size * Math.min(1, age / .8);
  return age <= RING_ACTIVE && Math.hypot(target.x - origin.x, target.y - origin.y) <= radius + target.size;
}

export function breathHits(origin, angle, target, range = BREATH_RANGE, area = 1) {
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const forward = dx * Math.cos(angle) + dy * Math.sin(angle);
  if (forward < 0 || forward > range + target.size) return false;
  const side = Math.abs(dy * Math.cos(angle) - dx * Math.sin(angle));
  return side <= (10 + forward * 0.25) * area + target.size;
}

export function makeTornadoVolley(player, angle, count, speed = 1) {
  return Array.from({ length: count }, (_, i) => {
    const offset = i - (count - 1) / 2, direction = angle + offset * .22;
    const dx = Math.cos(direction), dy = Math.sin(direction);
    return { x: player.x + dx * 18 - Math.sin(angle) * offset * 8,
      y: player.y + dy * 18 + Math.cos(angle) * offset * 8,
      vx: dx * 85 * speed, vy: dy * 85 * speed, age: 0, tick: 0 };
  });
}

export function turnToward(angle, target, dt) {
  const delta = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
  return angle + delta * (1 - Math.exp(-12 * dt));
}

export function pullIntoTornado(enemy, tornado, dt, radius = TORNADO_RADIUS) {
  const dx = tornado.x - enemy.x, dy = tornado.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  if (distance > radius || distance === 0) return distance;
  const step = Math.min(distance, (110 + (radius - distance) * 1.2) * dt);
  enemy.x += dx / distance * step;
  enemy.y += dy / distance * step;
  return distance - step;
}
