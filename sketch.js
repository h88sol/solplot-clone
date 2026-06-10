/* SKETCHPLOT — procedural hand-drawn building sketch generator.
   No network, no API key. Deterministic from a seed so every plot is unique
   and reproducible. Structure (floors/windows/roof) comes from `seed`; the
   wobble of the lines comes from `opts.hand` so several "artists" can draw the
   SAME building with a different hand. */
(function () {
  function rngFrom(a) {
    a = (a | 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // a wobbly hand-drawn line
  function hline(ctx, x1, y1, x2, y2, hand, wob) {
    var segs = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 26));
    ctx.beginPath();
    for (var i = 0; i <= segs; i++) {
      var t = i / segs, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      if (i !== 0 && i !== segs) { x += (hand() - 0.5) * wob * 2; y += (hand() - 0.5) * wob * 2; }
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  function poly(ctx, pts, hand, wob) {
    for (var i = 0; i < pts.length - 1; i++) hline(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], hand, wob);
  }

  function drawSketch(canvas, seed, opts) {
    opts = opts || {};
    var st = rngFrom(seed), hand = rngFrom(opts.hand || seed);
    var W = canvas.width, H = canvas.height, ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = Math.max(2, W / 175);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var wob = opts.rough ? 3.2 : 1.5;

    var diff = opts.diff || 'Medium';
    var cx = W / 2, baseY = H * 0.80;
    var floors = diff === 'Easy' ? 1 : diff === 'Medium' ? (1 + Math.round(st()))
               : diff === 'Hard' ? 2 : (2 + Math.round(st()));
    var bw = W * (0.34 + st() * 0.12);
    var fh = H * 0.135, bh = fh * floors;
    var left = cx - bw / 2, right = cx + bw / 2, top = baseY - bh;

    // ground
    hline(ctx, W * 0.10, baseY, W * 0.90, baseY, hand, wob);
    // walls
    poly(ctx, [[left, baseY], [left, top], [right, top], [right, baseY]], hand, wob);
    // floor lines
    for (var f = 1; f < floors; f++) { var fy = baseY - fh * f; hline(ctx, left, fy, right, fy, hand, wob); }

    // roof
    var roof = ['gable', 'hip', 'flat'][Math.floor(st() * 3)];
    if (roof === 'flat') {
      hline(ctx, left - 9, top, right + 9, top, hand, wob);
    } else {
      var peak = top - H * (0.10 + st() * 0.07);
      poly(ctx, [[left - 11, top], [cx, peak], [right + 11, top]], hand, wob);
      if (roof === 'hip') hline(ctx, cx, peak, cx, top, hand, wob);
      // chimney
      if (st() > 0.45) {
        var chx = right - bw * 0.22;
        poly(ctx, [[chx, top - H * 0.03], [chx, top - H * 0.11], [chx + 13, top - H * 0.11], [chx + 13, top - H * 0.02]], hand, wob);
      }
    }

    // door
    var dw = bw * 0.16, dh = fh * 0.82, dx = cx - dw / 2;
    poly(ctx, [[dx, baseY], [dx, baseY - dh], [dx + dw, baseY - dh], [dx + dw, baseY]], hand, wob);

    // windows
    var cols = diff === 'Easy' ? 1 : 2 + Math.floor(st() * 2);
    for (var fl = 0; fl < floors; fl++) {
      var wy = baseY - fh * fl - fh * 0.58;
      for (var c = 0; c < cols; c++) {
        var wcx = left + bw * ((c + 1) / (cols + 1));
        if (fl === 0 && Math.abs(wcx - cx) < dw * 0.9) continue; // don't overlap the door
        var ww = bw * 0.13, wh = fh * 0.4, wx = wcx - ww / 2;
        poly(ctx, [[wx, wy], [wx, wy + wh], [wx + ww, wy + wh], [wx + ww, wy]], hand, wob);
        hline(ctx, wcx, wy, wcx, wy + wh, hand, wob * 0.7);
        hline(ctx, wx, wy + wh / 2, wx + ww, wy + wh / 2, hand, wob * 0.7);
      }
    }

    // a pool for the fancy tiers
    if ((diff === 'Hard' || diff === 'Elite') && st() > 0.4) {
      var px = right + W * 0.02, py = baseY - H * 0.02;
      ctx.beginPath();
      for (var a = 0; a <= 16; a++) {
        var ang = a / 16 * Math.PI * 2;
        var ex = px + Math.cos(ang) * W * 0.07 + (hand() - 0.5) * wob;
        var ey = py + Math.sin(ang) * H * 0.028 + (hand() - 0.5) * wob;
        a === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey);
      }
      ctx.closePath(); ctx.stroke();
    }

    // scribbly trees
    var trees = Math.floor(st() * 3);
    for (var t2 = 0; t2 < trees; t2++) {
      var tx = (st() < 0.5) ? left - W * 0.07 : right + W * 0.06;
      var ty = baseY, rr = H * 0.05;
      ctx.beginPath();
      for (var k = 0; k <= 9; k++) {
        var an = k / 9 * Math.PI * 2, r2 = rr * (0.7 + hand() * 0.5);
        var xx = tx + Math.cos(an) * r2, yy = ty - rr - Math.sin(an) * r2;
        k === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
      }
      ctx.closePath(); ctx.stroke();
      hline(ctx, tx, ty - rr * 0.4, tx, ty, hand, wob);
    }
  }

  function sketchDataURL(seed, opts) {
    var c = document.createElement('canvas');
    c.width = c.height = (opts && opts.size) || 440;
    drawSketch(c, seed | 0, opts || {});
    return c.toDataURL('image/png');
  }

  window.drawSketch = drawSketch;
  window.sketchDataURL = sketchDataURL;
})();
