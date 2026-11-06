export function pullDrop(drop, player, dt, magnet, vacuum) {
  const dx = player.x - drop.x, dy = player.y - drop.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= magnet && !vacuum) return distance;
  if (distance === 0) return 0;
  const speed = vacuum ? Math.max(220, distance * 4) : 150;
  const step = Math.min(distance, speed * dt);
  drop.x += dx / distance * step;
  drop.y += dy / distance * step;
  return distance - step;
}

export function drinkPotion(player) {
  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.45);
  return player.hp - before;
}
