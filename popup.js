// Simple toggle for sync button animation
const syncBtn = document.querySelector(".btn-primary");
const syncIcon = syncBtn.querySelector(".fa-sync-alt");


// i want to get what the repo url was in the saved chrome storage
document.addEventListener("DOMContentLoaded", () => {
    // i want to now get the config saved 
    chrome.storage.sync.get(["repoUrl"], (result) => {
        const repoUrl = result.repoUrl || "Not Set";
        document.getElementById("repo-display").textContent = repoUrl
        // console.log("Retrieved from storage:", result)
    })
})

document.getElementById("sync-now").addEventListener("click", async () => {
    // i now want when i click this it sends message to that background js to run the sync 
    chrome.runtime.sendMessage({ action: "manualSync" }, (response) => {
        // console.log("Manual sync response:", response);

    });
})

syncBtn.addEventListener("click", () => {
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

        // Update last sync time
        const lastSync = document.querySelector(".last-sync");
        lastSync.textContent = "Last synced: Just now";
    }, 2000);
});