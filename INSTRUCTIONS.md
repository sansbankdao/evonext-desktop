The Instructions for Your AI Assistant

Copy and paste this into a file named.cursorrules orinstructions.md. This is the most important part—it changes the AI’s behavior.
Strict Protocol for AI Assistant:

Contract Integrity: Never modify a Rust struct insrc-tauri/src/types/ without first confirming how it affects the TypeScript frontend.

No Deletions: You are forbidden from deleting "unused" functions or fields unless specifically instructed. They may be used by the testing suite.



Test-First: When adding a feature, first write a unit test in the relevant.rs file under amod tests block.



Verification Loop: After any change, you MUST run./check.sh. If any step fails:





You broke a contract or logic.



Do not ask the user for help yet.



Analyze the error and fix your regression.

5. Submission: Only provide code solutions once./check.sh reports 100% success.

Summary of what we just built:
