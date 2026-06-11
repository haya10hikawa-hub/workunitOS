# MVP_USECASE_SPEC.md

# WorkUnit OS — MVP Inbox Use Case Specification

## 1. Purpose

This document defines the MVP WorkUnit Inbox experience.

The **Inbox** is the first product surface a user sees. It converts normalized tool
signals (GitHub, Slack, Calendar) into actionable WorkUnits that answer:

* What is happening?
* Why does it matter?
* What should I do next?

**Today's scope:** Use normalized mock signals only. No real external APIs.
The goal is the product experience — not the integration implementation.

## 2. Target Users

* Individual developers managing personal projects
* Student developers tracking assignments and side work
* Indie hackers shipping solo or in pairs
* Small teams of 1–5 people using GitHub + Slack + Calendar

## 3. Target Tools (MVP)

| Tool | Signal | WorkUnit Kind |
|------|--------|---------------|
| GitHub | PR waiting for review | `review_waiting` |
| GitHub | Issue assigned | `assigned_issue` |
| GitHub | Issue blocked | `blocker` |
| Slack | Mention / request | `missed_response` |
| Calendar | Deadline approaching | `deadline` |

## 4. Detected Work Types

| Kind | Description | Typical Priority |
|------|-------------|-----------------|
| `review_waiting` | Someone is waiting for your review | High / Medium |
| `assigned_issue` | You've been assigned a task | Medium |
| `blocker` | Something is blocking progress | High |
| `missed_response` | You may have missed a Slack message | Medium / High |
| `deadline` | A calendar deadline is approaching | High / Medium |

## 5. Conversion Rules

Signals are transformed into WorkUnits via deterministic rules in
`app/lib/workunitInbox/transform.ts`.

Rules:
* Signal type → WorkUnit kind (fixed mapping)
* `priorityHint` overrides default priority when present
* Blocker defaults to high, deadline to high/medium based on dueAt
* All other types default to medium
* Sort: high → medium → low, then newest first

## 6. Inbox API

`GET /api/workunit/inbox`

* Returns: `{ workUnits: InboxWorkUnit[] }`
* Session required
* Tenant-filtered
* No external API calls
* Mock data only

## 7. UI Requirements

### Inbox View
* Card list — each card shows: title, priority badge, kind label, source, reason, next action
* Loading / error / empty states

### Detail View
* Select card → detail panel with: reason, evidence, provider, sourceUrl, actor, assignee, repo, nextAction, priority
* Visual selection indicator

### Action Field
* Receives selected WorkUnit
* Shows: title, recommended action, placeholder draft text
* "Create Preview" button (placeholder — disabled)

### Feedback Controls
* Useful / Not useful / Later / Done buttons
* Local state only (no persistence)

## 8. Out of Scope

* GitHub OAuth / Slack OAuth / Calendar OAuth
* Real API clients
* Webhooks
* Raw payload validation
* External tool execution
* ActionPreview API integration
* D1 persistence for Inbox
* Billing / pricing
* Multi-tenant live data

## 9. Success Metrics

* User sees normalized WorkUnits from mock signals
* User can browse, select, and inspect WorkUnits
* Selected WorkUnit contextualizes the Action Field
* UI feels responsive and minimal
* All tests pass (transform + API + UI smoke)
* Zero real external API calls
