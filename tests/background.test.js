const test = require("node:test");
const assert = require("node:assert/strict");

const { loadScript } = require("./helpers/load-script");
const { createChromeMock } = require("./helpers/test-doubles");

function loadBackground(overrides = {}) {
  const chromeMock = overrides.chromeMock || createChromeMock();
  const context = loadScript("background.js", {
    chrome: chromeMock.chrome,
    document:
      "document" in overrides
        ? overrides.document
        : {
            querySelector() {
              return null;
            },
          },
    fetch: overrides.fetch,
  });

  return { chromeMock, context };
}

function invokeMessageListener(listener, request, sender = {}) {
  return new Promise((resolve) => {
    const returnValue = listener(request, sender, (response) => {
      resolve({ returnValue, response });
    });
  });
}

test("background helpers parse repo URLs and map filenames", () => {
  const { context } = loadBackground();

  const parsed = context.parseRepoUrl("https://github.com/octocat/leetcode");
  assert.equal(parsed.owner, "octocat");
  assert.equal(parsed.repo, "leetcode");

  const invalid = context.parseRepoUrl("https://example.com/octocat/leetcode");
  assert.equal(invalid.owner, null);
  assert.equal(invalid.repo, null);

  assert.equal(context.sanitizeFileName("Two Sum!"), "two_sum_");
  assert.equal(context.getFileExtension("Python3"), "py");
  assert.equal(context.getFileExtension("UnknownLang"), "txt");
});

test("updateLastSyncTime works without a DOM in the background worker", () => {
  const chromeMock = createChromeMock();
  const { context } = loadBackground({ chromeMock, document: undefined });

  assert.doesNotThrow(() => {
    context.updateLastSyncTime();
  });
  assert.ok(chromeMock.store.lastSyncTime);
});

test("handleNewSubmission creates a file when GitHub does not have one yet", async () => {
  const chromeMock = createChromeMock({
    repoUrl: "https://github.com/octocat/leetcode",
    githubToken: "token-123",
  });
  const fetchCalls = [];
  const fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    if (options.method === "GET") {
      return { ok: false, status: 404 };
    }

    if (options.method === "PUT") {
      return {
        ok: true,
        async json() {
          return {};
        },
      };
    }

    throw new Error(`Unexpected method: ${options.method}`);
  };

  const { context } = loadBackground({ chromeMock, fetch });
  const result = await context.handleNewSubmission({
    submissionId: "42",
    questionId: "1",
    questionTitle: "Two Sum",
    language: "Python3",
    solutionCode: "print('hello')",
  });

  assert.equal(result.type, "success");
  assert.equal(fetchCalls.length, 2);
  assert.equal(chromeMock.notifications.length, 1);
  assert.equal(chromeMock.store.lastSyncedSubmissionId, "42");
  assert.ok(chromeMock.store.lastSyncTime);

  const putRequest = fetchCalls[1];
  const body = JSON.parse(putRequest.options.body);
  assert.equal(body.branch, "main");
  assert.match(body.message, /Add 1_two_sum\.py/);
});

test("handleNewSubmission skips writing when GitHub content already matches", async () => {
  const chromeMock = createChromeMock({
    repoUrl: "https://github.com/octocat/leetcode",
    githubToken: "token-123",
  });
  const fetchCalls = [];
  const existingContent = Buffer.from("print('hello')", "utf8").toString("base64");
  const fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    if (options.method === "GET") {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            content: existingContent,
            sha: "existing-sha",
          };
        },
      };
    }

    throw new Error(`Unexpected method: ${options.method}`);
  };

  const { context } = loadBackground({ chromeMock, fetch });
  const result = await context.handleNewSubmission({
    submissionId: "42",
    questionId: "1",
    questionTitle: "Two Sum",
    language: "Python3",
    solutionCode: "print('hello')",
  });

  assert.equal(result.type, "info");
  assert.equal(fetchCalls.length, 1);
  assert.equal(chromeMock.notifications.length, 0);
  assert.equal(chromeMock.store.lastSyncedSubmissionId, undefined);
});

test("background message listener handles newSubmission success responses", async () => {
  const chromeMock = createChromeMock({
    repoUrl: "https://github.com/octocat/leetcode",
    githubToken: "token-123",
  });
  const fetch = async (url, options = {}) => {
    if (options.method === "GET") {
      return { ok: false, status: 404 };
    }

    if (options.method === "PUT") {
      return {
        ok: true,
        async json() {
          return {};
        },
      };
    }

    throw new Error(`Unexpected method: ${options.method}`);
  };

  const { context } = loadBackground({ chromeMock, fetch });
  const listener = chromeMock.getMessageListener();

  assert.equal(typeof listener, "function");

  const { returnValue, response } = await invokeMessageListener(listener, {
    action: "newSubmission",
    data: {
      submissionId: "42",
      questionId: "1",
      questionTitle: "Two Sum",
      language: "Python3",
      solutionCode: "print('hello')",
    },
  });

  assert.equal(returnValue, true);
  assert.equal(response.type, "success");
  assert.match(response.status, /Successfully synced 1_two_sum\.py to GitHub\./);
  assert.equal(chromeMock.store.syncStatus, "Idle");
  assert.equal(chromeMock.notifications.length, 1);
  assert.equal(chromeMock.notifications[0].title, "LeetCode GitHub Sync");
  assert.ok(chromeMock.store.lastSyncTime);
});

test("background message listener returns an error response and notification on sync failure", async () => {
  const chromeMock = createChromeMock();
  const { context } = loadBackground({
    chromeMock,
    fetch: async () => {
      throw new Error("Fetch should not run without repo configuration");
    },
  });
  const listener = chromeMock.getMessageListener();

  const { returnValue, response } = await invokeMessageListener(listener, {
    action: "newSubmission",
    data: {
      submissionId: "42",
      questionId: "1",
      questionTitle: "Two Sum",
      language: "Python3",
      solutionCode: "print('hello')",
    },
  });

  assert.equal(returnValue, true);
  assert.equal(response.type, "error");
  assert.equal(
    response.status,
    "GitHub repository URL or Personal Access Token is not configured.",
  );
  assert.equal(chromeMock.store.syncStatus, "Error");
  assert.equal(chromeMock.notifications.length, 1);
  assert.equal(chromeMock.notifications[0].title, "LeetCode GitHub Sync Error");
});

test("background message listener handles manualSync requests through the async response path", async () => {
  const chromeMock = createChromeMock({
    repoUrl: "https://github.com/octocat/leetcode",
    githubToken: "token-123",
  });
  let submissionFetches = 0;
  let githubWrites = 0;
  const fetch = async (url, options = {}) => {
    if (url.startsWith("https://leetcode.com/api/submissions/")) {
      submissionFetches += 1;
      return {
        ok: true,
        async json() {
          return {
            submissions_dump: [
              {
                id: "500",
                question_id: "3",
                lang_name: "JavaScript",
                code: "console.log('sync')",
                title: "Longest Substring",
              },
            ],
          };
        },
      };
    }

    if (options.method === "GET") {
      return { ok: false, status: 404 };
    }

    if (options.method === "PUT") {
      githubWrites += 1;
      return {
        ok: true,
        async json() {
          return {};
        },
      };
    }

    throw new Error(`Unexpected request: ${url}`);
  };

  const { context } = loadBackground({ chromeMock, fetch });
  const listener = chromeMock.getMessageListener();

  const { returnValue, response } = await invokeMessageListener(listener, {
    action: "manualSync",
  });

  assert.equal(returnValue, true);
  assert.equal(response.type, "success");
  assert.match(
    response.status,
    /Successfully synced 3_longest_substring\.js to GitHub\./,
  );
  assert.equal(submissionFetches, 2);
  assert.equal(githubWrites, 1);
  assert.equal(chromeMock.runtimeMessages.length, 1);
  assert.equal(chromeMock.runtimeMessages[0].action, "newSubmission");
});
