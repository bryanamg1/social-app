CREATE TABLE IF NOT EXISTS content_reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_user_id INT NOT NULL,
  target_type ENUM('user', 'post', 'comment') NOT NULL,
  target_id INT NOT NULL,
  reason_code ENUM(
    'spam',
    'harassment',
    'hate',
    'impersonation',
    'misinformation',
    'other'
  ) NOT NULL,
  details TEXT NULL,
  status ENUM('pending', 'reviewed', 'dismissed', 'actioned') NOT NULL DEFAULT 'pending',
  reviewed_by_user_id INT NULL,
  resolution_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_content_reports_reporter
    FOREIGN KEY (reporter_user_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_content_reports_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(user_id)
    ON DELETE SET NULL
);

CREATE INDEX idx_content_reports_status ON content_reports (status, created_at);
CREATE INDEX idx_content_reports_target ON content_reports (target_type, target_id);
CREATE INDEX idx_content_reports_reporter ON content_reports (reporter_user_id, created_at);
