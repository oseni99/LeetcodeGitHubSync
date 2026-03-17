function createElement(initial = {}) {
  const listeners = new Map();
  const classes = new Set(
    (initial.className || "").split(/\s+/).filter(Boolean),
  );

  return {
    textContent: initial.textContent || "",
    innerHTML: initial.innerHTML || "",
    value: initial.value || "",
    className: initial.className || "",
    disabled: false,
    style: {},
    addEventListener(eventName, handler) {
      const handlers = listeners.get(eventName) || [];
      handlers.push(handler);
      listeners.set(eventName, handlers);
    },
    dispatchEvent(eventName, event = {}) {
      const handlers = listeners.get(eventName) || [];
      for (const handler of handlers) {
        handler(event);
      }
    },
    getListeners(eventName) {
      return listeners.get(eventName) || [];
    },
    querySelector() {
      return null;
    },
    classList: {
      add(...names) {
        for (const name of names) {
          classes.add(name);
        }
      },
      remove(...names) {
        for (const name of names) {
          classes.delete(name);
        }
      },
      contains(name) {
        return classes.has(name);
      },
    },
  };
}

function createDocumentMock({ byId = {}, bySelector = {} } = {}) {
  const listeners = new Map();

  return {
    addEventListener(eventName, handler) {
      const handlers = listeners.get(eventName) || [];
      handlers.push(handler);
      listeners.set(eventName, handlers);
    },
    getElementById(id) {
      if (!(id in byId)) {
        throw new Error(`Missing element with id: ${id}`);
      }
      return byId[id];
    },
    querySelector(selector) {
      return bySelector[selector] || null;
    },
    dispatchEvent(eventName) {
      const handlers = listeners.get(eventName) || [];
      for (const handler of handlers) {
        handler();
      }
    },
  };
}

function resolveStorageValues(store, keys) {
  if (Array.isArray(keys)) {
    return Object.fromEntries(keys.map((key) => [key, store[key]]));
  }

  if (typeof keys === "string") {
    return { [keys]: store[keys] };
  }

  if (keys && typeof keys === "object") {
    return Object.fromEntries(
      Object.keys(keys).map((key) => [key, store[key] ?? keys[key]]),
    );
  }

  return { ...store };
}

function createChromeMock(initialStore = {}) {
  const store = { ...initialStore };
  const notifications = [];
  let openOptionsPageCalls = 0;
  const storageSets = [];
  const runtimeMessages = [];
  let messageListener = null;
  let sendMessageImpl = null;

  const chrome = {
    storage: {
      sync: {
        get(keys, callback) {
          callback(resolveStorageValues(store, keys));
        },
        set(values, callback) {
          Object.assign(store, values);
          storageSets.push(values);
          if (callback) {
            callback();
          }
        },
      },
    },
    notifications: {
      create(options) {
        notifications.push(options);
      },
    },
    runtime: {
      lastError: null,
      openOptionsPage() {
        openOptionsPageCalls += 1;
      },
      sendMessage(message, callback) {
        runtimeMessages.push(message);
        if (sendMessageImpl) {
          return sendMessageImpl(message, callback);
        }
        if (callback) {
          callback();
        }
        return undefined;
      },
      onMessage: {
        addListener(listener) {
          messageListener = listener;
        },
      },
    },
  };

  return {
    chrome,
    notifications,
    get openOptionsPageCalls() {
      return openOptionsPageCalls;
    },
    runtimeMessages,
    storageSets,
    store,
    getMessageListener() {
      return messageListener;
    },
    setSendMessageImpl(fn) {
      sendMessageImpl = fn;
    },
  };
}

module.exports = {
  createChromeMock,
  createDocumentMock,
  createElement,
};
