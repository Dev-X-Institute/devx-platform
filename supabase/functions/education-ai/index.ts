import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const MAX_BODY_BYTES = 8_192;
const MAX_QUESTION_CHARS = 2_000;

type Feature = "quiz.generate" | "lesson.explain";

interface AiRequest {
  feature: Feature;
  lessonId: string;
  count?: number;
  question?: string;
  idempotencyKey?: string;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function failure(
  code: string,
  status: number,
  retryable = false,
  requestId?: string,
): Response {
  return jsonResponse(status, {
    ok: false,
    ...(requestId ? { requestId } : {}),
    error: { code, retryable },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(value);
}

export function validateRequest(value: unknown): AiRequest | null {
  if (!isRecord(value) || typeof value.feature !== "string") return null;
  if (!isUuid(value.lessonId)) return null;

  const idempotencyKey = value.idempotencyKey;
  if (
    idempotencyKey !== undefined &&
    (typeof idempotencyKey !== "string" || idempotencyKey.length < 1 ||
      idempotencyKey.length > 200)
  ) return null;

  if (value.feature === "quiz.generate") {
    const count = value.count === undefined ? 5 : value.count;
    if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > 10) {
      return null;
    }
    if (value.question !== undefined) return null;
    return {
      feature: value.feature,
      lessonId: value.lessonId,
      count: count as number,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };
  }

  if (value.feature === "lesson.explain" && typeof value.question === "string") {
    const question = value.question.trim();
    if (question.length < 1 || question.length > MAX_QUESTION_CHARS) return null;
    if (value.count !== undefined) return null;
    return {
      feature: value.feature,
      lessonId: value.lessonId,
      question,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };
  }

  return null;
}

function getRequiredEnv(name: string): string | null {
  const value = Deno.env.get(name)?.trim();
  return value ? value : null;
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return failure("METHOD_NOT_ALLOWED", 405);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return failure("PAYLOAD_TOO_LARGE", 413);
  }

  const authorization = request.headers.get("authorization");
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const supabaseKey = getRequiredEnv("SUPABASE_ANON_KEY") ??
    getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !supabaseKey) {
    return failure("UNAUTHORIZED", 401);
  }

  const accessToken = authorization.slice("Bearer ".length);
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return failure("UNAUTHORIZED", 401);

  let rawBody: unknown;
  try {
    const rawText = await request.text();
    if (new TextEncoder().encode(rawText).byteLength > MAX_BODY_BYTES) {
      return failure("PAYLOAD_TOO_LARGE", 413);
    }
    rawBody = JSON.parse(rawText);
  } catch {
    return failure("INVALID_REQUEST", 400);
  }
  const body = validateRequest(rawBody);
  if (!body) return failure("INVALID_REQUEST", 400);

  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) return failure("TASK_ENQUEUE_FAILED", 503, true);
  const enqueueClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const payload = body.feature === "lesson.explain"
    ? { lesson_id: body.lessonId, question: body.question }
    : { lesson_id: body.lessonId, count: body.count };
  const { data: queued, error: enqueueError } = await enqueueClient.rpc(
    "enqueue_education_ai_task",
    {
      p_created_by: data.user.id,
      p_feature_key: body.feature,
      p_payload: payload,
      p_idempotency_key: body.idempotencyKey ?? null,
    },
  );

  if (enqueueError || !Array.isArray(queued) || !isRecord(queued[0])) {
    console.warn(JSON.stringify({ error: "task_enqueue_failed" }));
    return failure("TASK_ENQUEUE_FAILED", 503, true);
  }

  const taskId = queued[0].task_id;
  const requestId = queued[0].request_id;
  const status = queued[0].status;
  if (
    typeof taskId !== "string" || typeof requestId !== "string" ||
    typeof status !== "string"
  ) {
    console.warn(JSON.stringify({ error: "task_enqueue_invalid_response" }));
    return failure("TASK_ENQUEUE_FAILED", 503, true);
  }

  return jsonResponse(202, {
    ok: true,
    requestId,
    taskId,
    status,
  });
}

if ((import.meta as ImportMeta & { main: boolean }).main) {
  Deno.serve(handleRequest);
}
