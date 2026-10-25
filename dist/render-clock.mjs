function createRenderClock(fps = 30) {
  let dirty = true, last = -Infinity;
  return {
    invalidate() {
      dirty = true;
    },
    shouldDraw(time, animated) {
      if (!dirty && !animated || time - last < 1e3 / fps - 1e-6) return false;
      dirty = false;
      last = time;
      return true;
    }
  };
}
export {
  createRenderClock
};
