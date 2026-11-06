import { hex } from 'pixelfx';
import * as fireBreath from 'pixelfx/fx/fire/fire-breath';

const C = {
  orange:hex('#f2722b'), gold:hex('#ffd05b'), pale:hex('#fff0a0'),
  white:hex('#fffbe4'), smoke:hex('#655b67'), ember:hex('#cd4827')
};

export const CHARGE_TIME = .38;
export const BREATH_TIME = 2.15;
const EXHALE_TIME = 1.25;
const TAIL_TIME = BREATH_TIME - CHARGE_TIME - EXHALE_TIME;
const smooth = u => { const x=Math.max(0,Math.min(1,u));return x*x*(3-2*x); };
export function visualAlpha(t){
  if(t<CHARGE_TIME)return 1;
  const q=t-CHARGE_TIME;
  return (.5+.5*smooth(q/.16))*(1-smooth((q-EXHALE_TIME)/TAIL_TIME));
}

export const meta = {
  name:'Charged fire breath', size:[200,140], origin:[0,70],
  duration:BREATH_TIME, loop:false, fps:60,
  options:{...fireBreath.meta.options,spread:.3,speed:480}
};

export function draw(p,t,o) {
  if(t<CHARGE_TIME){
    const u=t/CHARGE_TIME;
    p.glow(0,0,17+u*15,C.orange,.25+u*.55);
    p.ring(0,0,5+u*8,1.5,u>.7?C.pale:C.orange,.5+u*.5);
    for(let i=0;i<18;i++){
      const a=i*2.399+t*9,r=26*(1-u)+3;
      p.dot(Math.cos(a)*r,Math.sin(a)*r,i%4?C.gold:C.white);
      if(i%3===0)p.line(Math.cos(a)*(r+4),Math.sin(a)*(r+4),Math.cos(a)*r,Math.sin(a)*r,C.orange);
    }
    p.circle(0,0,2+u*4,C.white);
    return;
  }

  const q=t-CHARGE_TIME;
  if(visualAlpha(t)>0)fireBreath.draw(p,q,o);
  if(q<.12){p.glow(0,0,27,C.gold,(1-q/.12)*.9);p.circle(0,0,3,C.white);}

  const tail=smooth((q-EXHALE_TIME+.12)/.25);
  if(tail>0){
    for(let i=0;i<28;i++){
      const drift=q-EXHALE_TIME, x=18+(i*43%145)+drift*(12+i%4*8);
      const y=((i*17%39)-19)-drift*(14+i%5*6)+Math.sin(q*5+i)*3;
      const life=tail*(1-smooth((drift-.12-i%5*.035)/.4));
      if(life<=0)continue;
      if(i%3)p.disc(x,y,2+i%3,C.smoke,.16*life);
      else p.dot(x,y,i%2?C.gold:C.ember,life);
    }
  }
}
