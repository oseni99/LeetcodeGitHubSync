const test = require("node:test");
const assert = require("node:assert/strict");

const { loadScript } = require("./helpers/load-script");
const {
  createChromeMock,
  createDocumentMock,
  createElement,
} = require("./helpers/test-doubles");

function createPopupContext(store = {}) {
  const chromeMock = createChromeMock(store);
  const repoDisplay = createElement({ className: "repo-value" });
  const lastSync = createElement({ textContent: "Never synced" });
  const statusBadge = createElement({ className: "status-value status-ready" });
  const statusText = createElement({ textContent: "Ready" });
  const statusDetail = createElement({ textContent: "Waiting for your next submission." });
  const statusIcon = createElement({ className: "fas fa-check-circle" });
  const syncButton = createElement({ className: "btn btn-primary" });
  const settingsButton = createElement({ className: "btn btn-secondary" });
  const syncIcon = createElement({ className: "fas fa-sync-alt" });
  const scheduledTimeouts = [];
  const window = {
    location: {
      href: "popup.html",
    },
  };

  syncButton.querySelector = (selector) =>
    selector === ".fa-sync-alt" ? syncIcon : null;

  const document = createDocumentMock({
    byId: {
      "open-settings": settingsButton,
      "sync-status": statusBadge,
      "sync-status-detail": statusDetail,
      "sync-status-icon": statusIcon,
      "sync-status-text": statusText,
      "last-sync": lastSync,
      "repo-display": repoDisplay,
      "sync-now": syncButton,
    },
    bySelector: {
      ".btn-primary": syncButton,
    },
  });

  const context = loadScript("popup.js", {
    chrome: chromeMock.chrome,
    document,
    window,
    setTimeout(callback) {
      scheduledTimeouts.push(callback);
      return scheduledTimeouts.length;
    },
    updateLastSyncTime() {},
  });

  return {
    chromeMock,
    context,
    document,
    window,
    elements: {
      lastSync,
      repoDisplay,
      settingsButton,
      statusBadge,
      statusDetail,
      statusIcon,
      statusText,
      syncButton,
      syncIcon,
    },
    scheduledTimeouts,
  };
}

test("popup renders the ready state with configured credentials", () => {
  const { document, elements } = createPopupContext({
    repoUrl: "https://github.com/octocat/leetcode",
    githubToken: "ghp_123456789012345678901234567890123456",
    lastSyncTime: "2024-01-01T12:34:56.000Z",
  });

  document.dispatchEvent("DOMContentLoaded");

  assert.equal(elements.repoDisplay.textContent, "octocat/leetcode");
  assert.equal(elements.repoDisplay.className, "repo-value");
  assert.equal(elements.statusText.textContent, "Ready");
  assert.equal(elements.statusBadge.className, "status-value status-ready");
  assert.equal(elements.statusIcon.className, "fas fa-check-circle");
  assert.equal(elements.statusDetail.textContent, "Waiting for your next submission.");
  assert.match(elements.lastSync.textContent, /\d{2}:\d{2}/);
});

test("popup renders the not configured state when credentials are missing", () => {
  const { document, elements } = createPopupContext();

  document.dispatchEvent("DOMContentLoaded");

  assert.equal(elements.statusText.textContent, "Not configured");
  assert.equal(elements.statusBadge.className, "status-value status-unconfigured");
  assert.equal(
    elements.statusDetail.textContent,
    "Add your repository and token to begin.",
  );
  assert.equal(elements.repoDisplay.textContent, "Not configured");
  assert.equal(elements.repoDisplay.className, "repo-value repo-value-empty");
  assert.equal(elements.lastSync.textContent, "Never synced");
});

test("popup renders the sync error state from storage", () => {
  const { document, elements } = createPopupContext({
    repoUrl: "https://github.com/octocat/leetcode",
    githubToken: "ghp_123456789012345678901234567890123456",
    syncStatus: "Error",
  });

  document.dispatchEvent("DOMContentLoaded");

  assert.equal(elements.statusText.textContent, "Sync error");
  assert.equal(elements.statusBadge.className, "status-value status-error");
  assert.equal(elements.statusIcon.className, "fas fa-exclamation-circle");
});

test("popup renders the syncing state from storage", () => {
  const { document, elements } = createPopupContext({
    repoUrl: "https://github.com/octocat/leetcode",
    githubToken: "ghp_123456789012345678901234567890123456",
    syncStatus: "Syncing",
  });

  document.dispatchEvent("DOMContentLoaded");

  assert.equal(elements.statusText.textContent, "Syncing");
  assert.equal(elements.statusBadge.className, "status-value status-syncing");
  assert.equal(elements.statusIcon.className, "fas fa-rotate");
});

test("popup sync button sends manualSync and toggles the loading state", () => {
  const { chromeMock, elements, scheduledTimeouts } = createPopupContext({
    repoUrl: "https://github.com/octocat/leetcode",
    githubToken: "ghp_123456789012345678901234567890123456",
    lastSyncTime: "2024-01-01T12:34:56.000Z",
  });

  chromeMock.setSendMessageImpl((message, callback) => {
    callback({ status: "ok" });
  });

  elements.syncButton.dispatchEvent("click");

  assert.equal(chromeMock.runtimeMessages.length, 1);
  assert.equal(chromeMock.runtimeMessages[0].action, "manualSync");
  assert.equal(elements.syncButton.disabled, true);
  assert.equal(elements.syncButton.textContent, "Syncing...");
  assert.equal(elements.syncIcon.classList.contains("spin"), true);
  assert.equal(scheduledTimeouts.length, 1);

  scheduledTimeouts[0]();

  assert.equal(elements.syncButton.disabled, false);
  assert.equal(elements.syncButton.innerHTML, '<i class="fas fa-sync-alt"></i> Sync Now');
  assert.equal(elements.syncIcon.classList.contains("spin"), false);
});

test("popup settings button navigates to the in-popup settings view", () => {
  const { elements, window } = createPopupContext();

  elements.settingsButton.dispatchEvent("click");

  assert.equal(window.location.href, "options.html");
});
