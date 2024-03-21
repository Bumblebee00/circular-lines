// t in degrees
// return [1,2]
function r(t,j) {
  n1 = 1 + noise(10 + cos(t), 10 + sin(t));
  n2 = 1 + 2*noise(10 + cos(t), 20 + sin(t));
  return map(j,0,10,n1/5,n2);
}

let res = 1000;

function setup() {
  createCanvas(400, 400);
  angleMode(DEGREES);
  background(220);
  noFill();
  for (let j=0; j<10; j++){
    beginShape();
    for (let t = 0; t < 360; t+= 360/res) {
      let radius = 100*r(t,j);
      vertex(200 + radius*cos(t), 200 + radius*sin(t));
    }
    endShape();
  }
}
