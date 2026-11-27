import type { Demo } from "../demo";
import type { Actor } from "./types";

/** Demo-only identity switch. Command authority always comes from the selected actor. */
export function ActorPicker({ demo }: { demo: Demo }) {
  const actor: Actor = demo.data.actor;
  const value = actor.userId === "admin" ? "admin" : actor.userId;

  return <label className="actor-picker">
    Acting as
    <select
      aria-label="Acting as"
      value={value}
      onChange={event => {
        const next = event.target.value;
        const selected: Actor = next === "admin"
          ? { role: "admin", userId: "admin" }
          : { role: "teacher", userId: next };
        demo.update({ actor: selected });
      }}
    >
      <option value="admin">Administrator</option>
      {demo.data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
    </select>
  </label>;
}
