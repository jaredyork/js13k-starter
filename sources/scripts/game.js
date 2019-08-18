(function(global){
   module = global.noise = {};

  function G(x, y, z) {
    this.x = x; this.y = y; this.z = z;
  }
  
  G.prototype.dot2 = function(x, y) {
    return this.x*x + this.y*y;
  };

  G.prototype.dot3 = function(x, y, z) {
    return this.x*x + this.y*y + this.z*z;
  };

   g3 = [new G(1,1,0),new G(-1,1,0),new G(1,-1,0),new G(-1,-1,0),
               new G(1,0,1),new G(-1,0,1),new G(1,0,-1),new G(-1,0,-1),
               new G(0,1,1),new G(0,-1,1),new G(0,1,-1),new G(0,-1,-1)];

   p = [];
  while (p.length<300) {
    p.push(rint(0,255));
  }
  p = [...new Set(p)];
  // To remove the need for index wrapping, double the permutation table length
   perm = new Array(512);
   gP = new Array(512);

  // This isn't a very good seeding function, but it works ok. It supports 2^16
  // different seed values. Write something better if you need more seeds.
  module.seed = function(seed) {
    if(seed > 0 && seed < 1) {
      // Scale the seed out
      seed *= 65536;
    }

    seed = Math.floor(seed);
    if(seed < 256) {
      seed |= seed << 8;
    }

    for( i = 0; i < 256; i++) {
       v=0;
      if (i & 1) {
        v = p[i] ^ (seed & 255);
      } else {
        v = p[i] ^ ((seed>>8) & 255);
      }

      perm[i] = perm[i + 256] = v;
      gP[i] = gP[i + 256] = g3[v % 12];
    }
  };

  module.seed(0);

  /*
  for( i=0; i<256; i++) {
    perm[i] = perm[i + 256] = p[i];
    gP[i] = gP[i + 256] = g3[perm[i] % 12];
  }*/

  // Skewing and unskewing factors for 2, 3, and 4 dimensions
   F2 = 0.5*(Math.sqrt(3)-1);
   G2 = (3-Math.sqrt(3))/6;

  // 2D simplex noise
  module.simplex2 = function(xin, yin) {
     n0, n1, n2; // Noise contributions from the three corners
    // Skew the input space to determine which simplex cell we're in
     s = (xin+yin)*F2; // Hairy factor for 2D
     i = Math.floor(xin+s);
     j = Math.floor(yin+s);
     t = (i+j)*G2;
     x0 = xin-i+t; // The x,y distances from the cell origin, unskewed.
     y0 = yin-j+t;
    // For the 2D case, the simplex shape is an equilateral triangle.
    // Determine which simplex we are in.
     i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
    if(x0>y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
      i1=1; j1=0;
    } else {    // upper triangle, YX order: (0,0)->(0,1)->(1,1)
      i1=0; j1=1;
    }
    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
    // c = (3-sqrt(3))/6
     x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
     y1 = y0 - j1 + G2;
     x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
     y2 = y0 - 1 + 2 * G2;
    // Work out the hashed gradient indices of the three simplex corners
    i &= 255;
    j &= 255;
     gi0 = gP[i+perm[j]];
     gi1 = gP[i+i1+perm[j+j1]];
     gi2 = gP[i+1+perm[j+1]];
    // Calculate the contribution from the three corners
     t0 = 0.5 - x0*x0-y0*y0;
    if(t0<0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * gi0.dot2(x0, y0);  // (x,y) of g3 used for 2D gradient
    }
     t1 = 0.5 - x1*x1-y1*y1;
    if(t1<0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * gi1.dot2(x1, y1);
    }
     t2 = 0.5 - x2*x2-y2*y2;
    if(t2<0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * gi2.dot2(x2, y2);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 70 * (n0 + n1 + n2);
  };

  // ##### Perlin noise stuff

  function fade(t) {
    return t*t*t*(t*(t*6-15)+10);
  }

  function lerp(a, bs, t) {
    return (1-t)*a + t*bs;
  }

  // 2D Perlin Noise
  module.perlin2 = function(x, y) {
    // Find unit grid cell containing point
     X = Math.floor(x), Y = Math.floor(y);
    // Get relative xy coordinates of point within that cell
    x = x - X; y = y - Y;
    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
    X = X & 255; Y = Y & 255;

    // Calculate noise contributions from each of the four corners
     n00 = gP[X+perm[Y]].dot2(x, y);
     n01 = gP[X+perm[Y+1]].dot2(x, y-1);
     n10 = gP[X+1+perm[Y]].dot2(x-1, y);
     n11 = gP[X+1+perm[Y+1]].dot2(x-1, y-1);

    // Compute the fade curve value for x
     u = fade(x);

    // Interpolate the four results
    return lerp(
        lerp(n00, n10, u),
        lerp(n01, n11, u),
       fade(y));
  };

})(this);

(function() {

   Camera = function(context, settings) {
    settings = settings || {};
    var t = this;
    t.d = 1000.0;
    t.la = [0,0];
    t.context = context;
    t.fieldOfView = settings.fieldOfView || Math.PI / 4.0;
    t.vp = {
      lf: 0,
      rt: 0,
      tp: 0,
      bottom: 0,
      w: 0,
      h: 0,
      scale: [1.0, 1.0]
    };
    t.updatevp();
  };

  Camera.prototype = {
    begin: function() {
      var t = this;
      t.context.save();
      t.applyScale();
      t.applyTranslation();
    },
    end: function() {
      this.context.restore();
    },
    applyScale: function() {
      this.context.scale(this.vp.scale[0], this.vp.scale[1]);
    },
    applyTranslation: function() {
      this.context.translate(-this.vp.lf, -this.vp.tp);
    },
    updatevp: function() {
      var t = this;
      t.aspectRatio = t.context.canvas.width / t.context.canvas.height;
      t.vp.w = t.d * Math.tan(t.fieldOfView);
      t.vp.h = t.vp.w / t.aspectRatio;
      t.vp.lf = t.la[0] - (t.vp.w / 2.0);
      t.vp.tp = t.la[1] - (t.vp.h / 2.0);
      t.vp.rt = t.vp.lf + t.vp.w;
      t.vp.bottom = t.vp.tp + t.vp.h;
      t.vp.scale[0] = t.context.canvas.width / t.vp.w;
      t.vp.scale[1] = t.context.canvas.height / t.vp.h;
    },
    zoomTo: function(z) {
      this.d = z;
      this.updatevp();
    },
    moveTo: function(x, y) {
      this.la[0] = x;
      this.la[1] = y;
      this.updatevp();
    },
    screenToWorld: function(x, y, obj) {
      obj = obj || {};
      obj.x = (x / this.vp.scale[0]) + this.vp.lf;
      obj.y = (y / this.vp.scale[1]) + this.vp.tp;
      return obj;
    },
    worldToScreen: function(x, y, obj) {
      obj = obj || {};
      obj.x = (x - this.vp.lf) * (this.vp.scale[0]);
      obj.y = (y - this.vp.tp) * (this.vp.scale[1]);
      return obj;      
    }
  };

  this.Camera = Camera;
  
}).call(this);

a.width=640;
a.height=800;
w=a.width;
h=a.height;
mapw=40*2;
maph=32 * 10;
 x=a.getContext('2d', { alpha: !1 });
x.imageSmoothingEnabled=!1;
x.mozImageSmoothingEnabled=!1;
cam=new Camera(x);
ps = [];
gvty=0.2;
function fs(c){x.fillStyle=c;}
screen=1;
dim=0;
k=[];//inpt
btls = a2(mapw, maph, null);
tls=a2(mapw, maph, null);
al_tls = a2(mapw, maph, null);//always loaded
ftls = a2(mapw, maph, null);
lt_tls = [];//lighting
ts=8;//tile size
bs=8;//bg tile size
mobs=[];
spwnDelay=300;
spwnTick=0;
n=noise;
noise.seed(rint(0,6000));


ir='images/';

rock=lc('rock','.png');
metal=lc('metal','.png');
tnt=lc('tnt','.png','.png');
bg_rocks=lc('bg_rock','.png');
bg_stars=lc('bg_stars','.png');
bg_tl_rocks=lc('bg_tl_rocks','.png');
bg_mach=lc('bg_mach','.png');
player=lc('player','.png');
player_drilling=lc('playerdown','.png');
oortbug=lc('oortbug','.png');

function rint(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function colCheck(shapeA, shapeB) {
  // get the vectors to check against
   vX = (shapeA.x + (shapeA.w / 2)) - (shapeB.x + (shapeB.w / 2)),
      vY = (shapeA.y + (shapeA.h / 2)) - (shapeB.y + (shapeB.h / 2)),
      // add the half widths and half heights of the objects
      hWidths = (shapeA.w / 2) + (shapeB.w / 2),
      hHeights = (shapeA.h / 2) + (shapeB.h / 2),
      cold = null;
  // if the x and y vector are less than the half width or half height, they we must be inside the object, causing a collision
  if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
      // figures out on which side we are colliding (tp, bottom, lf, or rt)
       oX = hWidths - Math.abs(vX),
          oY = hHeights - Math.abs(vY);
      if (oX >= oY) {
          if (vY > 0) {
            if (shapeA.vy < 10) {
                cold = "t";
                shapeA.y += oY;
            }
            else {
              if (vX > 0) {
                cold = "l";
                shapeA.x += oX;
              } else {
                cold = "r";
                shapeA.x -= oX;
              }
            }
          } else {
              cold = "bs";
              shapeA.y -= oY;
          }
      } else {
          if (vX > 0) {
              cold = "l";
              shapeA.x += oX;
          } else {
              cold = "r";
              shapeA.x -= oX;
          }
      }
  }
  return cold;
}

function sgf(value, cellSize) {
  return Math.floor(value / cellSize) * cellSize;
}

function b(n) {
  if(n){n=true}else{n=false}
  n=n?true:false;
  n=n?!0:!1;
  n=!!n;
  return n;
}

// 1D Perlin
var slopeAt = [];
for (let i = 0; i < 10; i++) {
  slopeAt[i] = rint(0,100)-1;
}

function sap(x) {
  var lo = Math.floor(x);
  var hi = lo+1;
  var dist = x-lo;
  loSlope = slopeAt[lo];
  hiSlope = slopeAt[hi];
  loPos = loSlope * dist;
  hiPos = -hiSlope * (1-dist);
  var u = dist * dist * (3.0 - 2.0 * dist);  // cubic curve
  return (loPos*(1-u)) + (hiPos*u);  // interpolate
}

class Anim {
  constructor(amtF,f,d) {
    var t = this;
    t.amtF=amtF;
    t.f=f;
    t.t=0;
    t.d=d;
    t.on=!0;
  }
  updt(){
    var t = this;
    if (t.on) {
      if(t.t<t.d){
        t.t++;
      }
      else {
        if(t.f<t.amtF-1){
          t.f++;
        }
        else{
          t.f=0;
        }
        t.t=0;
      }
    }
  }
}

class T{
  constructor(x,y,i){
    var t = this;
    t.x=x;
    t.y=y;
    t.i=i;
    t.w=ts;
    t.h=ts;
    t.vx = 0;
    t.vy = 0;
    t.hf=rint(0,1);
    t.vf=rint(0,1);
    t.iVis=!0;//img visible
    t.rVis=!1;//rect visible
    t.rCol='#000';
    t.dmg = 0;
  }
  drw(x){
    var t = this;
    if (t.iVis && !t.rVis) {
      x.save();
      x.translate(t.x, t.y);
      x.scale(!t.hf?1:-1, !t.vf?1:-1);
      x.drawImage(t.i, -Math.sign(t.hf)*t.w, -Math.sign(t.vf)*t.h);
      x.restore();
    }
    //drawImage(this.i,this.x,this.y, 1, this.r);

    if (t.rVis && !t.isVis) {
      x.save();
      x.fillStyle = t.rCol;
      x.fillRect(t.x,t.y,t.w,t.h);
      x.strokeStyle=t.rCol;
      x.strokeRect(t.x,t.y,t.w,t.h);
      x.restore();
    }

    if (t.dmg > 0) {
      x.save();
      x.fillStyle = t.rCol;
      x.globalAlpha = t.dmg;
      x.fillRect(t.x,t.y,t.w,t.h);
      x.restore();
    }
  }
}

class BgTile extends T {
  constructor(x, y, is, i) {
    super(x, y, is[i]);
    this.is = is;
  }
}

class FgTile extends T {
  constructor(x, y, i) {
    super(x, y, i);
  }
}

class TNT extends T{
  constructor(x,y,i){
    super(x,y,i);
    this.d=0;
    this.t=0;
    this.ce=!1;//can explode
  }
  updt(){
    if(this.t<this.d){
      this.t++;
    }
    else{
      this.ce=!0;
      this.t=0;
    }
  }
}

class LightingTile{
  constructor(x, y) {
    this.x=x;
    this.y=y;
    this.w=ts;
    this.h=ts;
    this.alpha=1;
  }
  drw(x) {
    var t = this;
    x.save();
    x.fillStyle='#000';
    x.fillRect(t.x,t.y,t.w,t.h);
    x.strokeStyle='#000';
    x.strokeRect(t.x, t.y,t.w,t.h);
    x.restore();
  }
}

class E {
  constructor(x,y) {
    this.x=x;
    this.y=y;
  }

  getTile() {

    var tile = null;

    var x = sgf(this.x, ts) / ts;
    var y = sgf(this.y, ts) / ts;
  
    if (x >= 0 && x < mapw &&
        y >= 0 && y < maph) {
      tile = tls[x][y];
    }

    return tile;
  }

  getTilePos() {

    var x = sgf(this.x, ts) / ts;
    var y = sgf(this.y, ts) / ts;

    return {x:x,y:y};
  }
}

class P extends E {
  constructor(x,y,i) {
    super(x, y);
    var t=this;
    t.i=i;
    t.w=10;
    t.h=14;
    t.spd = 1;
    t.vx=0;
    t.vy=0;
    t.fric = 0.8;
    t.jmp=!1;
    t.gnd=!1;
    t.drlg=!1;
    t.fc = "R";
    t.cheatmode=!1;
    t.anim=new Anim(2,0,8);
  }

  updt() {
    
    if (!this.cheatmode) {

      if (this.gnd) {
        this.vy = 0;
      }

      if (this.drlg) {
        this.vy = 5;
      }

      this.vx *= this.fric;
      if (this.vy < 10) {
        this.vy += gvty;
      }

      if (Math.abs(this.vx) < 0.1 ) {
        this.anim.on=!1;
      }
      else if (this.vx >= 0.5 || this.vx <= -0.5) {
        this.anim.on=!0;
      }
    }
    else {
      this.vx *= this.fric;
      this.vy *= this.fric;
    }

    this.x += this.vx;
    this.y += this.vy;

    this.anim.updt();

    /*
    if (this.x >= w-this.i.width) {
      this.x = w-this.i.width;
    }
    else if (this.x <= 0) {
      this.x = 0;
    }

    if (this.y >= h-this.i.height) {
      this.y = h-this.i.height;
      this.jmp = !1;
    }*/

  }

  drw(x) {
    //drawImage(this.i,this.x,this.y,1,this.r);
    x.save();

    var overrideDraw = !1;

    if (this.drlg) {
      overrideDraw = !0;
    }

    if (!overrideDraw) {
      if (this.fc == 'L') {

        x.translate(this.x, this.y);
        x.scale(-1, 1);
        x.drawImage(this.i, this.anim.f*10,0,10,16,-10, 0,10,16);
      }
      else if (this.fc == 'R') {
        x.drawImage(this.i, this.anim.f*10,0,10,16,this.x, this.y, 10, 16);
      }
    }
    else {
      if (this.drlg && this.idrlg !== undefined) {
        x.drawImage(this.idrlg, this.x, this.y);
      }
    }


    x.restore();
  }
}

class GroundMob extends E {
  constructor(x,y,w,h,i,isAnim, mf, fd=30) {
    super(x,y);
    var t = this;
    t.i=i;
    t.w=w;
    t.h=h;
    t.isAnim=isAnim;
    t.frame=0;
    t.mf=mf;
    t.fd=fd;
    t.ft=0;
    t.fc="R";
    t.gnd=!1;
    t.jmp=!1;
    t.vx=0;
    t.vy=0;
    t.fr=0;
  }

  baseUpdt(){
    var t = this;

    if (t.gnd) {
      t.vy = 0;
    }

    if (t.vy < 10) {
      t.vy += gvty;
    }

    t.x += t.vx;
    t.y += t.vy;


    if (t.ft < t.fd) {
      t.ft++;
    }
    else {
      if (t.frame < t.mf - 1) {
        t.frame++;
      }
      else {
        t.frame = 0;
      }

      t.ft=0;
    }

  }

  drw(x) {
    var t = this;

    x.save();

    if (b(t.fr)) {
      x.filter = t.fr;
    }

    if (t.fc == 'L') {

      x.translate(t.x, t.y);
      x.scale(-1, 1);
      if (t.isAnim) {
        x.drawImage(t.i, t.frame * t.w, 0, t.w, t.h, -16, 0, t.w, t.h);
      }
      else {
        x.drawImage(t.i, -10, 0, t.w, t.h);
      }
    }
    else if (t.fc == 'R') {
      if (t.isAnim) {
        x.drawImage(t.i, t.frame * t.w, 0, t.w, t.h, t.x, t.y, t.w, t.h);
      }
      else {
        x.drawImage(t.i, t.x, t.y, t.w, t.h);
      }
    }
    x.restore();
  }
}

class OortBug extends GroundMob {
  constructor(x,y,i) {
    super(x,y,16,12,i,!0,2,4);
    this.vx = rint(0,10) > 1 ? -1 : 1;
    if (Math.sign(this.vx) == 1) {
      this.fc = "R";
    }
    else {
      this.fc = "L";
    }
    this.fr=rint(0,1)?'hue-rotate('+rint(0,360)+'deg)':0;
  }

  updt() {
    this.baseUpdt();
  }

  owc(d) {
    var t = this;

    t.vx = -t.vx;

    t.vy = -4;
    t.jmp = !0;
    t.gnd = !1;

    if (d == 'l') {
      t.fc = 'R';
    }
    else {
      t.fc = 'L';
    }
  }
}

function a2(numrows, numcols, initial)
{
   arr = [];
  for ( i = 0; i < numrows; ++i)
  {
     columns = [];
    for ( j = 0; j < numcols; ++j)
    {
      columns[j] = initial;
    }
    arr[i] = columns;
  }
  return arr;
}

function lc(fn,ext,amt=0) {
  c=0;
  if (amt>0) {
    c=[];
    for( i=0;i<amt;i++){
       im=new Image();
      im.src=ir+fn+i+ext;
      c.push(im);
    }
    return c;
  }
  else {
    c=new Image();
    c.src=ir+fn+ext;
  }
  return c;
}

function init(){

  switch(screen) {
    case 0: {
      
      break;
    }
    case 1: {

      for(xp=0;xp<btls.length;xp++) {
         prln=Math.floor(sap(xp/100) + rint(4,6));

        for(yp=prln;yp>-maph;yp--){

          canAdd=!0;
          
          if (canAdd) {
             tl=new BgTile(xp*bs,yp*bs,[bg_stars],0);
            btls[xp][yp] = tl;
          }
          

        }

        for(yp=prln;yp<maph;yp++){

          canAdd=!0;
          
          if (canAdd) {
             tl=new BgTile(xp*bs,yp*bs,[bg_rocks,bg_mach],0);
            btls[xp][yp] = tl;
          }
          

        }
      }

      for ( xp=0;xp<mapw;xp++) {
         prln=Math.floor(sap(xp/100) + rint(4,6));

        for ( yp=prln;yp<maph;yp++) {

          canAdd=!0;
          d=10;

          if (yp > prln+(Math.random()*5)+3 && noise.perlin2(xp/d,yp/d) > 0.1) {
            canAdd = !1;
          }
          
          if (canAdd) {
             tl=new T(xp*ts,yp*ts,rock);
            tls[xp][yp] = tl;

            // lt=new LightingTile(xp*16,yp*16);
            //lt_tls.push(lt);
          }

        }
      }

      for ( xp=0;xp<mapw;xp++) {
        for ( yp=0;yp<maph;yp++) {

           tl = tls[xp][yp];

          if (tl !== null) {
            
            if (yp - 1 >= 0) {

              if (tls[xp][yp - 1] == null) {

                if (rint(0, 100) > 80) {

                   fg = new FgTile(xp*ts,(yp - 1)*ts,bg_tl_rocks,ts,2,rint(0,1));
                  ftls[xp][yp - 1] = fg;

                }

              }

            }

          }

        }        
      }

      /*
      for( xp=0;xp<mapw;xp++){
         prln=Math.floor(sap(xp/100) + rint(4,6));

        for( yp=prln;yp<maph;yp++){
          
          canAdd=!0;
          d=10;

          if (yp > prln+(Math.random()*5)+3 && noise.perlin2(xp/d,yp/d) > 0.1) {
            canAdd = !1;
          }
          
          if (canAdd) {
             tl=new T(xp*16,yp*16,rock[0]);
            tls[xp][yp] = tl;

             lt=new LightingTile(xp*16,yp*16);
            lt_tls.push(lt);
          }
          
        }
      }*/


      p = new P(w*0.5,128,player);
      p.idrlg = player_drilling;
      ps.push(p);

      break;
    }
  }
}
function updt(){
  if (ps.length>0) {

     cc = { x: cam.vp.lf, y: cam.vp.tp };
     sc = {
      lf: sgf(cc.x, ts)/ts,
      tp: sgf(cc.y, ts)/ts,
      w: (sgf(cam.vp.w, ts)/ts)+2,
      h: (sgf(cam.vp.h, ts)/ts)+2
    };

     p = ps[0];

    if (k[38] || k[87] || k[90]) { // jump
      if (!p.cheatmode) {
        if (!p.jmp && p.gnd) {
          p.jmp = !0;
          p.gnd = !1;
          p.vy = -p.spd * 2;
        }
      }

      if (p.cheatmode) {
        if (p.vy > -p.spd) {
          p.vy--;
        }
      }
    }

    if (k[40] || k[83]) {
      p.drlg = !0;

      if (p.cheatmode) {
        if (p.vy < p.spd) {
          p.vy++;
        }
      }

    }
    else {
      p.drlg = !1;
    }

    if (k[39] || k[68]) {
      
      if (p.vx < p.spd) {
        p.vx++;
        p.fc = "R";
      }

    }

    if (k[37] || k[65]) {

      if (p.vx > -p.spd) {
        p.vx--;
        p.fc = "L";
      }
    }

    if (k[69]) {
      dim=dim==0?1:0;
    }

    for ( i=0;i<ps.length;i++) {
      p.updt();
    }


    p.gnd = !1;

    // mob spawner
    
    if (spwnTick < spwnDelay) {
      spwnTick++;
    }
    else {
      for ( xp = sc.lf; xp < sc.lf + sc.w; xp++) {
        for ( yp = sc.tp; yp < sc.tp + sc.h; yp++) {
            
          if (mobs.length < 10) {
            if (rint(0,100)>98) {
               mob = new OortBug(xp*ts,yp*ts,oortbug);

               mt = mob.getTilePos();
              if (mt.x > 0 && mt.x < mapw*ts &&
                  mt.y > 0 && mt.y < maph*ts) {

                if (mob.getTile() == null) {
                  mobs.push(mob);
                }
              }
            }
          }

        }
      }
    
      spwnTick=0;
    }

    for ( i = 0; i < mobs.length; i++) {
       mob = mobs[i];
      mob.updt();

      mob.gnd = !1;

      if (p.x + p.w > mob.x &&
          p.x < mob.x + mob.w &&
          p.y + p.h > mob.y &&
          p.y < mob.y + mob.h) {
       
        if (p.vy > 0 && p.y + p.h < mob.y + (mob.h/2)){
          p.jmp = !0;
          p.gnd = !1;
          p.vy = -p.spd * 2;
          
          mobs.splice(i, 1);
        }

      }

       tp = mob.getTilePos();
      for ( xp = tp.x - 3; xp < tp.x + 3; xp++) {
        for ( yp = tp.y - 3; yp < tp.y + 3; yp++) {

          if (xp >= 0 && xp < mapw &&
              yp >= 0 && yp < maph) {
             t = tls[xp][yp];

            if (t !== null) {
               d = colCheck(mob, t);
        
              if (d === "l" || d === "r") {
                mob.owc(d);
                mob.jmp = !1;
              } else if (d === "bs") {
                mob.gnd = !0;
                mob.jmp = !1;
              }
            }
          }
        }
      }
    }

    for ( xp = sc.lf; xp < sc.lf + sc.w; xp++) {
      for ( yp = sc.tp; yp < sc.tp + sc.h; yp++) {

        if (xp >= 0 && xp < mapw &&
          yp >= 0 && yp < maph) {
              
           tl = tls[xp][yp];
            
          if (tl !== null) {
             d = colCheck(p, tl);

            if (d === "l" || d === "r") {
              p.vx = 0;
              p.jmp = !1;

              if (tls[xp][yp].dmg < 1) {
                tls[xp][yp].dmg += 0.05;
              }
              else {
                tls[xp][yp] = null;
              }
            } else if (d === "bs") {
              p.gnd = !0;
              p.jmp = !1;

              if (p.drlg) {
                if (tls[xp][yp].dmg < 1) {
                  tls[xp][yp].dmg += 0.05;
                }
                else {
                  tls[xp][yp] = null;
                }
              }
            } else if (d === "t") {
              p.vy *= -1;
            }

            if (tl.dmg > 0) {
              tl.dmg -= 0.001;
            }

            if (dim==0){
              tl.i = rock;
            }
            else if (dim==1) {
              tl.i = metal;
            }
            
          }
        }
      }
    }

     ppos= { x: ps[0].x, y: ps[0].y };
    cam.moveTo(ppos.x, ppos.y);

    for ( xp = 0; xp < btls.length; xp++) {

      for( yp=0;yp<btls[xp].length;yp++){

         bg=btls[xp][yp];

        bg.x += p.vx * 0.5;

        if (dim==0){
          bg.i=bg.is[0];
        }
        else if (dim==1) {
          if (yp > 0) {
            if (bg.is.length>1) {
              bg.i=bg.is[1];
            }
          }
        }
      }
    }
  }
}
function drw(x){

  x.clearRect(0,0,w,h);

  cam.begin();


   cc = { x: cam.vp.lf, y: cam.vp.tp, w: cam.vp.w, h: cam.vp.h };
   sc = {
    lf: sgf(cc.x, ts)/ts,
    tp: sgf(cc.y, ts)/ts,
    w: (sgf(cam.vp.w, ts)/ts)+2,
    h: (sgf(cam.vp.h, ts)/ts)+2
  };

   scBg = {
    lf: sgf(cc.x, bs)/bs,
    tp: sgf(cc.y, bs)/bs,
    w: (sgf(cam.vp.w, bs)/bs)+2,
    h: (sgf(cam.vp.h, bs)/bs)+2
  };

  for ( xp = 0; xp < mapw; xp++) {
    for ( yp = scBg.tp; yp < scBg.tp + scBg.h; yp++) {

      if (xp >= 0 && xp < mapw &&
        yp >= 0 && yp < maph) {

        tl = btls[xp][yp];

        if (tl.x > cc.x - bs && tl.x < cc.x + cc.w &&
          tl.y > cc.y - bs && tl.y < cc.y + cc.h) {

          if (tl !== null) {
            tl.drw(x);
          }
        }
      }
    }
  }

  for ( xp = sc.lf - 2; xp < sc.lf + sc.w + 2; xp++) {
    for ( yp = sc.tp - 2; yp < sc.tp + sc.h + 2; yp++) {

      if (xp >= 0 && xp < mapw &&
          yp >= 0 && yp < maph) {

         tl = tls[xp][yp];
         al_tl = al_tls[xp][yp];
         fg_tl = ftls[xp][yp];

        if (tl !== undefined && tl !== null) {
          tl.drw(x);
        }

        if (al_tl !== undefined && al_tl !== null) {
          al_tl.drw(x);
        }

        if (fg_tl !== undefined && fg_tl !== null) {
          fg_tl.drw(x);
        }
      }
    }
  }

  for(i=0;i<ps.length;i++){
    ps[i].drw(x);
  }

  for(i=0;i<mobs.length;i++){
    mobs[i].drw(x);
  }

  cam.end();

}
function ml() {
  updt();
  drw(x);
  requestAnimationFrame(ml);
}
ael=addEventListener;
ael('DOMContentLoaded',(e)=>{
  init();

  cam.zoomTo(200);
  ml();
});
ael('keydown',e=>{
   c=e.keyCode||e.which;
  k[c]=1;
});
ael('keyup',e=>{
   c=e.keyCode||e.which;
  k[c]=0;
});