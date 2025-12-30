---
description: Create a new plan, branch, and execute tasks with Docker verification
---

1. Analyze the user request and generate a descriptive branch name (e.g., `feature/short-description` or `fix/issue-description`).
2. Create and checkout a new git branch using `git checkout -b <branch-name>`.
3. Initialize the task using `task_boundary` in `PLANNING` mode with an appropriate `TaskName`.
4. Create a `task.md` artifact to track progress.
5. Research the codebase and create an `implementation_plan.md` artifact.
6. Use `notify_user` to present the plan and wait for explicit user approval.
7. Upon approval, switch to `EXECUTION` mode using `task_boundary`.
8. Implement the changes as outlined in the plan.
9. After implementation, switch to `VERIFICATION` mode using `task_boundary` and create a `walkthrough.md` artifact.
10. Run unit tests within Docker:
    ```bash
    docker-compose up --build test
    ```
11. Run E2E tests within Docker:
    ```bash
    docker-compose -f docker-compose.e2e.yml up --build
    ```
12. Verify all tests pass. If any fail, return to `EXECUTION` mode to fix them.
13. Once verified, notify the user of the completed task with the `walkthrough.md`.
