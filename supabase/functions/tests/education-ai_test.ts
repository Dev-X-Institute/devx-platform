import {
  createEducationAiHandler,
  validateRequest,
} from "../education-ai/index.ts";

declare const Deno: {
  test(name: string, fn: () => void | Promise<void>): void;
};

const supabaseUrl = "https://supabase.test";
const userId = "b7a05a25-39a1-46f0-9b0a-5a4db00f91a5";
const lessonId = "a56b0c2a-5d8c-4d3d-9205-2daf1d218760";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function makeHandler(
  options: { authenticated?: boolean; enqueueError?: boolean } = {},
) {
  const env: Record<string, string> = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  };
  const calls: Array<
    { key: string; rpc?: string; args?: Record<string, unknown> }
  > = [];
  const handler = createEducationAiHandler({
    getEnv: (name) => env[name],
    createClient: (_url, key) => {
      calls.push({ key });
      if (key === "test-anon-key") {
        return {
          auth: {
            getUser: async (token: string) => ({
              data: {
                user: options.authenticated === false ||
                    token !== "valid-user-token"
                  ? null
                  : { id: userId },
              },
              error:
                options.authenticated === false || token !== "valid-user-token"
                  ? new Error("invalid token")
                  : null,
            }),
          },
          rpc: async () => ({ data: null, error: new Error("unexpected RPC") }),
        };
      }
      return {
        auth: {
          getUser: async () => ({
            data: { user: null },
            error: new Error("unexpected auth"),
          }),
        },
        rpc: async (name: string, args: Record<string, unknown>) => {
          calls.push({ key, rpc: name, args });
          return options.enqueueError
            ? { data: null, error: new Error("RPC failed") }
            : {
              data: [{
                task_id: "task-123",
                request_id: "request-456",
                status: "queued",
              }],
              error: null,
            };
        },
      };
    },
  });
  return { handler, calls };
}

function post(body: unknown, token = "valid-user-token"): Request {
  return new Request(`${supabaseUrl}/functions/v1/education-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

Deno.test("valid authenticated lesson request is validated and enqueued", async () => {
  const { handler, calls } = makeHandler();
  const response = await handler(post({
    feature: "lesson.explain",
    lessonId,
    question: "What does this lesson mean?",
    idempotencyKey: "client-request-1",
  }));
  const body = await response.json();

  assertEquals(response.status, 202, "accepted status");
  assertEquals(body.taskId, "task-123", "task ID response");
  assertEquals(calls[0].key, "test-anon-key", "authentication uses public key");
  assertEquals(
    calls[1].key,
    "test-service-role-key",
    "enqueue uses server key",
  );
  assertEquals(calls[2].rpc, "enqueue_education_ai_task", "enqueue RPC");
  assertEquals(calls[2].args?.p_created_by, userId, "authenticated user ID");
  assertEquals(calls[2].args?.p_feature_key, "lesson.explain", "feature key");
  assertEquals(
    JSON.stringify(calls[2].args?.p_payload),
    JSON.stringify({
      lesson_id: lessonId,
      question: "What does this lesson mean?",
    }),
    "RPC payload",
  );
  assertEquals(
    calls[2].args?.p_idempotency_key,
    "client-request-1",
    "idempotency key",
  );
});

Deno.test("unauthenticated request does not call the enqueue RPC", async () => {
  const { handler, calls } = makeHandler({ authenticated: false });
  const response = await handler(
    post({ feature: "quiz.generate", lessonId }, "invalid-token"),
  );
  assertEquals(response.status, 401, "unauthorized status");
  assertEquals(calls.length, 1, "only authentication client was created");
});

Deno.test("invalid request is rejected after authentication and is not enqueued", async () => {
  const { handler, calls } = makeHandler();
  const response = await handler(
    post({ feature: "quiz.generate", lessonId, count: 11 }),
  );
  assertEquals(response.status, 400, "invalid request status");
  assertEquals(calls.length, 1, "RPC was not called");
});

Deno.test("quiz request is normalized before enqueue", async () => {
  const { handler, calls } = makeHandler();
  const response = await handler(post({ feature: "quiz.generate", lessonId }));
  assertEquals(response.status, 202, "accepted status");
  assertEquals(
    JSON.stringify(calls[2].args?.p_payload),
    JSON.stringify({ lesson_id: lessonId, count: 5 }),
    "default quiz count is included",
  );
});

Deno.test("RPC failure returns a retryable enqueue error", async () => {
  const { handler } = makeHandler({ enqueueError: true });
  const response = await handler(post({ feature: "quiz.generate", lessonId }));
  const body = await response.json();
  assertEquals(response.status, 503, "enqueue error status");
  assertEquals(body.error.code, "TASK_ENQUEUE_FAILED", "enqueue error code");
  assertEquals(body.error.retryable, true, "enqueue error is retryable");
});

Deno.test("request validator accepts only supported fields and bounds", () => {
  assert(
    validateRequest({ feature: "quiz.generate", lessonId, count: 10 }),
    "valid quiz",
  );
  assert(
    validateRequest({
      feature: "lesson.explain",
      lessonId,
      question: "  Why?  ",
    }),
    "valid explanation",
  );
  assert(
    !validateRequest({ feature: "quiz.generate", lessonId, count: 0 }),
    "rejects zero questions",
  );
  assert(
    !validateRequest({ feature: "lesson.explain", lessonId, question: " " }),
    "rejects blank question",
  );
  assert(
    !validateRequest({
      feature: "quiz.generate",
      lessonId,
      count: 2,
      prompt: "ignored field",
    }),
    "rejects extra fields",
  );
});
