ALTER TABLE messages
  ADD COLUMN read_at DATETIME NULL AFTER modified_at,
  ADD COLUMN read_by_user_id INT NULL AFTER read_at;

CREATE INDEX idx_messages_conversation_read_at
  ON messages (conversation_id, read_at);

CREATE INDEX idx_messages_read_by_user
  ON messages (read_by_user_id);
