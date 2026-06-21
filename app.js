// =============================================================================
//  Name: Radroach Races
//  Author: Theeohn Megistus
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/Theeohn/Radroach-Races
// =============================================================================

(function() {
  // Pre-bind heavily used graphics methods for tight loops (Rule 3.15 / CPU Fix)
  const drawLineCached = h.drawLine.bind(h);
  
  // Pre-allocate flat typed array for dirty rectangles (20 integers max needed) to prevent per-frame allocation
  const dirty = new Int16Array(20);

  let mainLoopInterval = null;
  let countdownTimer = null;

  // Game States
  let gameState = 'TITLE_SCREEN';
  let winnerId = -1;
  let countdownValue = 5;
  let currentMapId = 0;
  
  // trackWalls will be a flattened Int16Array instead of an array of objects
  let trackWalls = new Int16Array(0); 
  
  let goalPos = { x: 0, y: 0, w: 16, h: 16, hitW: 15, hitH: 15 };
  let startX = 0;
  let startYBase = 0;
  let radroaches = [];

  let trackDirty = 1;

  const SHAPE_NAMES = { 1: 'SQUARE', 2: 'TRIANGLE', 3: 'DIAMOND', 4: 'CROSS', 5: 'HEXAGON' };

  const SHAPES = {
    square:   { half: 7.48, hitR: 9.6  },
    triangle: { half: 9.7, hitR: 9.9  },
    diamond:  { half: 8.57, hitR: 9.9  },
    cross:    { half: 7.92, hitR: 9.9  },
    hexagon:  { half: 7.92, hitR: 9.9  } 
  };

  const MAP_BLUEPRINTS = [
    { // Map 1
      goal: { x: 42, y: 58 },
      start: { x: 25, y: 150 },
      walls: [
        { x1: 18,  y1: 95,  x2: 185, y2: 95 },
        { x1: 185, y1: 95,  x2: 185, y2: 200 },
        { x1: 185, y1: 200, x2: 310, y2: 200 },
        { x1: 320, y1: 18,  x2: 320, y2: 85 }
      ]
    },
    { // Map 2
      goal: { x: 340, y: 50 },
      start: { x: 30, y: 185 },
      walls: [
        { x1: 100, y1: 60,  x2: 100, y2: 170 },
        { x1: 100, y1: 135, x2: 310, y2: 135 },
        { x1: 210, y1: 220, x2: 465, y2: 220 }
      ]
    },
    { // Map 3
      goal: { x: 375, y: 200 },
      start: { x: 30, y: 46 },
      walls: [
        { x1: 18,  y1: 155, x2: 270, y2: 155 },
        { x1: 200, y1: 220, x2: 465, y2: 220 },
        { x1: 270, y1: 95,  x2: 270, y2: 155 },
        { x1: 200, y1: 155, x2: 200, y2: 298 }
      ]
    },
    { // Map 4
      goal: { x: 62, y: 145 },
      start: { x: 63, y: 25 },
      walls: [
        { x1: 18, y1: 125, x2: 360, y2: 125 },
        { x1: 115, y1: 205, x2: 360, y2: 205 },
        { x1: 115, y1: 125, x2: 115, y2: 205 },
        { x1: 360, y1: 125, x2: 360, y2: 205 }
      ]
    },
    { // Map 5
      goal: { x: 135, y: 31 },
      start: { x: 30, y: 192 },
      walls: [
        { x1: 18,  y1: 180, x2: 285, y2: 180 },
        { x1: 320, y1: 180, x2: 285, y2: 80 },
        { x1: 120, y1: 80, x2: 320, y2: 80 },
        { x1: 120, y1: 18, x2: 120, y2: 80 },
        { x1: 380, y1: 100, x2: 465, y2: 100 },
        { x1: 380, y1: 100, x2: 380, y2: 298 },
        { x1: 355, y1: 18, x2: 355, y2: 56}
      ]
    },
    { // Map 6
      goal: { x: 75, y: 250 },
      start: { x: 63, y: 27 },
      walls: [
        { x1: 18,  y1: 128, x2: 165, y2: 128 },
        { x1: 196,  y1: 128, x2: 323, y2: 128 },
        { x1: 323, y1: 128, x2: 323, y2: 90 },
        { x1: 100, y1: 180, x2: 205, y2: 180 },
        { x1: 255, y1: 180, x2: 465, y2: 180 },
        { x1: 319, y1: 180, x2: 319, y2: 264 },
        { x1: 18,  y1: 229, x2: 180, y2: 229 }
      ]
    },
  ];

  // ─── Title Screen ─────────────────────────────────────────────────────────

  function showTitleScreen() {
    gameState = 'TITLE_SCREEN';
    winnerId = -1;

    h.setColor(0).fillRect(0, 0, 480, 320);
    h.setColor(2).drawRect(18, 18, 465, 298);

    h.setFont("Monofonto23").setFontAlign(0, -1).setColor(3);
    h.drawString("Radroach Races", 240, 55);

    h.setColor(2);
    h.drawLine(55, 180, 425, 180);
    h.drawLine(55, 200, 425, 200);
    for (let fx = 75; fx < 425; fx += 35) {
      h.fillRect(fx, 150, fx + 15, 230);
    }

    for (let gx = 35; gx < 445; gx += 12) {
      h.drawLine(gx, 230, gx - 4, 210);
      h.drawLine(gx + 3, 230, gx + 6, 205);
    }

    h.setColor(3);
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

    // Dynamically uses MAP_BLUEPRINTS.length so you can add more maps easily!
    currentMapId = Math.randInt(MAP_BLUEPRINTS.length);
    const bp = MAP_BLUEPRINTS[currentMapId];
    const bpWalls = bp.walls;

    trackWalls = new Int16Array(bpWalls.length * 8); 
    for (let i = 0; i < bpWalls.length; i++) {
      let idx = i * 8;
      let w = bpWalls[i];
      trackWalls[idx] = w.x1;
      trackWalls[idx+1] = w.y1;
      trackWalls[idx+2] = w.x2;
      trackWalls[idx+3] = w.y2;
      trackWalls[idx+4] = Math.min(w.x1, w.x2);
      trackWalls[idx+5] = Math.min(w.y1, w.y2);
      trackWalls[idx+6] = Math.max(w.x1, w.x2);
      trackWalls[idx+7] = Math.max(w.y1, w.y2);
    }
    
    goalPos.x = bp.goal.x;
    goalPos.y = bp.goal.y;
    startX = bp.start.x;
    startYBase = bp.start.y;

    // Cache hitR directly onto the roach objects
    // Shuffle spawn slots so roach order varies each race
    const slots = [0, 20, 40, 60, 80];
    for (let s = 4; s > 0; s--) {
      const sv = Math.randInt(s + 1);
      const tmp = slots[s]; slots[s] = slots[sv]; slots[sv] = tmp;
    }
    radroaches = [
      { id: 1, shape: 'square',   cx: startX + 7, cy: startYBase + 7 + slots[0], vx: 0, vy: 0, hitR: SHAPES.square.hitR },
      { id: 2, shape: 'triangle', cx: startX + 7, cy: startYBase + 7 + slots[1], vx: 0, vy: 0, hitR: SHAPES.triangle.hitR },
      { id: 3, shape: 'diamond',  cx: startX + 7, cy: startYBase + 7 + slots[2], vx: 0, vy: 0, hitR: SHAPES.diamond.hitR },
      { id: 4, shape: 'cross',    cx: startX + 7, cy: startYBase + 7 + slots[3], vx: 0, vy: 0, hitR: SHAPES.cross.hitR },
      { id: 5, shape: 'hexagon',  cx: startX + 7, cy: startYBase + 7 + slots[4], vx: 0, vy: 0, hitR: SHAPES.hexagon.hitR }
    ];
    for (let i = 0; i < radroaches.length; i++) {
      setRandomVelocity(radroaches[i], 4);
    }

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(tickCountdown, 1000);
    tickCountdown();
  }

  function tickCountdown() {
    if (gameState !== 'COUNTDOWN') return;

    h.setColor(0).fillRect(0, 0, 480, 320);
    drawTrack();

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
      trackDirty = 1; 
    }

    h.flip();
    Pip.lastFlip = getTime();
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  function drawShape(r) {
    const s = SHAPES[r.shape], cx = r.cx, cy = r.cy, hf = s.half, hf2 = hf - 1;
    h.setColor(3);

    if (r.shape === 'square') {
      h.drawRect(cx - hf, cy - hf, cx + hf, cy + hf);
      h.drawRect(cx - hf2, cy - hf2, cx + hf2, cy + hf2);
    } else if (r.shape === 'triangle') {
      h.drawPoly([cx, cy - hf, cx + hf * 0.866, cy + hf * 0.5, cx - hf * 0.866, cy + hf * 0.5], true);
      h.drawPoly([cx, cy - hf2, cx + hf2 * 0.866, cy + hf2 * 0.5, cx - hf2 * 0.866, cy + hf2 * 0.5], true);
    } else if (r.shape === 'diamond') {
      h.drawPoly([cx, cy - hf, cx + hf, cy, cx, cy + hf, cx - hf, cy], true);
      h.drawPoly([cx, cy - hf2, cx + hf2, cy, cx, cy + hf2, cx - hf2, cy], true);
    } else if (r.shape === 'cross') {
      const w1 = 3, w2 = 2;
      h.drawPoly([
        cx - w1, cy - hf,  cx + w1, cy - hf,  cx + w1, cy - w1,
        cx + hf, cy - w1,  cx + hf, cy + w1,  cx + w1, cy + w1,
        cx + w1, cy + hf,  cx - w1, cy + hf,  cx - w1, cy + w1,
        cx - hf, cy + w1,  cx - hf, cy - w1,  cx - w1, cy - w1
      ], true);
      h.drawPoly([
        cx - w2, cy - hf2,  cx + w2, cy - hf2,  cx + w2, cy - w2,
        cx + hf2, cy - w2,  cx + hf2, cy + w2,  cx + w2, cy + w2,
        cx + w2, cy + hf2,  cx - w2, cy + hf2,  cx - w2, cy + w2,
        cx - hf2, cy + w2,  cx - hf2, cy - w2,  cx - w2, cy - w2
      ], true);
    } else if (r.shape === 'hexagon') {
      const q = hf / 2, q2 = hf2 / 2;
      h.drawPoly([cx - hf + q, cy - hf, cx + hf - q, cy - hf, cx + hf, cy, cx + hf - q, cy + hf, cx - hf + q, cy + hf, cx - hf, cy], true);
      h.drawPoly([cx - hf2 + q2, cy - hf2, cx + hf2 - q2, cy - hf2, cx + hf2, cy, cx + hf2 - q2, cy + hf2, cx - hf2 + q2, cy + hf2, cx - hf2, cy], true);
    }
  }

  function drawTrack() {
    h.setColor(3);
    h.drawRect(18, 18, 465, 298);
    h.drawRect(19, 19, 464, 297);

    for (let i = 0; i < trackWalls.length; i += 8) {
      const lx1 = trackWalls[i], ly1 = trackWalls[i+1], lx2 = trackWalls[i+2], ly2 = trackWalls[i+3];
      drawLineCached(lx1, ly1, lx2, ly2);
      if (trackWalls[i+7] - trackWalls[i+5] < 6) {
        // Horizontal wall — offset second line downward
        drawLineCached(lx1, ly1 + 1, lx2, ly2 + 1);
      } else {
        // Vertical wall — offset second line rightward
        drawLineCached(lx1 + 1, ly1, lx2 + 1, ly2);
      }
    }

    h.setFont("Monofonto14").setFontAlign(-1, -1).setColor(2);
    h.drawString("Map " + (currentMapId + 1), 25, 25);

    h.setColor(3);
    h.fillRect(goalPos.x, goalPos.y, goalPos.x + goalPos.w, goalPos.y + goalPos.h);
    h.setColor(2);
    h.fillRect(goalPos.x + 5, goalPos.y - 7, goalPos.x + 10, goalPos.y);
    h.fillRect(goalPos.x - 5, goalPos.y + 5, goalPos.x, goalPos.y + 10);
  }

  // ─── Physics ──────────────────────────────────────────────────────────────

  function setRandomVelocity(r, speed) {
    const deg = Math.randInt(360);
    const rad = deg * 0.017453292519943295;
    r.vx = Math.cos(rad) * speed;
    r.vy = Math.sin(rad) * speed;
  }

  function jitterVelocity(r) {
    const speed = Math.sqrt(r.vx * r.vx + r.vy * r.vy);
    const curAngle = Math.atan2(r.vy, r.vx);
    const jitterDeg = Math.randInt(21) - 10;
    const newAngle = curAngle + jitterDeg * 0.017453292519943295;
    r.vx = Math.cos(newAngle) * speed;
    r.vy = Math.sin(newAngle) * speed;
  }

  function checkWallCollision(r) {  "ram";
    let bounced = false;
    const hr = r.hitR; 

    if (r.cx - hr <= 18) {
      r.cx = 18 + hr; r.vx = Math.abs(r.vx); bounced = true;
    } else if (r.cx + hr >= 465) {
      r.cx = 465 - hr; r.vx = -Math.abs(r.vx); bounced = true;
    }
    if (r.cy - hr <= 18) {
      r.cy = 18 + hr; r.vy = Math.abs(r.vy); bounced = true;
    } else if (r.cy + hr >= 298) {
      r.cy = 298 - hr; r.vy = -Math.abs(r.vy); bounced = true;
    }

    for (let i = 0; i < trackWalls.length; i += 8) {
      const wx1 = trackWalls[i+4]; // minX
      const wy1 = trackWalls[i+5]; // minY
      const wx2 = trackWalls[i+6]; // maxX
      const wy2 = trackWalls[i+7]; // maxY

      if (r.cx + hr >= wx1 && r.cx - hr <= wx2 &&
          r.cy + hr >= wy1 && r.cy - hr <= wy2) {

        // Use penetration depth on each axis to find the true contact face.
        // The axis with the smallest overlap is the one the roach just crossed —
        // that is the face it hit, regardless of wall orientation.
        // This correctly handles vertex/corner contacts that the old shape-based
        // branch got wrong, causing teleports and bad bounce angles.
        const penLeft  = r.cx + hr - wx1;
        const penRight = wx2 - (r.cx - hr);
        const penTop   = r.cy + hr - wy1;
        const penBot   = wy2 - (r.cy - hr);
        const penX = penLeft < penRight ? penLeft : penRight;
        const penY = penTop  < penBot   ? penTop  : penBot;

        if (penX < penY) {
          // Shallower penetration on X — hit a vertical face
          if (penLeft < penRight) {
            r.cx = wx1 - hr;
          } else {
            r.cx = wx2 + hr;
          }
          r.vx = -r.vx;
          bounced = true;
        } else {
          // Shallower penetration on Y — hit a horizontal face
          if (penTop < penBot) {
            r.cy = wy1 - hr;
          } else {
            r.cy = wy2 + hr;
          }
          r.vy = -r.vy;
          bounced = true;
        }
      }
    }

    if (bounced) {
      jitterVelocity(r);
      if (r.cx - hr <= 18  && r.vx < 0) r.vx = -r.vx;
      if (r.cx + hr >= 465 && r.vx > 0) r.vx = -r.vx;
      if (r.cy - hr <= 18  && r.vy < 0) r.vy = -r.vy;
      if (r.cy + hr >= 298 && r.vy > 0) r.vy = -r.vy;

      // Enforce minimum normal velocity so shallow-angle hits always bounce cleanly away.
      // 1.5 out of speed-3 means the roach can never leave a wall at less than 30 degrees.
      // We track which axis was the collision normal and boost it if below threshold,
      // then renormalize to preserve speed.
      const vxAbs = r.vx < 0 ? -r.vx : r.vx;
      const vyAbs = r.vy < 0 ? -r.vy : r.vy;
      let fixed = 0;
      if (r.cx - hr <= 18 + 1 || r.cx + hr >= 465 - 1) {
        // X is the normal axis (border left/right)
        if (vxAbs < 1.5) { r.vx = r.vx < 0 ? -1.5 : 1.5; fixed = 1; }
      }
      if (r.cy - hr <= 18 + 1 || r.cy + hr >= 298 - 1) {
        // Y is the normal axis (border top/bottom)
        if (vyAbs < 1.5) { r.vy = r.vy < 0 ? -1.5 : 1.5; fixed = 1; }
      }
      for (let i = 0; i < trackWalls.length; i += 8) {
        const wx1 = trackWalls[i+4], wy1 = trackWalls[i+5];
        const wx2 = trackWalls[i+6], wy2 = trackWalls[i+7];
        if (r.cx + hr >= wx1 - 1 && r.cx - hr <= wx2 + 1 &&
            r.cy + hr >= wy1 - 1 && r.cy - hr <= wy2 + 1) {
          // Mirror the penetration-depth axis decision from collision so enforcement
          // always targets the same axis that was actually reflected.
          const pX = (r.cx + hr - wx1) < (wx2 - (r.cx - hr)) ? (r.cx + hr - wx1) : (wx2 - (r.cx - hr));
          const pY = (r.cy + hr - wy1) < (wy2 - (r.cy - hr)) ? (r.cy + hr - wy1) : (wy2 - (r.cy - hr));
          if (pX < pY) {
            if (vxAbs < 1.5) { r.vx = r.vx < 0 ? -1.5 : 1.5; fixed = 1; }
          } else {
            if (vyAbs < 1.5) { r.vy = r.vy < 0 ? -1.5 : 1.5; fixed = 1; }
          }
        }
      }
      if (fixed) {
        const spd = Math.sqrt(r.vx * r.vx + r.vy * r.vy);
        if (spd > 0) { r.vx = r.vx / spd * 3; r.vy = r.vy / spd * 3; }
      }
    }
  }

  function checkRoachCollisions() {  "ram";
    for (let i = 0; i < radroaches.length; i++) {
      for (let j = i + 1; j < radroaches.length; j++) {
        const a = radroaches[i];
        const b = radroaches[j];
        const rSum = a.hitR + b.hitR;

        const dx = a.cx - b.cx;
        const dy = a.cy - b.cy;
        const distSq = dx * dx + dy * dy;

        if (distSq < rSum * rSum && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist, ny = dy / dist;

          const overlap = rSum - dist;
          a.cx += nx * overlap * 0.5; a.cy += ny * overlap * 0.5;
          b.cx -= nx * overlap * 0.5; b.cy -= ny * overlap * 0.5;

          const relVel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (relVel >= 0) continue;

          const aN = a.vx * nx + a.vy * ny; // a's speed along collision normal
          const bN = b.vx * nx + b.vy * ny; // b's speed along collision normal

          a.vx += (bN - aN) * nx; a.vy += (bN - aN) * ny;
          b.vx += (aN - bN) * nx; b.vy += (aN - bN) * ny;

          let sMag = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
          if (sMag > 0) { a.vx = a.vx / sMag * 4; a.vy = a.vy / sMag * 4; }
          sMag = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (sMag > 0) { b.vx = b.vx / sMag * 4; b.vy = b.vy / sMag * 4; }
          jitterVelocity(a);
          jitterVelocity(b);
        }
      }
    }
  }

  function updatePhysics() {  "ram";
    if (gameState !== 'RACING') return;

    if (trackDirty) {
      trackDirty = 0;
      h.setColor(0).fillRect(0, 0, 480, 320);
      drawTrack();
      for (let i = 0; i < radroaches.length; i++) drawShape(radroaches[i]);
      h.flip();
      Pip.lastFlip = getTime();
      return;
    }

    let dIdx = 0;
    h.setColor(0);
    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      const hr = r.hitR; 
      const dx1 = r.cx - hr - 2, dy1 = r.cy - hr - 2;
      const dx2 = r.cx + hr + 2, dy2 = r.cy + hr + 2;
      
      h.fillRect(dx1, dy1, dx2, dy2);
      
      // Save directly into the pre-allocated Int16Array
      dirty[dIdx++] = dx1;
      dirty[dIdx++] = dy1;
      dirty[dIdx++] = dx2;
      dirty[dIdx++] = dy2;
    }

    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      r.cx += r.vx;
      r.cy += r.vy;
      checkWallCollision(r);
    }
    checkRoachCollisions();

    // Loop through the fixed 20 entries (5 roaches * 4 rect values)
    for (let i = 0; i < 20; i += 4) {
      h.setClipRect(dirty[i], dirty[i+1], dirty[i+2], dirty[i+3]);
      drawTrack();
      h.setClipRect(0, 0, 480, 320); 
    }

    for (let i = 0; i < radroaches.length; i++) {
      const r = radroaches[i];
      const hr = r.hitR;
      if (r.cx + hr >= goalPos.x && r.cx - hr <= goalPos.x + goalPos.hitW &&
          r.cy + hr >= goalPos.y && r.cy - hr <= goalPos.y + goalPos.hitH) {
        gameState = 'GAMEOVER';
        winnerId = r.id;
        Pip.audioStart('HOLO/RADROACH_RACES/WINNER.WAV');
        break;
      }
    }

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
    h.drawString("PRESS LEFT WHEEL TO RACE AGAIN!", 240, 168);
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