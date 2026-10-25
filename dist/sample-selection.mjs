function createSampleSelection({ onState = () => {
} } = {}) {
  let revision = 0;
  function cancel() {
    revision++;
    onState("idle");
  }
  function reserve() {
    const operation = ++revision;
    return { async run(read, apply) {
      if (operation !== revision) return false;
      onState("loading");
      try {
        const value = await read();
        if (operation !== revision) return false;
        return apply(value) !== false;
      } catch (error) {
        if (operation === revision) throw error;
        return false;
      } finally {
        if (operation === revision) onState("idle");
      }
    } };
  }
  return { cancel, reserve, run: (read, apply) => reserve().run(read, apply) };
}
export {
  createSampleSelection
};
