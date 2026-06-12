# Application Layer

This directory is the canonical home for orchestration code that sits between routes/UI and the pure domain model.

- May depend on domain modules.
- May depend on repository or external client interfaces.
- Must not depend on React components.
- Must not contain raw SQL.
