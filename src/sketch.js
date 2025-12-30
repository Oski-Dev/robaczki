/* Simple p5 sketch exposing start() and draw() via global `Robaczki` */

(function(window){
  // Robaczek class: basic attributes, color, and simple update/draw helpers
  class Robaczek {
    constructor(opts = {}){
      this.x = opts.x ?? 100;
      this.y = opts.y ?? 100;
      this.dir = opts.dir ?? (Math.random() * Math.PI * 2); // radians

      // current values
      this.speed = opts.speed ?? (0.5 + Math.random()*1.5);
      this.energy = opts.energy ?? opts.maxEnergy ?? 100;
      this.hp = opts.hp ?? opts.maxHp ?? 10;

      // maximums
      this.maxSpeed = opts.maxSpeed ?? 4.0;
      this.maxEnergy = opts.maxEnergy ?? 100;
      this.maxHp = opts.maxHp ?? 10;

      // visual
      this.color = opts.color ?? ('#' + Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0'));

      // vision
      this.viewAngle = opts.viewAngle ?? (45 + Math.random() * (180 - 45)); // degrees
      this.viewRange = opts.viewRange ?? 150; // pixels
    }

    setSpeed(s){ this.speed = Math.max(0, Math.min(this.maxSpeed, s)); }
    setEnergy(e){ this.energy = Math.max(0, Math.min(this.maxEnergy, e)); }
    setHp(h){ this.hp = Math.max(0, Math.min(this.maxHp, h)); }

    // dt is frame time multiplier (1 default). bounds = {w,h}
    update(dt = 1, bounds = null){
      // wander: occasionally change direction slightly
      if(Math.random() < 0.03) this.dir += (Math.random() - 0.5) * (Math.PI/2);

      // move
      this.x += Math.cos(this.dir) * this.speed * dt;
      this.y += Math.sin(this.dir) * this.speed * dt;

      // drain energy when moving
      this.energy = Math.max(0, this.energy - Math.abs(this.speed) * 0.02 * dt);
      if(this.energy <= 0) this.speed = Math.min(this.speed, this.maxSpeed * 0.2);

      // keep inside bounds by wrapping
      if(bounds){
        if(this.x < 0) this.x += bounds.w;
        else if(this.x > bounds.w) this.x -= bounds.w;
        if(this.y < 0) this.y += bounds.h;
        else if(this.y > bounds.h) this.y -= bounds.h;
      }
    }

    draw(p){
      p.push();
      p.translate(this.x, this.y);
      p.rotate(this.dir);

      // draw field of vision as semi-transparent arc
      p.noStroke();
      let visionColor = p.color(this.color);
      visionColor.setAlpha(40); // semi-transparent
      p.fill(visionColor);
      let halfAngle = (this.viewAngle * Math.PI / 180) / 2;
      p.arc(0, 0, this.viewRange*2, this.viewRange*2, -halfAngle, halfAngle, p.PIE);

      // draw body as arrow (triangle pointing right in local space)
      p.noStroke();
      p.fill(this.color);
      p.triangle(12, 0, -8, -6, -8, 6);

      // optional: small energy bar above
      let bw = 24;
      let bh = 4;
      p.push();
      p.translate(0, -10);
      p.noStroke();
      p.fill(0,0,0,80);
      p.rectMode(p.CENTER);
      p.rect(0,0,bw+2,bh+2,2);
      p.fill(0,200,80);
      let pct = this.energy / this.maxEnergy;
      p.rect(-bw/2 + (bw*pct)/2,0, bw*pct, bh, 2);
      p.pop();

      p.pop();
    }
  }

  // single roaming Robaczek instance will be created inside p5 setup
  let roaming = null;

  function drawScene(p){
    p.background(220);
    // update & draw roaming robaczek if present
    if(roaming){
      roaming.update(1, {w: p.width, h: p.height});
      roaming.draw(p);
    }
  }

  function start(){
    if(window._robaczkiP5) return;
    window._robaczkiP5 = new p5(function(p){
      p.setup = function(){
        var w = Math.min(800, window.innerWidth - 40);
        var h = Math.min(600, window.innerHeight - 120);
        p.createCanvas(w, h).parent(document.getElementById('canvas-holder'));
        p.frameRate(60);

        // create single roaming Robaczek at random position and random color
        roaming = new Robaczek({
          x: p.width * Math.random(),
          y: p.height * Math.random(),
        });
        // expose instance for debugging
        window.Robaczki.instance = roaming;
      };
      p.draw = function(){ drawScene(p); };
      p.windowResized = function(){
        var w = Math.min(800, window.innerWidth - 40);
        var h = Math.min(600, window.innerHeight - 120);
        p.resizeCanvas(w,h);
      };
    });
  }

  window.Robaczki = { start: start, draw: drawScene, Robaczek: Robaczek };

})(window);
