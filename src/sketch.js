/* Simple p5 sketch exposing start() and draw() via global `Robaczki` */

(function(window){
  // Apple class: food item with nutrition value and position
  class Apple {
    constructor(opts = {}){
      this.x = opts.x ?? Math.random() * 800;
      this.y = opts.y ?? Math.random() * 600;
      this.nutritionValue = opts.nutritionValue ?? 15;
      this.radius = 4;
      this.poisonous = opts.poisonous ?? false;
    }

    draw(p){
      p.push();
      p.noStroke();
      if(this.poisonous){
        p.fill(50, 200, 50); // green for poisonous
      } else {
        p.fill(220, 50, 50); // red for normal
      }
      p.ellipse(this.x, this.y, this.radius * 2);
      p.pop();
    }
  }

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

      // hunting & eating
      this.targetFood = null;
      this.lastEatenFood = null; // tracks what was just eaten (to remove from world)
      this.isEating = false;
      this.eatingTimeRemaining = 0; // frames
      this.eatingDuration = 3 * 60; // 3 seconds at 60 fps
    }

    setSpeed(s){ this.speed = Math.max(0, Math.min(this.maxSpeed, s)); }
    setEnergy(e){ this.energy = Math.max(0, Math.min(this.maxEnergy, e)); }
    setHp(h){ this.hp = Math.max(0, Math.min(this.maxHp, h)); }

    // check if a target (x, y) is within field of vision
    isInFOV(targetX, targetY){
      let dx = targetX - this.x;
      let dy = targetY - this.y;
      let dist = Math.sqrt(dx*dx + dy*dy);
      
      // check range
      if(dist > this.viewRange) return false;
      
      // check angle
      let targetDir = Math.atan2(dy, dx);
      let angleDiff = targetDir - this.dir;
      
      // normalize angle to [-PI, PI]
      while(angleDiff > Math.PI) angleDiff -= 2*Math.PI;
      while(angleDiff < -Math.PI) angleDiff += 2*Math.PI;
      
      let halfAngle = (this.viewAngle * Math.PI / 180) / 2;
      return Math.abs(angleDiff) <= halfAngle;
    }

    // find nearest food in FOV
    findNearestFood(foods){
      let nearest = null;
      let nearestDist = Infinity;
      for(let food of foods){
        if(this.isInFOV(food.x, food.y)){
          let dist = Math.hypot(food.x - this.x, food.y - this.y);
          if(dist < nearestDist){
            nearest = food;
            nearestDist = dist;
          }
        }
      }
      return nearest;
    }

    // dt is frame time multiplier (1 default). bounds = {w,h}, foods = array of food objects
    update(dt = 1, bounds = null, foods = []){
      // eating behavior
      if(this.isEating){
        this.eatingTimeRemaining--;
        this.speed = 0; // stop moving while eating
        if(this.eatingTimeRemaining <= 0){
          // finished eating
          if(this.targetFood){
            // gain/lose hp based on nutrition value
            this.setHp(this.hp + this.targetFood.nutritionValue);
            // poisonous food also drains energy
            if(this.targetFood.poisonous){
              this.setEnergy(this.energy - 20);
            }
            this.lastEatenFood = this.targetFood; // mark for removal
          }
          this.isEating = false;
          this.targetFood = null;
        }
        return; // skip normal movement logic while eating
      }

      // look for food in FOV
      let nearestFood = this.findNearestFood(foods);
      if(nearestFood){
        this.targetFood = nearestFood;
      }

      // if targeting food, move towards it
      if(this.targetFood){
        let dx = this.targetFood.x - this.x;
        let dy = this.targetFood.y - this.y;
        let dist = Math.hypot(dx, dy);

        // reached food?
        if(dist < 15){
          this.isEating = true;
          this.eatingTimeRemaining = this.eatingDuration;
        } else {
          // move towards target
          this.dir = Math.atan2(dy, dx);
          this.speed = this.maxSpeed * 0.8; // hunt at 80% max speed
        }
      } else {
        // wander when no target
        if(Math.random() < 0.03) this.dir += (Math.random() - 0.5) * (Math.PI/2);
        this.speed = 0.5 + Math.random() * 1.5; // normal wandering speed
      }

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

      // draw field of vision as semi-transparent arc (only when not eating)
      if(!this.isEating){
        p.noStroke();
        let visionColor = p.color(this.color);
        visionColor.setAlpha(40); // semi-transparent
        p.fill(visionColor);
        let halfAngle = (this.viewAngle * Math.PI / 180) / 2;
        p.arc(0, 0, this.viewRange*2, this.viewRange*2, -halfAngle, halfAngle, p.PIE);
      }

      // draw body as arrow (triangle pointing right in local space)
      p.noStroke();
      p.fill(this.color);
      p.triangle(12, 0, -8, -6, -8, 6);

      // small bars for energy and hp
      let bw = 24;
      let bh = 4;
      
      // energy bar (blue) above
      p.push();
      p.translate(0, -10);
      p.noStroke();
      p.fill(0,0,0,80);
      p.rectMode(p.CENTER);
      p.rect(0,0,bw+2,bh+2,2);
      p.fill(0, 100, 255); // blue for energy
      let energyPct = this.energy / this.maxEnergy;
      p.rect(-bw/2 + (bw*energyPct)/2,0, bw*energyPct, bh, 2);
      p.pop();

      // hp bar (green) below
      p.push();
      p.translate(0, -2);
      p.noStroke();
      p.fill(0,0,0,80);
      p.rectMode(p.CENTER);
      p.rect(0,0,bw+2,bh+2,2);
      p.fill(0, 200, 100); // green for hp
      let hpPct = this.hp / this.maxHp;
      p.rect(-bw/2 + (bw*hpPct)/2,0, bw*hpPct, bh, 2);
      p.pop();

      p.pop();
    }
  }

  // single roaming Robaczek instance will be created inside p5 setup
  let roaming = null;
  let foods = []; // array of Apple instances
  let lastFoodSpawnTime = 0; // frames elapsed since last spawn
  const foodSpawnInterval = 30 * 60; // 30 seconds at 60 fps
  let foodSpawnCount = 0; // counter to track every 5th food

  function drawScene(p){
    p.background(220);

    // spawn new food every 60 seconds
    lastFoodSpawnTime++;
    if(lastFoodSpawnTime >= foodSpawnInterval){
      foodSpawnCount++;
      let isPoisonous = (foodSpawnCount % 5 === 0);
      foods.push(new Apple({
        x: Math.random() * p.width,
        y: Math.random() * p.height,
        nutritionValue: isPoisonous ? -10 : 15,
        poisonous: isPoisonous
      }));
      lastFoodSpawnTime = 0;
    }

    // draw all food items
    for(let food of foods){
      food.draw(p);
    }

    // update & draw roaming robaczek if present
    if(roaming){
      roaming.update(1, {w: p.width, h: p.height}, foods);
      roaming.draw(p);

      // remove food that was just eaten
      if(roaming.lastEatenFood){
        let idx = foods.indexOf(roaming.lastEatenFood);
        if(idx !== -1){
          foods.splice(idx, 1);
        }
        roaming.lastEatenFood = null;
      }
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

        // spawn 5 apples on start (non-poisonous)
        for(let i = 0; i < 5; i++){
          foods.push(new Apple({
            x: Math.random() * p.width,
            y: Math.random() * p.height,
            poisonous: false
          }));
        }
      };
      p.draw = function(){ drawScene(p); };
      p.windowResized = function(){
        var w = Math.min(800, window.innerWidth - 40);
        var h = Math.min(600, window.innerHeight - 120);
        p.resizeCanvas(w,h);
      };
    });
  }

  window.Robaczki = { start: start, draw: drawScene, Robaczek: Robaczek, Apple: Apple };

})(window);
