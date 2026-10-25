/* Thème Champ stellaire — étoiles et nébuleuses procédurales (WebGL, avec repli 2D). */
window.CodexScene = { ok: true };
(()=>{'use strict';
const canvas=document.getElementById('stars'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let paused=document.hidden,raf=0,mouseX=0,mouseY=0;
const THREE=window.THREE;
if(THREE){
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x030511);const camera=new THREE.PerspectiveCamera(67,innerWidth/innerHeight,.1,500);camera.position.set(0,0,0);
const bgMaterial=new THREE.ShaderMaterial({depthWrite:false,depthTest:false,uniforms:{uTime:{value:0},uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)},uMouse:{value:new THREE.Vector2(0,0)}},vertexShader:`void main(){gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
precision highp float;uniform float uTime;uniform vec2 uResolution;uniform vec2 uMouse;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.05+7.1;a*=.5;}return v;}
void main(){vec2 uv=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;vec2 q=uv+uMouse*.035;float t=uTime*.009;vec3 p=vec3(q*1.65+vec2(.27,-.04),t);float f=fbm(p*2.8);float ridge=fbm(p*5.2+vec3(f*2.3,0.,1.));float fil=pow(smoothstep(.42,.77,f*.74+ridge*.48),1.7);float core=exp(-length((q-vec2(.19,.03))*vec2(.8,1.45))*1.55);float dark=fbm(p*3.4+13.);vec3 base=vec3(.006,.009,.024);vec3 violet=vec3(.19,.085,.33);vec3 blue=vec3(.06,.15,.31);vec3 rose=vec3(.33,.12,.24);vec3 amber=vec3(.32,.19,.13);float mixwave=smoothstep(.1,.9,fbm(p*1.4+3.));vec3 neb=mix(blue,violet,mixwave);neb=mix(neb,rose,smoothstep(.51,.78,f));neb=mix(neb,amber,smoothstep(.66,.9,ridge)*.38);float mask=fil*(.42+.8*core)*smoothstep(.28,.64,dark+.15);vec3 col=base+neb*mask*1.2;col+=vec3(.13,.13,.22)*pow(mask,2.)*.3;col*=1.-.22*length(uv);gl_FragColor=vec4(col,1.);}`});
const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),bgMaterial);quad.frustumCulled=false;quad.renderOrder=-1000;scene.add(quad);
function random(seed){let x=Math.sin(seed*127.1+78.233)*43758.5453123;return x-Math.floor(x)}
const groups=[{count:3600,min:25,max:155,size:2.2,opacity:.73},{count:1500,min:12,max:100,size:4.0,opacity:.83},{count:140,min:15,max:95,size:9,opacity:.92}];
const points=[];
groups.forEach((g,gi)=>{const pos=new Float32Array(g.count*3),col=new Float32Array(g.count*3),sizes=new Float32Array(g.count),phases=new Float32Array(g.count);
for(let i=0;i<g.count;i++){let j=i*3,z=g.min+random(i*3+gi*10000)*(g.max-g.min),x=(random(i*7+gi*30000)-.5)*z*2.8,y=(random(i*11+gi*50000)-.5)*z*1.7;pos[j]=x;pos[j+1]=y;pos[j+2]=-z;let hue=random(i*13+gi*999);let c=new THREE.Color().setRGB(hue<.12?1:hue<.45?.65:hue<.78?.76:1,hue<.12?.77:hue<.45?.76:hue<.78?.84:.9,hue<.12?.62:1);col[j]=c.r;col[j+1]=c.g;col[j+2]=c.b;sizes[i]=g.size*(.65+random(i*17+gi*100)*.85);phases[i]=random(i*23+gi*333)*6.283;}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geo.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,uniforms:{uTime:{value:0},uPixel:{value:Math.min(devicePixelRatio||1,1.7)},uOpacity:{value:g.opacity}},vertexShader:`attribute float aSize;attribute float aPhase;varying vec3 vColor;varying float vTwinkle;uniform float uTime;uniform float uPixel;void main(){vColor=color;vTwinkle=.78+.22*sin(uTime*(.6+aPhase*.12)+aPhase);vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uPixel*65./max(12.,-mv.z),1.,18.);}`,fragmentShader:`precision mediump float;varying vec3 vColor;varying float vTwinkle;uniform float uOpacity;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);float core=exp(-d*d*110.);float halo=exp(-d*d*16.)*.25;float cross=exp(-abs(p.x)*35.)*exp(-abs(p.y)*4.)+exp(-abs(p.y)*35.)*exp(-abs(p.x)*4.);float a=(core+halo+cross*.09)*uOpacity*vTwinkle;if(d>.5)discard;gl_FragColor=vec4(vColor*a,a);}`});
const obj=new THREE.Points(geo,mat);obj.frustumCulled=false;scene.add(obj);points.push({obj,mat,base:g.opacity});});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();bgMaterial.uniforms.uResolution.value.set(innerWidth,innerHeight)}resize();addEventListener('resize',resize);
addEventListener('pointermove',e=>{mouseX=e.clientX/innerWidth-.5;mouseY=e.clientY/innerHeight-.5},{passive:true});
const CFG={speed:1,bright:1,parallax:1};let tAcc=0,lastMs=0;window.CodexStellarCfg=CFG;function frame(ms){if(paused)return;tAcc+=Math.max(0,Math.min(ms-lastMs,100))*.001*CFG.speed;lastMs=ms;let t=reduced?0:tAcc;bgMaterial.uniforms.uTime.value=t;bgMaterial.uniforms.uMouse.value.set(mouseX,mouseY);camera.rotation.y+=(mouseX*.055*CFG.parallax-camera.rotation.y)*.018;camera.rotation.x+=(-mouseY*.035*CFG.parallax-camera.rotation.x)*.018;camera.position.x=reduced?0:Math.sin(t*.025)*1.5;camera.position.y=reduced?0:Math.cos(t*.02)*.65;points.forEach((p,i)=>{p.mat.uniforms.uTime.value=t;p.mat.uniforms.uOpacity.value=p.base*CFG.bright;p.obj.rotation.z=reduced?0:Math.sin(t*.008+i)*.007});renderer.render(scene,camera);if(!reduced)raf=requestAnimationFrame(frame)}frame(performance.now());document.addEventListener('visibilitychange',()=>{paused=document.hidden;if(!paused){cancelAnimationFrame(raf);lastMs=performance.now();frame(lastMs)}});
}else{const ctx=canvas.getContext('2d');function fallback(){canvas.width=innerWidth;canvas.height=innerHeight;ctx.fillStyle='#080c21';ctx.fillRect(0,0,canvas.width,canvas.height);for(let i=0;i<1000;i++){let x=randomFallback(i*2)*canvas.width,y=randomFallback(i*2+1)*canvas.height;ctx.fillStyle='rgba(190,195,255,'+(.2+randomFallback(i*3)*.6)+')';ctx.fillRect(x,y,1.2,1.2)}}function randomFallback(i){let x=Math.sin(i*78.233)*43758.5453;return x-Math.floor(x)}fallback();addEventListener('resize',fallback);}

/* Liaison avec l'interface commune */
const Codex=window.Codex;

Codex.on('navigate',e=>{if(e.direct)return;if(e.id)Codex.reader.open(e.id);else Codex.reader.close()});
})();

/* Réglages (carte de personnalisation commune) */
(function(){var C=window.Codex;if(!C||!C.customize||!window.CodexStellarCfg)return;var CFG=window.CodexStellarCfg,p=C.customize.pop();
function range(id,label,min,max,step,key){var d=document.createElement('div');d.innerHTML='<label class="cx-l" for="'+id+'">'+label+'</label><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+CFG[key]+'">';d.querySelector('input').addEventListener('input',function(e){CFG[key]=parseFloat(e.target.value)});p.appendChild(d)}
range('cs-speed','Vitesse de dérive',0,3,.1,'speed');range('cs-bright','Éclat des étoiles',.3,1.6,.05,'bright');range('cs-par','Parallaxe (souris)',0,3,.1,'parallax')})();

/* Le ciel vu de la Terre : Voie lactée, constellation des rubriques, étoiles filantes */
(function(){
var C=window.Codex; if(!C) return;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Voie lactée : bruit fractal en bande diagonale, couloirs de poussière, noyau plus chaud (une seule fois) */
(function(){
  var cv=document.getElementById('cs-mw'); if(!cv) return;
  var w=420,h=236; cv.width=w; cv.height=h; var g=cv.getContext('2d'), im=g.createImageData(w,h), d=im.data;
  function hash(x,y){var n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)}
  function vn(x,y){var ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);var a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),e=hash(ix+1,iy+1);return a+(b-a)*fx+(c-a)*fy+(a-b-c+e)*fx*fy}
  function fbm(x,y){var v=0,a=.5;for(var i=0;i<6;i++){v+=a*vn(x,y);x=x*2.03+11.3;y=y*2.03+4.7;a*=.5}return v}
  var ang=-.42, ca=Math.cos(ang), sa=Math.sin(ang);
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){
    var u=(x/w-.5)*1.78, v=(y/h-.46), s=u*ca+v*sa, t=-u*sa+v*ca;           // s le long de la bande, t en travers
    var wob=(fbm(s*2.2+3,t*2.2)-.5)*.16, tt=t+wob;
    var band=Math.exp(-tt*tt/(2*.085*.085)), wide=Math.exp(-tt*tt/(2*.22*.22));
    var cloud=fbm(s*5+9,t*5+2), fine=fbm(s*14,t*14);
    var dust=Math.max(0,fbm(s*7+30,t*9+5)-.5)*2.4*Math.exp(-tt*tt/(2*.07*.07));
    var core=Math.exp(-(s+.1)*(s+.1)/(2*.35*.35));
    var I=(band*(.55+.9*cloud)+wide*.18*cloud)*(.5+.7*core)*(.75+.5*fine)-dust*.9; I=Math.max(0,I)*.52;
    var k=(y*w+x)*4, warm=core*band;
    d[k]=Math.min(255,(150+90*warm)*I*1.5); d[k+1]=Math.min(255,(165+40*warm)*I*1.5); d[k+2]=Math.min(255,(200-50*warm)*I*1.5); d[k+3]=255;
  }
  g.putImageData(im,0,0);
})();
/* constellation des rubriques */
var box=document.getElementById('cs-const'), svg=document.getElementById('cs-lines'); if(!box) return;
var STARS=[{id:'atelier',n:'Atelier',x:.50,y:.30,c:'#ffb48a'},{id:'lab',n:'Laboratoire',x:.585,y:.52,c:'#bff0d0'},{id:'codex',n:'Codex',x:.675,y:.34,c:'#dfe8ff'},{id:'dashb',n:'Observatoire',x:.775,y:.56,c:'#9ec8ff'},{id:'profil',n:'Portrait',x:.86,y:.32,c:'#fff0c8'}];
var NS='http://www.w3.org/2000/svg', els=[], lines=[];
STARS.forEach(function(s,i){
  var d=document.createElement('div'); d.className='cs-star'; d.style.setProperty('--c',s.c); d.style.setProperty('--tw',(2.6+i*.55)+'s');
  d.innerHTML='<button type="button" aria-label="'+s.n+'"></button><span class="core"></span><span class="lab">'+s.n+'</span>';
  d.querySelector('button').addEventListener('click',function(){C.navigate(s.id)}); box.appendChild(d); els.push(d);
  if(i){var l=document.createElementNS(NS,'line'); svg.appendChild(l); lines.push(l)}
});
function place(){var W=innerWidth,H=innerHeight,mob=W<800;
  STARS.forEach(function(s,i){var x=mob?(.15+s.x*.7)*W:s.x*W, y=mob?(.42+(s.y-.3)*1.0)*H:s.y*H; s._x=x; s._y=y; els[i].style.transform='translate('+x+'px,'+y+'px)'});
  lines.forEach(function(l,i){l.setAttribute('x1',STARS[i]._x);l.setAttribute('y1',STARS[i]._y);l.setAttribute('x2',STARS[i+1]._x);l.setAttribute('y2',STARS[i+1]._y)});
}
place(); addEventListener('resize',place);
addEventListener('pointermove',function(e){if(reduce)return;box.style.transform='translate('+((e.clientX/innerWidth-.5)*-10)+'px,'+((e.clientY/innerHeight-.5)*-7)+'px)'},{passive:true});
/* étoiles filantes */
var fx=document.getElementById('cs-fx'); if(!fx||reduce) return; var g=fx.getContext('2d'), m=null, W=0,H=0;
function rs(){W=fx.width=innerWidth;H=fx.height=innerHeight} rs(); addEventListener('resize',rs);
function spawn(){var a=.35+Math.random()*.4; m={x:Math.random()*W*.8+W*.1,y:Math.random()*H*.35,vx:Math.cos(a)*(900+Math.random()*500),vy:Math.sin(a)*(900+Math.random()*500),t:0,life:.55+Math.random()*.4}}
var next=4+Math.random()*6, last=performance.now();
(function loop(now){requestAnimationFrame(loop); var dt=Math.min(.05,(now-last)/1000); last=now; if(document.hidden) return;
  g.clearRect(0,0,W,H); if(document.documentElement.classList.contains('reading')) return;
  next-=dt; if(next<0&&!m){spawn(); next=7+Math.random()*13}
  if(m){m.t+=dt; m.x+=m.vx*dt; m.y+=m.vy*dt; var p=m.t/m.life, a=Math.sin(Math.min(1,p)*Math.PI); var L=Math.hypot(m.vx,m.vy)*.09, nx=m.vx/Math.hypot(m.vx,m.vy), ny=m.vy/Math.hypot(m.vx,m.vy);
    var gr=g.createLinearGradient(m.x,m.y,m.x-nx*L,m.y-ny*L); gr.addColorStop(0,'rgba(255,255,255,'+(.95*a)+')'); gr.addColorStop(1,'rgba(180,200,255,0)'); g.strokeStyle=gr; g.lineWidth=1.6; g.beginPath(); g.moveTo(m.x,m.y); g.lineTo(m.x-nx*L,m.y-ny*L); g.stroke();
    if(m.t>m.life) m=null}
})(performance.now());
})();
