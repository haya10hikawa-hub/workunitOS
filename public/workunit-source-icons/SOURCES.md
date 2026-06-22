# WorkUnit Source Icons

Vendored source app icons for WorkUnit OS.

Source:
- Simple Icons project via jsDelivr npm CDN during implementation.
- Icons were downloaded during implementation and stored locally.
- Runtime UI must use local `/workunit-source-icons/*.svg` paths only.
- Runtime hotlinking to external icon URLs is forbidden.

Required icons:
- GitHub: github.svg
- Slack: slack.svg
- Gmail: gmail.svg
- Google Calendar: google-calendar.svg
- Google Drive: google-drive.svg
- Google Docs: google-docs.svg
- Google Sheets: google-sheets.svg
- Google Slides: google-slides.svg
- Notion: notion.svg

Optional icons:
- Jira: jira.svg
- Linear: linear.svg
- Figma: figma.svg
- Google Meet: google-meet.svg
- Google Chat: google-chat.svg
- Salesforce: salesforce.svg

Fallback badges remain required for:
- database: DB
- team/user: TE
- workunit/internal: WU
- unknown: WU
