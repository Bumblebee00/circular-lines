function distance(p1, p2) {
  return sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
}

function dot(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
}

class SegmentObstacle {
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = distance(p1, p2);
  }

  draw() {
    line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
  }

  minDistToSegment(p) {
    let dot1 = dot({x: p.x - this.p1.x, y: p.y - this.p1.y}, {x: this.p2.x - this.p1.x, y: this.p2.y - this.p1.y});
    if (dot1 <= 0) {
      return distance(p, this.p1);
    }
    let dot2 = dot({x: p.x - this.p2.x, y: p.y - this.p2.y}, {x: this.p1.x - this.p2.x, y: this.p1.y - this.p2.y});
    if (dot2 <= 0) {
      return distance(p, this.p2);
    }
    let distToLine = abs((this.p2.x - this.p1.x)*(p.y - this.p1.y) - (this.p2.y - this.p1.y)*(p.x - this.p1.x)) / this.length;
    return distToLine;
  }
}

class Pen {
  constructor(startingPos, startingSpeed, startingDir, obstacles) {
    this.head_pos = startingPos; // pixels
    this.head_dir = startingDir; // degrees. 0 is right and then counter-clockwise
    this.ang_dir = 1; // 1 or -1
    this.time_last_changed_dir = millis();
    this.head_speed = startingSpeed; // pixels per frame
    this.points = [startingPos]; // array of points that the pen has drawn
    this.obstacles = obstacles;
  }

  updateHeadDir() {
    let delta_total = 0;
    for (let i = 0; i < this.obstacles.length; i++) {
      let x = this.obstacles[i].minDistToSegment(this.head_pos);
      let f = 2;
      let b = (50 - 20*f)/(f-1);
      let a = 50 + b;
      delta_total += a / (x + b);
    }

    if (delta_total < 1 && millis() - this.time_last_changed_dir > 3000){
      this.ang_dir = -this.ang_dir;
      this.time_last_changed_dir = millis();
      console.log("changed direction");
    }
    this.head_dir += this.ang_dir * delta_total;
  }

  updatePen() {
    // update head position
    this.head_pos.x += this.head_speed * cos(this.head_dir);
    this.head_pos.y += this.head_speed * sin(this.head_dir);
    // add new head position to points array
    this.points.push({x: this.head_pos.x, y: this.head_pos.y});
  }

  drawPen() {
    // draw obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
      this.obstacles[i].draw();
    }
    // draw pen drawing
    for (let i = 1; i < this.points.length - 1; i++) {
      let p1 = this.points[i];
      let p2 = this.points[i + 1];
      line(p1.x, p1.y, p2.x, p2.y);
    }
    // draw head as a triangle
    push();
    translate(this.head_pos.x, this.head_pos.y);
    rotate(this.head_dir);
    triangle(10, 0, 0, 5, 0, -5);
    pop();
  }
}

let pen;

function setup() {
  createCanvas(400, 400);
  angleMode(DEGREES);
  let obstacle1 = new SegmentObstacle({x: 300, y: 100}, {x: 300, y: 300});
  let obstacle2 = new SegmentObstacle({x: 100, y: 300}, {x: 300, y: 300});
  let obstacle3 = new SegmentObstacle({x: 100, y: 100}, {x: 100, y: 300});
  let obstacle4 = new SegmentObstacle({x: 100, y: 100}, {x: 300, y: 100});
  pen = new Pen({x: 200, y: 200}, 1, 0, [obstacle1, obstacle2, obstacle3, obstacle4]);
}

function draw() {
  background(220);
  pen.updateHeadDir();
  pen.updatePen();
  pen.drawPen();
}