function distance(p1, p2) {
  return sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
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
    let tmp = distance(p, this.center)-this.r
    return max(0,tmp);
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
  constructor(startingPos, startingDir) {
    this.head_pos = startingPos; // pixels
    this.head_dir = startingDir; // degrees. 0 is right and then counter-clockwise
    
    this.forwardSpeed = 1.0; // pixels per frame
    
    this.forward_lookahead = 4.0; // pixels
    this.turning_lookahead = 90.0; // degrees

    this.desired_dist = 0.6;
    this.happines_max = 50;
    this.happines = this.happines_max;
    this.n_teletrasport_alowed = 5;
    
    this.points = [];
    this.latest_points = [];
    
    // Initialize the 5x5 spatial grid
    this.grid_size = 10;
    this.cell_width = width / this.grid_size;
    this.cell_height = height / this.grid_size;
    this.grid = Array(this.grid_size).fill().map(() => 
      Array(this.grid_size).fill().map(() => [])
    );
  }
  
  // Helper method to determine which grid cell a point belongs to
  getGridCell(p) {
    let col = constrain(floor(p.x / this.cell_width), 0, this.grid_size - 1);
    let row = constrain(floor(p.y / this.cell_height), 0, this.grid_size - 1);
    return {row, col};
  }
  
  distance_to_closest_point(p, obstacles) {
    if (p.x<0 || p.x>width || p.y<0 || p.y>height){ return 0; }
    
    let mindist = Infinity;
    
    // Only check grid cells near the point (current cell + neighbors)
    let cell = this.getGridCell(p);
    for (let i = Math.max(0, cell.row - 1); i <= Math.min(this.grid_size - 1, cell.row + 1); i++) {
      for (let j = Math.max(0, cell.col - 1); j <= Math.min(this.grid_size - 1, cell.col + 1); j++) {
        // Check all points in this cell
        for (let k = 0; k < this.grid[i][j].length; k++) {
          let d = distance(p, this.grid[i][j][k]);
          if (d < mindist) { mindist = d; }
        }
      }
    }
    
    // Check obstacles as before
    for (let i = 0; i < obstacles.length; i++) {
      let d = obstacles[i].minDist(p);
      if (d < mindist) { mindist = d; }
    }
    
    return mindist;
  }

  updatePen(obstacles) {
    let dd = this.desired_dist + noise(this.head_pos.x/50, this.head_pos.y/50)*4;

    // check the min distances at distance head_speed and angel +10, 0, -10 degrees from the pen head
    let mindist = Infinity;
    let mindist_dir = random(-this.turning_lookahead, this.turning_lookahead);
    let n = 30;
    for (let d = -this.turning_lookahead; d <= this.turning_lookahead; d += this.turning_lookahead*2/n) {
      let p = { // point to look at
        x: this.head_pos.x + this.forward_lookahead*cos(this.head_dir + d),
        y: this.head_pos.y + this.forward_lookahead*sin(this.head_dir + d)
      };

      let tmp = abs(this.distance_to_closest_point(p, obstacles)-dd);
      if (tmp < mindist) {
        mindist = tmp;
        mindist_dir = d;
      }
    }
    // then go to the distance closer to dd
    this.head_dir += mindist_dir;
    // update head position
    this.head_pos.x += this.forwardSpeed * cos(this.head_dir);
    this.head_pos.y += this.forwardSpeed * sin(this.head_dir);
    // check if the pen is happy
    if (mindist > 1) { this.happines -= 1; }
    if (this.happines <= 0 && this.n_teletrasport_alowed>0) {
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
      if (this.n_teletrasport_alowed <= 0) { go = false; }
    }
    // add new head position to points array
    this.latest_points.push({x: this.head_pos.x, y: this.head_pos.y});
    
    // when this.latest_points has more than 10 points, remove the oldest one and put it in this.points
    if (this.latest_points.length > 10) {
      let point = this.latest_points.shift();
      this.points.push(point);
      
      // Add the point to the appropriate grid cell
      let cell = this.getGridCell(point);
      this.grid[cell.row][cell.col].push(point);
    }
  }
  
  drawPen() {
    stroke(255,0,0);
    if (this.points.length < speed_multiplier+1) { return; }
    for (let i = 0; i < speed_multiplier; i++) {
      let p1 = this.points[this.points.length - i - 1];
      let p2 = this.points[this.points.length - i - 2];
      if (distance(p1, p2) < 10) { line(p1.x, p1.y, p2.x, p2.y); }
    }
    
  }
}



let pen; // the pen object
let obstacles = []; // array of obstacles

function setup() {
  createCanvas(400, 400);
  angleMode(DEGREES);
  background(255);
  pen = new Pen({x: 190, y: 190}, 0.0);

  if(random(0,1)>0.5){
    let p = {x: random(50, 350), y: random(50, 350)};
    let p2 = {x: p.x + random(30, 60), y: p.y + random(-60, -30)};
    let p3 = {x: p.x + random(30, 60), y: p.y + random(60, 30)};
    let bigTriangle = new TriangleObstacle(p, p2, p3);
    obstacles.push(bigTriangle);
  }
  if(random(0,1)>0.5){
    let c = new CircleObstacle({x: random(50, 350), y: random(50, 350)}, random(30, 50));
    obstacles.push(c);
  }
}

let go = true;
let speed_multiplier = 50;

function draw() { if (go) {
  for (let i = 0; i < speed_multiplier; i++) {
    pen.updatePen(obstacles);
  }
  pen.drawPen();
  // draw obstacles
  for (let i = 0; i < obstacles.length; i++) { obstacles[i].draw(); }
}}