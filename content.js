// The constants 

const SUBMISSIONS_ENDPOINT = 'https://leetcode.com/api/submissions/';
const FETCH_INTERVAL = 300000; // 5 minutes
let isFetching = false

/**
 * Fetching the latest submission from the leetcode API 
 * @returns {Promise<Object>|null} - This gets that latest submission data if its availaible or it returns null not found
 */

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
        // console.log("Submission Data:", data)

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
            // console.log("No submissions found");
            return null;
        }
    }
    catch (error) {
        // console.log("Error fetching latest submission:", error);
        return null;
    }
}

/**
 * The fact that i want to make it auto and once i get a submittion ID i want to check it with the last one i synced to check it out 
 * @returns {Promise<string|null>}
 */

async function getLastSyncedSubmissionId() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(["lastSyncedSubmissionId"], (result) => {
            resolve(result.lastSyncedSubmissionId || null)
        });
    });
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

/** 
 * i now need to process that latest submission by fetching, validating and now send it to my background.js so that its able to use it and both are connected 
 */

async function processLatestSubmission() {
    // This isFetching is used because of that mutation observer i have in there to check and not repeat 
    if (isFetching) {
        // console.log("Fetch is already in progress. Skipping this interval");
        return;
    }
    // now set isFetching to true 
    isFetching = true
    // console.log("Fetching the latest submission....")
    try {
        // fetch that latest submission 
        const latestSubmission = await fetchLatestSubmission();
        // if theres no latest submission 
        if (!latestSubmission) return;
        const lastSyncedId = await getLastSyncedSubmissionId();
        // if that latest submission is there def will be submission ID 
        // console.log(`Last Synced Submission ID: ${lastSyncedId}`);
        // if the last synced submission ID === current submission ID nothing needs to happen even though additional check is done on content side at github
        if (latestSubmission.submissionId === lastSyncedId) {
            // console.log("No new submissions to sync");
            return;
        }

        // now send that message to background.js to initiate its processs 
        // TODO RE READ THE CHROME API DOC ... 
        chrome.runtime.sendMessage(
            { action: 'newSubmission', data: latestSubmission },
            async (response) => {
                if (chrome.runtime.lastError) {
                    // console.error('Error sending message:', chrome.runtime.lastError);
                } else {
                    // console.log('Background script response:', response);
                    if (response && response.status === 'success') {
                        // Update that last synced submission ID
                        await setLastSyncedSubmissionId(latestSubmission.submissionId);
                        // console.log('Updated last synced submission ID.');
                    }
                }
            }
        );
    } catch (error) {
        // console.error("Error processing submission:", error)
    } finally {
        isFetching = false
    }
}

/**
 * Setting up thst mutation observer to detect realtime additions thats added to the submission page because i know that when somethng is submitted it is added to the submission page 
 * It is delicate because that leetcode can change their layout so i have to keep maintaining it 
 */

function setupMutationObserver() {
    // the submission table 
    const submissionsTableBody = document.querySelector("#submission-list-app table tbody")
    if (!submissionsTableBody) {
        console.warn("Submissions table body not found so MutationObserver is not intiailized");
        return;
    }
    // TODO: REREAD THIS CODE LATER MUTATION OBSERVER TRICKY 
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // console.log('New submission detected via MutationObserver.');
                processLatestSubmission();
            }
        }
    });

    observer.observe(submissionsTableBody, { childList: true, subtree: true });
    // console.log('MutationObserver set up to monitor new submissions.');
}

/**
 * This will intiailize that periodic fetching 
 */

function initializePeriodicFetching() {
    // make the script fetch that submission on load straigt away 
    processLatestSubmission();

    // scheduling the intervals to make it periodic
    setInterval(processLatestSubmission, FETCH_INTERVAL);
    // console.log(`Periodic fetching set to every ${FETCH_INTERVAL / 60000} minutes`);
}

/**
 * This will intialize the content so it works when page starts to load in the beginning 
 */

async function initializeContentScript() {
    // Setting that mutation server so i can read for changes that happens in my DOM
    setupMutationObserver();
    // I initialize that periodic function instantly 
    initializePeriodicFetching();
}

window.addEventListener("load", initializeContentScript)
