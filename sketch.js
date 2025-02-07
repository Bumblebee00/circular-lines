function distance(p1, p2) {
  return sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
}

function dot(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
}

function find_maxmin(arr) {
  let max = arr[0][0];
  let min = arr[0][0];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr[i].length; j++) {
      if (arr[i][j]!=Infinity && arr[i][j] > max) { max = arr[i][j]; }
      if (arr[i][j] < min) { min = arr[i][j]; }
    }
  }
  if (abs(min-max)<=0.1) { max = min + 1; }
  return {max: max, min: min};
}

class SegmentObstacle {
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = distance(p1, p2);
  }

  draw() {
    fill(0);
    stroke(0);
    line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
  }

  minDist(p) {
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

class CircleObstacle {
  constructor(center, r) {
    this.center = center;
    this.r = r;
  }

  draw() {
    noFill();
    stroke(0);
    circle(this.center.x, this.center.y, 2*this.r);
  }

  minDist(p) {
    return abs(distance(p, this.center) - this.r);
  }
}

class TriangleObstacle {
  constructor(p1, p2, p3) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
  }

  draw() {
    noFill();
    stroke(0);
    triangle(this.p1.x, this.p1.y, this.p2.x, this.p2.y, this.p3.x, this.p3.y);
  }

  minDist(p) {
    let d1 = new SegmentObstacle(this.p1, this.p2).minDist(p);
    let d2 = new SegmentObstacle(this.p2, this.p3).minDist(p);
    let d3 = new SegmentObstacle(this.p3, this.p1).minDist(p);
    return min(d1, d2, d3);
  }
}



class Pen {
  constructor(startingPos, startingDir, forwardSpeed, turning_speed, forward_lookahead, turning_lookahead) {
    this.head_pos = startingPos; // pixels
    this.head_dir = startingDir; // degrees. 0 is right and then counter-clockwise
    
    this.forwardSpeed = forwardSpeed; // pixels per frame
    this.turning_speed = turning_speed; // degrees per frame
    
    this.forward_lookahead = forward_lookahead; // pixels
    this.turning_lookahead = turning_lookahead; // degrees

    this.desired_dist = 5;
    this.happines_max = 50;
    this.happines = this.happines_max;
    this.n_teletrasport_alowed = 10;
    
    this.points = [];
    this.latest_points = [];
  }
  
  distance_to_closest_point(p, obstacles) {
    // loop over all points in this.points and over all abstacles, and find the minimum distance between anything and p
    let mindist = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      let d = distance(p, this.points[i]);
      if (d < mindist) { mindist = d; }
    }
    for (let i = 0; i < obstacles.length; i++) {
      let d = obstacles[i].minDist(p);
      if (d < mindist) { mindist = d; }
    }
    return mindist;
  }
  
  updatePen(obstacles) {
    this.desired_dist = 5 + noise(this.head_pos.x/20, this.head_pos.y/20)*4;

    // check the potential values at distance head_speed and angel +10, 0, -10 degrees from the pen head
    let mindist = Infinity;
    let mindist_dir = random(-this.turning_lookahead, this.turning_lookahead);
    let n = 20;
    for (let d = -this.turning_lookahead; d <= this.turning_lookahead; d += this.turning_lookahead*2/n) {
      let p = { // point to look at
        x: this.head_pos.x + this.forward_lookahead*cos(this.head_dir + d),
        y: this.head_pos.y + this.forward_lookahead*sin(this.head_dir + d)
      };

      let tmp = abs(this.distance_to_closest_point(p, obstacles)-this.desired_dist);
      if (tmp < mindist) {
        mindist = tmp;
        mindist_dir = d;
      }
    }
    // then go to the distance closer to this.desired_dist
    this.head_dir += mindist_dir;
    // update head position
    this.head_pos.x += this.forwardSpeed * cos(this.head_dir);
    this.head_pos.y += this.forwardSpeed * sin(this.head_dir);
    // check if the pen is happy
    if (mindist > 1) { this.happines -= 1; }
    if (this.happines <= 0) {
      if (this.n_teletrasport_alowed < 0) { go = false; }
      // if not teletrasport the pen to a random position that is far from obstacles and pen trace
      let found = false;
      for (let i = 0; i < 100; i++) {
        this.head_pos = {x: random(20, width-20), y: random(20, height-20)};
        if (this.distance_to_closest_point(this.head_pos, obstacles) > 10) { found = true; break; }
      }
      if (!found) { go = false; }
      this.head_dir = random(0, 360);
      this.happines = this.happines_max;
      this.n_teletrasport_alowed -= 1;
    }
    // add new head position to points array
    this.latest_points.push({x: this.head_pos.x, y: this.head_pos.y});
    // when this.latest_points has more than 200 points, remove the oldest one and put it in this.points
    if (this.latest_points.length > 10) {
      this.points.push(this.latest_points.shift());
    }
  }
  
  drawPen() {
    // draw pen drawing
    fill(255, 0, 0);
    stroke(255, 0, 0);
    for (let i = 0; i < this.points.length - 1; i++) {
      let p1 = this.points[i];
      let p2 = this.points[i + 1];
      if (distance(p1, p2) < 10) { line(p1.x, p1.y, p2.x, p2.y); }
    }
    // draw latest points
    fill(0, 0, 255);
    stroke(0, 0, 255);
    for (let i = 1; i < this.latest_points.length-1; i++) {
      let p1 = this.latest_points[i];
      let p2 = this.latest_points[i + 1];
      if (distance(p1, p2) < 10) { line(p1.x, p1.y, p2.x, p2.y); }
    }
    // // draw head as a triangle
    // push();
    // translate(this.head_pos.x, this.head_pos.y);
    // rotate(this.head_dir);
    // triangle(10, 0, 0, 5, 0, -5);
    // pop();
  }
}



let pen; // the pen object
let obstacles = []; // array of obstacles

function setup() {
  createCanvas(400, 400);
  angleMode(DEGREES);
  pen = new Pen({x: 190, y: 190}, 0.0, 1.0, 1.0, 4.0, 90.0);

  let border1 = new SegmentObstacle({x: 0, y: 0}, {x: 400, y: 0});
  let border2 = new SegmentObstacle({x: 400, y: 0}, {x: 400, y: 400});
  let border3 = new SegmentObstacle({x: 400, y: 400}, {x: 0, y: 400});
  let border4 = new SegmentObstacle({x: 0, y: 400}, {x: 0, y: 0});
  obstacles = [border1, border2, border3, border4]

  // create three small random triangles and a small circle
  let p1 = {x: random(50, 350), y: random(50, 350)};
  let tri1 = new TriangleObstacle(p1, {x: p1.x + random(-20, 20), y: p1.y + random(-40, 40)}, {x: p1.x + random(-40, 40), y: p1.y + random(-20, 20)});
  let p2 = {x: random(50, 350), y: random(50, 350)};
  let tri2 = new TriangleObstacle(p2, {x: p2.x + random(-20, 20), y: p2.y + random(-40, 40)}, {x: p2.x + random(-40, 40), y: p2.y + random(-20, 20)});
  let p3 = {x: random(50, 350), y: random(50, 350)};
  let tri3 = new TriangleObstacle(p3, {x: p3.x + random(-20, 20), y: p3.y + random(-40, 40)}, {x: p3.x + random(-40, 40), y: p3.y + random(-20, 20)});
  let circle = new CircleObstacle({x: random(50, 350), y: random(50, 350)}, random(10, 30));
  obstacles.push(tri1, tri2, tri3, circle);

}

let go = true;
let speed_multiplier = 20;

function draw() { if (go) {
  background(220);

  for (let i = 0; i < speed_multiplier; i++) {
    pen.updatePen(obstacles);
  }

  pen.drawPen();
  // draw obstacles
  for (let i = 0; i < obstacles.length; i++) { obstacles[i].draw(); }
}}