CREATE TABLE IF NOT EXISTS user_projects (
  project_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  summary TEXT NULL,
  technologies TEXT NULL,
  repo_url VARCHAR(255) NULL,
  demo_url VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'in_progress',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id),
  KEY idx_user_projects_user_id (user_id),
  KEY idx_user_projects_updated_at (updated_at),
  CONSTRAINT fk_user_projects_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
