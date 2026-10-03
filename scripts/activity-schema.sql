CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  received_at TEXT NOT NULL,
  event_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  card_id TEXT,
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS activity_events_received_at ON activity_events(received_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS activity_events_session ON activity_events(session_id, received_at DESC);
