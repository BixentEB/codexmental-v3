/* Thème Héliosphère — scène 3D du système solaire (importée de v2 ; le lecteur est celui de l'interface commune). */
window.CodexScene = { ok: true };
/* ===================== GLSL partagé ===================== */
var GLSL_COMMON = [
'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
'float snoise(vec3 v){',
'  const vec2 C=vec2(1.0/6.0,1.0/3.0);',
'  const vec4 D=vec4(0.0,0.5,1.0,2.0);',
'  vec3 i=floor(v+dot(v,C.yyy));',
'  vec3 x0=v-i+dot(i,C.xxx);',
'  vec3 g=step(x0.yzx,x0.xyz);',
'  vec3 l=1.0-g;',
'  vec3 i1=min(g.xyz,l.zxy);',
'  vec3 i2=max(g.xyz,l.zxy);',
'  vec3 x1=x0-i1+C.xxx;',
'  vec3 x2=x0-i2+C.yyy;',
'  vec3 x3=x0-D.yyy;',
'  i=mod289(i);',
'  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
'  float n_=0.142857142857;',
'  vec3 ns=n_*D.wyz-D.xzx;',
'  vec4 j=p-49.0*floor(p*ns.z*ns.z);',
'  vec4 x_=floor(j*ns.z);',
'  vec4 y_=floor(j-7.0*x_);',
'  vec4 x=x_*ns.x+ns.yyyy;',
'  vec4 y=y_*ns.x+ns.yyyy;',
'  vec4 h=1.0-abs(x)-abs(y);',
'  vec4 b0=vec4(x.xy,y.xy);',
'  vec4 b1=vec4(x.zw,y.zw);',
'  vec4 s0=floor(b0)*2.0+1.0;',
'  vec4 s1=floor(b1)*2.0+1.0;',
'  vec4 sh=-step(h,vec4(0.0));',
'  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;',
'  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
'  vec3 p0=vec3(a0.xy,h.x);',
'  vec3 p1=vec3(a0.zw,h.y);',
'  vec3 p2=vec3(a1.xy,h.z);',
'  vec3 p3=vec3(a1.zw,h.w);',
'  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
'  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
'  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);',
'  m=m*m;',
'  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
'}',
'float hash13(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}',
'vec3 hash33(vec3 p3){p3=fract(p3*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yxz+33.33);return fract((p3.xxy+p3.yxx)*p3.zyx);}',
/* fbm dont les octaves fines s\'estompent selon l\'empreinte du pixel (fp), pour éviter le scintillement à distance */
'float fbm(vec3 p,float fp){',
'  float s=0.0,a=0.5;',
'  for(int i=0;i<6;i++){',
'    float k=1.0-smoothstep(0.4,1.1,fp);',
'    s+=a*k*snoise(p);',
'    p=p*2.03+vec3(1.7,9.2,3.1);fp*=2.03;a*=0.5;',
'  }',
'  return s;',
'}',
'vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x-s*v.z,v.y,s*v.x+c*v.z);}',
'float ringDensity(float t){',
'  float n=snoise(vec3(t*60.0,3.7,0.0))*0.5+0.5;',
'  float n2=snoise(vec3(t*170.0,1.3,5.0))*0.5+0.5;',
'  float d=0.22+0.55*n+0.35*n2*n2;',
'  d*=smoothstep(0.0,0.04,t)*(1.0-smoothstep(0.95,1.0,t));',
'  d*=mix(0.04,1.0,smoothstep(0.0,0.03,abs(t-0.64)));',
'  d*=mix(0.35,1.0,smoothstep(0.24,0.30,t));',
'  return clamp(d,0.0,1.0);',
'}'
].join('\n');

/* ===================== Planètes ===================== */
var PLANET_VERT = [
'varying vec3 vObj; varying vec3 vWPos; varying vec3 vWN;',
'void main(){',
'  vObj=normalize(position);',
'  vec4 wp=modelMatrix*vec4(position,1.0);',
'  vWPos=wp.xyz;',
'  vWN=normalize(mat3(modelMatrix)*normal);',
'  gl_Position=projectionMatrix*viewMatrix*wp;',
'}'
].join('\n');

var PLANET_FRAG = [
'uniform float uType,uScale,uSeed,uTime,uRelief,uCloud,uCity,uBands,uWarp,uStorm,uIce,uSea,uAtmoK,uGloss,uStormLat,uStormLon,uRadius;',
'uniform vec3 uC0,uC1,uC2,uC3,uC4,uAtmo,uRingN,uCenter;',
'uniform vec2 uRing;',
'varying vec3 vObj; varying vec3 vWPos; varying vec3 vWN;',
GLSL_COMMON,
'float craters(vec3 p,float freq,float fw){',
'  vec3 q=p*freq; vec3 ip=floor(q); vec3 fq=q-ip;',
'  float vis=1.0-smoothstep(0.25,0.8,fw*freq);',
'  float h=0.0;',
'  for(int x=-1;x<=1;x++){ for(int y=-1;y<=1;y++){ for(int z=-1;z<=1;z++){',
'    vec3 g=vec3(float(x),float(y),float(z));',
'    vec3 o=hash33(ip+g);',
'    float has=step(0.42,hash13(ip+g+17.3));',
'    float r=0.16+0.30*o.z;',
'    vec3 c=g+0.2+0.6*o-fq;',
'    float d=length(c)/r;',
'    float bowl=-(1.0-smoothstep(0.15,1.0,d));',
'    float rim=exp(-pow((d-1.02)*5.5,2.0))*0.55;',
'    h+=has*(bowl+rim)*(0.4+r*1.6);',
'  }}}',
'  return h*vis;',
'}',
'vec3 bumpN(vec3 P,vec3 N,float h){',
'  vec3 dpdx=dFdx(P); vec3 dpdy=dFdy(P);',
'  float dhx=dFdx(h); float dhy=dFdy(h);',
'  vec3 r1=cross(dpdy,N); vec3 r2=cross(N,dpdx);',
'  float det=dot(dpdx,r1);',
'  vec3 grad=sign(det)*(dhx*r1+dhy*r2);',
'  return normalize(abs(det)*N-grad);',
'}',
'void main(){',
'  vec3 Ng=normalize(vWN);',
'  vec3 V=normalize(cameraPosition-vWPos);',
'  vec3 L=normalize(-vWPos);',
'  float fw=length(fwidth(vObj));',
'  float ndlG=dot(Ng,L);',
'  vec3 alb=vec3(0.5); float h=0.0; float oceanMask=0.0; float cloudA=0.0; vec3 emis=vec3(0.0);',
'  if(uType<0.5){',
/* --- Corps rocheux sans atmosphère (cratères) --- */
'    vec3 pp=vObj*uScale+uSeed;',
'    float fs=fw*uScale;',
'    float big=fbm(pp*0.8,fs*0.8);',
'    float det=fbm(pp*3.0,fs*3.0);',
'    float cr=craters(vObj+uSeed*0.37,3.2,fw)*0.9+craters(vObj+uSeed,10.0,fw)*0.6;',
'    h=cr*0.9+det*0.25+big*0.2;',
'    alb=mix(uC0,uC1,0.5+0.5*det);',
'    alb=mix(alb,uC2,smoothstep(0.02,0.32,big)*uIce);',
'    alb*=0.84+0.34*smoothstep(-0.25,0.6,cr);',
'    alb=mix(alb,uC3,smoothstep(0.35,1.0,cr)*0.28);',
'  } else if(uType<1.5){',
/* --- Monde désertique (type Mars) --- */
'    vec3 pp=vObj*uScale+uSeed;',
'    float fs=fw*uScale;',
'    float cont=fbm(pp,fs);',
'    float det=fbm(pp*4.0,fs*4.0);',
'    float cr=craters(vObj+uSeed,6.0,fw)*0.45;',
'    h=cont*0.5+det*0.2+cr;',
'    alb=mix(uC0,uC1,smoothstep(-0.3,0.5,cont));',
'    alb=mix(alb,uC2,smoothstep(0.05,0.5,-cont)*0.85);',
'    alb*=0.88+0.24*det;',
'    float cap=smoothstep(0.88-0.05*cont,0.95,abs(vObj.y))*uIce;',
'    alb=mix(alb,vec3(0.92,0.94,0.97),cap);',
'  } else if(uType<2.5){',
/* --- Monde océanique avec nuages (type Terre) --- */
'    vec3 pp=vObj*uScale+uSeed;',
'    float fs=fw*uScale;',
'    float e=fbm(pp,fs)+0.45*fbm(pp*2.3+3.1,fs*2.3);',
'    float lat=abs(vObj.y);',
'    float land=smoothstep(uSea,uSea+0.015,e);',
'    float elev=max(e-uSea,0.0);',
'    float depth=clamp((uSea-e)*2.2,0.0,1.0);',
'    vec3 ocean=mix(uC1,uC0,smoothstep(0.0,0.9,depth));',
'    float dry=smoothstep(0.05,0.4,fbm(pp*1.4+11.0,fs*1.4))*(1.0-smoothstep(0.35,0.7,lat));',
'    vec3 gr=mix(uC2,uC3,smoothstep(0.05,0.6,elev));',
'    vec3 landc=mix(gr,uC4,dry*0.85);',
'    landc=mix(landc,vec3(0.95),smoothstep(0.62,0.9,elev+lat*0.35));',
'    float ice=smoothstep(0.82+0.05*e,0.93,lat)*uIce;',
'    alb=mix(ocean,landc,land);',
'    alb=mix(alb,vec3(0.93,0.95,0.98),ice);',
'    h=land*elev*1.6;',
'    oceanMask=(1.0-land)*(1.0-ice);',
'    vec3 cp=rotY(vObj,-uTime*0.012)*2.3+5.0;',
'    float cf=fw*2.3;',
'    float cn=fbm(cp,cf)+0.5*fbm(cp*2.1+4.0,cf*2.1);',
'    float t0=0.30-0.5*uCloud;',
'    cloudA=smoothstep(t0,t0+0.4,cn);',
'    alb=mix(alb,vec3(1.0),cloudA*0.92);',
'    oceanMask*=(1.0-cloudA);',
'    float night=1.0-smoothstep(-0.2,0.08,ndlG);',
'    float cityN=fbm(vObj*38.0+uSeed,fw*38.0);',
'    float cityMask=smoothstep(0.18,0.42,cityN)*smoothstep(0.1,0.35,fbm(vObj*5.0+uSeed*2.0,fw*5.0)+0.1)*land*(1.0-ice)*(1.0-smoothstep(0.7,0.85,lat));',
'    emis=vec3(1.0,0.72,0.36)*cityMask*night*uCity*(1.0-cloudA*0.85)*1.4;',
'    h*=(1.0-cloudA*0.8);',
'  } else {',
/* --- Géante gazeuse / glacée : bandes, turbulences, tempête --- */
'    float lat=vObj.y;',
'    float ang=uTime*0.02*(0.6+sin(lat*uBands*0.7));',
'    vec3 q=rotY(vObj,ang);',
'    float w=fbm(q*vec3(2.0,8.0,2.0)+uSeed,fw*8.0);',
'    float y=lat+uWarp*w;',
'    float b1=0.5+0.5*sin(y*uBands*3.14159+1.7*sin(y*uBands*0.9));',
'    float b2=0.5+0.5*snoise(vec3(0.0,y*uBands*0.8,uSeed));',
'    float fine=fbm(q*vec3(2.5,24.0,2.5)+uSeed*2.0,fw*24.0);',
'    float t=clamp(b1*0.55+b2*0.45+fine*0.12,0.0,1.0);',
'    alb=t<0.5?mix(uC0,uC1,t*2.0):mix(uC1,uC2,(t-0.5)*2.0);',
'    alb=mix(alb,uC3,smoothstep(0.7,1.0,fine*0.5+0.5)*0.25);',
'    if(uStorm>0.0){',
'      float lon=atan(vObj.z,vObj.x);',
'      float dl=mod(lon-uStormLon+3.14159,6.28318)-3.14159;',
'      float dy=lat-uStormLat;',
'      float d2=(dl*dl)/(0.30*0.30)+(dy*dy)/(0.10*0.10);',
'      float st=1.0-smoothstep(0.15,1.0,d2);',
'      alb=mix(alb,uC4,st*uStorm*(0.65+0.35*fbm(vObj*14.0+uSeed,fw*14.0)));',
'    }',
'    alb*=1.0-0.25*smoothstep(0.75,1.0,abs(lat));',
'  }',
'  vec3 N=Ng;',
'  if(uRelief>0.0){',
'    vec3 Nb=bumpN(vWPos,Ng,h*uRelief);',
'    N=normalize(mix(Ng,Nb,smoothstep(0.05,0.35,dot(Ng,V))));',
'  }',
'  float ndl=dot(N,L);',
'  float soft=mix(max(ndl,0.0),smoothstep(-0.12,0.9,ndl),uAtmoK*0.6);',
'  float shadow=1.0;',
'  if(uRing.y>0.0){',
'    float dn=dot(L,uRingN);',
'    if(abs(dn)>0.002){',
'      float tt=dot(uCenter-vWPos,uRingN)/dn;',
'      if(tt>0.0){',
'        vec3 hp=vWPos+L*tt;',
'        float rr=length(hp-uCenter)/uRadius;',
'        if(rr>uRing.x&&rr<uRing.y){',
'          float rt=(rr-uRing.x)/(uRing.y-uRing.x);',
'          shadow*=1.0-0.85*ringDensity(rt);',
'        }',
'      }',
'    }',
'  }',
'  float lit=soft*shadow;',
'  // Faible lumiere ambiante pour conserver le volume de la face nocturne.',
'  // Lumiere de remplissage douce uniquement sur la face nocturne visible.',
'  float nightFill=(1.0-smoothstep(-0.12,0.28,ndlG))*0.19;',
'  float facing=0.55+0.45*max(dot(Ng,V),0.0);',
'  vec3 col=alb*(lit*1.35+0.045+nightFill*facing);',
'  vec3 Hh=normalize(L+V);',
'  float spec=pow(max(dot(N,Hh),0.0),120.0)*oceanMask*uGloss*max(ndlG,0.0)*shadow;',
'  col+=vec3(1.0,0.95,0.85)*spec*1.4;',
'  col+=emis;',
'  float rim=pow(1.0-max(dot(Ng,V),0.0),3.0);',
'  float litG=smoothstep(-0.2,0.5,ndlG);',
'  col+=uAtmo*rim*litG*uAtmoK*1.25;',
'  float tw=exp(-pow(ndlG*4.0,2.0));',
'  col+=uAtmo*vec3(1.0,0.55,0.35)*rim*tw*uAtmoK*0.5;',
'  gl_FragColor=vec4(col,1.0);',
'}'
].join('\n');

/* Anneaux */
var RING_VERT = [
'varying float vRad; varying vec3 vWPos;',
'void main(){',
'  vRad=length(position.xy);',
'  vec4 wp=modelMatrix*vec4(position,1.0);',
'  vWPos=wp.xyz;',
'  gl_Position=projectionMatrix*viewMatrix*wp;',
'}'
].join('\n');

var RING_FRAG = [
'uniform vec3 uCenter,uRingN; uniform float uRadius,uIn,uOut;',
'varying float vRad; varying vec3 vWPos;',
GLSL_COMMON,
'void main(){',
'  float t=(vRad-uIn)/(uOut-uIn);',
'  float d=ringDensity(t);',
'  vec3 L=normalize(-vWPos);',
'  vec3 V=normalize(cameraPosition-vWPos);',
'  vec3 c=uCenter-vWPos;',
'  float tt=dot(c,L);',
'  float sh=1.0;',
'  if(tt>0.0){ float dist=length(c-L*tt); sh=smoothstep(uRadius*0.97,uRadius*1.03,dist); }',
'  float side=abs(dot(uRingN,L));',
'  float amt=0.25+0.9*side;',
'  float opp=step(dot(uRingN,L)*dot(uRingN,V),0.0);',
'  vec3 base=mix(vec3(0.50,0.42,0.32),vec3(0.90,0.82,0.68),smoothstep(0.2,0.9,d));',
'  vec3 col=base*amt*(0.06+0.94*sh)*1.5;',
'  float alpha=d*0.92*mix(1.0,0.8,opp);',
'  gl_FragColor=vec4(col,alpha);',
'}'
].join('\n');

/* Atmosphère (halo au limbe) */
var ATMO_VERT = [
'varying vec3 vN; varying vec3 vWPos;',
'void main(){',
'  vN=normalize(mat3(modelMatrix)*normal);',
'  vec4 wp=modelMatrix*vec4(position,1.0);',
'  vWPos=wp.xyz;',
'  gl_Position=projectionMatrix*viewMatrix*wp;',
'}'
].join('\n');

var ATMO_FRAG = [
'uniform vec3 uAtmo; uniform float uK,uCmax;',
'varying vec3 vN; varying vec3 vWPos;',
'void main(){',
'  vec3 N=normalize(vN);',
'  vec3 V=normalize(cameraPosition-vWPos);',
'  vec3 L=normalize(-vWPos);',
'  float x=clamp(-dot(N,V)/uCmax,0.0,1.0);',
'  float a=pow(x,2.6);',
'  float lit=smoothstep(-0.35,0.45,dot(N,L));',
'  gl_FragColor=vec4(uAtmo*a*lit*uK,1.0);',
'}'
].join('\n');

/* Soleil */
var SUN_VERT = [
'varying vec3 vObj; varying vec3 vN; varying vec3 vV;',
'void main(){',
'  vObj=normalize(position);',
'  vN=normalize(normalMatrix*normal);',
'  vec4 mv=modelViewMatrix*vec4(position,1.0);',
'  vV=-mv.xyz;',
'  gl_Position=projectionMatrix*mv;',
'}'
].join('\n');

var SUN_FRAG = [
'uniform float uTime;',
'varying vec3 vObj; varying vec3 vN; varying vec3 vV;',
GLSL_COMMON,
'vec3 ramp(float h){',
'  vec3 a=vec3(0.45,0.08,0.0); vec3 b=vec3(0.95,0.32,0.02); vec3 c=vec3(1.0,0.66,0.18); vec3 d=vec3(1.0,0.93,0.65);',
'  if(h<0.4) return mix(a,b,h/0.4);',
'  if(h<0.7) return mix(b,c,(h-0.4)/0.3);',
'  return mix(c,d,clamp((h-0.7)/0.3,0.0,1.0));',
'}',
'void main(){',
'  float t=uTime;',
'  vec3 p=rotY(vObj,t*0.02);',
'  float fw=length(fwidth(vObj));',
'  float g1=fbm(p*5.0+vec3(0.0,0.0,t*0.05),fw*5.0);',
'  float g2=snoise(p*22.0+vec3(t*0.2,0.0,0.0))*(1.0-smoothstep(0.2,0.8,fw*22.0));',
'  float g3=snoise(p*60.0+vec3(0.0,t*0.3,0.0))*(1.0-smoothstep(0.2,0.8,fw*60.0));',
'  float spot=smoothstep(0.30,0.55,fbm(p*1.6+vec3(4.0),fw*1.6));',
'  float heat=0.64+0.17*g1+0.09*g2+0.04*g3-0.34*spot;',
'  float mu=clamp(dot(normalize(vN),normalize(vV)),0.0,1.0);',
'  float limb=0.38+0.62*pow(mu,0.5);',
'  heat*=limb;',
'  vec3 col=ramp(clamp(heat,0.0,1.0));',
'  col*=1.25+1.1*pow(clamp(heat,0.0,1.0),3.0);',
'  gl_FragColor=vec4(col,1.0);',
'}'
].join('\n');

/* Ciel : bake équirectangulaire de la Voie lactée */
var SKY_VERT = [
'varying vec2 vUv;',
'void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }'
].join('\n');

var SKY_FRAG = [
'varying vec2 vUv;',
GLSL_COMMON,
'void main(){',
'  float lon=(vUv.x-0.5)*6.28318; float lat=(vUv.y-0.5)*3.14159;',
'  vec3 d=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));',
'  vec3 nG=normalize(vec3(0.32,0.88,0.34));',
'  float g=dot(d,nG);',
'  float band=exp(-g*g*14.0);',
'  float core=exp(-g*g*60.0);',
'  vec3 q=d*3.0;',
'  float n1=fbm(q,0.0)*0.5+0.5;',
'  float n2=fbm(q*2.3+7.0,0.0)*0.5+0.5;',
'  float dust=smoothstep(0.45,0.8,fbm(q*1.7+3.0,0.0)*0.5+0.5);',
'  vec3 gc=normalize(cross(nG,vec3(0.0,1.0,0.1)));',
'  float cen=pow(max(dot(d,gc),0.0),3.0);',
'  float glow=band*(0.10+0.16*n1)+core*(0.12+0.25*cen)*(0.5+n2);',
'  glow*=1.0-0.75*dust*band;',
'  vec3 warm=vec3(1.0,0.78,0.55); vec3 cool=vec3(0.55,0.65,1.0);',
'  vec3 col=mix(cool,warm,clamp(core*1.5+cen*0.6,0.0,1.0))*glow*0.55;',
'  float neb=fbm(d*1.4+21.0,0.0)*0.5+0.5;',
'  col+=vec3(0.30,0.12,0.45)*smoothstep(0.55,0.85,neb)*0.05;',
'  col+=vec3(0.05,0.15,0.35)*smoothstep(0.5,0.9,fbm(d*1.1+40.0,0.0)*0.5+0.5)*0.05;',
'  col+=0.004;',
'  gl_FragColor=vec4(col,1.0);',
'}'
].join('\n');

/* Étoiles */
var STAR_VERT = [
'attribute float aSize; attribute vec3 aColor; uniform float uPR; varying vec3 vC;',
'void main(){ vC=aColor; gl_PointSize=aSize*uPR; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
].join('\n');
var STAR_FRAG = [
'varying vec3 vC;',
'void main(){ float d=length(gl_PointCoord-0.5); float a=1.0-smoothstep(0.0,0.5,d); a*=a; gl_FragColor=vec4(vC*a,1.0); }'
].join('\n');

/* Passe finale : tonemapping filmique, vignette, grain */
var FINAL_VERT = [
'varying vec2 vUv;',
'void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
].join('\n');
var FINAL_FRAG = [
'uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;',
'float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }',
'void main(){',
'  vec3 c=texture2D(tDiffuse,vUv).rgb;',
'  c=aces(c*0.92);',
'  vec2 d=vUv-0.5;',
'  c*=1.0-dot(d,d)*0.85;',
'  float g=h21(vUv*uRes+fract(uTime)*91.7)-0.5;',
'  c+=g*0.022;',
'  gl_FragColor=vec4(c,1.0);',
'}'
].join('\n');

/* export pour le test de compilation */
window.__GLSL = { PLANET_VERT: PLANET_VERT, PLANET_FRAG: PLANET_FRAG, RING_VERT: RING_VERT, RING_FRAG: RING_FRAG, ATMO_VERT: ATMO_VERT, ATMO_FRAG: ATMO_FRAG, SUN_VERT: SUN_VERT, SUN_FRAG: SUN_FRAG, SKY_VERT: SKY_VERT, SKY_FRAG: SKY_FRAG, STAR_VERT: STAR_VERT, STAR_FRAG: STAR_FRAG, FINAL_VERT: FINAL_VERT, FINAL_FRAG: FINAL_FRAG };
(function () {
  'use strict';
  var TAU = Math.PI * 2, DEG = Math.PI / 180;
  var Codex = window.Codex;
  var stage = document.getElementById('stage');
  var labelsEl = document.getElementById('labels');
  var tabsEl = null;
  var loadingEl = document.getElementById('loading');

  function fail(msg) { loadingEl.textContent = msg; loadingEl.classList.remove('done'); window.CodexScene.ok = false; }
  var T = window.THREE;
  if (!T || !T.OrbitControls || !T.EffectComposer || !T.UnrealBloomPass || !T.ShaderPass) {
    fail("Impossible de charger le moteur 3D. Vérifiez votre connexion et rechargez la page.");
    return;
  }
  var renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  } catch (err) {
    fail("Votre navigateur ne permet pas d'afficher la 3D (WebGL indisponible).");
    return;
  }

  var CODEX_LINKS = {codex:'../../codex.html',atelier:'../../atelier/atelier.html',lab:'../../lab/index.html',dashb:'../../dashb/index.html',profil:'../../profil/index.html'};
  var SECTIONS = {
    home:    { name: 'Accueil', sub: '', rgb: '255,178,62', text: "Chaque planète est une section du site. Glissez pour tourner, zoomez, puis cliquez une planète pour voler jusqu'à elle." },
    codex:   { name: 'Codex', sub: '', rgb: '190,205,255', text: "Le blog : articles et réflexions sur l’IA, la psychologie, la philosophie et l’esprit. Un monde argenté, creusé de cratères." },
    atelier: { name: 'Atelier', sub: '', rgb: '255,150,50', text: "Le lieu où je range mes idées farfelues : la cryodynamique, Polaris et autres explorations. Un monde rouille, avec deux petites lunes." },
    lab:     { name: 'Laboratoire', sub: 'Applications', rgb: '60,230,140', text: "La vitrine de mes créations : outils, personnalisations CSS et applications. Une géante verte sous un voile de gaz." },
    dashb:   { name: 'Observatoire', sub: 'Tableau de bord', rgb: '60,160,255', text: "Un espace d’exploration astronomique : cartes célestes, observations, visualisations et hypothèses personnelles accompagnées de croquis." },
    profil:  { name: 'Portrait', sub: 'Découverte', rgb: '205,218,255', text: "Un espace pour découvrir mon parcours, mes inspirations, mes valeurs et les différentes facettes de CODEX Mental." }
  };

  /* Objets d'information : ils ne mènent à aucune rubrique, mais on peut s'en approcher et lire une courte fiche. */
  SECTIONS.asteroides = { info: 1, name: 'Ceinture d’astéroïdes', sub: 'Entre Mars et Jupiter', rgb: '190,170,140', text: "Entre Mars et Jupiter, des débris rocheux que l’attraction de Jupiter a empêchés de s’assembler en planète." };
  SECTIONS.ceres = { info: 1, name: 'Cérès', sub: 'Planète naine', rgb: '170,165,155', text: "Planète naine de la ceinture principale, d’environ 940 km de diamètre. Elle concentre à elle seule à peu près un tiers de la masse de la ceinture d’astéroïdes." };
  SECTIONS.kuiper = { info: 1, name: 'Ceinture de Kuiper', sub: 'Au-delà de Neptune', rgb: '150,185,255', text: "Un vaste anneau de corps glacés au-delà de Neptune, d’environ 30 à 50 unités astronomiques. Pluton, Hauméa et Makémaké en font partie." };
  SECTIONS.haumea = { info: 1, name: 'Hauméa', sub: 'Planète naine', rgb: '210,220,240', text: "Planète naine de la ceinture de Kuiper, étirée par une rotation de moins de quatre heures. Elle possède deux lunes et un anneau." };
  SECTIONS.makemake = { info: 1, name: 'Makémaké', sub: 'Planète naine', rgb: '220,150,110', text: "Planète naine de la ceinture de Kuiper, découverte en 2005. Sa surface rougeâtre est couverte de glace de méthane." };
  SECTIONS.eris = { info: 1, name: 'Éris', sub: 'Planète naine', rgb: '225,230,240', text: "Planète naine du disque diffus, de la taille de Pluton mais un peu plus massive. Sa découverte, en 2005, a relancé le débat qui a conduit à redéfinir le mot « planète »." };
  SECTIONS.d2 = { info: 1, name: 'Vénus', sub: 'Planète', rgb: '235,205,150', text: "Deuxième planète du Système solaire, enveloppée d’une épaisse atmosphère de gaz carbonique. Sa surface atteint environ 460 °C : c’est la plus chaude de toutes les planètes." };
  SECTIONS.d3 = { info: 1, name: 'Jupiter', sub: 'Planète géante', rgb: '225,190,150', text: "La plus grande planète du Système solaire : plus de 1 300 Terres tiendraient dans son volume. Sa Grande Tache rouge est une tempête observée depuis plus de trois siècles." };
  SECTIONS.neptune = { info: 1, name: 'Neptune', sub: 'Planète géante de glace', rgb: '90,140,235', text: "Dernière planète du Système solaire, d’un bleu profond. Ses vents comptent parmi les plus rapides connus, au-delà de 2 000 km/h." };
  SECTIONS.pluto = { info: 1, name: 'Pluton', sub: 'Planète naine', rgb: '215,190,170', text: "Planète naine de la ceinture de Kuiper, d’environ 2 380 km de diamètre, reclassée en 2006. Son orbite très inclinée l’amène parfois plus près du Soleil que Neptune." };
  SECTIONS.planet9 = { info: 1, name: 'Planète 9', sub: 'Hypothétique', rgb: '150,165,255', text: "Hypothèse : l’orbite inhabituelle de certains objets lointains pourrait trahir une planète de 5 à 10 masses terrestres, à plusieurs centaines d’unités astronomiques. Elle n’a jamais été observée et son existence est débattue : sa place ici est symbolique." };
  var SOLAR_SUBTITLES = {
    codex:'Le blog : articles et réflexions',
    atelier:'L’espace des idées et des créations',
    lab:'La vitrine des créations',
    dashb:'La tête dans les étoiles',
    profil:'À la découverte de l’auteur'
  };

  /* ---------- Définitions des mondes (rayons exagérés pour rester lisibles) ---------- */
  function C(h) { return new T.Color(h); }
  var DEFS = [
    { id: 'codex', a: 15.5, e: .05, inc: 2, node: 2.1, M0: 4.2, r: 1.6, tilt: .1, spin: .18, type: 0, scale: 1.2, seed: 9.0, relief: .04, ice: .6,
      c: [0x8a909b, 0xc7ccd6, 0x555b69, 0xeef2fa],
      moons: [{ r: .26, d: 3.6, w: .45, ph: 1.0, c: [0x7d7d80, 0xb0b0b4, 0x4a4a50, 0xdddddd], seed: 5 }] },
    { id: 'd2', deco: true, info: true, a: 26, e: .007, inc: 3.4, node: 4.0, M0: 2.2, r: 2.15, tilt: .05, spin: .07, type: 0, scale: 1.3, seed: 2.0, relief: .018, ice: 0,
      c: [0xa57d53, 0xd7b68a, 0xe6d2ad, 0x7c6048], atmoK: .8, atmo: 0xe9c88d, shell: { k: 1.05, s: .55 } },
    { id: 'dashb', a: 35, e: .04, inc: 0, node: 0, M0: 5.4, r: 2.5, tilt: .41, spin: .5, type: 2, scale: 1.1, seed: 4.2, relief: .02,
      sea: .1, cloud: .55, city: 1.0, gloss: 1.0, ice: 1.0,
      c: [0x03153a, 0x0d4c86, 0x2f5f2a, 0x6b5a3c, 0xb89a62], atmoK: 1.0, atmo: 0x5d9bff, shell: { k: 1.06, s: 1.0 },
      moons: [{ r: .62, d: 6.0, w: .35, ph: 2.0, c: [0x77777a, 0xa8a8ac, 0x474750, 0xdcdcdc], seed: 11 },
              { r: .14, d: 8.6, w: .22, ph: 4.0, c: [0x6d6a66, 0x8f8b85, 0x44403c, 0xbbb6ae], seed: 12 }] },
    { id: 'atelier', a: 43, e: .08, inc: 1.9, node: 1.0, M0: 0.4, r: 1.9, tilt: .44, spin: .48, type: 1, scale: 1.8, seed: 7.0, relief: .045, ice: 1.0,
      c: [0xb5562c, 0xd98c4f, 0x4a2a22, 0xffffff], atmoK: .28, atmo: 0xffa56b, shell: { k: 1.05, s: .6 },
      moons: [{ r: .22, d: 3.6, w: .9, ph: .5, c: [0x6a5a50, 0x8c7a6c, 0x3e3430, 0xaaa090], seed: 21 },
              { r: .16, d: 5.0, w: .6, ph: 3.1, c: [0x6a5a50, 0x8c7a6c, 0x3e3430, 0xaaa090], seed: 22 }] },
    { id: 'd3', deco: true, info: true, a: 63, e: .05, inc: 1.3, node: 3.2, M0: 3.3, r: 6.0, tilt: .05, spin: .9, type: 3, bands: 9, warp: .055, seed: 6.0,
      storm: 1.0, stormLat: -.3, stormLon: 1.0,
      c: [0x7a4a2c, 0xc79a6b, 0xefe0c8, 0xa3522f, 0xb8482a], atmoK: .4, atmo: 0xe0b890, shell: { k: 1.04, s: .55 },
      moons: [{ r: .5, d: 9.5, w: .5, ph: 0.3, c: [0xc9a64a, 0xe6d27a, 0x7a5a2a, 0xffe9a0], seed: 31 },
              { r: .45, d: 11.5, w: .36, ph: 2.4, c: [0x8a7f74, 0xb7ab9c, 0x514a42, 0xdad2c4], seed: 32 },
              { r: .7, d: 14.0, w: .26, ph: 4.4, c: [0x6c6b6a, 0x9a9996, 0x403f3e, 0xc8c7c4], seed: 33 }] },
    { id: 'profil', a: 77, e: .06, inc: 2.4, node: 5.0, M0: 0.9, r: 4.8, tilt: .47, spin: .85, type: 3, bands: 7, warp: .035, seed: 8.0,
      c: [0xb89a62, 0xdcc794, 0xefe3c0, 0x9a7c4a, 0xc9a86e], atmoK: .35, atmo: 0xf0dca8, shell: { k: 1.04, s: .5 }, ring: [1.35, 2.3],
      moons: [{ r: .55, d: 15.5, w: .22, ph: 1.5, c: [0xb9a98a, 0xe0d2b2, 0x6e6250, 0xf6ecd6], seed: 41 },
              { r: .3, d: 19.0, w: .16, ph: 4.9, c: [0x8a8075, 0xb4a89a, 0x4e463e, 0xd8cdbd], seed: 42 }] },
    { id: 'lab', a: 104, e: .03, inc: 1.7, node: 0.9, M0: 5.8, r: 3.4, tilt: 1.68, spin: .72, type: 3, bands: 5, warp: .05, seed: 15.0,
      c: [0x1f7f5a, 0x35b684, 0x8fe3b9, 0x14503a, 0xffffff], atmoK: .75, atmo: 0x4fe6a0, shell: { k: 1.06, s: .8 }, ring: [1.55, 1.85] },
    { id: 'neptune', deco: true, info: true, a: 132, e: .009, inc: 1.77, node: 2.3, M0: 2.7, r: 3.25, tilt: .49, spin: .7, type: 3, bands: 6, warp: .04, seed: 18.0,
      c: [0x133f9c, 0x215fca, 0x4389e8, 0x0c2b75, 0xa7c8ff], atmoK: .65, atmo: 0x427bdf, shell: { k: 1.05, s: .7 },
      moons: [{ r: .37, d: 7.5, w: .2, ph: 1.3, c: [0x6b788a, 0x9aafbd, 0x46576b, 0xd3dce2], seed: 55 }] },
    { id: 'pluto', deco: true, info: true, a: 153, e: .248, inc: 17.1, node: 1.9, M0: 4.0, r: .9, tilt: 2.1, spin: .05, type: 0, scale: 1.2, seed: 24, relief: .04, ice: .75,
      c: [0x9a7969, 0xc9a99a, 0x59463f, 0xe4d8c8], moons: [{ r: .3, d: 2.6, w: .18, ph: .5, c: [0x888078, 0xada39a, 0x58524d, 0xcac0b8], seed: 57 }] },
    /* Planètes naines et objet hypothétique (info : étiquette et fiche, sans rubrique) */
    { id: 'ceres', deco: true, info: true, a: 51.5, e: .08, inc: 10.6, node: 1.1, M0: 1.7, r: .55, tilt: .07, spin: .4, type: 0, scale: 1.6, seed: 61, relief: .05, ice: .15,
      c: [0x6f6a64, 0x8d8780, 0x4a4642, 0xb3aca3] },
    { id: 'haumea', deco: true, info: true, a: 178, e: .19, inc: 28.2, node: 2.6, M0: 1.1, r: .75, tilt: .3, spin: .9, type: 0, scale: 1.4, seed: 62, relief: .03, ice: .9,
      c: [0xcfd3dc, 0xe9ecf3, 0x8f95a3, 0xffffff] },
    { id: 'makemake', deco: true, info: true, a: 191, e: .16, inc: 29, node: 5.3, M0: 3.4, r: .8, tilt: .2, spin: .2, type: 0, scale: 1.2, seed: 63, relief: .03, ice: .55,
      c: [0x8a4f35, 0xb87650, 0x5a3322, 0xe3c7a8] },
    { id: 'eris', deco: true, info: true, a: 262, e: .44, inc: 44, node: .4, M0: .5, r: 1.0, tilt: .1, spin: .15, type: 0, scale: 1.1, seed: 64, relief: .03, ice: 1.0,
      c: [0xd9dce4, 0xf2f4f8, 0x9aa0ad, 0xffffff] },
    { id: 'planet9', deco: true, info: true, hypo: true, a: 430, e: .22, inc: 18, node: 3.9, M0: 2.0, r: 3.1, tilt: .4, spin: .6, type: 3, bands: 5, warp: .04, seed: 90,
      c: [0x1b2260, 0x2d3a8f, 0x5864c4, 0x0e1440, 0x9aa8ff], atmoK: .55, atmo: 0x6d7de8, shell: { k: 1.05, s: .7 } }
  ];

  /* ---------- Scène, caméra, contrôles ---------- */
  var scene = new T.Scene();
  scene.background = new T.Color(0x000000);
  var camera = new T.PerspectiveCamera(40, 1, 0.1, 5000);
  var canvas = renderer.domElement;
  canvas.id = 'cv';
  canvas.setAttribute('aria-hidden', 'true');
  stage.insertBefore(canvas, stage.firstChild);

  var controls = new T.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .07;
  controls.enablePan = true; controls.panSpeed = .85; controls.screenSpacePanning = true; controls.zoomSpeed = .8; controls.rotateSpeed = .6;
  controls.minDistance = 10; controls.maxDistance = 1100;

  var ZERO = new T.Vector3();
  var W = 800, H = 600, PR = 1, mobile = false, homeDist = 195;
  function homeCamPos() {
    var el = 26 * DEG;
    return new T.Vector3(0, Math.sin(el), Math.cos(el)).multiplyScalar(homeDist);
  }

  /* ---------- Ciel (Voie lactée bakée) + étoiles ---------- */
  var skyRT = new T.WebGLRenderTarget(2048, 1024, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, depthBuffer: false });
  (function bakeSky() {
    var s2 = new T.Scene();
    var cam2 = new T.Camera();
    var m = new T.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, depthTest: false, depthWrite: false });
    s2.add(new T.Mesh(new T.PlaneGeometry(2, 2), m));
    renderer.setRenderTarget(skyRT);
    renderer.render(s2, cam2);
    renderer.setRenderTarget(null);
    m.dispose();
  })();
  var skyGroup = new T.Group();
  scene.add(skyGroup);
  var sky = new T.Mesh(new T.SphereGeometry(2000, 48, 32), new T.MeshBasicMaterial({ map: skyRT.texture, side: T.BackSide, depthWrite: false }));
  sky.renderOrder = -2;
  skyGroup.add(sky);

  var starUniforms = { uPR: { value: 1 } };
  (function makeStars() {
    var N = 9000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var u = Math.random() * 2 - 1, th = Math.random() * TAU, s = Math.sqrt(1 - u * u);
      pos[i * 3] = s * Math.cos(th) * 1800; pos[i * 3 + 1] = u * 1800; pos[i * 3 + 2] = s * Math.sin(th) * 1800;
      var b = .12 + .88 * Math.pow(Math.random(), 4.5);
      var temp = Math.random();
      var r = temp < .5 ? .75 + temp * .5 : 1.0, g = temp < .5 ? .85 + temp * .3 : 1.0 - (temp - .5) * .3, bl = temp < .5 ? 1.0 : 1.0 - (temp - .5) * 1.1;
      col[i * 3] = r * b; col[i * 3 + 1] = g * b; col[i * 3 + 2] = bl * b;
      size[i] = 1.0 + 2.4 * Math.pow(Math.random(), 8);
    }
    var g2 = new T.BufferGeometry();
    g2.setAttribute('position', new T.BufferAttribute(pos, 3));
    g2.setAttribute('aColor', new T.BufferAttribute(col, 3));
    g2.setAttribute('aSize', new T.BufferAttribute(size, 1));
    var mat = new T.ShaderMaterial({ uniforms: starUniforms, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    var pts = new T.Points(g2, mat);
    pts.frustumCulled = false; pts.renderOrder = -1;
    skyGroup.add(pts);
  })();

  /* ---------- Soleil ---------- */
  var SUN_R = 7.5;
  var sunMat = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, extensions: { derivatives: true } });
  var sunMesh = new T.Mesh(new T.SphereGeometry(SUN_R, 96, 64), sunMat);
  scene.add(sunMesh);

  function glowTexture(stops) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    var tx = new T.CanvasTexture(c); return tx;
  }
  var glowTexA = glowTexture([[0, 'rgba(255,205,130,0.85)'], [.16, 'rgba(255,150,60,0.45)'], [.4, 'rgba(255,100,30,0.14)'], [1, 'rgba(255,80,20,0)']]);
  var glowTexB = glowTexture([[0, 'rgba(255,170,90,0.28)'], [.3, 'rgba(255,120,50,0.10)'], [1, 'rgba(255,90,30,0)']]);
  function glowSprite(tex, size) {
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.scale.set(size, size, 1); return sp;
  }
  var glowTexV = glowTexture([[0, 'rgba(150,165,255,0.4)'], [.3, 'rgba(110,125,235,0.13)'], [1, 'rgba(90,100,220,0)']]);
  var sunGlowA = glowSprite(glowTexA, SUN_R * 5.2);
  var sunGlowB = glowSprite(glowTexB, SUN_R * 15);
  scene.add(sunGlowA); scene.add(sunGlowB);

  scene.add(new T.PointLight(0xfff1dc, 1.7, 0));
  scene.add(new T.AmbientLight(0x1a2236, 0.55));

  /* ---------- Planètes ---------- */
  var sphereGeo = new T.SphereGeometry(1, 128, 96);
  var shellGeo = new T.SphereGeometry(1, 64, 48);
  var K = 15.7;
  var planets = [], byId = {};

  function planetUniforms(d) {
    var c = d.c;
    return {
      uType: { value: d.type }, uScale: { value: d.scale || 1 }, uSeed: { value: d.seed || 0 }, uTime: { value: 0 },
      uRelief: { value: d.relief ? d.r * d.relief : 0 }, uCloud: { value: d.cloud || 0 }, uCity: { value: d.city || 0 },
      uBands: { value: d.bands || 6 }, uWarp: { value: d.warp || .05 }, uStorm: { value: d.storm || 0 },
      uStormLat: { value: d.stormLat === undefined ? -.3 : d.stormLat }, uStormLon: { value: d.stormLon || 1 },
      uIce: { value: d.ice === undefined ? 0 : d.ice }, uSea: { value: d.sea || 0 }, uAtmoK: { value: d.atmoK || 0 }, uGloss: { value: d.gloss || 0 },
      uC0: { value: C(c[0]) }, uC1: { value: C(c[1]) }, uC2: { value: C(c[2]) }, uC3: { value: C(c[3]) }, uC4: { value: C(c[4] === undefined ? c[3] : c[4]) },
      uAtmo: { value: C(d.atmo || 0) },
      uRingN: { value: new T.Vector3(0, 1, 0) }, uCenter: { value: new T.Vector3() },
      uRing: { value: new T.Vector2(d.ring ? d.ring[0] : 0, d.ring ? d.ring[1] : 0) }, uRadius: { value: d.r }
    };
  }
  function planetMaterial(d) {
    return new T.ShaderMaterial({ uniforms: planetUniforms(d), vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG, extensions: { derivatives: true } });
  }

  DEFS.forEach(function (d) {
    var frame = new T.Group();
    frame.rotation.set(d.inc * DEG, d.node, 0, 'YXZ');
    scene.add(frame);

    var body = new T.Group(); frame.add(body);
    var tilt = new T.Group(); tilt.rotation.z = d.tilt; body.add(tilt);
    var mat = planetMaterial(d);
    var mesh = new T.Mesh(sphereGeo, mat);
    mesh.scale.setScalar(d.r);
    tilt.add(mesh);

    var shellMat = null;
    if (d.shell) {
      shellMat = new T.ShaderMaterial({
        uniforms: { uAtmo: { value: C(d.atmo) }, uK: { value: d.shell.s }, uCmax: { value: Math.sqrt(1 - 1 / (d.shell.k * d.shell.k)) } },
        vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, side: T.BackSide, transparent: true, blending: T.AdditiveBlending, depthWrite: false
      });
      var shell = new T.Mesh(shellGeo, shellMat);
      shell.scale.setScalar(d.r * d.shell.k);
      body.add(shell);
    }

    var ringMat = null;
    if (d.ring) {
      var rin = d.ring[0] * d.r, rout = d.ring[1] * d.r;
      ringMat = new T.ShaderMaterial({
        uniforms: { uCenter: { value: new T.Vector3() }, uRingN: { value: new T.Vector3(0, 1, 0) }, uRadius: { value: d.r }, uIn: { value: rin }, uOut: { value: rout } },
        vertexShader: RING_VERT, fragmentShader: RING_FRAG, side: T.DoubleSide, transparent: true, depthWrite: false
      });
      var ringGeo = new T.RingGeometry(rin, rout, 192, 2);
      var ring = new T.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      tilt.add(ring);
    }

    var moons = [];
    (d.moons || []).forEach(function (m) {
      var md = { type: 0, scale: 2.0, seed: m.seed, relief: .05, ice: .4, c: m.c, r: m.r };
      var pivot = new T.Group(); body.add(pivot);
      var mm = new T.Mesh(sphereGeo, planetMaterial(md));
      mm.scale.setScalar(m.r); mm.position.x = m.d;
      pivot.add(mm);
      moons.push({ pivot: pivot, mesh: mm, w: m.w, a: m.ph });
    });

    var hit = new T.Mesh(sphereGeo, new T.MeshBasicMaterial({ visible: false }));
    hit.userData.id = d.id;
    body.add(hit);

    /* orbite képlérienne, foyer au soleil */
    var pts = [], b = d.a * Math.sqrt(1 - d.e * d.e);
    for (var i = 0; i < 256; i++) {
      var E = i / 256 * TAU;
      pts.push(new T.Vector3(d.a * (Math.cos(E) - d.e), 0, b * Math.sin(E)));
    }
    var lineMat = d.hypo
      ? new T.LineDashedMaterial({ color: 0xa7b4ff, dashSize: 6, gapSize: 5, transparent: true, opacity: .1, depthWrite: false })
      : new T.LineBasicMaterial({ color: 0x8fa4ff, transparent: true, opacity: .1, depthWrite: false });
    var line = new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), lineMat);
    if (d.hypo && line.computeLineDistances) line.computeLineDistances();
    frame.add(line);
    if (d.hypo) { var ghost = glowSprite(glowTexV, d.r * 11); ghost.material.opacity = .55; body.add(ghost); }

    var P = {
      id: d.id, def: d, frame: frame, body: body, tilt: tilt, mesh: mesh, mat: mat, shellMat: shellMat, ringMat: ringMat, hit: hit,
      line: line, lineMat: lineMat, moons: moons, M: d.M0, n: K * Math.pow(d.a, -1.5), sp: 1,
      pos: new T.Vector3(), lineTarget: d.deco ? .07 : .11, rgb: null
    };
    planets.push(P); byId[d.id] = P;
  });

  /* ---------- Ceinture d'astéroïdes ---------- */
  var beltGroup = [];
  (function makeBelt() {
    var geo = new T.IcosahedronGeometry(1, 1);
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      var hsh = Math.abs(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453) % 1;
      var f = .72 + .5 * hsh;
      p.setXYZ(i, x * f, y * f, z * f);
    }
    geo.computeVertexNormals();
    var speeds = [.012, .0095, .008], radii = [49.2, 52, 54.8];
    for (var g = 0; g < 3; g++) {
      var inst = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true }), 600);
      var m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), pp = new T.Vector3(), col = new T.Color();
      for (var i = 0; i < 600; i++) {
        var ang = Math.random() * TAU;
        var gauss = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        var rr = radii[g] + gauss * 2.0;
        pp.set(Math.cos(ang) * rr, (Math.random() - .5) * 1.4, Math.sin(ang) * rr);
        e.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU); q.setFromEuler(e);
        var sz = .06 + Math.pow(Math.random(), 4) * .42;
        s.set(sz * (.6 + Math.random() * .8), sz * (.6 + Math.random() * .8), sz * (.6 + Math.random() * .8));
        m4.compose(pp, q, s); inst.setMatrixAt(i, m4);
        var tone = .30 + Math.random() * .35;
        col.setRGB(tone * 1.0, tone * .92, tone * .82); inst.setColorAt(i, col);
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.frustumCulled = false;
      scene.add(inst);
      beltGroup.push({ obj: inst, w: speeds[g] });
    }
  })();

  /* ---------- Ceinture de Kuiper : un anneau épais de corps glacés au-delà de Neptune ---------- */
  (function makeKuiper() {
    var geo = new T.IcosahedronGeometry(1, 0), p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), hsh = Math.abs(Math.sin(x * 91.7 + y * 213.1 + z * 57.3) * 43758.5453) % 1, f = .7 + .5 * hsh;
      p.setXYZ(i, x * f, y * f, z * f);
    }
    geo.computeVertexNormals();
    var groups = [{ r: 176, w: 52, n: 1500, v: .0016 }, { r: 190, w: 70, n: 1100, v: .0011 }];
    groups.forEach(function (G) {
      var inst = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true }), G.n);
      var m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), pp = new T.Vector3(), col = new T.Color();
      for (var k = 0; k < G.n; k++) {
        var ang = Math.random() * TAU, gauss = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5, rr = G.r + gauss * G.w * .5;
        var inc = (Math.random() + Math.random() - 1) * .2;                       // inclinaisons plus fortes qu'au cœur du système
        pp.set(Math.cos(ang) * rr, Math.sin(inc) * rr * .5 + (Math.random() - .5) * 2, Math.sin(ang) * rr);
        e.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU); q.setFromEuler(e);
        var sz = .14 + Math.pow(Math.random(), 4) * .6;
        s.set(sz * (.6 + Math.random() * .8), sz * (.6 + Math.random() * .8), sz * (.6 + Math.random() * .8));
        m4.compose(pp, q, s); inst.setMatrixAt(k, m4);
        var tone = .42 + Math.random() * .4, red = Math.random() < .22;      // quelques corps rougeâtres, la plupart bleutés
        if (red) col.setRGB(tone * 1.0, tone * .72, tone * .58); else col.setRGB(tone * .82, tone * .9, tone);
        inst.setColorAt(k, col);
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.frustumCulled = false;
      scene.add(inst);
      beltGroup.push({ obj: inst, w: G.v });
    });
  })();
  /* repères d'étiquette pour les ceintures (pas de corps : un point fixe où la caméra peut aller) */
  var anchors = [];
  [['asteroides', 52, 2.3, 7], ['kuiper', 186, 2.45, 18]].forEach(function (a) {
    var A = { id: a[0], def: { r: a[3] }, pos: new T.Vector3(Math.cos(a[2]) * a[1], 0, Math.sin(a[2]) * a[1]) };
    anchors.push(A); byId[a[0]] = A;
  });

  /* ---------- Comète ---------- */
  var comet = { a: 82, e: .84, inc: 24 * DEG, node: 1.4, M: 3.2, pos: new T.Vector3(), prev: new T.Vector3() };
  var cometFrame = new T.Group(); cometFrame.rotation.set(comet.inc, comet.node, 0, 'YXZ'); scene.add(cometFrame);
  var cometHead = new T.Group(); cometFrame.add(cometHead);
  var nucleus = new T.Mesh(new T.IcosahedronGeometry(.28, 1), new T.MeshStandardMaterial({ color: 0x9a9690, roughness: 1, flatShading: true }));
  cometHead.add(nucleus);
  var cometGlow = glowSprite(glowTexA, 5); cometHead.add(cometGlow);
  var cometOrbitPts = [], cb = comet.a * Math.sqrt(1 - comet.e * comet.e);
  for (var ci = 0; ci < 360; ci++) { var cE = ci / 360 * TAU; cometOrbitPts.push(new T.Vector3(comet.a * (Math.cos(cE) - comet.e), 0, cb * Math.sin(cE))); }
  var cometLineMat = new T.LineBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: .05, depthWrite: false });
  var cometLine = new T.LineLoop(new T.BufferGeometry().setFromPoints(cometOrbitPts), cometLineMat);
  cometFrame.add(cometLine);

  var softTex = glowTexture([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
  var TAILN = 220;
  function makeTail(colHex, size) {
    var g = new T.BufferGeometry();
    var pos = new Float32Array(TAILN * 3), col = new Float32Array(TAILN * 3), seed = [];
    for (var i = 0; i < TAILN; i++) seed.push({ s: Math.pow(Math.random(), 1.4), x: Math.random() - .5, y: Math.random() - .5, z: Math.random() - .5 });
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    var pts = new T.Points(g, new T.PointsMaterial({ size: size, map: softTex, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    pts.frustumCulled = false; scene.add(pts);
    return { pts: pts, seed: seed, base: C(colHex) };
  }
  var tailIon = makeTail(0x7fb4ff, 1.5), tailDust = makeTail(0xffe2a8, 1.8);

  var tmpA = new T.Vector3(), tmpB = new T.Vector3(), tmpV = new T.Vector3();
  function updateTail(tl, headPos, dir, len, curve, vel, intensity) {
    var p = tl.pts.geometry.attributes.position, c = tl.pts.geometry.attributes.color;
    for (var i = 0; i < TAILN; i++) {
      var sd = tl.seed[i], s = sd.s, d = s * len;
      tmpA.copy(dir).multiplyScalar(d);
      tmpB.copy(vel).multiplyScalar(-curve * s * s * len * .5);
      var spread = .15 + s * len * .06;
      p.setXYZ(i, headPos.x + tmpA.x + tmpB.x + sd.x * spread, headPos.y + tmpA.y + tmpB.y + sd.y * spread, headPos.z + tmpA.z + tmpB.z + sd.z * spread);
      var f = Math.pow(1 - s, 1.6) * intensity;
      c.setXYZ(i, tl.base.r * f, tl.base.g * f, tl.base.b * f);
    }
    p.needsUpdate = true; c.needsUpdate = true;
  }

  /* ---------- Post-traitement ---------- */
  var composer, bloom, finalPass, finalUniforms, customRT = false;
  (function makeComposer() {
    var rt = null;
    try {
      if (renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget) {
        rt = new T.WebGLMultisampleRenderTarget(800, 600, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, type: T.HalfFloatType });
        rt.samples = 4;
      }
    } catch (e) { rt = null; }
    customRT = !!rt;
    composer = rt ? new T.EffectComposer(renderer, rt) : new T.EffectComposer(renderer);
    composer.addPass(new T.RenderPass(scene, camera));
    bloom = new T.UnrealBloomPass(new T.Vector2(800, 600), .9, .75, 1.15);
    composer.addPass(bloom);
    finalUniforms = { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new T.Vector2(800, 600) } };
    finalPass = new T.ShaderPass({ uniforms: finalUniforms, vertexShader: FINAL_VERT, fragmentShader: FINAL_FRAG });
    finalPass.renderToScreen = true;
    finalUniforms = finalPass.uniforms;
    composer.addPass(finalPass);
  })();

  /* ---------- Étiquettes et onglets ---------- */
  var els = {};
  var OBJ_NAMES = { codex: 'Mercure', dashb: 'Terre', atelier: 'Mars', profil: 'Saturne', lab: 'Uranus' };
  function makeLabel(P) {
    var s = SECTIONS[P.id];
    var d = document.createElement('div');
    d._k = (s.info ? ' pl-info' : ' pl-menu');
    d.className = 'pl right' + d._k;
    d.innerHTML = '<button class="hit" type="button" aria-label="' + s.name + (s.sub ? ' : ' + s.sub : '') + '"></button>' +
      '<span class="lbl"><b>' + s.name + '</b>' + (s.sub ? '<i>' + s.sub + '</i>' : '') + (OBJ_NAMES[P.id] ? '<em class="objn">' + OBJ_NAMES[P.id] + '</em>' : '') + '</span>';
    labelsEl.appendChild(d);
    var hit = d.querySelector('.hit');
    hit.addEventListener('focus', function () { hover = P.id; showSolarHover(P.id); });
    hit.addEventListener('blur', function () { if (hover === P.id) hover = null; showSolarHover(null); });
    hit.addEventListener('click', function () { select(P.id); });
    els[P.id] = d;
  }
  planets.forEach(function (P) { if (!P.def.deco || P.def.info) makeLabel(P); });
  anchors.forEach(makeLabel);
  // One navigation only: the header controls the camera, not legacy pages.
  var tabButtons = {};
  // La barre commune demande une rubrique : la caméra y vole, puis le lecteur s'ouvre.
  Codex.on('navigate', function (e) {
    if (e.direct) { if (!e.id) closeCodexReader(); return; }
    select(e.id);
  });

  /* ---------- Événements astronomiques rares (temps réel) ----------
     Un événement toutes les 15–30 min de visite active. Aucun nouveau
     rendu coûteux : trois objets réutilisés, un seul phénomène à la fois.
     La comète permanente du système solaire reste inchangée.
  -------------------------------------------------------------- */
  var astroRand = function(a,b){return a+Math.random()*(b-a);};
  var astroNextAt = performance.now()+astroRand(15,30)*60000;
  var astroActive = null, astroLastType = '', astroDuration = 0, astroElapsed = 0;
  var astroDirection = new T.Vector3(), astroStart = new T.Vector3(), astroEnd = new T.Vector3();
  var astroBody = new T.Group();
  var astroRock = new T.Mesh(
    new T.IcosahedronGeometry(.55,1),
    new T.MeshStandardMaterial({color:0xb0a59b,roughness:1,flatShading:true})
  );
  astroBody.add(astroRock);
  var astroBodyGlow = glowSprite(glowTexA,3);
  astroBody.add(astroBodyGlow);
  scene.add(astroBody); astroBody.visible=false;
  var astroStreakGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);
  var astroStreak = new T.Line(astroStreakGeo,new T.LineBasicMaterial({
    color:0xaad7ff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending
  }));
  scene.add(astroStreak);astroStreak.visible=false;
  var astroFlare = glowSprite(glowTexA,SUN_R*3);
  scene.add(astroFlare);astroFlare.visible=false;
  var astroStreakPos = astroStreakGeo.attributes.position;
  var astroTmp = new T.Vector3();

  function astroBegin(){
    var types=['wanderer','flare','streak'].filter(function(type){return type!==astroLastType;});
    astroActive=types[Math.floor(Math.random()*types.length)];
    astroLastType=astroActive;astroElapsed=0;
    astroDuration=astroActive==='wanderer'?astroRand(20,32):astroActive==='flare'?astroRand(9,16):astroRand(2.5,4.5);
    astroBody.visible=astroActive==='wanderer';
    astroFlare.visible=astroActive==='flare';
    astroStreak.visible=astroActive==='streak';
    if(astroActive==='wanderer'){
      var angle=astroRand(0,Math.PI*2),radius=astroRand(60,110);
      astroStart.set(Math.cos(angle)*radius,astroRand(-9,9),Math.sin(angle)*radius);
      astroEnd.set(-astroStart.x*.85,astroRand(-10,10),-astroStart.z*.85);
      astroRock.scale.setScalar(astroRand(.65,1.2));
    }else if(astroActive==='flare'){
      var theta=astroRand(0,Math.PI*2),phi=astroRand(-.6,.6);
      astroDirection.set(Math.cos(theta)*Math.cos(phi),Math.sin(phi),Math.sin(theta)*Math.cos(phi));
      astroFlare.position.copy(astroDirection).multiplyScalar(SUN_R*1.1);
    }else{
      // Camera-relative distant light trail, not a meteor inside space.
      astroDirection.set(0,0,-1).applyQuaternion(camera.quaternion);
      astroStart.copy(camera.position).addScaledVector(astroDirection,astroRand(160,230));
      astroStart.addScaledVector(new T.Vector3(1,0,0).applyQuaternion(camera.quaternion),astroRand(-55,55));
      astroStart.addScaledVector(new T.Vector3(0,1,0).applyQuaternion(camera.quaternion),astroRand(-28,28));
      astroEnd.copy(astroStart).add(new T.Vector3(astroRand(25,55),astroRand(-12,12),astroRand(-10,10)));
    }
  }
  function astroUpdate(dt,now){
    // Do not count inactive/background tab time toward events.
    if(document.hidden || paused)return;
    if(!astroActive){
      if(now>=astroNextAt)astroBegin();
      return;
    }
    astroElapsed+=dt;
    var t=Math.min(1,astroElapsed/astroDuration);
    var envelope=Math.sin(Math.PI*t);
    if(astroActive==='wanderer'){
      astroBody.position.lerpVectors(astroStart,astroEnd,t);
      astroRock.rotation.y+=dt*.3;
      astroBodyGlow.material.opacity=.2+.55*envelope;
    }else if(astroActive==='flare'){
      astroFlare.scale.setScalar(SUN_R*(1.4+2.2*envelope));
      astroFlare.material.opacity=.45*envelope;
    }else{
      astroTmp.lerpVectors(astroStart,astroEnd,t);
      astroStreakPos.setXYZ(0,astroTmp.x,astroTmp.y,astroTmp.z);
      astroStreakPos.setXYZ(1,astroTmp.x-(astroEnd.x-astroStart.x)*.19,
        astroTmp.y-(astroEnd.y-astroStart.y)*.19,astroTmp.z-(astroEnd.z-astroStart.z)*.19);
      astroStreakPos.needsUpdate=true;
      astroStreak.material.opacity=.8*envelope;
    }
    if(t>=1){
      astroBody.visible=astroFlare.visible=astroStreak.visible=false;
      astroActive=null;astroNextAt=now+astroRand(15,30)*60000;
    }
  }
  document.addEventListener('visibilitychange',function(){
    // If the user returns after a long absence, restart the quiet interval.
    if(!document.hidden)astroNextAt=performance.now()+astroRand(15,30)*60000;
  });

  /* ---------- Lecteur : délégué à l'interface commune (Codex.reader) ---------- */
  var readerRoutes = { codex: 1, atelier: 1, lab: 1, dashb: 1, profil: 1 };
  var readerPending = null, readerOpen = false;
  function closeCodexReader() {
    readerPending = null;
    if (readerOpen) { readerOpen = false; Codex.reader.close({ silent: true }); }
  }
  function openCodexReader(id) {
    if (!readerRoutes[id] || !SECTIONS[id]) return;
    readerPending = null; readerOpen = true; Codex.reader.open(id);
  }
  // fermeture demandée par le lecteur (croix, Échap) : on reste sur la planète
  Codex.on('reader:close', function () { readerOpen = false; });
  /* ---------- État, sélection, vols de caméra ---------- */
  var paused = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var speed = 1, showOrbits = true, hover = null, selected = null, flight = null, lastSel = new T.Vector3();
  var simT = 0, last = performance.now();

  function select(id) {
    closeCodexReader();
    readerPending = id && readerRoutes[id] ? id : null;
    selected = id;
    document.getElementById('solar-return-sun').hidden = !id;
    document.body.classList.toggle('solar-selected',!!id);
    document.getElementById('solar-hover').hidden=true;
    var key = id || 'home', s = SECTIONS[key];
    if (s.info) {   // fiche d'un objet d'information : elle reste affichée pendant qu'on s'en approche
      var hp = document.getElementById('solar-hover');
      document.getElementById('solar-hover-name').textContent = s.name;
      document.getElementById('solar-hover-sub').textContent = s.sub || '';
      document.getElementById('solar-hover-desc').textContent = s.text;
      hp.classList.add('is-info'); hp.hidden = false;
    } else document.getElementById('solar-hover').classList.remove('is-info');
    document.getElementById('infoTitle').textContent = s.name;
    document.getElementById('infoText').textContent = s.text;
    document.getElementById('infoDot').style.setProperty('--c', 'rgb(' + s.rgb + ')');
    Object.keys(tabButtons).forEach(function (k) { tabButtons[k].setAttribute('aria-current', k === key ? 'true' : 'false'); });
    Codex.emit('nav:active', id);
    startFlight(id);
  }
  function selDist(P) { return Math.max(P.def.r * (P.def.ring ? 7.6 : 5.4), 9); }
  function camDirFor(P) {
    var dirSun = tmpV.copy(P.pos).multiplyScalar(-1).normalize();
    var side = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), dirSun).normalize();
    return new T.Vector3().addScaledVector(dirSun, .55).addScaledVector(side, .75).add(new T.Vector3(0, .25, 0)).normalize();
  }
  function startFlight(id) {
    flight = { t: 0, dur: 2.6, id: id, fromOff: camera.position.clone().sub(controls.target), fromTgt: controls.target.clone() };
    controls.enabled = false;
    controls.minDistance = id ? byId[id].def.r * 1.5 : 10;
  }
  function ease(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  // Keep a stable viewing direction throughout each flight. The former
  // quaternion turn could cross the pole and flip the camera abruptly.
  var flightOffset = new T.Vector3();
  function stepCamera(dt) {
    var P = selected ? byId[selected] : null;
    if (flight) {
      flight.t += dt;
      var k = Math.min(1, flight.t / flight.dur), e = ease(k);
      var tgt = flight.id ? byId[flight.id].pos : ZERO;
      var targetDistance = flight.id ? selDist(byId[flight.id]) : homeCamPos().length();
      var startDistance = flight.fromOff.length();
      // Translate and zoom without changing the camera's orientation.
      // The start offset is captured at selection time and remains fixed.
      flightOffset.copy(flight.fromOff).normalize().multiplyScalar(
        Math.exp(Math.log(Math.max(startDistance,.01)) * (1-e) + Math.log(targetDistance) * e)
      );
      controls.target.lerpVectors(flight.fromTgt, tgt, e);
      camera.position.copy(controls.target).add(flightOffset);
      if (k >= 1) {
        flight = null;
        controls.enabled = true;
        if (P) lastSel.copy(P.pos);
        if (readerPending && readerPending === selected) openCodexReader(readerPending);
      }
    } else if (P) {
      tmpV.copy(P.pos).sub(lastSel);
      camera.position.add(tmpV);
      controls.target.copy(P.pos);
      lastSel.copy(P.pos);
    }
  }

  function showSolarHover(id){
    var panel=document.getElementById('solar-hover');
    if(!panel)return;
    if(selected && SECTIONS[selected] && SECTIONS[selected].info)return;   // la fiche de l'objet choisi reste affichée
    if(!id || selected || !SECTIONS[id]){panel.hidden=true;return;}
    panel.classList.remove('is-info');
    document.getElementById('solar-hover-name').textContent=SECTIONS[id].name;
    document.getElementById('solar-hover-sub').textContent=SOLAR_SUBTITLES[id]||SECTIONS[id].sub||'';
    document.getElementById('solar-hover-desc').textContent=SECTIONS[id].text||'';
    panel.hidden=false;
  }
  /* ---------- Picking ---------- */
  var ray = new T.Raycaster(), ndc = new T.Vector2(), pointerIn = false, needPick = false, downX = 0, downY = 0;
  var hitMeshes = planets.filter(function (P) { return !P.def.deco || P.def.info; }).map(function (P) { return P.hit; });
  function pickAt(cx, cy) {
    var r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(hitMeshes, false);
    return hits.length ? hits[0].object.userData.id : null;
  }
  var lastPX = 0, lastPY = 0;
  canvas.addEventListener('pointermove', function (e) { pointerIn = true; needPick = true; lastPX = e.clientX; lastPY = e.clientY; });
  canvas.addEventListener('pointerleave', function () { pointerIn = false; hover = null; canvas.classList.remove('over'); showSolarHover(null); });
  canvas.addEventListener('pointerdown', function (e) { downX = e.clientX; downY = e.clientY; });
  // Right-drag pans the camera; suppress the native browser context menu on the 3D canvas.
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('pointerup', function (e) {
    if (e.button !== 0) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    var id = pickAt(e.clientX, e.clientY);
    if (id) select(id);
  });

  /* ---------- Contrôles de l'interface ---------- */
  var pauseBtn = document.getElementById('pause');
  function syncPause() { pauseBtn.textContent = paused ? 'Lecture' : 'Pause'; }
  pauseBtn.addEventListener('click', function () { paused = !paused; syncPause(); });
  document.getElementById('speed').addEventListener('input', function (e) {
    speed = parseFloat(e.target.value); document.getElementById('speedOut').textContent = speed + '×';
  });
  document.getElementById('orbits').addEventListener('change', function (e) { showOrbits = e.target.checked; });
  var qualitySel = document.getElementById('quality');
  var quality = 'high';
  qualitySel.addEventListener('change', function (e) { quality = e.target.value; resize(); });

  /* ---------- Taille ---------- */
  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(280, Math.round(r.width)); H = Math.max(300, Math.round(r.height));
    mobile = W < 640;
    PR = quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    renderer.setPixelRatio(PR);
    renderer.setSize(W, H, false);
    if (customRT) composer.setSize(W * PR, H * PR); else { composer.setPixelRatio(PR); composer.setSize(W, H); }
    bloom.resolution.set(W * PR, H * PR);
    finalUniforms.uRes.value.set(W * PR, H * PR);
    starUniforms.uPR.value = PR;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    homeDist = Math.min(520, Math.max(170, 310 / Math.max(camera.aspect, .45)));
    if (!flight && !selected && !resize.once) { camera.position.copy(homeCamPos()); controls.target.copy(ZERO); }
    resize.once = true;
  }
  var rto = 0;
  if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(rto); rto = setTimeout(resize, 80); }).observe(stage);
  window.addEventListener('resize', function () { clearTimeout(rto); rto = setTimeout(resize, 80); });

  /* ---------- Boucle ---------- */
  var tanHalf = Math.tan(camera.fov * DEG / 2);
  var v3 = new T.Vector3(), camSpace = new T.Vector3();
  var q1 = new T.Quaternion(), tmpN = new T.Vector3();
  var firstFrame = true;

  function solveKepler(M, e) {
    M = M % TAU; var E = e > .8 ? Math.PI : M;
    for (var i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    return E;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    var sdt = paused ? 0 : dt * speed;
    simT += sdt;

    /* planètes sur orbite képlérienne */
    planets.forEach(function (P) {
      var d = P.def;
      var target = (hover === P.id) ? .12 : 1;
      P.sp += (target - P.sp) * .1;
      P.M += P.n * sdt * P.sp;
      var E = solveKepler(P.M, d.e);
      P.body.position.set(d.a * (Math.cos(E) - d.e), 0, d.a * Math.sqrt(1 - d.e * d.e) * Math.sin(E));
      P.mesh.rotation.y += d.spin * sdt * P.sp * .35;
      P.moons.forEach(function (m) {
        m.a += m.w * sdt * P.sp; m.pivot.rotation.y = m.a; m.mesh.rotation.y += sdt * .2;
      });
    });
    beltGroup.forEach(function (b) { b.obj.rotation.y += b.w * sdt; });

    /* comète */
    comet.M += K * Math.pow(comet.a, -1.5) * sdt;
    var cE = solveKepler(comet.M, comet.e);
    cometHead.position.set(comet.a * (Math.cos(cE) - comet.e), 0, comet.a * Math.sqrt(1 - comet.e * comet.e) * Math.sin(cE));
    nucleus.rotation.y += sdt * .4;

    scene.updateMatrixWorld(true);

    planets.forEach(function (P) {
      P.pos.setFromMatrixPosition(P.body.matrixWorld);
      P.tilt.getWorldQuaternion(q1);
      tmpN.set(0, 1, 0).applyQuaternion(q1);
      var u = P.mat.uniforms;
      u.uTime.value = simT;
      if (P.def.ring) {
        u.uRingN.value.copy(tmpN); u.uCenter.value.copy(P.pos);
        P.ringMat.uniforms.uRingN.value.copy(tmpN); P.ringMat.uniforms.uCenter.value.copy(P.pos);
      }
      P.moons.forEach(function (m) { m.mesh.material.uniforms.uTime.value = simT; });
    });
    sunMat.uniforms.uTime.value = simT;
    finalUniforms.uTime.value = now / 1000;

    /* queue de la comète, à l'opposé du soleil */
    cometHead.getWorldPosition(comet.pos);
    var rc = comet.pos.length();
    tmpA.copy(comet.pos).normalize();
    tmpB.copy(comet.pos).sub(comet.prev); if (tmpB.lengthSq() > 1e-8) tmpB.normalize(); else tmpB.set(1, 0, 0);
    comet.prev.copy(comet.pos);
    var tl = Math.min(42, Math.max(2.5, 42 * Math.pow(14 / rc, 1.35)));
    var inten = Math.min(1, Math.max(.12, 1.25 * Math.pow(14 / rc, .8)));
    updateTail(tailIon, comet.pos, tmpA, tl, 0, tmpB, inten);
    updateTail(tailDust, comet.pos, tmpA, tl * .75, .5, tmpB, inten * .85);
    cometGlow.scale.setScalar(2.5 + 6 * inten);

    /* ciel centré sur la caméra */
    skyGroup.position.copy(camera.position);

    /* caméra */
    stepCamera(dt);
    controls.update();
    astroUpdate(dt,now);

    /* survol */
    if (needPick && pointerIn && !flight) {
      needPick = false;
      var id = pickAt(lastPX, lastPY);
      hover = id; canvas.classList.toggle('over', !!id);
      showSolarHover(id);
    }

    /* hit-spheres : taille minimale à l'écran, et rayons à l'écran pour les étiquettes */
    var sunPx = SUN_R / (camera.position.length() * tanHalf) * (H / 2);
    planets.forEach(function (P) {
      var dist = camera.position.distanceTo(P.pos);
      var rPx = P.def.r / (dist * tanHalf) * (H / 2);
      P.rPx = rPx;
      P.hit.scale.setScalar(P.def.r * Math.max(1.35, 17 / Math.max(rPx, 1)));
      var tgt = (hover === P.id || selected === P.id) ? .6 : (showOrbits ? P.lineTarget : 0);
      P.lineMat.opacity += (tgt - P.lineMat.opacity) * .12;
      P.line.visible = P.lineMat.opacity > .004;
    });
    cometLineMat.opacity = showOrbits ? .05 : 0; cometLine.visible = showOrbits;

    /* Étiquettes responsives : noms seuls, placement anti-collision.
       Les planètes restent cliquables via le raycaster même si un nom est masqué. */
    camera.updateMatrixWorld();
    var sunDist = camera.position.length();
    var placements = [];
    anchors.forEach(function (A) { A.rPx = 6; });
    planets.concat(anchors).forEach(function (P) {
      var el = els[P.id]; if (!el) return;
      camSpace.copy(P.pos).applyMatrix4(camera.matrixWorldInverse);
      var behind = camSpace.z > 0;
      v3.copy(P.pos).project(camera);
      var x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * H;
      var rp = Math.min(P.rPx, 90);
      var hid = behind || x < -40 || x > W + 40 || y < -40 || y > H + 40;
      if (!hid && camera.position.distanceTo(P.pos) > sunDist) {
        v3.set(0, 0, 0).project(camera);
        var sx = (v3.x * .5 + .5) * W, sy = (-v3.y * .5 + .5) * H;
        if (Math.hypot(sx - x, sy - y) < sunPx * 1.05) hid = true;
      }
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      el.style.setProperty('--s', Math.max(rp, 6).toFixed(1) + 'px');
      el.style.setProperty('--hit', Math.max(34, rp * 2 + 16).toFixed(1) + 'px');
      placements.push({P:P,el:el,x:x,y:y,hid:hid});
    });
    // Priorité à la planète sélectionnée / survolée, puis aux plus proches de l'écran.
    placements.sort(function(a,b){
      var pa=(a.P.id===selected?100:a.P.id===hover?50:0);
      var pb=(b.P.id===selected?100:b.P.id===hover?50:0);
      return pb-pa || Math.hypot(a.x-W/2,a.y-H/2)-Math.hypot(b.x-W/2,b.y-H/2);
    });
    var occupied = [];
    var stageRect = stage.getBoundingClientRect();
    var margin = mobile ? 10 : 14;
    var titleZone = {left:0,top:H-(mobile?175:145),right:mobile?Math.min(W*.68,340):Math.min(W*.34,400),bottom:H};
    function overlaps(a,b,pad){
      return a.left < b.right+pad && a.right+pad > b.left &&
             a.top < b.bottom+pad && a.bottom+pad > b.top;
    }
    placements.forEach(function(item){
      var P=item.P,el=item.el,chosen=null;
      var preferred = item.x > W*.65 ? ['left','above','below','right'] :
                      item.x < W*.32 ? ['right','above','below','left'] :
                      ['right','left','above','below'];
      if (mobile) preferred = ['right','left','above','below'];
      if (!item.hid) {
        for(var ci=0;ci<preferred.length;ci++){
          var cls=preferred[ci];
          el.className='pl '+cls+(el._k||'')+(selected===P.id?' active':'')+(hover===P.id?' hov':'');
          var rect=el.querySelector('.lbl').getBoundingClientRect();
          var box={left:rect.left-stageRect.left,top:rect.top-stageRect.top,
                   right:rect.right-stageRect.left,bottom:rect.bottom-stageRect.top};
          if(box.left<margin || box.right>W-margin || box.top<margin+42 || box.bottom>H-margin)continue;
          if(overlaps(box,titleZone,8))continue;
          if(occupied.some(function(other){return overlaps(box,other,mobile?12:9)}))continue;
          chosen={cls:cls,box:box};break;
        }
      }
      var full='pl '+(chosen?chosen.cls:preferred[0])+(el._k||'')+
        (selected===P.id?' active':'')+(hover===P.id?' hov':'')+
        (selected&&selected!==P.id?' dim':'')+(!chosen?' hid':'');
      if(el.className!==full)el.className=full;
      if(chosen)occupied.push(chosen.box);
    });

    composer.render();
    if (firstFrame) { firstFrame = false; loadingEl.classList.add('done'); }
  }

  document.getElementById('solar-return-sun').addEventListener('click', function(){select(null);});
  var settingsSlot=document.getElementById('solar-settings-slot');
  var settingsPanel=document.getElementById('solar-settings-panel');
  // Keep technical controls outside the public theme selector; DashB will host observatory controls.
  // Conserver les commandes : la mini-console les pilote.
  syncPause();
  if (window.innerWidth < 640 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)) { quality = 'std'; qualitySel.value = 'std'; }
  resize();
  select(null);
  flight = null; controls.enabled = true; controls.minDistance = 10;
  camera.position.copy(homeCamPos()); controls.target.copy(ZERO);
  requestAnimationFrame(function (t) { last = t; frame(t); });
})();
(function(){
const toggle=document.getElementById('solar-settings-toggle');
toggle?.addEventListener('click',function(){
 const open=document.body.classList.toggle('solar-settings-open');
 toggle.setAttribute('aria-expanded',String(open));
 toggle.textContent=open?'✕ Fermer':'⚙ Réglages';
});
})();
(function(){
 const bar=document.getElementById('solar-observatory'), theme=document.createElement('div');
 const themes=document.createElement('button'), settings=document.getElementById('solar-observatory-settings');
 const panel=document.getElementById('solar-settings-panel');
 if(!bar||!theme||!panel)return;
 function closeThemes(){theme.hidden=true;theme.classList.remove('solar-observatory-visible');themes.setAttribute('aria-expanded','false')}
 function closeSettings(){document.body.classList.remove('solar-settings-open');settings.setAttribute('aria-expanded','false')}
 themes.addEventListener('click',function(e){e.stopPropagation();const open=theme.hidden;closeSettings();closeThemes();if(open){theme.hidden=false;theme.classList.add('solar-observatory-visible');themes.setAttribute('aria-expanded','true')}});
 settings.addEventListener('click',function(e){e.stopPropagation();const open=!document.body.classList.contains('solar-settings-open');closeThemes();closeSettings();if(open){document.body.classList.add('solar-settings-open');settings.setAttribute('aria-expanded','true')}});
 document.addEventListener('pointerdown',function(e){if(!bar.contains(e.target)&&!theme.contains(e.target)&&!panel.contains(e.target)){closeThemes();closeSettings()}});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeThemes();closeSettings()}});
 const orbit=document.getElementById('orbits');if(orbit){try{const v=localStorage.getItem('codex.solar.orbits');if(v!==null){orbit.checked=v==='true';orbit.dispatchEvent(new Event('change'))}}catch(e){}orbit.addEventListener('change',function(){try{localStorage.setItem('codex.solar.orbits',String(orbit.checked))}catch(e){}})}
})();

/* Réglage : quels noms afficher (rubriques du site / objets astronomiques) */
(function () {
  var sel = document.getElementById('names'); if (!sel) return;
  var KEY = 'codex.solar.names', MODES = ['all', 'menus', 'objects'];
  function apply(m) { MODES.forEach(function (k) { document.body.classList.toggle('nm-' + k, k === m); }); }
  var v = 'all'; try { var r = localStorage.getItem(KEY); if (MODES.indexOf(r) >= 0) v = r; } catch (e) {}
  sel.value = v; apply(v);
  sel.addEventListener('change', function () { apply(sel.value); try { localStorage.setItem(KEY, sel.value); } catch (e) {} });
  var sw = document.getElementById('names-objn');   // interrupteur : en mode « objets seulement », nommer aussi les planètes-rubriques
  if (sw) {
    var on = true; try { on = localStorage.getItem(KEY + '.objn') !== '0'; } catch (e) {}
    sw.checked = on; document.body.classList.toggle('nm-objn', on);
    sw.addEventListener('change', function () { document.body.classList.toggle('nm-objn', sw.checked); try { localStorage.setItem(KEY + '.objn', sw.checked ? '1' : '0'); } catch (e) {} });
  }
})();
