CREATE TABLE IF NOT EXISTS user_privacy_settings (
  privacy_setting_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  profile_visibility ENUM('public', 'followers') NOT NULL DEFAULT 'public',
  direct_message_permission ENUM('everyone', 'followers') NOT NULL DEFAULT 'everyone',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_privacy_settings_user (user_id),
  CONSTRAINT fk_user_privacy_settings_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
);
