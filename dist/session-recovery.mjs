const MAX_DRAFT_BYTES = 30 * 1024 * 1024;
function createRecoveryStore(indexedDB = globalThis.indexedDB) {
  let opened;
  function database() {
    if (!indexedDB) return Promise.reject(new Error("Local recovery storage is unavailable. Save a project file."));
    if (!opened) opened = new Promise((resolve, reject) => {
      const request = indexedDB.open("hushfield-recovery", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("drafts");
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opened = void 0;
        };
        resolve(db);
      };
      request.onerror = () => {
        opened = void 0;
        reject(request.error);
      };
      request.onblocked = () => {
        opened = void 0;
        reject(new Error("Local recovery storage is blocked by another tab."));
      };
    });
    return opened;
  }
  async function operation(mode, action) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", mode);
      let result;
      const request = action(tx.objectStore("drafts"));
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(tx.error || request.error || new Error("Recovery storage failed."));
    });
  }
  return {
    read: () => operation("readonly", (store) => store.get("latest")),
    write: (value) => operation("readwrite", (store) => store.put(value, "latest")),
    remove: () => operation("readwrite", (store) => store.delete("latest"))
  };
}
function createSessionRecovery({ store, snapshot, restore, onState = () => {
}, onError = () => {
}, schedule = setTimeout, unschedule = clearTimeout }) {
  let candidate, status = "unsaved", revision = 0, persisted = 0, dirty = false, timer, queue = Promise.resolve(), initialized = false;
  const notify = () => onState({ status, available: !!candidate, dirty });
  const setStatus = (value) => {
    status = value;
    notify();
  };
  const ready = store.read().then((value) => {
    if (value?.project && typeof value.project === "string") candidate = value;
    initialized = true;
    notify();
  }).catch((error) => {
    initialized = true;
    setStatus("error");
    onError(error);
  });
  function edited() {
    revision++;
    dirty = true;
    setStatus("unsaved");
    unschedule(timer);
    timer = schedule(() => {
      flush();
    }, 750);
  }
  async function flush() {
    unschedule(timer);
    await ready;
    queue = queue.then(async () => {
      if (candidate || revision === persisted) return;
      const version = revision;
      setStatus("saving");
      try {
        const project = snapshot();
        if (new TextEncoder().encode(project).length > MAX_DRAFT_BYTES) throw new Error("Recovery draft exceeds 30 MB. Save a project file.");
        await store.write({ project, savedAt: Date.now() });
        persisted = version;
        setStatus(version === revision ? "draft" : "unsaved");
      } catch (error) {
        setStatus("error");
        onError(error);
      }
    });
    return queue;
  }
  async function recover() {
    await ready;
    if (!candidate) return false;
    if (status === "discarding") return false;
    const version = revision, selected = candidate;
    setStatus("recovering");
    try {
      const applied = await restore(selected.project, () => version === revision && candidate === selected);
      if (applied === false || version !== revision) {
        setStatus("unsaved");
        return false;
      }
      candidate = void 0;
      dirty = true;
      persisted = revision;
      setStatus("recovered");
      return true;
    } catch (error) {
      setStatus("error");
      onError(error);
      return false;
    }
  }
  async function discard() {
    const requestedRevision = revision;
    await ready;
    const previous = !!candidate, saveCurrent = previous && dirty;
    if (status === "recovering" || status === "discarding") return;
    setStatus("discarding");
    queue = queue.then(async () => {
      try {
        await store.remove();
        candidate = void 0;
        persisted = saveCurrent ? requestedRevision - 1 : requestedRevision;
        setStatus(dirty ? "unsaved" : "empty");
      } catch (error) {
        setStatus("error");
        onError(error);
      }
    });
    await queue;
    if (saveCurrent || revision > requestedRevision) await flush();
  }
  function exported() {
    dirty = false;
    setStatus("exported");
  }
  return { ready, edited, flush, recover, discard, exported, get status() {
    return status;
  }, get dirty() {
    return dirty;
  }, get available() {
    return !!candidate;
  }, get initialized() {
    return initialized;
  } };
}
export {
  createRecoveryStore,
  createSessionRecovery
};
