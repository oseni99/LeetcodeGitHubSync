// This waits for the DOM to load before it restore the Cridentials needed
document.addEventListener('DOMContentLoaded', restoreOptions);

// This is an event listener that retrieves the form submissions 
document.getElementById("config-form").addEventListener("submit", saveOptions);

/**
 * Saves what the user inputs to the chrome storage 
 * @param {Event} e - The form submission event 
 */
function saveOptions(e) {
    const repoUrl = document.getElementById("repo-url").value.trim()
    const githubToken = document.getElementById("github-token").value.trim()

    // prevents the default that happens when you load page
    e.preventDefault();
    // Validating the Github URL 
    if (!validateGitHubRepoUrl(repoUrl)) {
        displayStatus("Invalid Github Repository", "error")
        return
    }
    // Validating the Github Token
    if (!validateGitHubToken(githubToken)) {
        displayStatus("Invalid GitHub Personal Access Token", "error")
        return
    }
    // Save that options to the chrome storage 
    chrome.storage.sync.set({ repoUrl, githubToken }, () => {
        displayStatus("Options saved succesfully", "Success")
    })
}

// Restores the options that i saved in my chrome storage and updates that UI 
function restoreOptions() {
    chrome.storage.sync.get(["repoUrl", "githubToken"], (items) => {
        if (items.repoUrl) {
            document.getElementById("repo-url").value = items.repoUrl
        }
        if (items.githubToken) {
            document.getElementById("github-token".value = items.githubToken)
        }
    })
}

/** 
 * This displays the status to the user 
 * @param {string} message - The message to display 
 * @param {string} type - The type of message [either success or error]
 */
function displayStatus(message, type) {
    const statusDiv = document.getElementById("status");
    statusDiv.textContent = message;
    statusDiv.className = type;

    setTimeout(() => {
        statusDiv.textContent = "";
        statusDiv.className = "";
    }, 3000);

}

/**
 * Validates the Github Repo format
 * @param {string} url - The repo url to validate 
 * @returns {boolean} - True if valid and false if not valid 
 */

function validateGitHubRepoUrl(url) {
    if (!url || typeof url !== "string") {
        return false
    }
    const regex = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
    return regex.test(url);
}

/**
 * Validates the Github Token
 * @param {string} token - The PAT to validate
 * @returns {boolean} -True if valid and false if not valid 
 */

function validateGitHubToken(token) {
    if (!token || typeof token !== "string") {
        return false
    }
    const tokenRegex = /^(?:[a-f0-9]{40}|ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]+)$/;
    return tokenRegex.test(token);
}