import {getDB} from "../config/db.js";
import { insertPost, getPosts,deletePost, getPostById, countposts } from "../service/postsService.js";
import { AppError } from "../utils/utils.js";
import { pagination } from "../utils/pagination.js";

export const addpost = async (req, res, next) => {
    try {
     const postData = req.body;
     const userId = parseInt(req.params.id, 10);

     const {image_url: imageUrlFromBody} = req.body

     let image_url = null;
 // validations

      if (req.file) {
      image_url = req.file.secure_url || req.file.path;
    } else if (imageUrlFromBody) {
      image_url = imageUrlFromBody.trim();
    }

        if (isNaN(userId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.params.id },
        })
      );
    }

    if (!postData || Object.keys(postData).length === 0) {
      return next(
        new AppError({
          code: "POST_DATA_EMPTY",
          message: "No post data provided",
          status: 400,
        })
      );
    }

    if (!postData.content || postData.content.trim() === "") {
      return next(
        new AppError({
          code: "POST_CONTENT_REQUIRED",
          message: "Post content is required",
          status: 400,
        })
      );
    }

    
// insert
    const result = await insertPost(db, postData, userId, image_url);

    res.status(201).json({
      message: "✅ Post added successfully",
      postId: result.insertId,
      image_url
    });


    } catch (error) {
        console.error('Error agregar post:', error);
      return next(
        new AppError({
          code: "POST_CREATE_FAILED",
          message: "Error adding post",
          status: 500,
          details: error?.code || null,
        })
      );
    }
};

export const allpost = async (req, res, next) =>{
try {
const { page, limit, offset } = pagination(req);

  const result = await getPosts(db, limit, offset)
  const total = await countposts(db);

  if (!result || result.length === 0) {
      return next(
        new AppError({
          code: "POSTS_NOT_FOUND",
          message: "⚠️ No se encontraron posts.",
          status: 404,
          details: { page, limit },
        })
      );
    }


    res.status(200).json({
      data: result,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
} catch (error) {
     console.error("❌ Error retrieving posts:", error);

    return next(
      new AppError({
        code: "POSTS_LIST_FAILED",
        message: "Error retrieving posts",
        status: 500,
        details: error?.code || null,
      })
    );
}
};

export const postByUserId = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;
    const userId = parseInt(req.params.id, 10);

    // 🔹 Validación del ID
    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.params.id },
        })
      );
    }

    // 🔹 Consulta al servicio
    const result = await getPosts(db, limit, offset, userId);

    // 🔹 Si no hay resultados
    if (!result || result.length === 0) {
      return next(
        new AppError({
          code: "POSTS_NOT_FOUND",
          message: "⚠️ No se encontraron posts.",
          status: 404,
          details: { page, limit },
        })
      );
    }

    // 🔹 Respuesta exitosa
    res.status(200).json({
      message: "✅ Posts retrieved successfully",
      ...result
    });

  } catch (error) {
    console.error("❌ Error retrieving posts:", error);

    return next(
      new AppError({
        code: "POSTS_LIST_FAILED",
        message: "Error retrieving posts",
        status: 500,
        details: error?.code || null,
      })
    );
  }
};

export const postById = async (req, res, next) => {
  try {
    const post_id = parseInt(req.params.id, 10);


    if (isNaN(post_id)) {
      return next(
        new AppError({
          code: "POST_ID_INVALID",
          message: "Invalid or missing post ID",
          status: 400,
          details: { param: req.params.id },
        })
      );
    }

    const result = await getPostById(db, post_id);

    if (!result) {
  return next(
    new AppError({
      code: "POST_NOT_FOUND",
      message: "⚠️ Post no encontrado.",
      status: 404,
      details: { post_id },
    })
  );
}

    return res.status(200).json({
      message: "✅ Post retrieved successfully",
      post: result,
    });
  } catch (error) {
    console.error("❌ Error retrieving posts:", error);

    return next(
      new AppError({
        code: "POSTS_LIST_FAILED",
        message: "Error retrieving posts",
        status: 500,
        details: error?.code || null,
      })
    );
  }
};

export const deletePostById = async (req, res, next) =>{
  try {
    const postId = parseInt(req.params.id, 10)

    if (isNaN(userId)) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.params.id },
        })
      );
    }

    const result = await deletePost(db, postId)

    if (result.affectedRows === 0) {
  return next(
    new AppError({
      code: "POST_NOT_FOUND",
      message: "❌ Post not found",
      status: 404,
      details: { affectedRows: result.affectedRows },
    })
  );
}

    res.status(200).json({
      message: "✅ Post deleted successfully",
      affectedRows: result.affectedRows,
    });

  } catch (error) {
    console.error("❌ Error retrieving posts:", error);

    return next(
      new AppError({
        code: "POSTS_LIST_FAILED",
        message: "Error retrieving posts",
        status: 500,
        details: error?.code || null,
      })
    );
  }
}

