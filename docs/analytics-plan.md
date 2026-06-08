# Analytics Plan

## Overview
Phase 1 adds a local, append-only analytics pipeline for the broad product funnel. Events are captured client-side and sent to `POST /api/analytics`, then appended to `data/analytics/events.jsonl`.

Phase 1 is intentionally lightweight:
- local JSONL storage
- anonymous session tracking
- no vendor integration
- no dashboard yet

## Goals
- understand Ask usage and answer quality
- measure card-detail and apply click-through
- observe recommendation and finder usage
- capture feedback in the same analytics stream

## Phase 1 Event Taxonomy

### Core events
- `ask_query_submitted`
- `ask_result_rendered`
- `card_detail_viewed`
- `compare_viewed`
- `recommendation_generated`
- `feedback_submitted`
- `apply_clicked`
- `details_clicked`
- `filter_used`

### Shared payload
- `event_name`
- `timestamp` (stored server-side as `received_at`)
- `session_id`
- `page`
- `source`
- optional `query`
- optional `card_id`
- optional `card_ids`
- `device_type`
- optional `referrer`
- optional `metadata`

### Ask metadata
- `intent`
- `confidence`
- `result_count`
- `top_card_id`
- `needs_database_update`
- `display_mode`

### Recommendation metadata
- `max_annual_fee`
- `wants_lounge`
- `wants_lifetime_free`
- spend summary by category
- `top_3_card_ids`

### Card detail metadata
- `issuer`
- `verified_by_user`
- `apply_url_present`
- `image_present`

### Feedback metadata
- `feedback`
- `has_comment`
- `feedback_source`

## Storage and Ingestion
- endpoint: `POST /api/analytics`
- log file: `data/analytics/events.jsonl`
- append-only writes
- one JSON object per line
- no read API in phase 1

## Privacy and Data Minimization
- no authenticated user ids
- no IP-based tracking
- anonymous browser session id via `localStorage`
- keep payloads scoped to product analytics fields only

## Rollout Order
1. shared analytics contract
2. analytics API route and JSONL writer
3. client tracking helper
4. Ask, Finder, Compare, Recommend, card-detail, and feedback instrumentation
5. tests and local verification

## Out of Scope
- dashboards
- vendor analytics
- historical backfill
- advanced deduplication
- cookie consent flows
- search analytics for surfaces that do not have search
