
// const SUBMISSIONS_ENDPOINT = 'https://leetcode.com/api/submissions/';
// const FETCH_INTERVAL = 300000; // 5 minutes
// let isFetching = false

// export async function fetchLatestSubmission() {
//     try {
//         const submissionsParams = new URLSearchParams({
//             offset: "0",
//             limit: "1",
//             lastkey: "",
//         });

//         const response = await fetch(`${SUBMISSIONS_ENDPOINT}?${submissionsParams.toString()}`, {
//             method: "GET",
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Referer': 'https://leetcode.com/submissions/',
//                 'X-Requested-With': 'XMLHttpRequest',
//             },
//             credentials: 'include',
//         });
//         if (!response.ok) {
//             throw new Error(`Failed to fetch submissions: ${response.status} ${response.statusText}`);
//         }
//         const data = await response.json();
//         // TODO debugging purposes -> remove later on 
//         console.log("Submission Data:", data)

//         if (Array.isArray(data.submissions_dump) && data.submissions_dump.length > 0) {
//             const latest = data.submissions_dump[0]
//             const structuredData = {
//                 submissionId: latest.id,
//                 questionId: latest.question_id,
//                 language: latest.lang_name,
//                 solutionCode: latest.code.trim(),
//                 // timeStamp: latest.timestamp || new Date().toISOString(),
//                 questionTitle: latest.title || "Unknown Title"
//             };
//             return structuredData;
//         } else {
//             console.log("No submissions found");
//             return null;
//         }
//     }
//     catch (error) {
//         console.log("Error fetching latest submission:", error);
//         return null;
//     }
// }


// export async function getLastSyncedSubmissionId() {
//     return new Promise((resolve) => {
//         chrome.storage.sync.get(["lastSyncedSubmissionId"], (result) => {
//             resolve(result.lastSyncedSubmissionId || null)
//         });
//     });
// }


// export async function processLatestSubmission() {
//     // This isFetching is used because of that mutation observer i have in there to check and not repeat 
//     if (isFetching) {
//         console.log("Fetch is already in progress. Skipping this interval");
//         return;
//     }
//     // now set isFetching to true 
//     isFetching = true
//     console.log("Fetching the latest submission....")
//     try {
//         // fetch that latest submission 
//         const latestSubmission = await fetchLatestSubmission();
//         // if theres no latest submission 
//         if (!latestSubmission) return;
//         const lastSyncedId = await getLastSyncedSubmissionId();
//         // if that latest submission is there def will be submission ID 
//         console.log(`Last Synced Submission ID: ${lastSyncedId}`);
//         // if the last synced submission ID === current submission ID nothing needs to happen even though additional check is done on content side at github
//         if (latestSubmission.submissionId === lastSyncedId) {
//             console.log("No new submissions to sync");
//             return;
//         }

//         // now send that message to background.js to initiate its processs 
//         // TODO RE READ THE CHROME API DOC ... 
//         chrome.runtime.sendMessage(
//             { action: 'newSubmission', data: latestSubmission },
//             async (response) => {
//                 if (chrome.runtime.lastError) {
//                     console.error('Error sending message:', chrome.runtime.lastError);
//                 } else {
//                     console.log('Background script response:', response);
//                     if (response && response.status === 'success') {
//                         // Update that last synced submission ID
//                         await setLastSyncedSubmissionId(latestSubmission.submissionId);
//                         console.log('Updated last synced submission ID.');
//                     }
//                 }
//             }
//         );
//     } catch (error) {
//         console.error("Error processing submission:", error)
//     } finally {
//         isFetching = false
//     }
// }
