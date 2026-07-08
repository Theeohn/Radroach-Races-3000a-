// =============================================================================
//  Name: Radroach Races
//  Author: Theeohn Megistus
//  License: MIT
//  Repository: https://github.com/Theeohn/Radroach-Races
// =============================================================================
//  File: TITLE.JS (scene)
//  Description: Draws the title screen and waits for the left knob press to
//  start a race.
// =============================================================================

(function (app) {
  /**
   * Handle the left scroll wheel input
   * @param dir The direction of the scroll wheel
   * @returns {void} Nothing
   */
  function onKnob1(dir) {
    if (dir !== 0) return;

    Pip.audioStart('HOLO/RADROACH_RACES/BUGLE.WAV');
    app.go(app.scenes.RACE);
  }

  h.setColor(0).fillRect(0, 0, 480, 320).setColor(2).drawRect(18, 18, 465, 298);

  h.setFont('Monofonto36')
    .setFontAlign(0, -1)
    .setColor(3)
    .drawString('RADROACH RACES', 240, 52)
    .setFont('Monofonto18')
    .setFontAlign(0, -1)
    .setColor(2)
    .drawString('by Theeohn', 360, 94)
    .setFont('Monofonto14')
    .setFontAlign(0, -1)
    .setColor(2)
    .drawString('v2.0', 450, 282);

  h.setColor(2).drawLine(55, 180, 425, 180).drawLine(55, 200, 425, 200);
  for (let fx = 75; fx < 425; fx += 35) {
    h.fillRect(fx, 150, fx + 15, 230);
  }

  for (let gx = 35; gx < 445; gx += 12) {
    h.drawLine(gx, 230, gx - 4, 210).drawLine(gx + 3, 230, gx + 6, 205);
  }

  h.setColor(3)
    .fillEllipse(200, 165, 280, 215)
    .fillCircle(240, 150, 18)
    .drawLine(236, 138, 205, 105)
    .drawLine(244, 138, 275, 105)
    .drawPoly([205, 165, 180, 175, 165, 200], false)
    .drawPoly([200, 190, 175, 200, 160, 230], false)
    .drawPoly([275, 165, 300, 175, 315, 200], false)
    .drawPoly([280, 190, 305, 200, 320, 230], false);

  h.setFont('Monofonto23')
    .setFontAlign(0, -1)
    .setColor(3)
    .drawString('PRESS LEFT WHEEL TO START!', 240, 255);

  h.flip();
  Pip.lastFlip = getTime();

  Pip.onExclusive('knob1', onKnob1);

  return {
    remove: function () {
      Pip.removeListener('knob1', onKnob1);
    },
  };
});