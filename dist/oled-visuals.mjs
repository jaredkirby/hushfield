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
function drawTape({ c, w, h }, p, angle, level, seconds = 0) {
  c.clearRect(0, 0, w, h);
  c.save();
  const scale = Math.min((w - 16) / 360, (h - 16) / 220);
  c.translate((w - 360 * scale) / 2, (h - 220 * scale) / 2);
  c.scale(scale, scale);
  const on = p.tapeOn, signal = Math.max(0, Math.min(1, level)), wow = on ? p.wow / 100 : 0, flutter = on ? p.flutter / 100 : 0;
  const reelDrift = tapeWow(seconds, wow) / 5e-3 * 0.18 + tapeFlutter(seconds, flutter) / 35e-5 * 0.035;
  const rect = (x, y, a, b, fill) => {
    c.fillStyle = fill;
    c.fillRect(x, y, a, b);
  };
  c.lineWidth = 1.3;
  c.strokeStyle = "#fff";
  c.beginPath();
  c.moveTo(8, 0);
  c.lineTo(352, 0);
  c.lineTo(360, 8);
  c.lineTo(360, 212);
  c.lineTo(352, 220);
  c.lineTo(8, 220);
  c.lineTo(0, 212);
  c.lineTo(0, 8);
  c.closePath();
  c.stroke();
  for (const [x, y] of [[10, 10], [350, 10], [10, 210], [350, 210]]) {
    c.strokeStyle = "#aaa";
    c.beginPath();
    c.arc(x, y, 3, 0, Math.PI * 2);
    c.moveTo(x - 2, y);
    c.lineTo(x + 2, y);
    c.stroke();
  }
  c.fillStyle = "#fff";
  c.font = "bold 13px monospace";
  c.fillText("HUSHFIELD", 22, 26);
  c.font = "9px monospace";
  c.fillStyle = "#bbb";
  c.fillText("VINTAGE TAPE / STEREO", 166, 26);
  c.strokeStyle = "#777";
  c.strokeRect(20, 38, 320, 125);
  rect(24, 42, 312, 117, "#191919");
  for (const [x, r, phase] of [[98, 49, angle + reelDrift], [262, 39, (angle + reelDrift) * 1.2]]) {
    c.fillStyle = "#444";
    c.beginPath();
    c.arc(x, 100, 53, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#999";
    c.stroke();
    for (let radius = 24; radius < r; radius += 2) {
      c.strokeStyle = radius % 4 ? "#444" : "#888";
      c.beginPath();
      c.arc(x, 100, radius, 0, Math.PI * 2);
      c.stroke();
    }
    c.save();
    c.translate(x, 100);
    c.rotate(phase);
    c.fillStyle = "#ccc";
    c.beginPath();
    c.arc(0, 0, 25, 0, Math.PI * 2);
    c.fill();
    for (let j = 0; j < 3; j++) {
      const a = j * Math.PI * 2 / 3;
      c.save();
      c.rotate(a);
      rect(7, -4, 13, 8, "#000");
      c.restore();
    }
    c.fillStyle = "#000";
    c.beginPath();
    c.arc(0, 0, 7, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#fff";
    c.stroke();
    c.restore();
  }
  const path = (lift = 0) => {
    c.beginPath();
    c.moveTo(50, 119);
    c.lineTo(42, 178);
    for (let x = 42; x <= 318; x += 3) {
      const u = (x - 42) / 276, envelope = Math.sin(Math.PI * u);
      const sway = tapeWow(seconds - u * 0.15, wow) / 5e-3 * 16;
      const ripple = tapeFlutter(seconds - u * 0.8, flutter) / 35e-5 * 4;
      c.lineTo(x, 178 + (sway + ripple - lift) * envelope);
    }
    c.lineTo(307, 119);
  };
  if (on) {
    for (let repeat = 3; repeat >= 1; repeat--) {
      c.globalAlpha = p.delayMix / 100 * Math.pow(p.feedback / 100, repeat - 1) * (0.5 + signal * 0.5);
      c.lineWidth = 1;
      path(repeat * 5);
      c.strokeStyle = "#fff";
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  c.strokeStyle = on ? "#eee" : "#777";
  c.lineWidth = 2;
  path();
  c.stroke();
  const warmth = on ? p.drive / 100 * (0.25 + 0.75 * signal) : 0, shade = Math.round(45 + 160 * Math.sqrt(warmth));
  rect(148, 160, 64, 26, `rgb(${shade},${shade},${shade})`);
  rect(151, 163, 58, 20, "#333");
  c.strokeStyle = on ? "#fff" : "#777";
  c.strokeRect(151, 163, 58, 20);
  rect(169, 174, 22, 7, on ? "#eee" : "#777");
  for (let i = 0; i < Math.ceil(warmth * 12); i++) rect(154 + i * 4, 166, 2, 5, "#ccc");
  for (const x of [42, 318]) {
    c.fillStyle = "#000";
    c.beginPath();
    c.arc(x, 178, 9, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#fff";
    c.stroke();
    c.beginPath();
    c.arc(x, 178, 3, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = "#fff";
  c.font = "9px monospace";
  c.fillText(on ? "WARMTH " + p.drive + "%" : "TAPE BYPASS", 22, 201);
  c.fillStyle = "#bbb";
  c.fillText("WOW " + (on ? p.wow : 0) + " / FLT " + (on ? p.flutter : 0), 135, 201);
  c.fillText("ECHO " + (on ? p.delayMix : 0) + "%", 268, 201);
  for (let i = 0; i < 9; i++) rect(300 + i * 3, 207, 2, 4, signal > i / 10 ? "#fff" : "#333");
  c.restore();
}
export {
  ditherCanvas,
  drawTape
};
