import './style.css';
import { createFrame, clearFrame, createFx, composite } from 'pixelfx';
import * as explosionFx from 'pixelfx/fx/explosions/small-explosion';
import * as hitFx from 'pixelfx/fx/impacts/hit-spark';
import * as collectFx from 'pixelfx/fx/pickups/collect-burst';
import * as levelUpFx from 'pixelfx/fx/ui/level-up';
import * as chargedBreathFx from './breath-fx.js';
import fireballData from './assets/fire-fireball_sheet.json';
import fireballUrl from './assets/fire-fireball_sheet.png';
import xpOrbData from './assets/pickups-xp-orb_sheet.json';
import xpOrbUrl from './assets/pickups-xp-orb_sheet.png';
import potionData from './assets/pickups-potion_sheet.json';
import potionUrl from './assets/pickups-potion_sheet.png';
import chestData from './assets/pickups-chest-open_sheet.json';
import chestUrl from './assets/pickups-chest-open_sheet.png';
import tornadoData from './assets/fire-fire-tornado_sheet.json';
import tornadoUrl from './assets/fire-fire-tornado_sheet.png';
import ringData from './assets/fire-fire-ring_sheet.json';
import ringUrl from './assets/fire-fire-ring_sheet.png';
import { pullDrop, drinkPotion } from './pickups.js';
import { breathHits, turnToward, pullIntoTornado, makeTornadoVolley, ringHits, BREATH_COOLDOWN, BREATH_RANGE, TORNADO_COOLDOWN, TORNADO_DURATION, TORNADO_RADIUS, RING_COOLDOWN, RING_RADIUS } from './spells.js';
import { makeVolley } from './shots.js';
import { drawGround, drawHero, drawEnemy } from './art.js';
import { CHARGE_TIME, BREATH_TIME, visualAlpha } from './breath-fx.js';
import { joystickVector } from './touch.js';

const W = 480, H = 270, TAU = Math.PI * 2;
const touchControls = matchMedia('(pointer: coarse)').matches;
const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
if (touchControls) { canvas.width = W; canvas.height = H; }
const stage = canvas.parentElement;
function fitCanvas(){const scale=Math.min(stage.clientWidth/W,stage.clientHeight/H);if(scale>0){canvas.style.width=`${W*scale}px`;canvas.style.height=`${H*scale}px`;}}
new ResizeObserver(fitCanvas).observe(stage);
const overlay = document.querySelector('#overlay');
const fxCanvas = document.createElement('canvas'); fxCanvas.width = W; fxCanvas.height = H;
const fxCtx = fxCanvas.getContext('2d');
const frame = createFrame(W, H), imageData = fxCtx.createImageData(W, H);
ctx.imageSmoothingEnabled = false;
if (!touchControls) ctx.scale(2, 2);
const hud = Object.fromEntries(['hp-text','hp-bar','hp-lag','xp-bar','level','coins','score','time','wave-label','breath-status','tornado-status','ring-status'].map(id => [id, document.getElementById(id)]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (x, y) => { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; };
const keys = new Set(), mouse = { x: W / 2, y: H / 2, down: false };
const touchMove = { x: 0, y: 0 };
let touchAim = false;
let state = 'menu', game, previous = 0, fireImage = new Image(), sheet = { frames: [], ready: false }, settings = { auto: false, volume: 0.35 };
const xpOrbImage = new Image(), xpOrbFrames = Object.values(xpOrbData.frames).map(({frame}) => frame), xpOrbPivot = xpOrbData.meta.pixelfx.pivot;
xpOrbImage.src = xpOrbUrl;
const potionImage = new Image(), potionFrames = Object.values(potionData.frames).map(({frame}) => frame), potionPivot = potionData.meta.pixelfx.pivot;
potionImage.src = potionUrl;
const chestImage = new Image(), chestFrames = Object.values(chestData.frames).map(({frame}) => frame), chestPivot = chestData.meta.pixelfx.pivot;
const chestDuration = chestFrames.length / chestData.meta.pixelfx.fps;
chestImage.src = chestUrl;
const tornadoImage = new Image(), tornadoFrames = Object.values(tornadoData.frames).map(({frame}) => frame), tornadoPivot = tornadoData.meta.pixelfx.pivot;
tornadoImage.src = tornadoUrl;
const ringImage = new Image(), ringFrames = Object.values(ringData.frames).map(({frame}) => frame), ringPivot = ringData.meta.pixelfx.pivot;
const ringDuration = ringFrames.length / ringData.meta.pixelfx.fps;
ringImage.src = ringUrl;
const levelupFrame = createFrame(200, 162), levelupEffectOnly = { ...levelUpFx, meta: { ...levelUpFx.meta, actor: 0 } };
let levelupCanvas, levelupInstance, levelupPixels, chestCanvas;
try { Object.assign(settings, JSON.parse(localStorage.getItem('chicken-settings') || '{}')); } catch { /* reset invalid settings */ }
const ENEMIES = [
  { name:'Gà con', kind:'peep', hp:22, speed:28, damage:8, color:'#f8d578', size:7, xp:3 },
  { name:'Kiếm sĩ', kind:'runner', hp:18, speed:55, damage:7, color:'#875548', size:7, xp:4 },
  { name:'Sát thủ', kind:'zigzag', hp:30, speed:39, damage:10, color:'#635078', size:8, xp:5 },
  { name:'Kỵ sĩ giáp sắt', kind:'tank', hp:95, speed:19, damage:18, color:'#61737b', size:12, xp:10 },
  { name:'Pháp sư chiến trận', kind:'archer', hp:38, speed:27, damage:9, color:'#3c7770', size:9, xp:7 },
  { name:'Kỵ binh xung phong', kind:'charger', hp:44, speed:25, damage:15, color:'#893f45', size:9, xp:8 },
  { name:'Gà tách đôi', kind:'splitter', hp:48, speed:31, damage:11, color:'#b7dc7e', size:10, xp:8 },
  { name:'Cung thủ đảo vòng', kind:'orbit', hp:34, speed:38, damage:9, color:'#446979', size:8, xp:7 },
  { name:'Giáo sĩ hắc ám', kind:'healer', hp:52, speed:24, damage:9, color:'#784d70', size:9, xp:10 },
  { name:'GÀ TRÙM', kind:'boss', hp:800, speed:21, damage:25, color:'#f06964', size:23, xp:80 }
];
const UPGRADES = [
  { title:'CẦU LỬA+', desc:'Sát thương cầu lửa +25%', icon:0, apply:g=>g.damage*=1.25 },
  { title:'BẮN NHANH', desc:'Tốc độ bắn +18%', icon:1, apply:g=>g.fireDelay*=0.82 },
  { title:'TIM KHỎE', desc:'Máu tối đa +25, hồi 25 HP', icon:2, apply:g=>{g.player.maxHp+=25;g.player.hp=Math.min(g.player.maxHp,g.player.hp+25);} },
  { title:'CHẠY NHANH', desc:'Tốc độ di chuyển +12%', icon:3, apply:g=>g.player.speed*=1.12 },
  { title:'CHÍ MẠNG', desc:'Tỉ lệ chí mạng +8%', icon:4, apply:g=>g.crit+=0.08 },
  { title:'LỬA XUYÊN', desc:'Cầu lửa xuyên thêm một địch', icon:5, apply:g=>g.pierce++ },
  { title:'NAM CHÂM', desc:'Tầm hút XP Orb +35%', icon:6, available:g=>!g.vacuum, apply:g=>g.magnet*=1.35 },
  { title:'HỒI PHỤC', desc:'Hồi 2 HP mỗi giây', icon:7, apply:g=>g.regen+=2 },
  { title:'CÓ SỨC HÚT', desc:'Hút mọi XP Orb trên bản đồ về bạn', icon:8, available:g=>!g.vacuum, apply:g=>g.vacuum=true },
  { title:'+1 ĐẠN', desc:'Bắn thêm 1 cầu lửa mỗi lần', icon:9, apply:g=>g.bullets++ },
  { title:'+1 Q', desc:'Mỗi lần dùng Q bắn thêm 1 lốc xoáy', icon:10, apply:g=>g.tornadoCount++ },
  { title:'LƯỚT XA', desc:'Quãng lướt né +15% mỗi cấp', icon:11, apply:g=>g.dashRange*=1.15 },
  { title:'HAM HỌC', desc:'Kinh nghiệm nhận được +2% mỗi cấp', icon:12, apply:g=>g.xpMultiplier*=1.02 },
  { title:'CƯỜNG HÓA', desc:'Sức mạnh, tốc độ đạn, thời gian và vùng tác dụng +2% mỗi cấp', icon:13, apply:g=>g.omniMultiplier*=1.02 },
  { title:'TẦM XA', desc:'Tầm tấn công +3% mỗi cấp', icon:14, apply:g=>g.attackRange*=1.03 },
  { title:'PHÉP KHỔNG LỒ', desc:'Kích thước E, Q và R +20%', icon:15, apply:g=>g.spellSize*=1.2 }
];
const UPGRADE_ICONS = [
  ['....y....','...yoy...','..yoooy..','.yorrroy.','yorrwrroy','.yorrroy.','..yoooy..','...yoy...','....y....'],
  ['..yy.....','.yoooy...','yoooy....','..yy.....','...yyo...','..yoooy..','.yoooy...','..yy.....','.........'],
  ['.rr...rr.','rwwr.rwwr','rwwwrwwwr','rwwwwwwwr','.rwwwwwr.','..rwwwr..','...rwr...','....r....','.........'],
  ['....gg...','...ggg...','..ggggg..','.ggg.ggg.','..ggggg..','...ggg...','..gg.gg..','.gg...gg.','gg.....gg'],
  ['....p....','....p....','....p....','ppppwpppp','....w....','....p....','....p....','....p....','.........'],
  ['....y....','...yoy...','..yooy...','yooorrrrr','..yooy...','...yoy...','....y....','.........','.........'],
  ['bb.....rr','bb.....rr','bb.....rr','bb.....rr','bbwwwwwrr','bwwwwwwwr','.bbbbrrr.','.........','.........'],
  ['...ggg...','...gwg...','...gwg...','gggwwwggg','gwwwwwwwg','gggwwwggg','...gwg...','...gwg...','...ggg...'],
  ['....c....','...ccc...','..ccwcc..','.ccwwwcc.','ccwwwwwcc','.ccwwwcc.','..ccwcc..','...ccc...','....c....'],
  ['..y...y..','.yoy.yoy.','yowoyowoy','.yoy.yoy.','..y...y..','.........','...w.w...','..wwwww..','...www...'],
  ['..c...c..','.cwc.cwc.','cwwwcwwwc','.cwc.cwc.','..c...c..','...ccc...','..ccwcc..','...ccc...','....c....'],
  ['....g....','...ggg...','..ggggg..','ggggggggg','..ggggg..','...ggg...','..g.g.g..','.g..g..g.','g...g...g'],
  ['...g.g...','..ggggg..','.ggwwwgg.','ggwwwwwgg','ggwwwwwgg','.ggwwwgg.','..ggggg..','...g.g...','.........'],
  ['....p....','..ppwpp..','.pwwwwwp.','ppwypywpp','.wwyyyww.','..wwyww..','...www...','..p.p.p..','.p.....p.'],
  ['w.......w','.w.....w.','..w...w..','...w.w...','....y....','...yyy...','..yyyyy..','.yyyyyyy.','yyyyyyyyy'],
  ['....y....','..yoooy..','.yo...oy.','yo.....oy','yo..w..oy','yo.....oy','.yo...oy.','..yoooy..','....y....']
];
const ICON_COLORS = {y:'#ffe18a',o:'#f7944d',r:'#dc5b58',w:'#fff6cf',g:'#8cd8a6',p:'#d6a3ee',b:'#69b7cf',c:'#86dbe2'};
function upgradeIcon(index){
  const icon=document.createElement('canvas');icon.width=icon.height=9;icon.setAttribute('aria-hidden','true');
  const ink=icon.getContext('2d');
  UPGRADE_ICONS[index].forEach((row,y)=>[...row].forEach((color,x)=>{if(ICON_COLORS[color]){ink.fillStyle=ICON_COLORS[color];ink.fillRect(x,y,1,1);}}));
  return icon;
}

function start() {
  touchAim = false;
  game = { player:{x:0,y:0,hp:100,maxHp:100,lagHp:100,speed:85,inv:0,dash:0,dashCd:0,dir:0,attack:0}, enemies:[], shots:[], enemyShots:[], drops:[], effects:[], numbers:[], wave:1, waveTime:0, spawnClock:0, time:0, score:0, coins:0, level:1, xp:0, xpGoal:12, damage:18, fireDelay:0.42, fireClock:0, breath:null, breathCooldown:0, tornadoes:[], tornadoCooldown:0, ring:null, ringCooldown:0, spellSize:1, tornadoCount:1, dashRange:1, xpMultiplier:1, omniMultiplier:1, attackRange:1, bullets:1, crit:0.12, pierce:0, magnet:30, vacuum:false, regen:0, kills:0, shake:0 };
  state = 'playing'; overlay.classList.add('hidden');
  sound(440,0.11,'triangle',0.14); musicStart(); updateHud();
}
function panel(title, description, buttons) {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="panel"><h1>${title}</h1><p>${description}</p><div class="buttons"></div></div>`;
  const area = overlay.querySelector('.buttons');
  for (const [label, action] of buttons) { const btn = document.createElement('button'); btn.className='pixel-btn'; btn.textContent=label; btn.onclick=action; area.append(btn); }
}
function menu() { state='menu'; panel('LOD_SURVIVAL', `Sống sót trước chiến binh, pháp sư và đàn gà, thu thập XP để nâng cấp cầu lửa.<br>${touchControls?'Joystick di chuyển · Chạm màn hình để ngắm · Nút LƯỚT, Q, E, R để dùng kỹ năng':'WASD di chuyển · Chuột trái bắn · SPACE lướt né · Q lốc xoáy · E phun lửa · R vòng lửa'}`, [['BẮT ĐẦU',start],['CÀI ĐẶT',openSettings]]); }
function showPause(){state='paused';panel('TẠM DỪNG',`Đợt ${game.wave} · Điểm ${game.score.toLocaleString('vi-VN')}`, [['TIẾP TỤC',()=>{state='playing';overlay.classList.add('hidden');}],['CHỈ SỐ',showStats],['CÀI ĐẶT',openSettings],['CHƠI LẠI',start]]);}
let closeStats;
function showStats(){
  if(!game||!['playing','paused'].includes(state))return;
  closeStats=state==='paused'?showPause:()=>{state='playing';overlay.classList.add('hidden');};
  state='stats';overlay.classList.remove('hidden');
  const g=game,p=g.player,percent=v=>`${Math.round(v*100)}%`;
  const rows=[['Máu',`${Math.ceil(p.hp)} / ${p.maxHp}`],['Sát thương cầu lửa',Math.round(g.damage*g.omniMultiplier)],['Tốc độ bắn',`${(1/g.fireDelay).toFixed(2)} lần/giây`],['Chí mạng',`${percent(Math.min(1,g.crit))} · x1.8 sát thương`],['Đạn mỗi lần bắn',g.bullets],['Xuyên địch',g.pierce],['Di chuyển',`${Math.round(p.speed)} px/giây`],['Tầm lướt',`${Math.round(56*g.dashRange)} px`],['Hồi máu',`${g.regen} HP/giây`],['Tầm hút XP',g.vacuum?'Toàn bản đồ':`${Math.round(g.magnet)} px`],['XP nhận thêm',percent(g.xpMultiplier-1)],['Kích thước phép',`x${g.spellSize.toFixed(2)}`],['Cường hóa chung',`x${g.omniMultiplier.toFixed(2)}`],['Tầm cầu lửa',`x${g.attackRange.toFixed(2)}`],['Q · vùng hút',`${Math.round(TORNADO_RADIUS*g.omniMultiplier*g.spellSize)} px · ${g.tornadoCount} lốc`],['E · tầm phun',`${Math.round(BREATH_RANGE*g.attackRange*g.spellSize)} px`],['R · bán kính',`${Math.round(RING_RADIUS*g.omniMultiplier*g.spellSize)} px`]];
  overlay.innerHTML=`<div class="panel stat-panel"><h2>CHỈ SỐ NHÂN VẬT · CẤP ${g.level}</h2><dl>${rows.map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl><button class="pixel-btn" id="close-stats">QUAY LẠI</button></div>`;
  overlay.querySelector('#close-stats').onclick=closeStats;
}
function pause() { if (state==='playing') showPause(); else if(state==='paused') { state='playing';overlay.classList.add('hidden'); } }
function openSettings() {
  const back = state === 'menu' ? menu : showPause;
  state='settings'; overlay.classList.remove('hidden');
  overlay.innerHTML=`<div class="panel"><h2>CÀI ĐẶT</h2><div class="settings"><label><input id="auto" type="checkbox"> Tự động bắn địch gần nhất</label><label>Âm lượng <input id="volume" type="range" min="0" max="100"></label><label>Nhập Fireball từ PixelFX Lab <input id="sheet-file" type="file" accept="image/png"></label><label>JSON sprite sheet <input id="json-file" type="file" accept="application/json,.json"></label><p id="import-status">Chọn PNG và JSON cùng một bộ để thay hiệu ứng.</p></div><div class="buttons"><button class="pixel-btn" id="back">QUAY LẠI</button></div></div>`;
  const auto=overlay.querySelector('#auto'), volume=overlay.querySelector('#volume'); auto.checked=settings.auto; volume.value=settings.volume*100;
  auto.onchange=()=>{settings.auto=auto.checked;saveSettings();}; volume.oninput=()=>{settings.volume=volume.value/100;saveSettings();};
  overlay.querySelector('#back').onclick=back;
  let pendingImage, pendingJson;
  const load=async()=>{if(!pendingImage||!pendingJson)return;try{const data=JSON.parse(await pendingJson.text());const frames=Object.values(data.frames||{}).map(v=>v.frame);if(!frames.length||frames.some(f=>!Number.isFinite(f.x)||!Number.isFinite(f.y)||f.w<1||f.h<1))throw Error('JSON thiếu frame hợp lệ');const img=new Image();img.src=URL.createObjectURL(pendingImage);await img.decode();if(frames.some(f=>f.x+f.w>img.width||f.y+f.h>img.height))throw Error('Kích thước PNG và JSON không khớp');fireImage=img;sheet={frames,ready:true,pivot:data.meta?.pixelfx?.pivot||[frames[0].w*.8,frames[0].h/2]};overlay.querySelector('#import-status').textContent=`Đã nhập ${frames.length} khung hình Fireball.`;}catch(e){overlay.querySelector('#import-status').textContent=`Lỗi: ${e.message}`;}};
  overlay.querySelector('#sheet-file').onchange=e=>{pendingImage=e.target.files[0];load();}; overlay.querySelector('#json-file').onchange=e=>{pendingJson=e.target.files[0];load();};
}
function saveSettings(){localStorage.setItem('chicken-settings',JSON.stringify(settings));}
function spawn(type, x, y) {
  const def=ENEMIES[type], scale=1+(game.wave-1)*0.18;
  game.enemies.push({type,x,y,hp:def.hp*scale,maxHp:def.hp*scale,speed:def.speed*(1+Math.min(game.wave*.035,.45)),damage:def.damage*(1+game.wave*.08),size:def.size,phase:rand(0,TAU),timer:rand(.5,2),flash:0,lagHp:def.hp*scale,charge:0,attack:0});
}
function spawnEdge(type) { const angle=rand(0,TAU), radius=rand(180,245); spawn(type,game.player.x+Math.cos(angle)*radius,game.player.y+Math.sin(angle)*radius); }
function waveUpdate(dt) {
  game.waveTime+=dt; game.spawnClock-=dt;
  if(game.spawnClock<=0){ const pool=Math.min(9,2+Math.floor(game.wave/2));const count=1+Math.floor(game.wave/4);for(let i=0;i<count;i++)spawnEdge(Math.floor(rand(0,pool)));game.spawnClock=Math.max(.35,1.35-game.wave*.06); }
  if(game.waveTime>=25){game.wave++;game.waveTime=0;game.spawnClock=0;if(game.wave%5===0)spawnEdge(9);sound(330,.3,'sawtooth',.18);}
}
function shoot() {
  const p=game.player; let target;
  if(settings.auto||touchControls){target=game.enemies.reduce((a,b)=>!a||dist(b,p)<dist(a,p)?b:a,null);if(!target)return;}
  const d=target?unit(target.x-p.x,target.y-p.y):unit(mouse.x-W/2,mouse.y-H/2);
  p.dir=Math.atan2(d.y,d.x);
  game.shots.push(...makeVolley(p,p.dir,game.bullets,game.pierce,game.omniMultiplier,game.omniMultiplier*game.attackRange));
  game.fireClock=game.fireDelay;p.attack=.28;sound(350,.08,'square',.045,190);
}
function aimAngle(){
  if(touchControls&&!touchAim&&game?.enemies.length){const target=game.enemies.reduce((a,b)=>!a||dist(b,game.player)<dist(a,game.player)?b:a,null);return Math.atan2(target.y-game.player.y,target.x-game.player.x);}
  return Math.atan2(mouse.y-H/2,mouse.x-W/2);
}
function castBreath(){
  if(state!=='playing'||game.breathCooldown>0||game.breath)return;
  const angle=aimAngle(),p=game.player;
  game.breath={angle,age:0,hits:new Set(),fx:createFx(chargedBreathFx,{x:p.x,y:p.y,angle,seed:6})};game.breathCooldown=BREATH_COOLDOWN;p.dir=angle;
  sound(115,CHARGE_TIME,'sawtooth',.14,320);
}
function castTornado(){
  if(state!=='playing'||game.tornadoCooldown>0)return;
  const angle=aimAngle(),p=game.player;
  game.tornadoes.push(...makeTornadoVolley(p,angle,game.tornadoCount,game.omniMultiplier*game.attackRange));
  game.tornadoCooldown=TORNADO_COOLDOWN;p.dir=angle;sound(145,.6,'sawtooth',.16,45);
}
function castRing(){
  if(state!=='playing'||game.ringCooldown>0)return;
  game.ring={x:game.player.x,y:game.player.y,age:0,hits:new Set()};
  game.ringCooldown=RING_COOLDOWN;sound(95,.7,'sawtooth',.18,380);
}
function dash() {const p=game.player;if(p.dashCd>0||state!=='playing')return;const x=touchMove.x||(keys.has('d')?1:0)-(keys.has('a')?1:0),y=touchMove.y||(keys.has('s')?1:0)-(keys.has('w')?1:0);const d=unit(x||Math.cos(p.dir),y||Math.sin(p.dir));p.dashX=d.x;p.dashY=d.y;p.dash=.16*game.dashRange;p.dashCd=1.2;p.inv=p.dash+.1;sound(210,.1,'sawtooth',.1,420);}
function damageEnemy(e, amount, crit=false) {
  amount*=game.omniMultiplier;
  if(e.type===3)amount*=0.7;
  e.hp-=amount;e.flash=.12;e.lagHp=Math.max(e.lagHp,e.hp+amount);
  game.numbers.push({x:e.x,y:e.y-14,text:Math.round(amount).toString(),crit,life:.7});
  effect(hitFx,e.x,e.y); sound(crit?610:170,.065,'triangle',crit?.11:.055);
  if(e.hp<=0)kill(e);
}
function ignite(e){
  if(!e.burn){e.burnAge=0;e.burnTick=0;}
  e.burn=3;e.smolder=0;e.scorched=true;
}
function kill(e) {
  const idx=game.enemies.indexOf(e);if(idx<0)return;game.enemies.splice(idx,1);
  const def=ENEMIES[e.type];game.kills++;game.score+=Math.round(def.xp*10*(1+game.wave*.1));
  game.drops.push({x:e.x,y:e.y,kind:'xp',value:def.xp,phase:rand(0,1.8)});
  if(e.type===9||Math.random()<0.08)game.drops.push({x:e.x+rand(-9,9),y:e.y+rand(-9,9),kind:'potion',phase:rand(0,2.4)});
  if(e.type===9)game.drops.push({x:e.x,y:e.y,kind:'chest',phase:0});
  else if(Math.random()<.62){const earned=1+Math.floor(e.type/3);game.coins+=earned;game.score+=earned*5;}
  effect(explosionFx,e.x,e.y);sound(80,.15,'sawtooth',.09,35);
  if(e.type===6)for(let i=0;i<2;i++)spawn(0,e.x+rand(-10,10),e.y+rand(-10,10));
}
function effect(mod,x,y){game.effects.push({fx:createFx(mod,{x,y,seed:Math.floor(rand(1,99999)),...(mod===explosionFx?{size:.35}:{})}),life:mod===explosionFx ? 0.85 : 0.7});}
function hurt(amount){const p=game.player;if(p.inv>0)return;p.hp=Math.max(0,p.hp-amount);p.inv=.55;game.shake=3;sound(90,.15,'sawtooth',.15);if(!p.hp){state='dead';panel('GAME OVER',`Sống sót ${formatTime(game.time)} · Đạt ${game.score.toLocaleString('vi-VN')} điểm · Hạ ${game.kills} kẻ địch`,[['CHƠI LẠI',start],['MENU',menu]]);}}
function levelUp(){game.level++;game.xp-=game.xpGoal;game.xpGoal=Math.floor(game.xpGoal*1.35+8);state='levelup';overlay.classList.add('levelup-overlay');overlay.classList.remove('hidden');overlay.innerHTML='<div class="levelup-stage"><canvas width="200" height="162" aria-label="Hiệu ứng lên cấp"></canvas></div>';levelupCanvas=overlay.querySelector('canvas');levelupPixels=levelupCanvas.getContext('2d').createImageData(200,162);levelupInstance=createFx(levelupEffectOnly,{x:100,y:126,seed:5});sound(440,.36,'triangle',.15,880);}
function updateLevelup(dt){
  levelupInstance.update(dt);
  if(levelupInstance.done()){showUpgrades();return;}
  clearFrame(levelupFrame);levelupInstance.draw(levelupFrame);
  composite(levelupFrame,levelupPixels.data);
  levelupCanvas.getContext('2d').putImageData(levelupPixels,0,0);
}
function showUpgrades(){
  state='upgrade';overlay.classList.remove('levelup-overlay');
  const options=UPGRADES.filter(item=>!item.available||item.available(game)).sort(()=>Math.random()-.5).slice(0,3);
  overlay.innerHTML=`<div class="panel upgrade-panel"><h2>LÊN CẤP ${game.level}!</h2><p>Chọn một kỹ năng nâng cấp</p><div class="choices"></div></div>`;
  for(const [index,item] of options.entries()){const btn=document.createElement('button');btn.className='choice';btn.style.animationDelay=`${index*130}ms`;btn.innerHTML=`<span class="choice-art"></span><strong>${item.title}</strong><span class="choice-desc">${item.desc}</span><span class="choice-pick" aria-hidden="true">✦ CHỌN NÂNG CẤP</span>`;btn.querySelector('.choice-art').append(upgradeIcon(item.icon));btn.onclick=()=>{item.apply(game);state='playing';overlay.classList.add('hidden');sound(660,.2,'triangle',.17);};overlay.querySelector('.choices').append(btn);}
}
function openChest(drop){
  game.drops.splice(game.drops.indexOf(drop),1);
  game.chestReward={age:0,gold:75,skills:UPGRADES.filter(item=>!item.available||item.available(game)).sort(()=>Math.random()-.5).slice(0,3)};
  state='chestOpening';overlay.classList.add('chest-overlay');overlay.classList.remove('hidden');
  overlay.innerHTML='<div class="chest-stage"><h2>RƯƠNG GÀ TRÙM</h2><canvas width="176" height="112" aria-label="Rương đang mở"></canvas><p>ĐANG MỞ RƯƠNG...</p></div>';
  chestCanvas=overlay.querySelector('canvas');sound(380,.35,'triangle',.16,760);
}
function updateChestOpening(dt){
  const reward=game.chestReward;reward.age+=dt;
  if(chestImage.complete&&chestImage.naturalWidth){
    const index=Math.min(chestFrames.length-1,Math.floor(reward.age*chestData.meta.pixelfx.fps)),f=chestFrames[index],ink=chestCanvas.getContext('2d');
    ink.clearRect(0,0,176,112);ink.drawImage(chestImage,f.x,f.y,f.w,f.h,0,0,176,112);
  }
  if(reward.age>=chestDuration)showChestReward();
}
function showChestReward(){
  state='chestReward';overlay.classList.remove('chest-overlay');
  const reward=game.chestReward;
  overlay.innerHTML=`<div class="panel upgrade-panel chest-reward"><h2>RƯƠNG GÀ TRÙM!</h2><p class="chest-gold">◈ +${reward.gold} VÀNG</p><p>Nhận cả 3 lá kỹ năng sau:</p><div class="choices reward-choices"></div><div class="buttons"><button class="pixel-btn" id="claim-chest">NHẬN TẤT CẢ</button></div></div>`;
  const cards=overlay.querySelector('.reward-choices');
  reward.skills.forEach((item,index)=>{const card=document.createElement('div');card.className='choice reward-card';card.style.animationDelay=`${index*180}ms`;card.innerHTML=`<span class="choice-art"></span><strong>${item.title}</strong><span class="choice-desc">${item.desc}</span><span class="choice-pick">✦ ĐÃ TÌM THẤY</span>`;card.querySelector('.choice-art').append(upgradeIcon(item.icon));cards.append(card);});
  overlay.querySelector('#claim-chest').onclick=()=>{for(const item of reward.skills)item.apply(game);game.coins+=reward.gold;game.score+=reward.gold*5;game.chestReward=null;state='playing';overlay.classList.add('hidden');sound(880,.35,'triangle',.18,1320);updateHud();};
}
function update(dt) {
  game.time+=dt;const p=game.player;p.inv=Math.max(0,p.inv-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.dash=Math.max(0,p.dash-dt);p.attack=Math.max(0,p.attack-dt);p.lagHp+=(p.hp-p.lagHp)*Math.min(1,dt*2);p.hp=Math.min(p.maxHp,p.hp+game.regen*dt);game.shake=Math.max(0,game.shake-dt*14);
  const mx=touchMove.x+(keys.has('d')?1:0)-(keys.has('a')?1:0),my=touchMove.y+(keys.has('s')?1:0)-(keys.has('w')?1:0),move=unit(mx,my);p.moving=!!(mx||my||p.dash>0);
  if(p.dash>0){p.x+=p.dashX*350*dt;p.y+=p.dashY*350*dt;}else if(mx||my){p.x+=move.x*p.speed*dt;p.y+=move.y*p.speed*dt;}
  if(!settings.auto&&!touchControls)p.dir=aimAngle();
  game.fireClock-=dt;game.breathCooldown=Math.max(0,game.breathCooldown-dt);game.tornadoCooldown=Math.max(0,game.tornadoCooldown-dt);game.ringCooldown=Math.max(0,game.ringCooldown-dt);if((mouse.down||settings.auto||touchControls)&&game.fireClock<=0&&!(game.breath&&game.breath.age<CHARGE_TIME))shoot();
  waveUpdate(dt);
  for(const e of [...game.enemies]) updateEnemy(e,dt);
  if(game.breath){const breath=game.breath,previous=breath.age;breath.age+=dt/game.omniMultiplier;breath.angle=turnToward(breath.angle,aimAngle(),dt);p.dir=breath.angle;breath.fx.options.x=p.x+Math.cos(breath.angle)*26;breath.fx.options.y=p.y+Math.sin(breath.angle)*26-2;breath.fx.options.angle=breath.angle;breath.fx.update(dt/game.omniMultiplier);p.casting=breath.age<CHARGE_TIME?breath.age/CHARGE_TIME:0;if(previous<CHARGE_TIME&&breath.age>=CHARGE_TIME)sound(180,.55,'sawtooth',.17,70);if(breath.age>=CHARGE_TIME&&breath.age<BREATH_TIME-.5){const reach=BREATH_RANGE*game.attackRange*game.spellSize*Math.min(1,(breath.age-CHARGE_TIME)/.3);for(const e of [...game.enemies])if(!breath.hits.has(e)&&breathHits(p,breath.angle,e,reach,game.omniMultiplier*game.spellSize)){breath.hits.add(e);damageEnemy(e,game.damage*.8);if(e.hp>0)ignite(e);}}if(breath.age>=BREATH_TIME){game.breath=null;p.casting=0;}}
  for(const tornado of [...game.tornadoes]){tornado.age+=dt;tornado.x+=tornado.vx*dt;tornado.y+=tornado.vy*dt;tornado.tick+=dt;const strike=tornado.tick>=.4;if(strike)tornado.tick-=.4;for(const e of [...game.enemies])if(pullIntoTornado(e,tornado,dt,TORNADO_RADIUS*game.omniMultiplier*game.spellSize)<34*game.omniMultiplier*game.spellSize&&strike){damageEnemy(e,game.damage*.55);if(e.hp>0)ignite(e);}if(tornado.age>=TORNADO_DURATION*game.omniMultiplier)game.tornadoes.splice(game.tornadoes.indexOf(tornado),1);}
  if(game.ring){const ring=game.ring;ring.age+=dt/game.omniMultiplier;for(const e of [...game.enemies])if(!ring.hits.has(e)&&ringHits(ring,e,ring.age,game.omniMultiplier*game.spellSize)){ring.hits.add(e);damageEnemy(e,game.damage*.9);if(e.hp>0)ignite(e);}if(ring.age>=ringDuration)game.ring=null;}
  for(const s of [...game.shots]){s.x+=s.vx*dt;s.y+=s.vy*dt;s.age+=dt;s.life-=dt;if(s.life<=0){game.shots.splice(game.shots.indexOf(s),1);continue;}for(const e of [...game.enemies])if(!s.hits.has(e)&&dist(s,e)<e.size+5*game.omniMultiplier){s.hits.add(e);const crit=Math.random()<game.crit;damageEnemy(e,game.damage*(crit?1.8:1),crit);if(s.hits.size>s.pierce){game.shots.splice(game.shots.indexOf(s),1);break;}}}
  for(const shot of [...game.enemyShots]){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;if(dist(shot,p)<9){hurt(shot.damage);shot.life=0;}if(shot.life<=0)game.enemyShots.splice(game.enemyShots.indexOf(shot),1);}
  for(const d of [...game.drops]){d.phase+=dt;if(d.kind==='chest'){if(dist(d,p)<18)openChest(d);continue;}const potion=d.kind==='potion',magnet=potion&&p.hp>=p.maxHp?0:game.magnet;const distance=pullDrop(d,p,dt,magnet,game.vacuum&&!potion);if(distance<9&&(!potion||p.hp<p.maxHp)){game.drops.splice(game.drops.indexOf(d),1);if(potion){const healed=drinkPotion(p);game.numbers.push({x:p.x,y:p.y-22,text:`+${Math.ceil(healed)} HP`,heal:true,life:.9});sound(720,.22,'triangle',.12,980);}else{game.xp+=d.value*game.xpMultiplier;sound(500,.045,'triangle',.05);}effect(collectFx,d.x,d.y);}}
  for(const item of [...game.effects]){item.fx.update(dt);item.life-=dt;if(item.life<=0||item.fx.done())game.effects.splice(game.effects.indexOf(item),1);}
  for(const n of [...game.numbers]){n.y-=23*dt;n.life-=dt;if(n.life<=0)game.numbers.splice(game.numbers.indexOf(n),1);}
  if(state==='playing'&&game.xp>=game.xpGoal)levelUp();updateHud();
}
function updateEnemy(e,dt){
  const p=game.player,d=unit(p.x-e.x,p.y-e.y),range=dist(e,p),kind=ENEMIES[e.type].kind;e.facing=d.x>=0?1:-1;e.phase+=dt*5;e.timer-=dt;e.attack=Math.max(0,e.attack-dt);e.flash=Math.max(0,e.flash-dt);e.lagHp+=(e.hp-e.lagHp)*Math.min(1,dt*2.5);
  if(e.burn>0){e.burn=Math.max(0,e.burn-dt);e.burnAge=(e.burnAge||0)+dt;e.burnTick=(e.burnTick||0)+dt;if(e.burnTick>=.5){e.burnTick-=.5;damageEnemy(e,Math.max(3,game.damage*.25));if(e.hp<=0)return;}if(!e.burn)e.smolder=.9;}
  else if(e.smolder>0){e.smolder=Math.max(0,e.smolder-dt);e.burnAge+=dt;}
  let vx=d.x,vy=d.y;
  if(kind==='runner'&&Math.sin(e.phase*1.3)>0.45){vx*=1.65;vy*=1.65;}
  if(kind==='zigzag'){vx+=-d.y*Math.sin(e.phase*2)*.8;vy+=d.x*Math.sin(e.phase*2)*.8;}
  if(kind==='orbit'){vx=d.x*.55-d.y*.9;vy=d.y*.55+d.x*.9;}
  if(kind==='archer'&&range<105){vx=-d.x*.4;vy=-d.y*.4;}
  if(kind==='healer'&&range<85){vx=-d.x*.5;vy=-d.y*.5;}
  if(kind==='charger'){if(e.timer<=0&&e.charge<=0){e.charge=.36;e.attack=.44;e.timer=rand(2.3,3.5);e.cx=d.x;e.cy=d.y;}if(e.charge>0){e.charge-=dt;vx=e.cx*3;vy=e.cy*3;}}
  e.x+=vx*e.speed*dt;e.y+=vy*e.speed*dt;
  if((kind==='archer'||kind==='orbit'||kind==='boss')&&e.timer<=0&&range<230){const dir=unit(p.x-e.x,p.y-e.y),angles=kind==='boss'?[-.28,0,.28]:[0];for(const a of angles){const c=Math.cos(a),s=Math.sin(a);game.enemyShots.push({x:e.x,y:e.y,vx:(dir.x*c-dir.y*s)*85,vy:(dir.x*s+dir.y*c)*85,life:3,damage:e.damage*.7,magic:kind==='archer',arrow:kind==='orbit'});}e.attack=.44;e.timer=kind==='boss'?1.4:kind==='orbit'?2.1:2.4;}
  if(kind==='healer'&&e.timer<=0){for(const ally of game.enemies)if(ally!==e&&dist(ally,e)<48)ally.hp=Math.min(ally.maxHp,ally.hp+12);e.attack=.44;e.timer=3;}
  if(kind==='tank'&&e.timer<=0&&range<28){hurt(e.damage*.65);effect(hitFx,e.x,e.y);e.attack=.44;e.timer=2.2;}
  if(range<e.size+12&&e.attack<=0)e.attack=.44;
  if(range<e.size+6)hurt(e.damage);
}
function updateHud(){if(!game)return;const p=game.player;hud['hp-text'].textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;hud['hp-bar'].style.width=`${p.hp/p.maxHp*100}%`;hud['hp-lag'].style.width=`${p.lagHp/p.maxHp*100}%`;hud['xp-bar'].style.width=`${game.xp/game.xpGoal*100}%`;hud.level.textContent=game.level;hud.coins.textContent=game.coins;hud.score.textContent=game.score.toLocaleString('vi-VN');hud.time.textContent=formatTime(game.time);hud['wave-label'].textContent=`WAVE ${String(game.wave).padStart(2,'0')}`;for(const [id,remaining,total] of [['tornado-status',game.tornadoCooldown,TORNADO_COOLDOWN],['breath-status',game.breathCooldown,BREATH_COOLDOWN],['ring-status',game.ringCooldown,RING_COOLDOWN]]){const card=hud[id];card.classList.toggle('cooldown',remaining>0);card.querySelector('span').textContent=remaining>0?`${remaining.toFixed(1)} / ${total.toFixed(1)} GIÂY`:'SẴN SÀNG';card.querySelector('i').style.width=`${(1-remaining/total)*100}%`;}if(touchControls)for(const [id,remaining] of [['touch-q',game.tornadoCooldown],['touch-e',game.breathCooldown],['touch-r',game.ringCooldown],['touch-dash',p.dashCd]])document.getElementById(id).disabled=remaining>0;}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}

function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function drawFire(s,x,y){if(!sheet.ready)return;const frames=sheet.frames,f=frames[Math.floor(s.age*30)%frames.length],scale=.37,angle=Math.atan2(s.vy,s.vx);ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(fireImage,f.x,f.y,f.w,f.h,-sheet.pivot[0]*scale,-sheet.pivot[1]*scale,f.w*scale,f.h*scale);ctx.restore();}
function drawBreath(){
  const breath=game.breath;
  if(!breath)return;
  clearFrame(frame);frame.ox=game.player.x-W/2;frame.oy=game.player.y-H/2;
  breath.fx.draw(frame);composite(frame,imageData.data);fxCtx.putImageData(imageData,0,0);
  ctx.save();ctx.globalAlpha=visualAlpha(breath.age);ctx.translate(W/2,H/2);ctx.scale(game.spellSize,game.spellSize);ctx.drawImage(fxCanvas,-W/2,-H/2);ctx.restore();
}
function drawTornado(sx,sy){
  if(!tornadoImage.complete||!tornadoImage.naturalWidth)return;
  for(const tornado of game.tornadoes){
    const f=tornadoFrames[Math.floor(tornado.age*tornadoData.meta.pixelfx.fps)%tornadoFrames.length],scale=.7*game.omniMultiplier*game.spellSize;
    ctx.drawImage(tornadoImage,f.x,f.y,f.w,f.h,sx(tornado.x)-tornadoPivot[0]*scale,sy(tornado.y)-tornadoPivot[1]*scale,f.w*scale,f.h*scale);
  }
}
function drawRing(sx,sy){
  const ring=game.ring;
  if(!ring||!ringImage.complete||!ringImage.naturalWidth)return;
  const f=ringFrames[Math.min(ringFrames.length-1,Math.floor(ring.age*ringData.meta.pixelfx.fps))],scale=.85*game.omniMultiplier*game.spellSize;
  ctx.drawImage(ringImage,f.x,f.y,f.w,f.h,sx(ring.x)-ringPivot[0]*scale,sy(ring.y)-ringPivot[1]*scale,f.w*scale,f.h*scale);
}
function drawChest(d,x,y){
  rect(x-14,y+1,28,3,'#152b2b');
  if(chestImage.complete&&chestImage.naturalWidth){
    const f=chestFrames[0],scale=1.4,bob=Math.sin(d.phase*4)*2;
    ctx.drawImage(chestImage,f.x,f.y,f.w,f.h,x-chestPivot[0]*scale,y-chestPivot[1]*scale+bob,f.w*scale,f.h*scale);
  }else{rect(x-10,y-12,20,12,'#c68a3e');rect(x-7,y-9,14,5,'#ffe08b');}
  ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillStyle='#ffe08b';ctx.fillText('RƯƠNG',x,y-21);
}
function drawOrb(d,x,y){
  if(d.kind==='chest'){drawChest(d,x,y);return;}
  if(!xpOrbImage.complete||!xpOrbImage.naturalWidth){rect(x-3,y-6,6,6,'#b8ff67');return;}
  const f=xpOrbFrames[Math.floor(d.phase*12)%xpOrbFrames.length],scale=.5;
  ctx.drawImage(xpOrbImage,f.x,f.y,f.w,f.h,Math.round(x-xpOrbPivot[0]*scale),Math.round(y-xpOrbPivot[1]*scale+Math.sin(d.phase*8)*2),f.w*scale,f.h*scale);
}
function drawPotion(d,x,y){
  if(!potionImage.complete||!potionImage.naturalWidth){rect(x-4,y-10,8,10,'#f03942');return;}
  const f=potionFrames[Math.floor(d.phase*30)%potionFrames.length],scale=.53;
  ctx.drawImage(potionImage,f.x,f.y,f.w,f.h,Math.round(x-potionPivot[0]*scale),Math.round(y-potionPivot[1]*scale+Math.sin(d.phase*6)*2),f.w*scale,f.h*scale);
}
function drawEnemyShot(shot, x, y) {
  if (shot.arrow) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(Math.atan2(shot.vy, shot.vx));
    rect(-5, -1, 8, 2, '#9a7046');
    rect(2, -2, 4, 4, '#f0e4c3');
    ctx.restore();
  } else if (shot.magic) {
    rect(x - 4, y - 4, 8, 8, '#2d777a');
    rect(x - 3, y - 3, 6, 6, '#78ddc9');
    rect(x - 1, y - 1, 2, 2, '#f0ffe0');
  } else {
    rect(x - 3, y - 3, 7, 7, '#b77d57');
    rect(x - 2, y - 4, 5, 6, '#f4e6b7');
  }
}
function render() {
  const p = game?.player || {x:0,y:0,dir:0,hp:100,maxHp:100,lagHp:100,dashCd:0,inv:0};
  const shake = game?.shake || 0;
  ctx.save();
  ctx.translate(rand(-shake, shake), rand(-shake, shake));
  drawGround(ctx, p.x, p.y, W, H);
  if (game) {
    const sx = x => x - p.x + W / 2, sy = y => y - p.y + H / 2;
    for (const d of game.drops) (d.kind === 'potion' ? drawPotion : drawOrb)(d, sx(d.x), sy(d.y));
    for (const shot of game.enemyShots) drawEnemyShot(shot, sx(shot.x), sy(shot.y));
    for (const e of game.enemies) drawEnemy(ctx, sx(e.x), sy(e.y), e);
    drawTornado(sx, sy);
    drawRing(sx, sy);
    drawBreath();
    drawHero(ctx, W / 2, H / 2, p, game.time);
    for (const s of game.shots) drawFire(s, sx(s.x), sy(s.y));
    for (const n of game.numbers) {
      ctx.font = n.crit ? 'bold 9px monospace' : 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1c2725';
      ctx.fillText(n.crit ? `✦ ${n.text}!` : n.text, sx(n.x) + 1, sy(n.y) + 1);
      ctx.fillStyle = n.heal ? '#9fffab' : n.crit ? '#ffd36d' : '#fff1be';
      ctx.fillText(n.crit ? `✦ ${n.text}!` : n.text, sx(n.x), sy(n.y));
    }
    if (game.effects.length) {
      clearFrame(frame);
      frame.ox = p.x - W / 2; frame.oy = p.y - H / 2;
      for (const item of game.effects) item.fx.draw(frame);
      composite(frame, imageData.data);
      fxCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(fxCanvas, 0, 0);
    }
  } else drawHero(ctx, W / 2, H / 2, p, 0);
  ctx.restore();
}

let audio, musicTimer, noteIndex=0;
function sound(freq,duration,type='square',gain=.1,end=freq){if(!settings.volume)return;try{audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(gain*settings.volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration);}catch{/* audio unavailable */}}
function musicStart(){if(musicTimer)return;const notes=[220,0,330,392,0,330,294,0,220,0,294,330,0,262,196,0];musicTimer=setInterval(()=>{if(state==='playing'&&notes[noteIndex%notes.length])sound(notes[noteIndex%notes.length],.15,'triangle',.035);noteIndex++;},180);}
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(key==='f11'){e.preventDefault();toggleFullscreen();return;}keys.add(key);if([' ','arrowup','arrowdown'].includes(key))e.preventDefault();if(key===' '&&!e.repeat)dash();if(key==='e'&&!e.repeat)castBreath();if(key==='q'&&!e.repeat)castTornado();if(key==='r'&&!e.repeat)castRing();if(key==='c'&&!e.repeat){if(state==='stats')closeStats();else showStats();}if(key==='escape'){if(state==='stats')closeStats();else if(state==='playing'||state==='paused')pause();}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();mouse.down=false;if(state==='playing')pause();});
function pointAim(e){const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*W;mouse.y=(e.clientY-r.top)/r.height*H;if(e.pointerType==='touch')touchAim=true;}
canvas.addEventListener('pointermove',pointAim);canvas.addEventListener('pointerdown',e=>{pointAim(e);if(e.button===0)mouse.down=true;if(e.pointerType==='touch'){e.preventDefault();canvas.setPointerCapture(e.pointerId);}});window.addEventListener('pointerup',()=>mouse.down=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());document.querySelector('#pause').onclick=()=>{if(state==='playing'||state==='paused')pause();};
if(touchControls){
  const joystick=document.querySelector('#joystick'),knob=document.querySelector('#joystick-knob');
  const move=e=>{const r=joystick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;Object.assign(touchMove,joystickVector(x,y));knob.style.setProperty('--dx',`${touchMove.x*32}px`);knob.style.setProperty('--dy',`${touchMove.y*32}px`);};
  joystick.addEventListener('pointerdown',e=>{e.preventDefault();joystick.setPointerCapture(e.pointerId);move(e);});
  joystick.addEventListener('pointermove',e=>{if(joystick.hasPointerCapture(e.pointerId))move(e);});
  const release=()=>{touchMove.x=touchMove.y=0;knob.style.setProperty('--dx','0px');knob.style.setProperty('--dy','0px');};
  joystick.addEventListener('pointerup',release);joystick.addEventListener('pointercancel',release);
  for(const [id,action] of [['touch-dash',dash],['touch-q',castTornado],['touch-e',castBreath],['touch-r',castRing]])document.getElementById(id).addEventListener('pointerdown',e=>{e.preventDefault();action();});
}
document.querySelector('#character-stats').onclick=()=>{if(state==='stats')closeStats();else showStats();};
const fullscreenButton=document.querySelector('#fullscreen');
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#shell').requestFullscreen();}catch{fullscreenButton.title='Không thể bật toàn màn hình trong cửa sổ này';}}
fullscreenButton.onclick=toggleFullscreen;
document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;fullscreenButton.setAttribute('aria-label',active?'Thoát toàn màn hình':'Toàn màn hình');fullscreenButton.title=active?'Thoát toàn màn hình (F11)':'Toàn màn hình (F11)';fullscreenButton.textContent=active?'▣':'⛶';fitCanvas();});
async function loadDefaultSheet(){try{fireImage.src=fireballUrl;await fireImage.decode();sheet={frames:Object.values(fireballData.frames).map(v=>v.frame),pivot:fireballData.meta.pixelfx.pivot,ready:true};}catch(e){console.error('Fireball sheet load failed',e);}}
function loop(now){if(touchControls&&now-previous<1000/30){requestAnimationFrame(loop);return;}const dt=Math.min(.05,(now-previous)/1000||0);previous=now;if(state==='playing')update(dt);else if(state==='levelup')updateLevelup(dt);else if(state==='chestOpening')updateChestOpening(dt);render();requestAnimationFrame(loop);}
fitCanvas();loadDefaultSheet();menu();requestAnimationFrame(loop);
