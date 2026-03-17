const syncBtn = document.querySelector(".btn-primary");
const settingsBtn = document.getElementById("open-settings");
const POPUP_STORAGE_KEYS = ["repoUrl", "githubToken", "syncStatus", "lastSyncTime"];

const STATUS_STATES = {
    ready: {
        badgeClass: "status-ready",
        iconClass: "fas fa-check-circle",
        label: "Ready",
        detail: "Waiting for your next submission."
    },
    syncing: {
        badgeClass: "status-syncing",
        iconClass: "fas fa-rotate",
        label: "Syncing",
        detail: "Working on the current sync."
    },
    syncError: {
        badgeClass: "status-error",
        iconClass: "fas fa-exclamation-circle",
        label: "Sync error",
        detail: "The last sync failed. Check your settings and try again."
    },
    notConfigured: {
        badgeClass: "status-unconfigured",
        iconClass: "fas fa-cog",
        label: "Not configured",
        detail: "Add your repository and token to begin."
    }
};

function getPopupStatusState({ repoUrl, githubToken, syncStatus }) {
    const hasConfig = Boolean(repoUrl && githubToken);

    if (!hasConfig) {
        return STATUS_STATES.notConfigured;
    }
    if (syncStatus === "Syncing") {
        return STATUS_STATES.syncing;
    }
    if (syncStatus === "Error") {
        return STATUS_STATES.syncError;
    }
    return STATUS_STATES.ready;
}

function renderStatus(data) {
    const status = getPopupStatusState(data);
    const statusBadge = document.getElementById("sync-status");
    const statusIcon = document.getElementById("sync-status-icon");
    const statusText = document.getElementById("sync-status-text");
    const statusDetail = document.getElementById("sync-status-detail");

    statusBadge.className = `status-value ${status.badgeClass}`;
    statusIcon.className = status.iconClass;
    statusText.textContent = status.label;
    statusDetail.textContent = status.detail;
}

function renderLastSyncTime(lastSyncTime) {
    const lastSyncElement = document.getElementById("last-sync");
    if (!lastSyncElement) {
        return;
    }
    if (!lastSyncTime) {
        lastSyncElement.textContent = "Never synced";
        return;
    }

    const date = new Date(lastSyncTime);
    if (Number.isNaN(date.getTime())) {
        lastSyncElement.textContent = "Never synced";
        return;
    }

    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    lastSyncElement.textContent = formattedTime;
}

function formatRepoDisplay(repoUrl) {
    if (!repoUrl) {
        return null;
    }

    return repoUrl
        .replace(/^https:\/\/github\.com\//, "")
        .replace(/\/$/, "") || repoUrl;
}

function renderRepoInfo(repoUrl) {
    const repoDisplay = document.getElementById("repo-display");
    if (!repoDisplay) {
        return;
    }

    const formattedRepo = formatRepoDisplay(repoUrl);

    if (formattedRepo) {
        repoDisplay.textContent = formattedRepo;
        repoDisplay.className = "repo-value";
        return;
    }

    repoDisplay.textContent = "Not configured";
    repoDisplay.className = "repo-value repo-value-empty";
}

function renderPopupState(data) {
    renderStatus(data);
    renderRepoInfo(data.repoUrl);
    renderLastSyncTime(data.lastSyncTime);
}

function refreshPopupState() {
    chrome.storage.sync.get(POPUP_STORAGE_KEYS, (data) => {
        renderPopupState(data);
    });
}

function getCurrentSyncIcon() {
    return syncBtn.querySelector(".fa-sync-alt");
}

document.addEventListener("DOMContentLoaded", () => {
    refreshPopupState();
});

settingsBtn.addEventListener("click", () => {
    window.location.href = "options.html";
});

// Handle manual sync click from the popup's sync button.
document.getElementById("sync-now").addEventListener("click", async () => {
    chrome.runtime.sendMessage({ action: "manualSync" }, () => {
        refreshPopupState();
    });
});

// Sync button animation and behavior
syncBtn.addEventListener("click", () => {
    const syncIcon = getCurrentSyncIcon();

    // Visual feedback for syncing
    if (syncIcon) {
        syncIcon.classList.add("spin");
    }
    syncBtn.disabled = true;
    syncBtn.style.opacity = "0.7";
    syncBtn.textContent = "Syncing...";

    // Simulate sync completion after 2 seconds
    setTimeout(() => {
        if (syncIcon) {
            syncIcon.classList.remove("spin");
        }
        syncBtn.disabled = false;
        syncBtn.style.opacity = "1";
        syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Now';

        refreshPopupState();
    }, 2000);
});
