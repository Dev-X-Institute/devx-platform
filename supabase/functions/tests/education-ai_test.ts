import { handleRequest } from "../education-ai/index.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
    set(name: string, value: string): void;
    delete(name: string): void;
  };
  test(name: string, fn: () => void | Promise<void>): void;
};

const supabaseUrl = "https://supabase.test";
const supabaseKey = "test-anon-key";
const providerUrl = "https://provider.test/v1/chat/completions";

function requestUrl(input: Request | URL | string): string {
  return input instanceof Request ? input.url : input.toString();
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function withMockServices<T>(
  role: "student" | "teacher" | "admin",
  values: Record<string, string>,
  run: (
    providerCalls: () => number,
    providerRequest: () => string | null,
  ) => Promise<T>,
): Promise<T> {
  const environment = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseKey,
    AI_PROVIDER_APPROVED: "false",
    AI_API_URL: providerUrl,
    AI_API_KEY: "test-provider-key",
    AI_MODEL: "test-model",
    ...values,
  };
  const previousEnvironment = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(environment)) {
    previousEnvironment.set(name, Deno.env.get(name));
    Deno.env.set(name, value);
  }

  const originalFetch = globalThis.fetch;
  let providerCallCount = 0;
  let lastProviderRequest: string | null = null;
  globalThis.fetch = async (input, init) => {
    const url = requestUrl(input);
    if (url.endsWith("/auth/v1/user")) {
      return Response.json({
        id: "test-user-123",
        aud: "authenticated",
        role: "authenticated",
        app_metadata: { education_role: role },
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      });
    }
    if (url === providerUrl) {
      providerCallCount += 1;
      lastProviderRequest = typeof init?.body === "string" ? init.body : null;
      const providerBody = lastProviderRequest
        ? JSON.parse(lastProviderRequest)
        : {};
      const isQuiz = providerBody.messages?.[0]?.content.includes(
        "multiple-choice quiz",
      );
      return Response.json({
        choices: [{
          message: {
            content: isQuiz
              ? JSON.stringify({
                questions: [{
                  question: "What is a force?",
                  options: [
                    "A push or pull",
                    "A type of matter",
                    "A unit of time",
                    "A kind of energy",
                  ],
                  answerIndex: 0,
                }],
              })
              : "A force is a push or pull that can change motion.",
          },
        }],
      });
    }
    return new Response("Unexpected mocked request", { status: 404 });
  };

  try {
    return await run(() => providerCallCount, () => lastProviderRequest);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of previousEnvironment) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function post(body: unknown, withAuth = true): Request {
  return new Request(`${supabaseUrl}/functions/v1/education-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(withAuth ? { Authorization: "Bearer test-user-jwt" } : {}),
    },
    body: JSON.stringify(body),
  });
}

Deno.test("OPTIONS returns CORS success", async () => {
  const response = await handleRequest(
    new Request(`${supabaseUrl}/functions/v1/education-ai`, {
      method: "OPTIONS",
    }),
  );
  assertEquals(response.status, 200, "OPTIONS status");
  assertEquals(
    response.headers.get("Access-Control-Allow-Methods"),
    "POST, OPTIONS",
    "allowed methods",
  );
});

Deno.test("POST without a bearer token is rejected", async () => {
  await withMockServices("teacher", {}, async (providerCalls) => {
    const response = await handleRequest(
      post({
        feature: "quiz.generate",
        lessonText: "A sufficiently long lesson text.",
      }, false),
    );
    assertEquals(response.status, 401, "unauthenticated status");
    assertEquals(providerCalls(), 0, "provider calls");
  });
});

Deno.test("unsupported feature payload is rejected after authentication", async () => {
  await withMockServices("teacher", {}, async (providerCalls) => {
    const response = await handleRequest(
      post({
        feature: "arbitrary.prompt",
        lessonText: "A sufficiently long lesson text.",
      }),
    );
    const body = await response.json();
    assertEquals(response.status, 400, "invalid request status");
    assertEquals(body.error.code, "INVALID_REQUEST", "error code");
    assertEquals(providerCalls(), 0, "provider calls");
  });
});

Deno.test("AI stays disabled until the provider approval flag is enabled", async () => {
  await withMockServices("teacher", {}, async (providerCalls) => {
    const response = await handleRequest(post({
      feature: "quiz.generate",
      lessonText: "A force is a push or pull that can change motion.",
      count: 1,
    }));
    const body = await response.json();
    assertEquals(response.status, 503, "provider approval status");
    assertEquals(body.error.code, "AI_PROVIDER_NOT_APPROVED", "error code");
    assertEquals(providerCalls(), 0, "provider calls");
  });
});

Deno.test("student role cannot generate teacher quiz drafts", async () => {
  await withMockServices(
    "student",
    { AI_PROVIDER_APPROVED: "true" },
    async (providerCalls) => {
      const response = await handleRequest(post({
        feature: "quiz.generate",
        lessonText: "A force is a push or pull that can change motion.",
        count: 1,
      }));
      const body = await response.json();
      assertEquals(response.status, 403, "forbidden status");
      assertEquals(body.error.code, "FORBIDDEN", "error code");
      assertEquals(providerCalls(), 0, "provider calls");
    },
  );
});

Deno.test("teacher receives a schema-checked quiz draft without identity data", async () => {
  await withMockServices(
    "teacher",
    { AI_PROVIDER_APPROVED: "true" },
    async (providerCalls, providerRequest) => {
      const response = await handleRequest(post({
        feature: "quiz.generate",
        lessonText: "A force is a push or pull that can change motion.",
        count: 1,
      }));
      const body = await response.json();
      assertEquals(response.status, 200, "success status");
      assert(body.ok === true, "success envelope");
      assert(body.data.reviewRequired === true, "teacher review is required");
      assertEquals(body.data.questions.length, 1, "question count");
      assertEquals(body.data.questions[0].answerIndex, 0, "answer index");
      assertEquals(providerCalls(), 1, "provider calls");
      assert(
        !providerRequest()?.includes("test-user-123"),
        "user identity must not be sent to the model",
      );
    },
  );
});

Deno.test("student receives a lesson-scoped explanation", async () => {
  await withMockServices(
    "student",
    { AI_PROVIDER_APPROVED: "true" },
    async (providerCalls, providerRequest) => {
      const response = await handleRequest(post({
        feature: "lesson.explain",
        lessonText: "A force is a push or pull that can change motion.",
        question: "What is a force?",
      }));
      const body = await response.json();
      assertEquals(response.status, 200, "success status");
      assert(body.ok === true, "success envelope");
      assertEquals(
        body.data.answer,
        "A force is a push or pull that can change motion.",
        "lesson explanation",
      );
      assertEquals(providerCalls(), 1, "provider calls");
      assert(
        providerRequest()?.includes("What is a force?"),
        "the learner's question should be sent to the model",
      );
    },
  );
});

Deno.test("malformed model quiz output is rejected", async () => {
  await withMockServices(
    "teacher",
    { AI_PROVIDER_APPROVED: "true" },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input) => {
        if (requestUrl(input).endsWith("/auth/v1/user")) {
          return Response.json({
            id: "test-user-123",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: { education_role: "teacher" },
            user_metadata: {},
            created_at: "2026-01-01T00:00:00Z",
          });
        }
        return Response.json({
          choices: [{ message: { content: "not valid quiz json" } }],
        });
      };
      try {
        const response = await handleRequest(post({
          feature: "quiz.generate",
          lessonText: "A force is a push or pull that can change motion.",
          count: 1,
        }));
        const body = await response.json();
        assertEquals(response.status, 502, "invalid model output status");
        assertEquals(body.error.code, "AI_INVALID_RESPONSE", "error code");
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});
