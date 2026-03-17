const test = require("node:test");
const assert = require("node:assert/strict");

const { loadScript } = require("./helpers/load-script");
const {
  createChromeMock,
  createDocumentMock,
  createElement,
} = require("./helpers/test-doubles");

function createOptionsContext(store = {}) {
  const chromeMock = createChromeMock(store);
  const elements = {
    form: createElement(),
    repoUrl: createElement(),
    githubToken: createElement(),
    status: createElement(),
  };

  const document = createDocumentMock({
    byId: {
      "config-form": elements.form,
      "repo-url": elements.repoUrl,
      "github-token": elements.githubToken,
      status: elements.status,
    },
  });

  const context = loadScript("options.js", {
    chrome: chromeMock.chrome,
    document,
    setTimeout() {
      return 1;
    },
  });

  return { chromeMock, context, document, elements };
}

test("options validators accept valid values and reject invalid ones", () => {
  const { context } = createOptionsContext();

  assert.equal(
    context.validateGitHubRepoUrl("https://github.com/octocat/leetcode"),
    true,
  );
  assert.equal(context.validateGitHubRepoUrl("https://example.com/octocat/repo"), false);
  assert.equal(
    context.validateGitHubToken("ghp_123456789012345678901234567890123456"),
    true,
  );
  assert.equal(context.validateGitHubToken("short-token"), false);
});

test("restoreOptions populates both saved fields from chrome storage", () => {
  const { context, elements } = createOptionsContext({
    repoUrl: "https://github.com/octocat/leetcode",
    githubToken: "ghp_123456789012345678901234567890123456",
  });

  context.restoreOptions();

  assert.equal(elements.repoUrl.value, "https://github.com/octocat/leetcode");
  assert.equal(
    elements.githubToken.value,
    "ghp_123456789012345678901234567890123456",
  );
});

test("saveOptions persists valid settings and shows a success status", () => {
  const { chromeMock, context, elements } = createOptionsContext();
  let prevented = false;

  elements.repoUrl.value = "https://github.com/octocat/leetcode";
  elements.githubToken.value = "ghp_123456789012345678901234567890123456";

  context.saveOptions({
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(chromeMock.store.repoUrl, "https://github.com/octocat/leetcode");
  assert.equal(
    chromeMock.store.githubToken,
    "ghp_123456789012345678901234567890123456",
  );
  assert.equal(elements.status.textContent, "Options saved succesfully");
  assert.equal(elements.status.className, "success");
});

test("saveOptions rejects invalid repository URLs without writing storage", () => {
  const { chromeMock, context, elements } = createOptionsContext();

  elements.repoUrl.value = "not-a-github-url";
  elements.githubToken.value = "ghp_123456789012345678901234567890123456";

  context.saveOptions({
    preventDefault() {},
  });

  assert.equal(chromeMock.store.repoUrl, undefined);
  assert.equal(elements.status.textContent, "Invalid Github Repository");
  assert.equal(elements.status.className, "error");
});
