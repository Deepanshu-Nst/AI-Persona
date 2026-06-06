export interface GuardResult {
  flagged: boolean;
  reason: string | null;
}

const INJECTION_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /ignore\s+(all\s+)?(previous\s+)?(instructions|prompts|messages)/i, label: "ignore_instructions" },
  { pattern: /you\s+(are\s+)?(not\s+)?((a|an)\s+)?(ai\s+)?(assistant|chatbot|bot)/i, label: "identity_override" },
  { pattern: /forget\s+(everything|all\s+(previous|prior)\s+(instructions|knowledge|context))/i, label: "forget_context" },
  { pattern: /system\s+(prompt|message|instruction)/i, label: "system_prompt_reference" },
  { pattern: /new\s+(instructions|prompt|rules)/i, label: "new_instructions" },
  { pattern: /override/i, label: "override_attempt" },
  { pattern: /you\s+(will|must|shall)\s+(now|from\s+now\s+on)/i, label: "behavior_override" },
  { pattern: /act\s+as\s+(if|though)/i, label: "act_as_if" },
  { pattern: /role\s*[: ]/i, label: "role_assignment" },
  { pattern: /\[system\]|\[instructions\]|\[prompt\]/i, label: "meta_marker" },
  { pattern: /<\s*system\s*>|<\s*\/\s*system\s*>/i, label: "xml_system_tag" },
  { pattern: /answer\s+(without|ignoring|regardless)/i, label: "bypass_attempt" },
  { pattern: /do\s+(not|n't)\s+(follow|obey|listen)/i, label: "disobey_instruction" },
];

export function guardQuery(query: string): GuardResult {
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return { flagged: true, reason: label };
    }
  }
  return { flagged: false, reason: null };
}
