export const searchUser = async (db, query) => {
    try {
        const sql = `
            SELECT user_id, user_name, email, avatar_url
            FROM users
            WHERE 
                user_name LIKE ? 
                OR email LIKE ?
                OR bio LIKE ?
            LIMIT 20
        `;

        const wildcard = `%${query}%`;

        const [rows] = await db.query(sql, [wildcard, wildcard, wildcard]);

        return rows;

    } catch (error) {
        console.error("❌ Error en búsqueda:", error);
        throw error;
    }
};