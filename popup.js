// When the popup loads, get the repo URL and last sync time from storage.
document.addEventListener("DOMContentLoaded", () => {
    // Get the repo URL from storage
    chrome.storage.sync.get(["repoUrl"], (result) => {
        const repoUrl = result.repoUrl || "Not Set";
        document.getElementById("repo-display").textContent = repoUrl;
    });

    // Get the last sync time from storage and update the UI
    chrome.storage.sync.get(["lastSyncTime"], (data) => {
        const lastSyncElement = document.querySelector(".last-sync");
        if (lastSyncElement && data.lastSyncTime) {
            const date = new Date(data.lastSyncTime);
            const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            lastSyncElement.textContent = `Last Synced: ${formattedTime}`;
        }
    });
});

// Simple toggle for sync button animation
const syncBtn = document.querySelector(".btn-primary");
const syncIcon = syncBtn.querySelector(".fa-sync-alt");

// Handle manual sync click from the popup's sync button.
document.getElementById("sync-now").addEventListener("click", async () => {
    chrome.runtime.sendMessage({ action: "manualSync" }, (response) => {
        updateLastSyncTime();

        // Retrieve and display the updated sync time
        chrome.storage.sync.get("lastSyncTime", (data) => {
            const lastSyncElement = document.querySelector(".last-sync");
            if (lastSyncElement && data.lastSyncTime) {
                const date = new Date(data.lastSyncTime);
                const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                lastSyncElement.textContent = `Last Synced: ${formattedTime}`;
            }
        });
    });
});

// Sync button animation and behavior
syncBtn.addEventListener("click", () => {
    // Visual feedback for syncing
    syncIcon.classList.add("spin");
    syncBtn.disabled = true;
    syncBtn.style.opacity = "0.7";
    syncBtn.textContent = "Syncing...";

    // Simulate sync completion after 2 seconds
    setTimeout(() => {
        syncIcon.classList.remove("spin");
        syncBtn.disabled = false;
        syncBtn.style.opacity = "1";
        syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Now';

        // Update the last sync time in storage and UI
        updateLastSyncTime();
    }, 2000);
});
