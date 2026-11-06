import characterAtlasUrl from './assets/characters_atlas.png';
import burningUrl from './assets/status-burning_sheet.png';
import burningData from './assets/status-burning_sheet.json';

const pixel = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};

function hash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return (n ^ (n >>> 16)) >>> 0;
}

export function drawGround(ctx, cx, cy, width, height) {
  ctx.fillStyle = '#203b35';
  ctx.fillRect(0, 0, width, height);
  const left = Math.floor((cx - width / 2) / 16) - 1;
  const top = Math.floor((cy - height / 2) / 16) - 1;
  for (let ty = top; ty < top + Math.ceil(height / 16) + 3; ty++) {
    for (let tx = left; tx < left + Math.ceil(width / 16) + 3; tx++) {
      const h = hash(tx, ty), x = Math.round(tx * 16 - cx + width / 2), y = Math.round(ty * 16 - cy + height / 2);
      if (h % 3 === 0) {
        pixel(ctx, x + 1, y + 5, 9, 4, '#25443a');
        pixel(ctx, x + 4, y + 3, 6, 2, '#29483d');
        pixel(ctx, x + 9, y + 9, 4, 2, '#25443a');
      }
      if (h % 4 === 0) {
        pixel(ctx, x + 3, y + 12, 5, 2, '#1b342f');
        pixel(ctx, x + 8, y + 10, 3, 2, '#1b342f');
      }
      if (h % 6 === 0) {
        pixel(ctx, x + 4, y + 10, 1, 4, '#476d48');
        pixel(ctx, x + 5, y + 8, 1, 4, '#5d8653');
        pixel(ctx, x + 7, y + 9, 1, 5, '#406c49');
        pixel(ctx, x + 8, y + 11, 1, 3, '#79a264');
      }
      if (h % 17 === 0) {
        pixel(ctx, x + 2, y + 11, 10, 2, '#182f2b');
        pixel(ctx, x + 4, y + 7, 7, 4, '#586e62');
        pixel(ctx, x + 5, y + 6, 5, 2, '#829789');
        pixel(ctx, x + 9, y + 9, 2, 2, '#3d514b');
      }
      if (h % 41 === 0) {
        pixel(ctx, x + 2, y + 11, 12, 2, '#172f2b');
        pixel(ctx, x + 3, y + 7, 4, 4, '#31594a');
        pixel(ctx, x + 5, y + 4, 5, 7, '#3b684e');
        pixel(ctx, x + 9, y + 6, 4, 5, '#426f50');
        pixel(ctx, x + 6, y + 4, 2, 2, '#6f985e');
      }
      if (h % 53 === 0) {
        pixel(ctx, x + 8, y + 9, 1, 4, '#729156');
        pixel(ctx, x + 6, y + 6, 5, 3, '#edca79');
        pixel(ctx, x + 7, y + 5, 3, 2, '#fff0ab');
        pixel(ctx, x + 7, y + 7, 1, 1, '#bb8066');
      }
      if (h % 79 === 0) {
        pixel(ctx, x + 5, y + 8, 1, 4, '#668655');
        pixel(ctx, x + 8, y + 8, 1, 4, '#668655');
        pixel(ctx, x + 5, y + 6, 2, 2, '#a5aed4');
        pixel(ctx, x + 8, y + 6, 2, 2, '#d4b2d8');
        pixel(ctx, x + 6, y + 5, 1, 1, '#f3daac');
      }
    }
  }
}

const characterAtlas = new Image();
characterAtlas.src = characterAtlasUrl;
const burningImage = new Image();
burningImage.src = burningUrl;
const burningFrames = Object.values(burningData.frames).map(({ frame }) => frame);
const burningPivot = burningData.meta.pixelfx.pivot;
const burningFps = burningData.meta.pixelfx.fps;
const CELL_W = 180, CELL_H = 160;
const ENEMY_ROWS = [1, 8, 3, 4, 5, 6, 7, 2, 9, 10];

function drawFrame(ctx, x, y, row, frame, facing = 1) {
  if (!characterAtlas.complete || !characterAtlas.naturalWidth) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing, 1);
  ctx.drawImage(characterAtlas, frame * CELL_W, row * CELL_H, CELL_W, CELL_H,
    -CELL_W / 4, -(CELL_H - 10) / 2, CELL_W / 2, CELL_H / 2);
  ctx.restore();
}

export function drawHero(ctx, x, y, player, time) {
  const frame = player.casting
    ? 4 + Math.min(3, Math.floor(player.casting * 4))
    : player.attack > 0
      ? 4 + Math.min(3, Math.floor((.28 - player.attack) * 14))
      : player.moving ? Math.floor(time * 10) % 4 : 0;
  ctx.save();
  if (player.inv > 0 && Math.floor(player.inv * 20) % 2 === 0) ctx.globalAlpha = .5;
  drawFrame(ctx, x, y, 0, frame, Math.cos(player.dir) < 0 ? -1 : 1);
  ctx.restore();
  pixel(ctx, x - 11, y + 19, 22, 2, '#19393c');
  pixel(ctx, x - 11, y + 19, 22 * (1 - player.dashCd / 1.2), 2, '#79dfd0');
}

export function drawEnemy(ctx, x, y, enemy) {
  const frame = enemy.attack > 0
    ? 4 + Math.min(3, Math.floor((.44 - enemy.attack) * 9))
    : Math.floor(enemy.phase * 2) % 4;
  ctx.save();
  if (enemy.flash > 0) ctx.globalAlpha = .65;
  drawFrame(ctx, x, y, ENEMY_ROWS[enemy.type], frame, enemy.facing ?? 1);
  ctx.restore();
  const size = enemy.size / 9, age = enemy.burnAge || 0;
  if (enemy.scorched) {
    pixel(ctx, x - enemy.size * .5, y - enemy.size * .7, 3 * size, 2 * size, '#3b2329');
    pixel(ctx, x + enemy.size * .22, y - enemy.size * 1.2, 2 * size, 3 * size, '#4b2929');
  }
  if (enemy.burn > 0 || enemy.smolder > 0) {
    const fire = Math.min(1, (enemy.burn || 0) / .65, age / .12), smoke = Math.min(1, (enemy.burn || 0) / .4 + (enemy.smolder || 0));
    if (fire > 0 && burningImage.complete && burningImage.naturalWidth) {
      const f = burningFrames[Math.floor(age * burningFps) % burningFrames.length];
      const scale = Math.min(2.5, 1.5 * (enemy.size / 7) ** .5);
      ctx.save();
      ctx.globalAlpha = fire * .85;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(burningImage, f.x, f.y, f.w, f.h,
        Math.round(x - burningPivot[0] * scale), Math.round(y - burningPivot[1] * scale),
        f.w * scale, f.h * scale);
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = .5 * smoke;
    for (let i = 0; i < 5; i++) {
      const lift = (age * 16 + i * 11) % (22 * size), side = Math.sin(age * 5 + i * 2.7) * 5 * size;
      pixel(ctx, x + (i - 2) * enemy.size * .25 + side, y - enemy.size * 1.4 - lift,
        Math.max(1, 2 * size), Math.max(1, 2 * size), i % 2 ? '#675c63' : '#87796f');
    }
    ctx.restore();
  }
  if (enemy.hp < enemy.maxHp || enemy.type === 9) {
    const width = Math.max(20, enemy.size * 2.5);
    const barY = y - (enemy.type === 9 ? 78 : enemy.type === 3 ? 52 : 45);
    pixel(ctx, x - width / 2, barY, width, 4, '#152a2c');
    pixel(ctx, x - width / 2, barY, width * Math.max(0, enemy.lagHp / enemy.maxHp), 3, '#e8b46e');
    pixel(ctx, x - width / 2, barY, width * Math.max(0, enemy.hp / enemy.maxHp), 3,
      enemy.type === 9 ? '#ee6962' : '#bcdf8a');
  }
}
