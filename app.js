// =============================================================================
//  Name: Radroach Races
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/Theeohn/Radroach-Races
// =============================================================================

(function() {
  let mainLoopInterval = null;
  let countdownTimer = null;

  // Game States
  let gameState = 'TITLE_SCREEN';
  let winnerId = -1;
  let countdownValue = 5;
  let currentMapId = 0;
  let trackWalls = [];
  let goalPos = { x: 0, y: 0, w: 14, h: 14 };
  let startX = 0;
  let startYBase = 0;
  let radroaches = [];

  // Sound limiter — max 2 bounce sound instances at once
  let bounceSoundCount = 0;

  const BLOCK_SIZE = 14;
  const SHAPE_NAMES = { 1: 'SQUARE', 2: 'TRIANGLE', 3: 'DIAMOND', 4: 'CROSS', 5: 'HEXAGON' };

  // Play area: 480x320 screen, with margin
  // PLAY_AREA: x1=18, x2=465, y1=18, y2=298

  // MAP_BLUEPRINTS derived from Horse Race Test map images.
  // Walls are line segments (x1,y1)-(x2,y2) representing internal barriers.
  // Outer boundary enforcement is handled by PLAY_AREA bounce logic.
  // Start positions are from the yellow START box (top-left region of each map).
  // Goal positions are from the checkered flag square in each map image.
  //
  // Map coordinate space: 480x320, play area inset x1=18, x2=465, y1=18, y2=298.
  // Wall coordinates are scaled/mapped from each image's proportional layout.

  const MAP_BLUEPRINTS = [
    // Map 1: S-shaped winding tunnel with two horizontal corridors and two vertical connectors.
    // Start: top-left. Goal: center-right area (checkered flag near x=340, y=240 in image).
    {
      goal: { x: 330, y: 215 },
      start: { x: 30, y: 55 },
      walls: [
        // Upper horizontal divider — splits top corridor from mid section
        { x1: 18,  y1: 155, x2: 270, y2: 155 },
        // Lower horizontal divider — creates bottom corridor
        { x1: 200, y1: 220, x2: 465, y2: 220 },
        // Left vertical connector — joins upper and mid dividers.
        // Starts at y=80 (not the pen's top edge) so a 35px gap remains at the
        // top-right corner of the start pen — wide enough for a 14px roach to escape through.
        { x1: 270, y1: 80,  x2: 270, y2: 155 },
        // Right vertical connector — joins mid and lower dividers
        { x1: 200, y1: 155, x2: 200, y2: 285 }
      ]
    },
    // Map 2: Large open floor with a central U-shaped funnel and a left side pocket.
    // Start: top-left. Goal: center (checkered flag near x=270, y=215 in image).
    {
      goal: { x: 260, y: 205 },
      start: { x: 30, y: 100 },
      walls: [
        // Top horizontal bar cutting upper-right off
        { x1: 18,  y1: 95,  x2: 185, y2: 95  },
        // Vertical drop from top bar — forms left wall of funnel
        { x1: 185, y1: 95,  x2: 185, y2: 200 },
        // Bottom of funnel — horizontal join
        { x1: 185, y1: 200, x2: 310, y2: 200 },
        // Left side pocket wall — partial vertical on left
        { x1: 80,  y1: 200, x2: 80,  y2: 285 }
      ]
    },
    // Map 3: Jagged rocky terrain with a diagonal central obstacle and upper corridor blocker.
    // Start: top-left. Goal: left-center (checkered flag near x=250, y=235 in image).
    {
      goal: { x: 240, y: 225 },
      start: { x: 30, y: 185 },
      walls: [
        // Upper wall — cuts off top passage, forcing left or right routing
        { x1: 100, y1: 55,  x2: 100, y2: 170 },
        // Mid horizontal — central barrier across map
        { x1: 100, y1: 170, x2: 310, y2: 170 },
        // Lower right horizontal — forces lower path on right side
        { x1: 210, y1: 220, x2: 465, y2: 220 }
      ]
    },
    // Map 4: Boxy corridors with a large hollow central rectangle (room with no exit until corners).
    // Start: top-left. Goal: left-center pocket (checkered flag near x=65, y=215 in image).
    {
      goal: { x: 55, y: 205 },
      start: { x: 30, y: 110 },
      walls: [
        // Top bar of central box
        { x1: 130, y1: 105, x2: 385, y2: 105 },
        // Bottom bar of central box
        { x1: 130, y1: 245, x2: 385, y2: 245 },
        // Left bar of central box
        { x1: 130, y1: 105, x2: 130, y2: 245 },
        // Right bar of central box
        { x1: 385, y1: 105, x2: 385, y2: 245 }
      ]
    },
    // Map 5: Organic blob terrain with a winding path. Two horizontal bands create level splits.
    // Start: top-left. Goal: right-center (checkered flag near x=390, y=210 in image).
    {
      goal: { x: 380, y: 200 },
      start: { x: 30, y: 55 },
      walls: [
        // Upper horizontal band — forces traffic to split above or below
        { x1: 18,  y1: 165, x2: 355, y2: 165 },
        // Lower horizontal band — second level split
        { x1: 90,  y1: 240, x2: 465, y2: 240 }
      ]
    }
  ];

  // ─── Title Screen ─────────────────────────────────────────────────────────

  function showTitleScreen() {
    gameState = 'TITLE_SCREEN';
    winnerId = -1;

    h.setColor(0).fillRect(0, 0, 480, 320);
    h.setColor(1).drawRect(18, 18, 465, 298);

    h.setFont("Monofonto23").setFontAlign(0, -1).setColor(3);
    h.drawString("Radroach Races", 240, 55);

    // Fence backdrop
    h.setColor(2);
    h.drawLine(55, 180, 425, 180);
    h.drawLine(55, 200, 425, 200);
    for (let fx = 75; fx < 425; fx += 35) {
      h.fillRect(fx, 150, fx + 15, 230);
    }

    // Grass tufts
    for (let gx = 35; gx < 445; gx += 12) {
      h.drawLine(gx, 230, gx - 4, 210);
      h.drawLine(gx + 3, 230, gx + 6, 205);
    }

    // Cockroach vector art
    h.setColor(1);
    h.fillEllipse(200, 165, 280, 215);
    h.fillCircle(240, 150, 18);
    h.drawLine(236, 138, 205, 105);
    h.drawLine(244, 138, 275, 105);
    h.drawPoly([205, 165, 180, 175, 165, 200], false);
    h.drawPoly([200, 190, 175, 200, 160, 230], false);
    h.drawPoly([275, 165, 300, 175, 315, 200], false);
    h.drawPoly([280, 190, 305, 200, 320, 230], false);

    h.setFont("Monofonto16").setFontAlign(0, -1).setColor(3);
    h.drawString("PRESS LEFT WHEEL TO START!", 240, 270);

    h.flip();
    Pip.lastFlip = getTime();

    Pip.onExclusive("knob1", handleKnobStart);
  }

  function handleKnobStart(dir) {
    if (dir !== 0) return;
    if (gameState === 'TITLE_SCREEN') {
      Pip.audioStart('HOLO/RADROACH_RACES/BUGLE.WAV');
      startCountdown();
    } else if (gameState === 'GAMEOVER') {
      showTitleScreen();
    }
  }

  // ─── Countdown ────────────────────────────────────────────────────────────

  function startCountdown() {
    gameState = 'COUNTDOWN';
    countdownValue = 5;

    currentMapId = Math.randInt(5);
    const bp = MAP_BLUEPRINTS[currentMapId];
    trackWalls = bp.walls;
    goalPos.x = bp.goal.x;
    goalPos.y = bp.goal.y;
    startX = bp.start.x;
    startYBase = bp.start.y;

    // Initialise radroaches DVD-logo style: each gets its own random angle,
    // so every roach heads off in a near-random direction from the start.
    // Speed magnitude stays constant (2.8 px/tick); only the angle varies.
    radroaches = [
      { id: 1, shape: 'square',   x: startX, y: startYBase,      vx: 0, vy: 0 },
      { id: 2, shape: 'triangle', x: startX, y: startYBase + 18, vx: 0, vy: 0 },
      { id: 3, shape: 'diamond',  x: startX, y: startYBase + 36, vx: 0, vy: 0 },
      { id: 4, shape: 'cross',    x: startX, y: startYBase + 54, vx: 0, vy: 0 },
      { id: 5, shape: 'hexagon',  x: startX, y: startYBase + 72, vx: 0, vy: 0 }
    ];
    for (let i = 0; i < radroaches.length; i++) {
      setRandomVelocity(radroaches[i], 2.8);
    }

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(tickCountdown, 1000);
    tickCountdown();
  }

  function tickCountdown() {
    if (gameState !== 'COUNTDOWN') return;

    h.setColor(0).fillRect(0, 0, 480, 320);
    drawTrack();

    h.setColor(1);
    for (let i = 0; i < radroaches.length; i++) {
      drawShape(radroaches[i]);
    }

    if (countdownValue > 0) {
      h.setFont("Monofonto96").setFontAlign(0, 0).setColor(3);
      h.drawString(countdownValue.toString(), 240, 160);
      countdownValue--;
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      gameState = 'RACING';
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  function drawShape(r) {
    const cx = r.x + 7;
    const cy = r.y + 7;

    if (r.shape === 'square') {
      h.drawRect(r.x, r.y, r.x + BLOCK_SIZE, r.y + BLOCK_SIZE);
    } else if (r.shape === 'triangle') {
      h.drawPoly([cx, r.y, r.x + BLOCK_SIZE, r.y + BLOCK_SIZE, r.x, r.y + BLOCK_SIZE], true);
    } else if (r.shape === 'diamond') {
      h.drawPoly([cx, r.y, r.x + BLOCK_SIZE, cy, cx, r.y + BLOCK_SIZE, r.x, cy], true);
    } else if (r.shape === 'cross') {
      h.drawLine(cx, r.y, cx, r.y + BLOCK_SIZE);
      h.drawLine(r.x, cy, r.x + BLOCK_SIZE, cy);
    } else if (r.shape === 'hexagon') {
      const q = BLOCK_SIZE / 4;
      h.drawPoly([r.x + q, r.y, r.x + BLOCK_SIZE - q, r.y, r.x + BLOCK_SIZE, cy, r.x + BLOCK_SIZE - q, r.y + BLOCK_SIZE, r.x + q, r.y + BLOCK_SIZE, r.x, cy], true);
    }
  }

  function drawTrack() {
    h.setColor(1);
    h.drawRect(18, 18, 465, 298);

    for (let i = 0; i < trackWalls.length; i++) {
      const w = trackWalls[i];
      h.drawLine(w.x1, w.y1, w.x2, w.y2);
    }

    // Map label top-left
    h.setFont("Monofonto14").setFontAlign(-1, -1).setColor(2);
    h.drawString("Map " + (currentMapId + 1), 21, 21);

    // Goal marker (bright block, same footprint as a radroach)
    h.setColor(3);
    h.fillRect(goalPos.x, goalPos.y, goalPos.x + goalPos.w, goalPos.y + goalPos.h);
    // Stem detail above goal
    h.setColor(2);
    h.fillRect(goalPos.x + 4, goalPos.y - 6, goalPos.x + 10, goalPos.y);
    h.fillRect(goalPos.x - 4, goalPos.y + 4, goalPos.x, goalPos.y + 10);
  }

  // ─── Physics ──────────────────────────────────────────────────────────────

  // Set a roach's velocity to a random angle at the given speed magnitude.
  // Used both for the initial DVD-logo-style launch and for the small
  // randomised kick applied after every bounce.
  function setRandomVelocity(r, speed) {
    // Random angle in [0, 2*PI). Math.randInt(360) gives a degree value,
    // converted to radians — avoids floating point random() per the no-Math.random rule.
    const deg = Math.randInt(360);
    const rad = deg * 0.017453292519943295;
    r.vx = Math.cos(rad) * speed;
    r.vy = Math.sin(rad) * speed;
  }

  // Nudge an existing velocity vector by a random angle (±40°) while
  // preserving its speed — keeps the DVD-logo "near random, not truly random"
  // bounce: a real reflection, with a touch of unpredictability so paths
  // never repeat the exact same loop.
  function jitterVelocity(r) {
    const speed = Math.sqrt(r.vx * r.vx + r.vy * r.vy);
    const curAngle = Math.atan2(r.vy, r.vx);
    const jitterDeg = Math.randInt(9) - 40;
    const newAngle = curAngle + jitterDeg * 0.017453292519943295;
    r.vx = Math.cos(newAngle) * speed;
    r.vy = Math.sin(newAngle) * speed;
  }

  function checkWallCollision(r) {
    let bounced = false;

    // Play area boundary bounce
    if (r.x <= 18) {
      r.x = 18; r.vx = Math.abs(r.vx); bounced = true;
    } else if (r.x + BLOCK_SIZE >= 465) {
      r.x = 465 - BLOCK_SIZE; r.vx = -Math.abs(r.vx); bounced = true;
    }
    if (r.y <= 18) {
      r.y = 18; r.vy = Math.abs(r.vy); bounced = true;
    } else if (r.y + BLOCK_SIZE >= 298) {
      r.y = 298 - BLOCK_SIZE; r.vy = -Math.abs(r.vy); bounced = true;
    }

    // Internal wall bounce
    for (let i = 0; i < trackWalls.length; i++) {
      const w = trackWalls[i];
      const wx1 = Math.min(w.x1, w.x2);
      const wx2 = Math.max(w.x1, w.x2);
      const wy1 = Math.min(w.y1, w.y2);
      const wy2 = Math.max(w.y1, w.y2);

      // Broad AABB overlap with a 4px thickness buffer around the line
      if (r.x + BLOCK_SIZE >= wx1 - 4 && r.x <= wx2 + 4 &&
          r.y + BLOCK_SIZE >= wy1 - 4 && r.y <= wy2 + 4) {

        if (wy2 - wy1 < 6) {
          // Horizontal wall — flip vy
          r.vy = -r.vy;
          r.y += r.vy * 2;
          bounced = true;
        } else if (wx2 - wx1 < 6) {
          // Vertical wall — flip vx
          r.vx = -r.vx;
          r.x += r.vx * 2;
          bounced = true;
        }
      }
    }

    if (bounced) {
      jitterVelocity(r);
    }
  }

  // Roach-vs-roach collision: simple elastic-style swap of velocity
  // components along with a separating push so they never overlap,
  // plus the same DVD-logo style jitter as a wall bounce.
  function checkRoachCollisions() {
    for (let i = 0; i < radroaches.length; i++) {
      for (let j = i + 1; j < radroaches.length; j++) {
        const a = radroaches[i];
        const b = radroaches[j];

        if (a.x < b.x + BLOCK_SIZE && a.x + BLOCK_SIZE > b.x &&
            a.y < b.y + BLOCK_SIZE && a.y + BLOCK_SIZE > b.y) {

          // Push apart along the axis of greatest overlap
          const dx = (a.x + 7) - (b.x + 7);
          const dy = (a.y + 7) - (b.y + 7);

          if (Math.abs(dx) > Math.abs(dy)) {
            const push = (dx >= 0) ? 1 : -1;
            a.x += push * 1.5;
            b.x -= push * 1.5;
            const avx = a.vx;
            a.vx = Math.abs(b.vx) * push;
            b.vx = -Math.abs(avx) * push;
          } else {
            const push = (dy >= 0) ? 1 : -1;
            a.y += push * 1.5;
            b.y -= push * 1.5;
            const avy = a.vy;
            a.vy = Math.abs(b.vy) * push;
            b.vy = -Math.abs(avy) * push;
          }

          jitterVelocity(a);
          jitterVelocity(b);
        }
      }
    }
  }

  function updatePhysics() {  "ram";
    if (gameState !== 'RACING') return;

    // Erase previous positions
    h.setColor(0);
    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      h.fillRect(r.x - 2, r.y - 2, r.x + BLOCK_SIZE + 2, r.y + BLOCK_SIZE + 2);
    }

    // Move and check wall/edge collisions
    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      r.x += r.vx;
      r.y += r.vy;

      checkWallCollision(r);
    }

    // Roach-vs-roach collisions (after movement, before goal check)
    checkRoachCollisions();

    // Goal collision — only one roach can occupy the mutfruit
    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      if (r.x + BLOCK_SIZE >= goalPos.x && r.x <= goalPos.x + goalPos.w &&
          r.y + BLOCK_SIZE >= goalPos.y && r.y <= goalPos.y + goalPos.h) {
        gameState = 'GAMEOVER';
        winnerId = r.id;
        Pip.audioStart('HOLO/RADROACH_RACES/WINNER.WAV');
        break;
      }
    }

    drawTrack();

    h.setColor(1);
    for (let i = 0; i < radroaches.length; i++) {
      drawShape(radroaches[i]);
    }

    if (gameState === 'GAMEOVER') {
      displayWinner();
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  function displayWinner() {
    h.setColor(0).fillRect(120, 130, 360, 190);
    h.setColor(3).drawRect(122, 132, 358, 188);

    h.setFont("Monofonto16").setFontAlign(0, -1).setColor(2);
    h.drawString(SHAPE_NAMES[winnerId] + " ROACH WINS!", 240, 142);
    h.setFont("Monofonto14");
    h.drawString("PRESS LEFT WHEEL TO RESTART", 240, 168);
  }

  // ─── Main Loop ────────────────────────────────────────────────────────────

  function mainLoop() {
    if (gameState === 'RACING') {
      updatePhysics();
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  showTitleScreen();
  mainLoopInterval = setInterval(mainLoop, 33); // ~30fps

  return {
    id: "RADROACHRACES",
    notDefault: true,
    fullscreen: true,
    remove: function() {
      if (mainLoopInterval) { clearInterval(mainLoopInterval); mainLoopInterval = null; }
      if (countdownTimer)   { clearInterval(countdownTimer);   countdownTimer = null; }
      Pip.removeListener("knob1", handleKnobStart);
      Pip.audioStop();
    }
  };
});