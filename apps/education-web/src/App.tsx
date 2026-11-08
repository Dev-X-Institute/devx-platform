import { MockAiProvider } from "@devx/ai";
import type { EducationRole } from "@devx/core";

const roles: EducationRole[] = ["student", "teacher", "admin"];
const ai = new MockAiProvider();

export default function App() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">DevX Education</h1>
      <p className="mt-2 text-gray-600">
        Monorepo skeleton is working. Shared packages loaded: @devx/core and @devx/ai.
      </p>
      <p className="mt-4">Roles: {roles.join(", ")}</p>
      <button
        className="mt-4 rounded bg-black px-4 py-2 text-white"
        onClick={async () => alert(await ai.explain("", "Is the AI adapter wired up?"))}
      >
        Test AI adapter
      </button>
    </main>
  );
}
