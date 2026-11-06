import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFrame, createFx } from 'pixelfx';
import * as levelUpFx from 'pixelfx/fx/ui/level-up';
import * as chargedBreathFx from '../src/breath-fx.js';
import { BREATH_TIME, CHARGE_TIME, visualAlpha } from '../src/breath-fx.js';
import { pullDrop, drinkPotion } from '../src/pickups.js';
import { makeVolley } from '../src/shots.js';
import { joystickVector } from '../src/touch.js';
import { breathHits, turnToward, pullIntoTornado, makeTornadoVolley, ringHits, TORNADO_RADIUS, RING_ACTIVE } from '../src/spells.js';

assert.deepEqual(joystickVector(0, 0), { x: 0, y: 0 });
assert.deepEqual(joystickVector(19, 0), { x: .5, y: 0 });
assert.deepEqual(joystickVector(100, 0), { x: 1, y: 0 });
assert(Math.abs(Math.hypot(...Object.values(joystickVector(40, 40))) - 1) < 1e-9);
console.log('Touch joystick stays centered and caps movement speed');

for (const [name, expected] of [['fire-fireball', 36], ['fire-fire-breath', 45], ['fire-fire-tornado', 60], ['fire-fire-ring', 47], ['ui-level-up', 44], ['pickups-xp-orb', 22], ['pickups-potion', 72], ['pickups-chest-open', 138], ['status-burning', 15]]) {
  const png = readFileSync(new URL(`../src/assets/${name}_sheet.png`, import.meta.url));
  const data = JSON.parse(readFileSync(new URL(`../src/assets/${name}_sheet.json`, import.meta.url), 'utf8'));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  const frames = Object.values(data.frames);
  assert.equal(frames.length, expected);
  assert.equal(width, data.meta.size.w);
  assert.equal(height, data.meta.size.h);
  for (const { frame:f, duration } of frames) {
    assert(f.x >= 0 && f.y >= 0 && f.w > 0 && f.h > 0);
    assert(f.x + f.w <= width && f.y + f.h <= height);
    assert(duration > 0);
  }
  console.log(`${name}: ${frames.length} frames, ${width} × ${height}px`);
}

const fx = createFx({ ...levelUpFx, meta: { ...levelUpFx.meta, actor: 0 } }, { x: 100, y: 126, seed: 5 });
assert.equal(fx.options.actor, undefined);
for (let i = 0; i < 40; i++) fx.update(1 / 30);
const frame = createFrame(200, 162);
fx.draw(frame);
assert(frame.color.some(Boolean) || frame.light.some(Boolean));
for (let i = 0; i < 70; i++) fx.update(1 / 30);
assert(fx.done());
console.log('Level Up effect renders without actor and completes');

const drop = { x: 100, y: 0 }, player = { x: 0, y: 0 };
assert.equal(pullDrop(drop, player, 0.1, 30, false), 100);
assert.equal(drop.x, 100);
assert.equal(pullDrop(drop, player, 0.1, 30, true), 60);
assert.equal(drop.x, 60);
assert.equal(pullDrop(drop, player, 1, 30, true), 0);
assert.equal(drop.x, 0);
console.log('Global XP Orb pull reaches distant drops without overshooting');

const injured = { hp: 20, maxHp: 100 };
assert.equal(drinkPotion(injured), 45);
assert.equal(injured.hp, 65);
injured.hp = 90;
assert.equal(drinkPotion(injured), 10);
assert.equal(injured.hp, 100);
console.log('Potion restores 45% max HP without exceeding the cap');

const single = makeVolley({ x: 0, y: 0 }, 0, 1, 0);
const double = makeVolley({ x: 0, y: 0 }, 0, 2, 1);
assert.equal(single.length, 1);
assert.equal(double.length, 2);
assert(double[0].vy < 0 && double[1].vy > 0);
assert(double[0].y < 0 && double[1].y > 0);
assert(double.every(shot => shot.pierce === 1));
assert.notEqual(double[0].hits, double[1].hits);
assert.equal(makeVolley({ x: 0, y: 0 }, 0, 3, 0).length, 3);
const strongerShot = makeVolley({ x: 0, y: 0 }, 0, 1, 0, 1.02, 1.02 * 1.03)[0];
assert(strongerShot.vx > single[0].vx && strongerShot.life > single[0].life);
console.log('Extra bullet adds a separate projectile to each volley');

const caster = { x: 0, y: 0 };
assert(breathHits(caster, 0, { x: 80, y: 20, size: 7 }));
assert(!breathHits(caster, 0, { x: -20, y: 0, size: 7 }));
assert(!breathHits(caster, 0, { x: 80, y: 65, size: 7 }));
assert(breathHits(caster, 0, { x: 150, y: 40, size: 7 }));
assert(!breathHits(caster, 0, { x: 200, y: 0, size: 7 }));
assert(breathHits(caster, -Math.PI / 2, { x: 0, y: -80, size: 7 }));
assert(turnToward(Math.PI - .1, -Math.PI + .1, 1/60) > Math.PI - .1);
assert(!breathHits(caster,0,{x:80,y:0,size:7},30));
assert(!breathHits(caster,0,{x:80,y:38,size:7},100));
assert(breathHits(caster,0,{x:80,y:38,size:7},100,1.05));
console.log('Fire Breath hits only enemies in the aimed cone');

const vortex = { x: 0, y: 0 }, nearby = { x: 80, y: 0 }, distant = { x: TORNADO_RADIUS + 1, y: 0 };
assert(pullIntoTornado(nearby, vortex, .1) < 80);
assert(nearby.x < 80);
assert.equal(pullIntoTornado(nearby, vortex, 10), 0);
assert.equal(nearby.x, 0);
assert.equal(pullIntoTornado(distant, vortex, .1), TORNADO_RADIUS + 1);
assert.equal(distant.x, TORNADO_RADIUS + 1);
assert(pullIntoTornado(distant,vortex,.1,TORNADO_RADIUS*1.02)<TORNADO_RADIUS+1);
const twinTornadoes = makeTornadoVolley(caster,0,2,1.03);
assert.equal(twinTornadoes.length,2);
assert(twinTornadoes[0].vy<0&&twinTornadoes[1].vy>0);
assert.equal(makeTornadoVolley(caster,0,3).length,3);
console.log('Fire Tornado pulls nearby enemies without overshooting');

assert(ringHits(caster,{x:75,y:0,size:7},.8));
assert(!ringHits(caster,{x:120,y:0,size:7},.8));
assert(ringHits(caster,{x:115,y:0,size:7},.8,1.2));
assert(!ringHits(caster,{x:0,y:0,size:7},RING_ACTIVE+.1));
console.log('Fire Ring radius grows and follows spell size');

const breath = createFx(chargedBreathFx, { x: 20, y: 80, angle: 0 });
const breathFrame = createFrame(210, 160);
breath.update(.2);breath.draw(breathFrame);
assert(breathFrame.color.some(Boolean));
breathFrame.color.fill(0);breathFrame.light.fill(0);
breath.update(.55);breath.draw(breathFrame);
assert(breathFrame.color.some(Boolean));
assert(breathFrame.color.some((color,index)=>color && index%210>75));
breathFrame.color.fill(0);breathFrame.light.fill(0);
breath.update(1.2);breath.draw(breathFrame);
assert(breathFrame.color.some(Boolean));
assert(visualAlpha(CHARGE_TIME + .5) > visualAlpha(BREATH_TIME - .1));
assert.equal(visualAlpha(BREATH_TIME), 0);
console.log('Charged Fire Breath renders charge, moving flame, and a fading tail');
