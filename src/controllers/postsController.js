import {getDB} from "../config/db.js";
import { insertPost, getPosts,deletePost, getPostById, countposts } from "../service/postsService.js";
import { AppError } from "../utils/utils.js";
import { getCache, setCache, invalidateCache } from "../cache/cacheHelpers.js";
import { pagination } from "../utils/pagination.js";
import { normalizePostType } from "../utils/postTypes.js";
import { getAuthenticatedUserId, getRouteUserId, isSameUser } from "../utils/authHelpers.js";

const resolveValidatedPostType = (value) => {
  const rawValue = `${value ?? ""}`.trim();

  if (!rawValue) {
    return null;
  }

  return normalizePostType(rawValue);
};

export const addpost = async (req, res, next) => {
    try {
      const db = await getDB();
     const postData = req.body;
     const authUserId = getAuthenticatedUserId(req);
     const routeUserParam = req.params.id ?? null;
     const routeUserId = routeUserParam ? getRouteUserId(routeUserParam) : authUserId;
     const {image_url: imageUrlFromBody} = req.body;
     const normalizedContent = String(postData?.content ?? "").trim();
     const normalizedPostType =
      normalizePostType(postData?.post_type);

     let image_url = null;
 // validations

      if (req.file) {
      image_url = req.file.secure_url || req.file.path;
    } else if (imageUrlFromBody) {
      image_url = imageUrlFromBody.trim();
    }

        if (!authUserId) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

        if (routeUserParam && !routeUserId) {
      return next(
        new AppError({
          code: "USER_ID_INVALID",
          message: "Invalid or missing user ID",
          status: 400,
          details: { param: req.params.id },
        })
      );
    }

    if (!isSameUser(authUserId, routeUserId)) {
      return next(
        new AppError({
          code: "FORBIDDEN",
          message: "No tienes permiso para crear publicaciones para otro usuario",
          status: 403,
          details: { authenticatedUserId: authUserId, routeUserId },
        })
      );
    }

    if (!normalizedContent && !image_url) {
      return next(
        new AppError({
          code: "POST_DATA_EMPTY",
          message: "No post data provided",
          status: 400,
        })
      );
    }

    if (!normalizedPostType) {
      return next(
        new AppError({
          code: "POST_TYPE_INVALID",
          message: "Invalid post type",
          status: 400,
          details: { post_type: postData?.post_type ?? null },
        })
      );
    }

    
// insert
    const result = await insertPost(
      db,
      {
        ...postData,
        content: normalizedContent,
        post_type: normalizedPostType,
      },
      authUserId,
      image_url
    );

    await invalidateCache("posts:list:*");

    await invalidateCache("post:detail:*");

    res.status(201).json({
      message: "✅ Post added successfully",
      postId: result.insertId,
      image_url,
      post_type: normalizedPostType,
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
  const db = await getDB();
const { page, limit, offset } = pagination(req);
const postTypeFilter = resolveValidatedPostType(
  req.query.postType ?? req.query.post_type
);

  if ((req.query.postType || req.query.post_type) && !postTypeFilter) {
    return next(
      new AppError({
        code: "POST_TYPE_INVALID",
        message: "Invalid post type",
        status: 400,
        details: { postType: req.query.postType ?? req.query.post_type },
      })
    );
  }

  const result = await getPosts(db, {
    limit,
    offset,
    postType: postTypeFilter,
  });
  const total = await countposts(db, {
    postType: postTypeFilter,
  });

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
    const db = await getDB();
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;
    const userId = parseInt(req.params.id, 10);
    const postTypeFilter = resolveValidatedPostType(
      req.query.postType ?? req.query.post_type
    );

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

    if ((req.query.postType || req.query.post_type) && !postTypeFilter) {
      return next(
        new AppError({
          code: "POST_TYPE_INVALID",
          message: "Invalid post type",
          status: 400,
          details: { postType: req.query.postType ?? req.query.post_type },
        })
      );
    }

    // 🔹 Consulta al servicio
    const result = await getPosts(db, {
      limit,
      offset,
      userId,
      postType: postTypeFilter,
    });
    const total = await countposts(db, {
      userId,
      postType: postTypeFilter,
    });

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

export const postById = async (req, res, next) => {
  try {
    const db = await getDB();
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

    const cacheKey = `post:detail:${post_id}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
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

const response = {
      message: "✅ Post retrieved successfully",
      post: result,
}

await setCache(cacheKey, 120, response)

    return res.status(200).json(response);

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

export const deletePostById = async (req, res, next) => {
  try {
    const db = await getDB();
    const postId = parseInt(req.params.id, 10)
    const authUserId = getAuthenticatedUserId(req);

    if (!authUserId) {
      return next(
        new AppError({
          code: "UNAUTHORIZED",
          message: "Usuario no autenticado",
          status: 401,
        })
      );
    }

    if (isNaN(postId)) {
      return next(
        new AppError({
          code: "POST_ID_INVALID",
          message: "Invalid or missing post ID",
          status: 400,
          details: { param: req.params.id },
        })
      );
    }

    const post = await getPostById(db, postId);

    if (!post) {
      return next(
        new AppError({
          code: "POST_NOT_FOUND",
          message: "❌ Post not found",
          status: 404,
          details: { postId },
        })
      );
    }

    if (!isSameUser(post.user_id, authUserId)) {
      return next(
        new AppError({
          code: "FORBIDDEN",
          message: "No tienes permiso para eliminar esta publicacion",
          status: 403,
          details: { authenticatedUserId: authUserId, ownerUserId: post.user_id, postId },
        })
      );
    }

    const result = await deletePost(db, postId);

    if (result.affectedRows === 0) {
      return next(
        new AppError({
          code: "POST_NOT_FOUND",
          message: "❌ Post not found",
          status: 404,
          details: { postId },
        })
      );
    }

    await invalidateCache("posts:list:*");
    await invalidateCache(`post:detail:${postId}`);

    return res.status(200).json({
      message: "✅ Post deleted successfully",
      affectedRows: result.affectedRows,
    });

  } catch (error) {
    console.error("❌ Error deleting post:", error);

    return next(
      new AppError({
        code: "POST_DELETE_FAILED",
        message: "Error deleting post",
        status: 500,
        details: error?.code || null,
      })
    );
  }
};

