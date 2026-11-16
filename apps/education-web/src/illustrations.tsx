export function LearningArt({ compact = false }: { compact?: boolean }) {
  return <svg className={`learning-art ${compact ? "compact" : ""}`} viewBox="0 0 440 290" fill="none" aria-hidden="true">
    <circle cx="232" cy="139" r="115" fill="currentColor" opacity=".07" />
    <path d="M50 246h344" stroke="currentColor" opacity=".18" strokeWidth="2" />
    <path d="m89 224 144-31 112 29-144 29-112-27Z" fill="#a6d8bc" />
    <path d="m89 214 144-31 112 29-144 29-112-27Z" fill="#fff5df" />
    <path d="m201 241 144-29v10l-144 29v-10Z" fill="#76b997" />
    <path d="M132 201V76c38-8 66-3 97 17 31-20 61-25 98-17v125c-41-7-70 0-98 20-28-20-57-27-97-20Z" fill="#fffcf4" stroke="#145c45" strokeWidth="3" strokeLinejoin="round" />
    <path d="M229 93v128" stroke="#145c45" strokeWidth="3" />
    <path d="M152 101c22-2 40 2 58 12M152 119c22-2 40 2 58 12M152 137c22-2 40 2 58 12M152 166c15 0 28 3 41 9" stroke="#aac9b6" strokeWidth="5" strokeLinecap="round" />
    <circle cx="278" cy="137" r="24" fill="#e7f2e7" />
    <ellipse cx="278" cy="137" rx="31" ry="12" transform="rotate(-40 278 137)" stroke="#247457" strokeWidth="2" />
    <ellipse cx="278" cy="137" rx="31" ry="12" transform="rotate(40 278 137)" stroke="#247457" strokeWidth="2" />
    <circle cx="278" cy="137" r="5" fill="#e8ab43" />
    <path d="M253 179h50" stroke="#aac9b6" strokeWidth="5" strokeLinecap="round" />
    <g transform="rotate(-18 95 145)"><rect x="75" y="108" width="32" height="75" rx="6" fill="#efb94f" /><path d="m75 183 16 24 16-24" fill="#f3dfb6" /><path d="m85 198 6 9 6-9" fill="#145c45" /><path d="M85 121v52M97 121v52" stroke="#d59529" strokeWidth="2" /></g>
    <rect x="311" y="37" width="69" height="56" rx="14" fill="#cce8d4" transform="rotate(9 311 37)" />
    <path d="m337 57 21 3-3 22-21-3 3-22Z" stroke="#145c45" strokeWidth="2" /><path d="m337 57 10-6 21 3-10 6M358 60l10-6-3 22-10 6" stroke="#145c45" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="122" cy="50" r="17" fill="#efb94f" /><path d="M122 42v16M114 50h16" stroke="#145c45" strokeWidth="2" strokeLinecap="round" />
    <path d="m366 169 5 11 12 2-9 8 2 12-10-6-11 6 2-12-9-8 12-2 6-11Z" fill="#efb94f" />
    <circle cx="64" cy="77" r="4" fill="#a6d8bc" /><circle cx="381" cy="127" r="5" fill="#a6d8bc" />
  </svg>;
}

export function SubjectArt({ subject }: { subject: string }) {
  const math = subject === "Mathematics";
  const english = subject === "English Language";
  return <span className={`subject-art ${math ? "math" : english ? "english" : "science"}`} aria-hidden="true"><svg viewBox="0 0 80 64" fill="none">
    {math ? <><rect x="22" y="10" width="35" height="44" rx="6" fill="#fffaf0" stroke="currentColor" strokeWidth="2" transform="rotate(-8 22 10)" /><path d="M31 22h16M32 32h5m-2.5-2.5v5M43 32h5M32 42h5m6 0h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></> : english ? <><path d="M40 19c-9-6-18-6-26-3v34c9-3 18-2 26 4 8-6 17-7 26-4V16c-8-3-17-3-26 3Z" fill="#fffcf5" stroke="currentColor" strokeWidth="2" /><path d="M40 19v35M22 26h10M22 33h10M48 26h10M48 33h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></> : <><path d="M32 11h16M34 11v17L20 47c-3 5 0 8 5 8h30c5 0 8-3 5-8L46 28V11" fill="#f5fff8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M28 38h24l8 12c1 3-1 5-5 5H25c-4 0-6-2-5-5l8-12Z" fill="#9bc7ab" /><circle cx="35" cy="44" r="3" fill="#f5fff8" /><circle cx="45" cy="49" r="2" fill="#f5fff8" /></>}
  </svg></span>;
}
