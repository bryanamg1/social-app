import db from "../config/db.js";

export const toggleReactionPost = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = parseInt(req.params.userId, 10);
    const postId = parseInt(req.params.postId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    if (isNaN(postId)) {
      return res.status(400).json({ error: "Invalid or missing post ID" });
    }

    if (!status) {
      return res.status(400).json({ error: "status requerido" });
    }

    if (!['LIKE', 'DISLIKE', 'LOVE', 'HAHA', 'WOW', 'SAD'].includes(status)) {
      return res.status(400).json({
        error: 'status debe ser LIKE, DISLIKE, LOVE, HAHA, WOW o SAD'
      });
    }

    // Buscar reacción existente
    const [existing] = await db.query(
      'SELECT reaction_type FROM post_reactions WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    // Si ya existe una reacción del usuario
    if (existing.length > 0) {
      const currentReaction = existing[0].reaction_type;

      // Si la nueva reacción es igual → eliminar
      if (currentReaction === status) {
        await db.query(
          'DELETE FROM post_reactions WHERE user_id = ? AND post_id = ?',
          [userId, postId]
        );
        return res.json({ message: `Reacción eliminada (${status})` });
      }

      // Si es distinta → actualizar
      await db.query(
        'UPDATE post_reactions SET reaction_type = ? WHERE user_id = ? AND post_id = ?',
        [status, userId, postId]
      );
      return res.json({ message: `Reacción actualizada a ${status}` });
    }

    // Si no existe → crear nueva
    await db.query(
      'INSERT INTO post_reactions (user_id, post_id, reaction_type) VALUES (?, ?, ?)',
      [userId, postId, status]
    );

    return res.json({ message: `Reacción registrada: ${status}` });

  } catch (error) {
    console.error('Error al manejar la reacción:', error);
    res.status(500).json({ error: 'Error al manejar la reacción' });
  }
};


export const getReactionsByPost = async (req, res) => {
  try {
    const  postId  = parseInt(req.params.postId, 10);

    if (isNaN(postId)) {
     return res.status(400).json({ error: "Invalid or missing post ID" });
    };

    const [results] = await db.query(
      'SELECT reaction_type, COUNT(*) AS count FROM post_reactions WHERE post_id = ? GROUP BY reaction_type',
      [postId]
    );

    if (results.length === 0) {
  return res.status(400).json({
    message: "No se encontraron reacciones para el post ID",
    postId
    });
    };

    res.json(results);

  } catch (error) {
    console.error('Error al obtener reacciones:', error);
    res.status(500).json({ error: 'Error al obtener reacciones' });
  }
};

export const toggleReactionComment = async (req, res) =>{
    try {
        const {status} = req.body
        const userId = parseInt(req.params.userId, 10)
        const commentId = parseInt(req.params.commentId, 10)

        if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid or missing user ID" });
    }

        if (isNaN(commentId)) {
      return res.status(400).json({ error: "Invalid or missing comment ID" });
    }

    if (!status) {
      return res.status(400).json({ error: "status requerido" });
    }

    if (!['LIKE', 'DISLIKE', 'LOVE', 'HAHA', 'WOW', 'SAD'].includes(status)) {
      return res.status(400).json({
        error: 'status debe ser LIKE, DISLIKE, LOVE, HAHA, WOW o SAD'
      });
    }

    // Buscar reacción existente
    const [existing] = await db.query(
      'SELECT reaction_type FROM comment_reactions WHERE user_id = ? AND comment_id = ?',
      [userId, commentId]
    );

        // Si ya existe una reacción del usuario
    if (existing.length > 0) {
      const currentReaction = existing[0].reaction_type;

      // Si la nueva reacción es igual → eliminar
      if (currentReaction === status) {
        await db.query(
          'DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?',
          [userId, commentId]
        );
        return res.json({ message: `Reacción eliminada (${status})` });
      }

      // Si es distinta → actualizar
      await db.query(
        'UPDATE comment_reactions SET reaction_type = ?  WHERE user_id = ? AND comment_id = ?',
        [status, userId, commentId]
      );
      return res.json({ message: `Reacción actualizada a ${status}` });
    }

    // Si no existe → crear nueva
    await db.query(
      'INSERT INTO comment_reactions (user_id, comment_id, reaction_type) VALUES (?, ?, ?)',
      [userId, commentId, status]
    );

    return res.json({ message: `Reacción registrada: ${status}` });

    } catch (error) {
        console.error('Error al manejar la reacción:', error);
        res.status(500).json({ error: 'Error al manejar la reacción' });
    }
}


export const getReactionsByComment = async (req, res) => {
  try {
    const  commentId  = parseInt(req.params.commentId, 10);

    if (isNaN(commentId)) {
     return res.status(400).json({ error: "Invalid or missing post ID" });
    };

    const [results] = await db.query(
      'SELECT reaction_type, COUNT(*) AS count FROM comment_reactions WHERE comment_id = ? GROUP BY reaction_type',
      [commentId]
    );

    if (results.length === 0) {
  return res.status(400).json({
    message: "No se encontraron reacciones para el post ID",
    commentId
    });
    };

    res.json(results);

  } catch (error) {
    console.error('Error al obtener reacciones:', error);
    res.status(500).json({ error: 'Error al obtener reacciones' });
  }
};