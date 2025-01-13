// import { fetchLatestSubmission, getLastSyncedSubmissionId, processLatestSubmission } from "./common.js";

const SUBMISSIONS_ENDPOINT = 'https://leetcode.com/api/submissions/';
const FETCH_INTERVAL = 300000; // 5 minutes
let isFetching = false
/** 
 * Gets the Github Config saved in the chrome storage 
 * @returns {Promise<object>} - An object that contains the repoUrl and githubToken
 * Wrapping it in a promise because its a callback API so i can use await && fetch later 
 */
function getGitHubConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(["repoUrl", "githubToken"], (items) => {
            resolve({
                repoUrl: items.repoUrl || "",
                githubToken: items.githubToken || ""
            });
        });
    });
}

/** 
 * Parses that Github repo url and gets the owner and repo name 
 * @param {string} url - The Github repo url 
 * @returns {Object} - An object that contains the owner and repo 
 */

function parseRepoUrl(url) {
    const regex = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/;
    const match = url.match(regex)
    if (match) {
        return { owner: match[1], repo: match[2] }
    }
    return { owner: null, repo: null }
}

/** 
 * Sanitizes the problem name to create a valid filename 
 * @param {string} name - The problem name
 * @returns {string} - Sanitized file name
 */

function sanitizeFileName(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Determines the correct file extension based on that language
 * @param {string} language - The programming language used 
 * @returns {string} - File extension 
 */

function getFileExtension(language) {
    const langMap = {
        'Python': 'py',
        'Python3': 'py',
        'Java': 'java',
        'C++': 'cpp',
        'JavaScript': 'js',
        'C#': 'cs',
        'Ruby': 'rb',
    };
    return langMap[language] || "txt";
}

/**
 * This is updating the sync status in chrome so i can use it later 
 * @param {string} status - The current status that the program is in either Syncing, Idle or Error
 */

function updateSyncStatus(status) {
    chrome.storage.sync.set({ syncStatus: status }, () => {
        console.log(`Sync status updated to: ${status}`);
    });
}

function updateLastSyncTime() {
    const now = new Date().toISOString();
    chrome.storage.sync.set({ lastSyncTime: now }, () => {
        console.log(`Last sync time updated to: ${now}`);
    });
}

/** 
 * @param {string} owner - Github repo owner
 * @param {string} repo -  Github repo name
 * @param {string} path - repo file path
 * @param {string} token -  Github Personal Acess Token
 * @returns {Promise<Object>} - Github file content data 
 */

async function getGitHubFileContent(owner, repo, path, token) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (response.status === 404) {
        const error = new Error("File not found");
        error.status = 404
        throw error
    }
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API Error: ${errorData.message}`);
    }
    const data = await response.json()
    return data // this is where the sha will be as it is in the Github API docs
}

/**
 * Sets the last synced submission ID in Chrome storage to use later
 * @param {string} submissionId - The submission ID to set
 * @returns {Promise<void>}
 */
async function setLastSyncedSubmissionId(submissionId) {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ lastSyncedSubmissionId: submissionId }, () => {
            resolve();
        });
    });
}
// TODO: REREAD THIS CODE
async function manualSync() {
    updateSyncStatus("Syncing")
    // First, fetch the latest submission data.
    const submissionData = await fetchLatestSubmission();
    if (!submissionData) {
        updateSyncStatus("Idle");
        return { status: "No submissions found", type: "info" };
    }

    // You can optionally check for duplicates here if needed, similar to processLatestSubmission()
    await processLatestSubmission()
    // For now, we call handleNewSubmission with the data.
    const status = await handleNewSubmission(submissionData);

    // After successful sync, update status and last sync time.
    updateSyncStatus("Idle");
    updateLastSyncTime();
    return status;
}

/**
 * Handles a new submission by creating or it updates the corresponding file on Github 
 * @param {Object} submissionData - The Submission data 
 * @returns {Promise<Object>} - Status Message and the type
 */
async function handleNewSubmission(submissionData) {
    const { repoUrl, githubToken } = await getGitHubConfig();

    if (!repoUrl || !githubToken) {
        throw new Error("GitHub repository URL or Personal Access Token is not configured.")
    }
    const { owner, repo } = parseRepoUrl(repoUrl);
    if (!owner || !repo) {
        throw new Error('Invalid GitHub repository URL.');
    }
    console.log("RECEIVED SUBMISSION DATA", submissionData)
    // TODO: ADD TIMESTAMP LATER IF NEED BE
    const { submissionId, questionId, questionTitle, language, solutionCode } = submissionData;
    // Construct file name
    const fileName = `${questionId}_${sanitizeFileName(questionTitle)}.${getFileExtension(language)}`;

    // in the Github API you need the sha to uniquely identify a code so you dont make a mistake and overwrite another file 
    // sha handles file creation and Update 
    let existingFile = null
    try {
        existingFile = await getGitHubFileContent(owner, repo, fileName, githubToken)
        // fileSha = existingFile.sha
    } catch (error) {
        if (error.message === "File not found") {
            //  if no file exists it goes ahead to create that file 
            console.log(`File ${fileName} not found. It will now be created`)
        } else {
            throw new Error("Error fetching file from GitHub")
        }
    }
    //  turn the content into their uni code and change it to char code and join it together later 
    const newContent = btoa(
        new TextEncoder()
            .encode(solutionCode)
            .reduce((data, byte) =>
                data + String.fromCharCode(byte)
                , "")
    );

    // now checking if theres a file with the name and if its same content or not 
    if (existingFile) {
        const existingContent = atob(existingFile.content);
        // trim the contents so i dont miss anything 
        if (existingContent.trim() == solutionCode.trim()) {
            console.log(`No changes detected for ${fileName}. Sync skipped.`);
            return {
                message: `No changes detected for ${fileName}. Sync skipped.`,
                type: 'info'
            }
        }
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`;
    const body = {
        message: existingFile ? `Update ${fileName} - LeetCode Problem ${questionId}` : `Add ${fileName} - LeetCode Problem ${questionId}`,
        content: newContent,
        branch: 'main'
    };

    // have to keep in mind if that filesha exists which allows us to update
    if (existingFile) {
        body.sha = existingFile.sha;
    }

    const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
        }, body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Github Api Error: ${errorData.message}`)
    }
    // TODO ADD THE ICON TO IT HERE 
    // Optionally, display a notification to the user
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon32.png',
        title: 'LeetCode GitHub Sync',
        message: `Successfully synced ${fileName} to GitHub.`,
        priority: 1
    });

    // At this place everything now works well
    await setLastSyncedSubmissionId(submissionId);
    updateSyncStatus("Idle");
    updateLastSyncTime();

    return {
        message: `Successfully synced ${fileName} to GitHub.`, type: 'success'
    }
}





async function fetchLatestSubmission() {
    try {
        const submissionsParams = new URLSearchParams({
            offset: "0",
            limit: "1",
            lastkey: "",
        });

        const response = await fetch(`${SUBMISSIONS_ENDPOINT}?${submissionsParams.toString()}`, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com/submissions/',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch submissions: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        // TODO debugging purposes -> remove later on 
        console.log("Submission Data:", data)

        if (Array.isArray(data.submissions_dump) && data.submissions_dump.length > 0) {
            const latest = data.submissions_dump[0]
            const structuredData = {
                submissionId: latest.id,
                questionId: latest.question_id,
                language: latest.lang_name,
                solutionCode: latest.code.trim(),
                // timeStamp: latest.timestamp || new Date().toISOString(),
                questionTitle: latest.title || "Unknown Title"
            };
            return structuredData;
        } else {
            console.log("No submissions found");
            return null;
        }
    }
    catch (error) {
        console.log("Error fetching latest submission:", error);
        return null;
    }
}


async function getLastSyncedSubmissionId() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(["lastSyncedSubmissionId"], (result) => {
            resolve(result.lastSyncedSubmissionId || null)
        });
    });
}


async function processLatestSubmission() {
    // This isFetching is used because of that mutation observer i have in there to check and not repeat 
    if (isFetching) {
        console.log("Fetch is already in progress. Skipping this interval");
        return;
    }
    // now set isFetching to true 
    isFetching = true
    console.log("Fetching the latest submission....")
    try {
        // fetch that latest submission 
        const latestSubmission = await fetchLatestSubmission();
        // if theres no latest submission 
        if (!latestSubmission) return;
        const lastSyncedId = await getLastSyncedSubmissionId();
        // if that latest submission is there def will be submission ID 
        console.log(`Last Synced Submission ID: ${lastSyncedId}`);
        // if the last synced submission ID === current submission ID nothing needs to happen even though additional check is done on content side at github
        if (latestSubmission.submissionId === lastSyncedId) {
            console.log("No new submissions to sync");
            return;
        }

        // now send that message to background.js to initiate its processs 
        // TODO RE READ THE CHROME API DOC ... 
        chrome.runtime.sendMessage(
            { action: 'newSubmission', data: latestSubmission },
            async (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                } else {
                    console.log('Background script response:', response);
                    if (response && response.status === 'success') {
                        // Update that last synced submission ID
                        await setLastSyncedSubmissionId(latestSubmission.submissionId);
                        console.log('Updated last synced submission ID.');
                    }
                }
            }
        );
    } catch (error) {
        console.error("Error processing submission:", error)
    } finally {
        isFetching = false
    }
}








// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'newSubmission' || request.action === 'manualSync') {
        if (request.action === "manualSync" && !request.data) {
            manualSync()
                .then((status) => {
                    console.log("Manual sync successful:", status.message);
                    sendResponse({ status: status.message, type: status.type });
                })
                .catch((error) => {
                    console.error("Manual sync error:", error.message);
                    sendResponse({ status: error.message, type: 'error' });
                })
        } else {
            updateSyncStatus("Syncing")
            handleNewSubmission(request.data)
                .then((status) => {
                    sendResponse({ status: status.message, type: status.type });
                    updateSyncStatus("Idle");
                    updateLastSyncTime();
                })
                .catch((error) => {
                    // Display an error notification
                    updateSyncStatus("Error")
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon32.png',
                        title: 'LeetCode GitHub Sync Error',
                        message: `Failed to sync submission: ${error.message}`,
                        priority: 2
                    });
                    sendResponse({ status: error.message, type: 'error' });
                });
        }
        return true; // Indicates that the response is asynchronous
    }
});