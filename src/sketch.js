/* Simple p5 sketch exposing start() and draw() via global `Robaczki` */

(function(window){
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

  window.Robaczki = { start: start, draw: draw };

})(window);
