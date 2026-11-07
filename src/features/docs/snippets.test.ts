import { describe, expect, it } from "vitest";

import { SAMPLE_AGENT } from "./context";
import { accepted202, buildBody, callbackUrlFor, handlerSnippet, HANDLER_STACKS, joinUrl, requestSnippet, SNIPPET_LANGS } from "./snippets";

describe("docs snippets", () => {
  it("joins URLs without doubling slashes", () => {
    expect(joinUrl("https://a.test/", "/agents/x")).toBe("https://a.test/agents/x");
    expect(joinUrl("https://a.test", "agents/x")).toBe("https://a.test/agents/x");
  });

  it("targets this project and drops the example's initiatedBy, which the server derives", () => {
    const body = buildBody(SAMPLE_AGENT, "my-project");
    expect(body["projectId"]).toBe("my-project");
    expect(body["requestId"]).toBe("run-001");
    expect(body).not.toHaveProperty("initiatedBy");
    expect(body["courseId"]).toBe("course_123");
  });

  it("never puts a key in a snippet, only an environment reference", () => {
    for (const { id } of SNIPPET_LANGS) {
      const code = requestSnippet(id, "https://a.test", SAMPLE_AGENT, buildBody(SAMPLE_AGENT, "p"));
      expect(code).toContain("SUCCOR_API_KEY");
      expect(code).toContain("https://a.test/agents/quiz-generator");
      expect(code).not.toMatch(/ask_live_[a-zA-Z0-9]/);
    }
  });

  it("writes valid Python literals", () => {
    const code = requestSnippet("python", "https://a.test", SAMPLE_AGENT, { ok: true, none: null });
    expect(code).toContain("True");
    expect(code).toContain("None");
  });

  it("escapes single quotes in cURL bodies", () => {
    const code = requestSnippet("curl", "https://a.test", SAMPLE_AGENT, { name: "it's" });
    expect(code).toContain(`it'\\''s`);
  });

  it("echoes the agent's id field in the 202", () => {
    expect(accepted202(SAMPLE_AGENT, "p")).toMatchObject({ accepted: true, projectId: "p", courseId: "course_123" });
  });

  it("fills callback path params from the body and leaves unknown ones visible", () => {
    expect(callbackUrlFor(SAMPLE_AGENT)).toBe("/api/v1/admin/courses/course_123/quiz");
    expect(callbackUrlFor({ ...SAMPLE_AGENT, callbackPath: "/x/:missing" })).toBe("/x/:missing");
  });

  it("verifies the callback key in every handler, on the agent's real method", () => {
    for (const { id } of HANDLER_STACKS) {
      const code = handlerSnippet(id, SAMPLE_AGENT).toLowerCase();
      expect(code).toMatch(/x[-_]succor[-_]callback[-_]key/);
      expect(code).toMatch(/x[-_]delivery[-_]id/);
    }
    expect(handlerSnippet("express", SAMPLE_AGENT)).toContain("app.put(");
  });
});
