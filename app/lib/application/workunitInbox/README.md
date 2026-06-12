# Application WorkUnit Inbox

Canonical home for inbox-facing application logic:

- normalized signal types used by the inbox surface
- signal -> InboxWorkUnit transforms
- action-preview request mapping for inbox-originated work units
- persistence mapping between InboxWorkUnit and repository rows

Provider clients do not belong here. They live under `app/lib/infrastructure/external/`.
