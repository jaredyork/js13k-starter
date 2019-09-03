(() => {
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

    player = [];
    while (player.length<300) {
      player.push(rint(0,255));
    }
    player = [...new Set(player)];
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
          v = player[i] ^ (seed & 255);
        } else {
          v = player[i] ^ ((seed>>8) & 255);
        }

        perm[i] = perm[i + 256] = v;
        gP[i] = gP[i + 256] = g3[v % 12];
      }
    };

    module.seed(0);

    /*
    for( i=0; i<256; i++) {
      perm[i] = perm[i + 256] = player[i];
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

  a.width=480;
  a.height=640;
  var w=a.width;
  var h=a.height;
  var mapw=40*2;
  var maph=(32 * 3)+6;
  var x=a.getContext('2d', { alpha: !1 });
  x.imageSmoothingEnabled=!1;
  x.mozImageSmoothingEnabled=!1;
  var cam=new Camera(x);
  var ps = [];
  var gvty=0.2;
  function fs(c){x.fillStyle=c;}
  var screen=1;
  var k=[];//inpt
  var btls = a2(mapw, maph, null);
  var tls=a2(mapw, maph, null);
  var al_tls = a2(mapw, maph, null);//always loaded
  var ftls = a2(mapw, maph, null);
  var ts=32;//tile size
  var bs=32;//bg tile size
  var mobs=[];
  var parts=[];
  var projs=[];
  var spwnDelay=300;
  var spwnTick=0;
  var n=noise;
  var mseed=rint(0,6000);
  var seeds=[];
  for (var i=0;i<10;i++) {
    seeds.push(rint(0,6000));
  }
  noise.seed(mseed);
  var hasMusic=false;

  var ir='images/';

  var grass=lc('grass','.png');
  var dirt=lc('dirt','.png');
  var rock=[];
  for (var i = 0; i < 3; i++) {
    rock.push(lc('rock'+i,'.png'));
  }
  var rockblue=lc('rockblue','.png');
  var oiron=lc('oiron','.png');
  var metal=lc('metal','.png');
  var lavarock=lc('lavarock','.png');
  var bedrock=lc('bedrock','.png');
  var ladder=lc('ladder','.png');
  var lava=lc('lava','.png');
  var tnt=lc('tnt','.png');
  var ecrystal=lc('ecrystal','.png');
  var bg_rocks=[];
  for (var i = 0; i < 3; i++) {
    bg_rocks.push(lc('bg_rock'+i,'.png'));
  }
  var bg_lavarock=lc('bg_lavarock','.png');
  var bg_stars=lc('bg_stars','.png');
  var spcship=lc('spcship','.png');
  var player=lc('player','.png');
  var player_drilling=lc('playerdown','.png');
  var plasma_ball=lc('plasmaball','.png');
  var oortbug=lc('oortbug','.png');
  var heart=lc('heart','.png');
  var heartempty=lc('heartempty','.png');
  var lifecanister=lc('lifecanister','.png');

  var worldTemplates = [
    {
      name: "grass",
      rockIndex: 0,
      hasGrass: true,
      hasDirt: true,
      hasSky: true
    },
    {
      name: "blue",
      rockIndex: 1,
      hasGrass: !rint(0, 1),
      hasDirt: !rint(0, 1),
      hasSky: !rint(0, 1)
    },
    {
      name: "sand",
      rockIndex: 2,
      hasGrass: !1,
      hasDirt: !1,
      hasSky: !rint(0, 1)
    }
  ];
  worldTemplate = worldTemplates[rint(0, worldTemplates.length - 1)];

  function drill() {
  }

  function distance(p1,p2){
    var dx = p2.x-p1.x;
    var dy = p2.y-p1.y;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function clamp(val, min, max) {
    if (val < min) return min;
    if (val > max) return max;
    return val;
  }

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

  function colRect(rect1, rect2) {
    if (rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y) {
       // collision detected!
       return true;
    }
    return false;
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
    constructor(x,y,i,args){
      args=args||{
        canFlip:true,
        destructible:true,
        collidable:true,
        damage: null
      };
      var t = this;
      t.x=x;
      t.y=y;
      t.i=i;
      t.w=ts;
      t.h=ts;
      t.vx = 0;
      t.vy = 0;
      t.hf=0;
      t.vf=0;
      t.collidable=args.collidable;
      t.destructible=args.destructible;
      t.damage=args.damage;
      if (args.canFlip) {
        t.hf=rint(0,1);
        t.vf=rint(0,1);
      }
      t.iVis=!0;//img visible
      t.rVis=!1;//rect visible
      t.rCol='#000';
      t.dmg = 0;
    }
    hit(amt) {
      if (this.dmg < 1 && this.destructible) {
        this.dmg += amt;
      }
    }
    drw(x){
      var t = this;
      if (t.iVis && !t.rVis) {
        x.save();
        x.translate(t.x, t.y);
        x.scale(!t.hf?1:-1, !t.vf?1:-1);
        x.drawImage(t.i, -Math.sign(t.hf)*t.w, -Math.sign(t.vf)*t.h, t.w, t.h);
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
        x.globalAlpha = t.dmg * 0.65;
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

  class TNT extends FgTile{
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

  class E {
    constructor(x,y) {
      this.x=x;
      this.y=y;
      this.hp=1;
    }

    getTile(arr) {

      var tile = null;

      var x = sgf(this.x, ts) / ts;
      var y = sgf(this.y, ts) / ts;
    
      if (x >= 0 && x < mapw &&
          y >= 0 && y < maph) {
        tile = arr[x][y];
      }

      return tile;
    }

    getTilePos() {

      var x = sgf(this.x, ts) / ts;
      var y = sgf(this.y, ts) / ts;

      return {x:x,y:y};
    }
  }

  class Part extends E {
    constructor(x,y,i) {
      super(x, y);
      var t=this;
      t.i=i;
      t.w=4;
      t.h=4;
      t.vx=0;
      t.vy=0;
      t.frc=0.8;
      t.gnd=!1;
    }

    updt() {
      var t=this;

      if (t.gnd) {
        t.vy = 0;
      }

      t.vx *= t.fric;
      if (t.vy < 10) {
        t.vy += gvty;
      }
    }
  }

  class P extends E {
    constructor(x,y,i) {
      super(x, y);
      var t=this;
      t.i=i;
      t.w=10;
      t.h=14;
      t.spd=1;
      t.vx=0;
      t.vy=0;
      t.fric = 0.8;
      t.jmp=!1;
      t.gnd=!1;
      t.dsh=!1;
      t.drlg=!1;
      t.fc = "R";
      t.vxm=1; // velocity multiplier
      t.sd=99999;
      t.st=0;
      t.ecrystal=0;
      t.ammo=0;
      t.iron=0;
      t.maxhp=3;
      t.hp=3;
      t.dead=false;
      t.invinc=!1;
      t.invincTick=0;
      t.invincDelay=120;
      t.vis=true;
      t.cheatmode=!1;
      t.anim=new Anim(2,0,8);
    }

    damage(amt) {

      if (!this.invinc) {
        if (this.hp - amt > 0) {
          this.hp -= amt;
        }
        else {
          this.hp = 0;
          this.dead = true;
        }

        this.invincTick = 0;
        this.invinc = true;
      }

    }

    updt() {
      var t=this;
      
      if (!t.cheatmode) {

        if (t.gnd) {
          t.vy = 0;
        }

        if (t.dsh) {
          t.vxm=2;
          t.anim.d=4;
        }
        else {
          t.vxm=1;
          t.anim.d=8;
        }

        t.vx *= t.fric;
        if (t.vy < 10) {
          t.vy += gvty;
        }

        if (Math.abs(t.vx) < 0.1 ) {
          t.anim.on=!1;
        }
        else if (t.vx >= 0.5 || t.vx <= -0.5) {
          t.anim.on=!0;
        }
      }
      else {
        t.vx *= t.fric;
        t.vy *= t.fric;
      }

      t.x += t.vx;
      t.y += t.vy;

      t.anim.updt();

      if (t.invinc) {
        if (t.invincTick < t.invincDelay) {
          t.invincTick++;

          t.vis=!t.vis;
        }
        else {
          t.invinc = false;
          t.vis = true;

          t.invincTick = 0;
        }
      }

      if (t.dead) {
        t.vis = false;
      }

      /*
      if (t.x >= w-t.i.width) {
        t.x = w-t.i.width;
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

      if (!overrideDraw && this.vis) {
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

  class Proj extends E {
    constructor(x,y,i,vx,vy,friendly) {
      super(x,y);
      var t = this;
      t.i=i;
      t.w=i.width;
      t.h=i.height;
      t.vx=vx;
      t.vy=vy;
      t.friendly=friendly;
    }

    updt(){
      var t = this;

      t.x += t.vx;
      t.y += t.vy;
    }

    drw(x){
      var t = this;
      x.drawImage(t.i, t.x, t.y);
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
          prln=Math.floor(sap(xp/100) + 32);

          for(yp=prln;yp>0;yp--){

            canAdd=!0;

            var skyTexture = bg_stars;
            
            if (canAdd) {
              tl=new BgTile(xp*bs,yp*bs,[skyTexture],0);

              if (worldTemplate.hasSky) {
                tl.iVis=!1;
                tl.rVis=!0;
                tl.rCol="#4488FF";
              }

              btls[xp][yp] = tl;
            }
          }

          for(yp=prln;yp<maph;yp++){

            canAdd=!0;

            texture = bg_rocks[worldTemplate.rockIndex];

            if (yp > maph-(maph/4)) {
              texture = bg_lavarock;
            }
            
            if (canAdd) {
              tl=new BgTile(xp*bs,yp*bs,[texture],0);
              btls[xp][yp] = tl;
            }

          }
        }

        for ( xp=0;xp<mapw;xp++) {
          prln=Math.floor(sap(xp/100) + 32);

          for ( yp=prln;yp<maph+6;yp++) {

            canAdd=!0;
            d=10;
            d2=20;
            d3=20;
            texture = rock[worldTemplate.rockIndex];
            args = {
              canFlip:true,
              destructible:true,
              collidable:true,
              damage:null
            };

            if (yp < prln + 6) {
              texture = dirt;

              if (yp == prln) {
                texture = grass;
                args.canFlip = false;
              }
            }

            if (yp > maph-(maph/4)) {
              texture = lavarock;
            }

            noise.seed(seeds[0]);
            p2 = noise.perlin2(xp/d2, yp/d2);

            if (p2 > 0.05 && p2 < 0.2) {
              texture = rockblue;

              if (yp > maph-(maph/4)) {
                texture = lava;
                args.destructible=false;
                args.collidable=false;
                args.damage=3;
              }
            }

            noise.seed(seeds[1]);
            p3 = noise.perlin2(xp/d3, yp/d3);
            if (p3 > 0.025 && p3 < 0.3) {
              texture = oiron;
              args.collidable=true;
              args.destructible=true;
            }

            noise.seed(mseed);

            if (yp > prln+(Math.random()*5)+3 && noise.perlin2(xp/d,yp/d) > 0.1) {
              canAdd = !1;
            }
            
            if (canAdd) {
              tl=new T(xp*ts,yp*ts,texture,args);
              tls[xp][yp] = tl;
            }

            if (yp > maph - rint(6,8)) {
              tls[xp][yp] = new T(xp*ts,yp*ts,bedrock,{
                canFlip:!0,
                destructible:false,
                collidable:!0
              });
            }

          }
        }


        var spcshipx = Math.floor(mapw/2);

        player = new P(spcshipx*ts,128,player);
        player.idrlg = player_drilling;
        ps.push(player);

        var foundTile = false;
        for (var y=0;y<maph;y++) {
          if (tls[spcshipx][y] != null) {
            if (!foundTile) {
              tls[spcshipx][y - 1] = new T(spcshipx*ts,(y-1)*ts,spcship,{
                canFlip:false,
                destructible:false,
                collidable:true
              });

              player.x=spcshipx*ts;
              player.y=(y-1)*ts;
              foundTile = true;
            }
          }
        }

        // Place energy crystals
        var chunkSize = 3;
        var chunkSizeInTilesWidth = Math.floor(mapw/chunkSize);
        var chunkSizeInTilesHeight = Math.floor(maph/chunkSize);

        for (cpx=0;cpx<chunkSize;cpx++) {
          for (cpy=0;cpy<chunkSize;cpy++) {

            var canisterTileLocations = [];
            var crystalTileLocations = [];

            // location in tiles of the current "chunk"
            var left = (cpx*chunkSizeInTilesWidth);
            var top = (cpy*chunkSizeInTilesHeight);

            // Look through the chunk and get locations just above ground
            for (px=left;px<left+chunkSizeInTilesWidth;px++) {
              for(py=top;py<top+chunkSizeInTilesHeight;py++) {

                if (tls[px][py]) {
                  if (py - 1 > 0 && py - 1 < maph - 10) {
                    if (!tls[px][py - 1]) {
                      
                      canisterTileLocations.push({ x: px, y: py - 1 });
                      crystalTileLocations.push({ x: px, y: py - 1 });
                    }
                  }
                }
              }
            }


            if (crystalTileLocations.length === 0) {
              crystalTileLocations.push({ x: rint(left,left+chunkSizeInTilesWidth), y: rint(top,top+chunkSizeInTilesHeight) });
            }

            var crystalLocIndex = rint(0,crystalTileLocations.length - 1);
            var loc = crystalTileLocations[crystalLocIndex];
            crystalTileLocations.splice(crystalLocIndex, 1);

            //console.log("placed energy crystal at: " + loc.x + "," + loc.y);
            tls[loc.x][loc.y] = new T(loc.x*ts,loc.y*ts,ecrystal, {
              canFlip: false,
              destructible: true,
              collidable:true
            });


            if (canisterTileLocations.length === 0) {
              canisterTileLocations.push({ x: rint(left,left+chunkSizeInTilesWidth), y: rint(top,top+chunkSizeInTilesHeight) });
            }
            
            var canisterLoc = canisterTileLocations[rint(0,canisterTileLocations.length - 1)];
            tls[canisterLoc.x][canisterLoc.y] = new T(canisterLoc.x*ts,canisterLoc.y*ts,lifecanister, {
              canFlip: false,
              destructible: true,
              collidable:true
            });

          }
        }

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

      player = ps[0];

      if (!player.dead) {
        if (k[90]) { // jump
          if (!player.cheatmode) {
            if (!player.jmp && player.gnd) {
              player.jmp = !0;
              player.gnd = !1;
              player.vy = -4;
            }
          }

          if (player.cheatmode) {
            if (player.vy > -player.spd) {
              player.vy--;
            }
          }
        }

        if (k[40]) { // down
          player.drlg = !0;

          if (player.cheatmode) {
            if (player.vy < player.spd) {
              player.vy++;
            }
          }

        }
        else {
          player.drlg = !1;
        }

        if (k[39]) { // right
          
          if (player.vx < player.spd * player.vxm) {
            player.vx++;
            player.fc = "R";
          }

        }

        if (k[37]) { // left

          if (player.vx > -player.spd * player.vxm) {
            player.vx--;
            player.fc = "L";
          }
        }

        if (k[88]) {

          player.dsh=!0;

          if (player.st < player.sd) {
            player.st++;
          }
          else {
            if (player.ammo>0&&!player.drlg) {
              // player shoot
              var vx=0;
              if (player.fc == "L") {
                vx = -5;
              }
              else {
                vx = 5;
              }
              var proj = new Proj(player.x,player.y+7,plasma_ball,vx,0,true);
              projs.push(proj);

              player.ammo--;

              player.st=0;
            }
          }
        }
        else {
          player.dsh=!1;
          player.st=player.sd-1;
        }

        if (k[38]) { // up
          var ftl = player.getTile(ftls);
          var tlp = player.getTilePos();

          if (ftl) {
            if (ftl.i == ladder) {
              player.vy=-2;
            }
          }

          var placey=null;
          for (var y = tlp.y; y > 0; y--) {

            if (tlp.x >= 0 && tlp.x < mapw &&
                tlp.y >= 0 && tlp.y < maph) {
              if (tls[tlp.x][y] == null && !placey) {
                placey=y;
              }
            }
          }

          if (placey && player.iron>0) {
            if (!ftls[tlp.x][placey]) {
              ftls[tlp.x][placey] = new T(tlp.x*ts,placey*ts,ladder,{
                canFlip:!1
              });

              player.iron--;
            }
          }
        }
      }
      else {
        setTimeout(function() {
          document.location.reload(true);
        }, 3000);
      }

      for ( i=0;i<ps.length;i++) {
        player.updt();
      }


      player.gnd = !1;

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

                  if (mob.getTile(tls) == null) {
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

        if (player.x + player.w > mob.x &&
            player.x < mob.x + mob.w &&
            player.y + player.h > mob.y &&
            player.y < mob.y + mob.h) {

        
          if (player.vy > 0 && player.y + player.h < mob.y + (mob.h/2)){
            player.jmp = !0;
            player.gnd = !1;
            if (player.jmp) {
              player.vy = -player.spd * 4;
            }
            else {
              player.vy = -player.spd * 2;
            }
            
            mobs.splice(i, 1);
          }
          else {
            var d = colRect(player, mob);

            if (d) {
              player.damage(1);
            }
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

        for ( j = 0; j < projs.length; j++) {
          var d = colCheck(projs[j], mob);

          if (d) {
            mobs.splice(i, 1);
            projs.splice(j, 1);
          }
        }
      }

      for (i = 0; i < projs.length; i++) {
        projs[i].updt();
      }

      for ( xp = 0; xp < mapw; xp++) {
        for ( yp = 0; yp < maph; yp++) {

          var tl = tls[xp][yp];

          if (tl) {
            if (tl.i == lava) {
              var args = {
                canFlip:true,
                destructible:false,
                collidable:false
              };
              
              if (xp-1 > 0) {
                if (!tls[xp-1][yp]) {
                  tls[xp-1][yp] = new T((xp-1)*ts,yp*ts,lava,args);
                }
              }

              if (xp+1 < mapw) {
                if (!tls[xp+1][yp]) {
                  tls[xp+1][yp] = new T((xp+1)*ts,yp*ts,lava,args);
                }
              }

              if (yp+1 < maph) {
                if (!tls[xp][yp+1]) {
                  tls[xp][yp+1] = new T(xp*ts,(yp+1)*ts,lava,args);
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

              if (tl.collidable) {
                d = colCheck(player, tl);

                var dmg = 0.05;

                if (tl.i == rockblue) {
                  dmg = 0.5;
                }

                if (d === "l" || d === "r") {
                  player.vx = 0;
                  player.jmp = !1;
                  player.anim.d=9999;
                  drill();
                  tl.hit(dmg);

                } else if (d === "bs") {
                  player.gnd = !0;
                  player.jmp = !1;

                  if (player.drlg) {
                    drill();
                    tl.hit(dmg);
                  }

                  if (player.vy > 8) {
                    player.damage(Math.round(player.vy * 0.1));
                  }

                } else if (d === "t") {
                  player.vy *= -1;
                }
              }

              if (tl.damage) {
                if (colRect(player, tl)) {
                  player.damage(tl.damage);
                }
              }
              
              if (tl.dmg > 0) {
                tl.dmg -= 0.001;
              }
              
              if (tl.dmg >= 1) {

                if (tl.i == rockblue) {
                  player.ammo += 1;
                }
                else if (tl.i == oiron) {
                  var amt = 1;
                  amt = rint(0,100)>80?rint(2,3):amt;
                  player.iron += amt;
                }
                else if (tl.i == lifecanister) {
                  player.maxhp += 1;
                  player.hp = player.maxhp;
                }
                else if (tl.i == ecrystal) {
                  player.ecrystal += 1;
                }

                tls[xp][yp] = null;
              }
            }

            var ftl = ftls[xp][yp];
            if (ftl) {
              if (ftl) {
                if (ftl.i == spcship) {
                  if (player.ecrystal > 0) {
                    if (distance(
                      player.x,
                      player.y,
                      ftl.x,
                      ftl.y
                    ) < 256) {

                      player.vis=false;
                      camera.moveTo(ftl.x, ftl.y);
                    }
                  }
                }
              }
            }
          }
        }
      }

      ps[0].x = clamp(ps[0].x, 0, (mapw*ts)-ps[0].w);
      ps[0].y = clamp(ps[0].y, 0, (maph*ts)-ps[0].h);

      ppos= { x: ps[0].x, y: ps[0].y };
      cam.moveTo(ppos.x, ppos.y);
      cam.vp.lf = clamp(cam.vp.lf, 0, (mapw*ts) - cam.vp.w);
      cam.vp.tp = clamp(cam.vp.tp, 0, (maph*ts) - cam.vp.h);

      for ( xp = 0; xp < btls.length; xp++) {

        for( yp=0;yp<btls[xp].length;yp++){

          if (b(btls[xp][yp])) {
            bg=btls[xp][yp];

            if (cam.vp.lf > 0 && cam.vp.lf < (mapw*ts)-cam.vp.w) {
              bg.x += player.vx * 0.75;
            }
          }
        }
      }
    }
  }
  function drw(x){

    x.clearRect(0,0,w,h - 4);

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

          if (b(tl)) {
            if (tl.x > cc.x - bs && tl.x < cc.x + cc.w &&
              tl.y > cc.y - bs && tl.y < cc.y + cc.h) {

              if (tl !== null) {
                tl.drw(x);
              }
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

    for (i=0;i<projs.length;i++){
      projs[i].drw(x);
    }

    cam.end();

    for (var i = 0; i < ps[0].maxhp; i++) {
      x.drawImage(heartempty, 32 + (i * 32), 32, 32, 32);
      if (i < ps[0].hp) {
        x.drawImage(heart, 32 + (i * 32), 32, 32, 32);
      }
    }

    var inv = [
      { icon: ecrystal, text: ps[0].ecrystal },
      { icon: plasma_ball, text: ps[0].ammo },
      { icon: oiron, text: ps[0].iron }
    ];

    for (var i = 0; i < inv.length; i++) {
      var item = inv[i];
      x.drawImage(item.icon, 32, 80 + (i * 48), 32, 32);

      x.save();
      x.font = "bold 24px monospace";
      x.fillStyle = "#fff";
      x.fillText(item.text, 72, 106 + (i * 48));
      x.restore();
    }

    if (ps[0].dead) {
      x.save();
      x.fillStyle = "#111";
      x.fillRect(0, 240, w, 128);
      x.fillStyle = "#fff";
      x.font = "32px monospace";
      var youdied="You Died. :c";
      x.fillText(youdied, (w/2)-x.measureText(youdied).width/2, 310);
      x.font = "14px monospace";
      var torestart="A new game will start in a sec...";
      x.fillText(torestart, (w/2)-x.measureText(torestart).width/2, 340);
      x.restore();
    }

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
})();