CREATE TABLE IF NOT EXISTS blocked_users (
  block_id INT AUTO_INCREMENT PRIMARY KEY,
  blocker_id INT NOT NULL,
  blocked_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_block_relationship (blocker_id, blocked_id),
  CONSTRAINT fk_blocked_users_blocker
    FOREIGN KEY (blocker_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_blocked_users_blocked
    FOREIGN KEY (blocked_id) REFERENCES users(user_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users (blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users (blocked_id);
