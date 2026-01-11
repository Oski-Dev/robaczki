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
      this.gender = opts.gender ?? (Math.random() < 0.5 ? 'M' : 'F'); // M or F

      // vision
      this.viewAngle = opts.viewAngle ?? (45 + Math.random() * (180 - 45)); // degrees
      this.viewRange = opts.viewRange ?? 150; // pixels

      // hunting & eating
      this.targetFood = null;
      this.lastEatenFood = null; // tracks what was just eaten (to remove from world)
      this.isEating = false;
      this.eatingTimeRemaining = 0; // frames
      this.eatingDuration = 3 * 60; // 3 seconds at 60 fps

      // sleeping
      this.isSleeping = false;
      this.sleepTimeRemaining = 0; // frames
      this.sleepDuration = 30 * 60; // 30 seconds at 60 fps

      // death
      this.isDead = false;
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
      // check for death
      if(this.hp <= 0){
        this.isDead = true;
        this.speed = 0;
        return; // skip all logic when dead
      }

      // skip all logic if already dead
      if(this.isDead) return;

      // sleeping behavior
      if(this.isSleeping){
        this.sleepTimeRemaining--;
        this.speed = 0; // no movement while sleeping
        // recover energy while sleeping
        this.setEnergy(this.energy + (this.maxEnergy / this.sleepDuration));
        if(this.sleepTimeRemaining <= 0){
          this.isSleeping = false;
          this.setEnergy(this.maxEnergy); // full energy after sleep
        }
        return; // skip all other logic while sleeping
      }

      // check if need to sleep (energy depleted)
      if(this.energy <= 0 && !this.isEating){
        this.isSleeping = true;
        this.sleepTimeRemaining = this.sleepDuration;
        this.targetFood = null;
        return;
      }

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

      // apply fatigue: speed decreases with low energy
      let energyRatio = this.energy / this.maxEnergy;
      let fatigueMultiplier = 0.3 + (energyRatio * 0.7); // 30% to 100% speed based on energy
      this.speed *= fatigueMultiplier;

      // move
      this.x += Math.cos(this.dir) * this.speed * dt;
      this.y += Math.sin(this.dir) * this.speed * dt;

      // drain energy when moving
      this.energy = Math.max(0, this.energy - Math.abs(this.speed) * 0.02 * dt);

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

      // draw tombstone if dead
      if(this.isDead){
        p.noStroke();
        p.fill(this.color);
        // tombstone shape: rectangle with rounded top
        p.rectMode(p.CENTER);
        p.rect(0, 2, 16, 20, 8, 8, 0, 0);
        // cross on tombstone
        p.fill(255, 255, 255, 150);
        p.rect(0, 0, 2, 8);
        p.rect(0, -2, 6, 2);
        p.pop();
        return;
      }

      p.rotate(this.dir);

      // draw field of vision as semi-transparent arc (only when not eating or sleeping)
      if(!this.isEating && !this.isSleeping){
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

      // draw gender indicator (in the center)
      if(this.gender === 'F'){
        // pink bow for female
        p.fill(255, 105, 180); // hot pink
        p.ellipse(-2, -1, 4, 4); // left bow
        p.ellipse(2, -1, 4, 4); // right bow
        p.ellipse(0, -1, 3, 3); // center knot
      } else {
        // black tie for male
        p.fill(0, 0, 0);
        p.triangle(0, 1, -1, -2, 1, -2); // tie knot
        p.quad(-1, 1, 1, 1, 0.5, 4, -0.5, 4); // tie body
      }

      // small bars for energy and hp
      let bw = 24;
      let bh = 4;
      
      // energy bar (blue) on the left side (parallel to robaczek)
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

      // hp bar (green) on the right side (parallel to robaczek)
      p.push();
      p.translate(0, 10);
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

  // array of Robaczek instances
  let robaczki = [];
  let foods = []; // array of Apple instances
  let lastFoodSpawnTime = 0; // frames elapsed since last spawn
  const foodSpawnInterval = 10 * 60; // 10 seconds at 60 fps
  let foodSpawnCount = 0; // counter to track every 5th food

  function drawScene(p){
    p.background(220);

    // spawn new food every 10 seconds
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

    // update & draw all robaczki
    for(let robaczek of robaczki){
      robaczek.update(1, {w: p.width, h: p.height}, foods);
      robaczek.draw(p);

      // remove food that was just eaten
      if(robaczek.lastEatenFood){
        let idx = foods.indexOf(robaczek.lastEatenFood);
        if(idx !== -1){
          foods.splice(idx, 1);
        }
        robaczek.lastEatenFood = null;
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
        let initialRobaczek = new Robaczek({
          x: p.width * Math.random(),
          y: p.height * Math.random(),
        });
        robaczki.push(initialRobaczek);
        // expose instance for debugging
        window.Robaczki.instance = initialRobaczek;

        // spawn 10 apples on start (5th and 10th poisonous to match pattern)
        for(let i = 0; i < 10; i++){
          foodSpawnCount++;
          let isPoisonous = (foodSpawnCount % 5 === 0);
          foods.push(new Apple({
            x: Math.random() * p.width,
            y: Math.random() * p.height,
            nutritionValue: isPoisonous ? -10 : 15,
            poisonous: isPoisonous
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

  function addRobaczek(){
    if(!window._robaczkiP5) return; // can't add if not started
    let p = window._robaczkiP5;
    let newRobaczek = new Robaczek({
      x: p.width * Math.random(),
      y: p.height * Math.random(),
    });
    robaczki.push(newRobaczek);
    return newRobaczek;
  }

  window.Robaczki = { start: start, draw: drawScene, addRobaczek: addRobaczek, Robaczek: Robaczek, Apple: Apple };

})(window);
