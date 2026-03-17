const test = require("node:test");
const assert = require("node:assert/strict");

const { loadScript } = require("./helpers/load-script");
const { createChromeMock } = require("./helpers/test-doubles");

function createContentContext({ store = {}, fetch, sendMessageImpl } = {}) {
  const chromeMock = createChromeMock(store);
  if (sendMessageImpl) {
    chromeMock.setSendMessageImpl(sendMessageImpl);
  }

  const context = loadScript("content.js", {
    chrome: chromeMock.chrome,
    fetch,
    window: {
      addEventListener() {},
    },
  });

  return { chromeMock, context };
}

function createSubmissionResponse(submission) {
  return {
    ok: true,
    async json() {
      return {
        submissions_dump: [submission],
      };
    },
  };
}

test("processLatestSubmission skips sendMessage when the latest submission is already synced", async () => {
  const latestSubmission = {
    id: "100",
    question_id: "1",
    lang_name: "Python3",
    code: "print('hello')",
    title: "Two Sum",
  };

  const { chromeMock, context } = createContentContext({
    store: { lastSyncedSubmissionId: "100" },
    fetch: async () => createSubmissionResponse(latestSubmission),
  });

  await context.processLatestSubmission();

  assert.equal(chromeMock.runtimeMessages.length, 0);
});

test("processLatestSubmission sends a message for a new submission and stores the synced id on success", async () => {
  const latestSubmission = {
    id: "101",
    question_id: "2",
    lang_name: "JavaScript",
    code: "console.log('hi')",
    title: "Add Two Numbers",
  };

  const { chromeMock, context } = createContentContext({
    fetch: async () => createSubmissionResponse(latestSubmission),
    sendMessageImpl(message, callback) {
      callback({ status: "success" });
    },
  });

  await context.processLatestSubmission();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(chromeMock.runtimeMessages.length, 1);
  assert.equal(chromeMock.runtimeMessages[0].action, "newSubmission");
  assert.equal(chromeMock.runtimeMessages[0].data.submissionId, "101");
  assert.equal(chromeMock.store.lastSyncedSubmissionId, "101");
});
