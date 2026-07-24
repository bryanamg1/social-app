CREATE TABLE IF NOT EXISTS pinned_posts (
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    KEY idx_pinned_posts_post_id (post_id),
    KEY idx_pinned_posts_created_at (created_at),
    CONSTRAINT fk_pinned_posts_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_pinned_posts_post
        FOREIGN KEY (post_id) REFERENCES posts(post_id)
        ON DELETE CASCADE
);
