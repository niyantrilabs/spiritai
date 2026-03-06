# Fix Placeholder: VULN-001

## Vulnerability
**Title:** Remote command execution via child_process.exec with shell:true
**File:** index.js

## Vulnerable Code
```
const { stdout, stderr } = await execAsync(command, {
  cwd: execDir,
  timeout: 600000, // 10 minutes
  maxBuffer: 50 * 1024 * 1024, // 50MB buffer
  shell: true
});
```

## Suggested Fix
Do not execute untrusted shell strings. Replace exec with a safe API (spawn with explicit args) and implement a strict whitelist of allowed commands and arguments. Validate and canonicalize input; remove shell:true. Add authentication/authorization checks that ensure only authorized tasks are executed. Consider running code in a constrained sandbox or separate least-privileged process/container.

## Status
⏳ This is a placeholder. Replace this file with the actual code fix.
