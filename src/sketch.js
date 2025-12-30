/* Simple p5 sketch exposing start() and draw() via global `Robaczki` */

(function(window){
  // Robaczek class: basic attributes and simple update/draw helpers
  class Robaczek {
    constructor(opts = {}){
      this.x = opts.x ?? 100;
      this.y = opts.y ?? 100;
      this.dir = opts.dir ?? 0; // radians

      // current values
      this.speed = opts.speed ?? 1.0;
      this.energy = opts.energy ?? 100;
      this.hp = opts.hp ?? 10;

      // maximums
      this.maxSpeed = opts.maxSpeed ?? 5.0;
      this.maxEnergy = opts.maxEnergy ?? 100;
      this.maxHp = opts.maxHp ?? 10;
    }

    setSpeed(s){ this.speed = Math.max(0, Math.min(this.maxSpeed, s)); }
    setEnergy(e){ this.energy = Math.max(0, Math.min(this.maxEnergy, e)); }
    setHp(h){ this.hp = Math.max(0, Math.min(this.maxHp, h)); }

    // dt is frame time multiplier (e.g., 1 for normal frame)
    update(dt = 1){
      this.x += Math.cos(this.dir) * this.speed * dt;
      this.y += Math.sin(this.dir) * this.speed * dt;

      // drain energy slightly when moving
      this.energy = Math.max(0, this.energy - Math.abs(this.speed) * 0.1 * dt);

      // if out of energy, limit speed
      if(this.energy <= 0){
        this.speed = Math.min(this.speed, this.maxSpeed * 0.1);
      }
    }

    draw(p){
      p.push();
      p.translate(this.x, this.y);
      p.rotate(this.dir);
      p.noStroke();
      p.fill(200, 120, 50);
      p.ellipse(0, 0, 20, 12);
      p.pop();
    }
  }

  function draw(p){
    p.background(220);
    p.fill(50,150,50);
    p.noStroke();
    p.ellipse(p.width/2 + Math.sin(p.frameCount*0.02)*100, p.height/2, 80, 80);
  }

  function start(){
    if(window._robaczkiP5) return;
    window._robaczkiP5 = new p5(function(p){
      p.setup = function(){
        var w = Math.min(800, window.innerWidth - 40);
        var h = Math.min(600, window.innerHeight - 120);
        p.createCanvas(w, h).parent(document.getElementById('canvas-holder'));
        p.frameRate(60);
      };
      p.draw = function(){ draw(p); };
      p.windowResized = function(){
        var w = Math.min(800, window.innerWidth - 40);
        var h = Math.min(600, window.innerHeight - 120);
        p.resizeCanvas(w,h);
      };
    });
  }

  window.Robaczki = { start: start, draw: draw, Robaczek: Robaczek };

})(window);
