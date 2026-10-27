import { drawSpaceEcho } from "./space-echo-visual.mjs";
import { drawTapeTransport, TAPE_LAYOUTS } from "./tape-transport.mjs";
import { tapeWow, tapeFlutter } from "./tape-motion.mjs";
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function ditherCanvas(canvas) {
  const c = canvas.getContext("2d", { willReadFrequently: true }), frame = c.getImageData(0, 0, canvas.width, canvas.height), d = frame.data;
  for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
    const i = (y * frame.width + x) * 4, lum = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) * (d[i + 3] / 255), v = lum > (bayer[y % 4 * 4 + x % 4] + 0.5) * 255 / 16 ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  c.putImageData(frame, 0, 0);
}
function drawTape({ c, w, h }, p, angle, level, seconds = 0, layout = "space-echo", runtime) {
  if (layout === "space-echo") return drawSpaceEcho({c, w, h}, p, angle, level, seconds, runtime);
  if (Object.hasOwn(TAPE_LAYOUTS, layout)) return drawTapeTransport({c, w, h}, p, angle, level, seconds, layout);
  c.clearRect(0, 0, w, h);
  if (w <= 16 || h <= 16) return;
  c.save();
  const scale = Math.min((w - 16) / 360, (h - 16) / 190);
  c.translate((w - 360 * scale) / 2, (h - 190 * scale) / 2);
  c.scale(scale, scale);
  const on = p.tapeOn, signal = Math.max(0, Math.min(1, level));
  const wow = on ? p.wow / 100 : 0, flutter = on ? p.flutter / 100 : 0;
  const drift = tapeWow(seconds, wow) / 5e-3 * 0.18 + tapeFlutter(seconds, flutter) / 35e-5 * 0.035;
  const circle = (x, y, r, fill, stroke) => {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  };

  // Quiet, exposed reels leave most of the contrast for the moving tape.
  c.lineWidth = 0.8;
  for (const [x, radius, phase] of [[68, 34, angle + drift], [292, 29, (angle + drift) * 34 / 29]]) {
    circle(x, 53, radius, "#222", "#777");
    for (let r = 18; r < radius - 1; r += 2.5) circle(x, 53, r, null, "#555");
    c.save();
    c.translate(x, 53);
    c.rotate(phase);
    circle(0, 0, 17, "#999", "#aaa");
    c.fillStyle = "#000";
    for (let spoke = 0; spoke < 3; spoke++) {
      c.rotate(Math.PI * 2 / 3);
      c.fillRect(6, -2.5, 9, 5);
    }
    circle(0, 0, 4, "#000");
    c.restore();
  }

  // Each free span moves, with the guides and head holding the tape in place.
  const tapeY = (u, time = seconds, lift = 0) => {
    const span = Math.sin(Math.PI * 2 * u);
    const sway = tapeWow(time - u * 0.2, wow) / 5e-3 * 22;
    const ripple = tapeFlutter(time - u * 0.8, flutter) / 35e-5 * 5.5;
    return 118 + 22 * Math.sin(Math.PI * u) + (sway + ripple) * span - lift * Math.sin(Math.PI * u);
  };
  const path = (time = seconds, lift = 0) => {
    c.beginPath();
    c.moveTo(36, 65);
    c.lineTo(24, 118);
    for (let x = 24; x <= 336; x += 1.5) c.lineTo(x, tapeY((x - 24) / 312, time, lift));
    c.lineTo(319, 63);
  };
  c.lineJoin = "round";
  c.lineCap = "round";
  if (on) {
    for (let repeat = 4; repeat >= 1; repeat--) {
      c.globalAlpha = p.delayMix / 100 * Math.pow(p.feedback / 100, repeat - 1) * (0.6 + signal * 0.4);
      c.lineWidth = 1.2;
      c.strokeStyle = "#ccc";
      path(seconds - repeat * p.delayTime, repeat * (5 + p.delayTime * 7));
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  // A bright ribbon and travelling marks make transport visible even at zero Wow.
  path();
  c.lineWidth = 6;
  c.strokeStyle = on ? "#eee" : "#666";
  c.stroke();
  c.lineWidth = 3.5;
  c.strokeStyle = "#555";
  c.stroke();
  const travel = angle * 26;
  c.strokeStyle = on ? "#fff" : "#888";
  c.lineWidth = 1;
  for (let x = 24 + ((travel % 13) + 13) % 13; x < 336; x += 13) {
    const y = tapeY((x - 24) / 312);
    c.beginPath();
    c.moveTo(x - 1, y - 1.5);
    c.lineTo(x + 1, y + 1.5);
    c.stroke();
  }

  const warmth = on ? p.drive / 100 * (0.25 + 0.75 * signal) : 0;
  const shade = Math.round(35 + 170 * Math.sqrt(warmth));
  c.fillStyle = `rgb(${shade},${shade},${shade})`;
  c.fillRect(160, 143, 40, 28);
  c.fillStyle = "#080808";
  c.fillRect(164, 146, 32, 21);
  c.lineWidth = 1;
  c.strokeStyle = on ? "#ccc" : "#666";
  c.strokeRect(164, 146, 32, 21);
  c.fillStyle = on ? "#fff" : "#888";
  c.fillRect(171, 140, 18, 6);
  c.fillStyle = `rgb(${shade},${shade},${shade})`;
  for (let i = 0; i < 5; i++) c.fillRect(169 + i * 5, 152, 2, 9);

  for (const x of [24, 336]) {
    circle(x, 118, 6, "#000", "#aaa");
    circle(x, 118, 2, "#ccc");
  }
  c.restore();
}

export {
  ditherCanvas,
  drawTape
};
