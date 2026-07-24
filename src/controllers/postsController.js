import { getDB } from "../config/db.js";
import {
  countposts,
  countSavedPosts,
  deletePost,
  getPostById,
  getPosts,
  getSavedPostIds,
  getSavedPosts,
  insertPost,
  savePost,
  setPinnedPost,
  unsavePost,
  updatePost,
} from "../service/postsService.js";
import { AppError } from "../utils/utils.js";
import { getCache, invalidateCache, setCache } from "../cache/cacheHelpers.js";
import { pagination } from "../utils/pagination.js";
import { normalizePostType } from "../utils/postTypes.js";
import { getAuthenticatedUserId, isSameUser } from "../utils/authHelpers.js";

const resolveValidatedPostType = (value) => {
  const rawValue = `${value ?? ""}`.trim();

  if (!rawValue) {
    return null;
  }

  return normalizePostType(rawValue);
};

const invalidatePostCollections = async (postId = null) => {
  await invalidateCache("posts:list:*");
  await invalidateCache("post:detail:*");

  if (postId) {
    await invalidateCache(`post:detail:${postId}`);
  }
};

const ensureAuthenticatedUser = (authUserId) => {
  if (!authUserId) {
    throw new AppError({
      code: "UNAUTHORIZED",
      message: "Usuario no autenticado",
      status: 401,
    });
  }
};

const ensureValidPostId = (rawValue) => {
  const postId = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(postId) || postId <= 0) {
    throw new AppError({
      code: "POST_ID_INVALID",
      message: "Invalid or missing post ID",
      status: 400,
      details: { param: rawValue },
    });
  }

  return postId;
};

const ensurePostOwnership = (post, authUserId, action) => {
  if (!post) {
    throw new AppError({
      code: "POST_NOT_FOUND",
      message: "Post no encontrado",
      status: 404,
    });
  }

  if (!isSameUser(post.user_id, authUserId)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `No tienes permiso para ${action} esta publicacion`,
      status: 403,
      details: {
        authenticatedUserId: authUserId,
        ownerUserId: post.user_id,
        postId: post.post_id ?? null,
      },
    });
  }
};

export const addpost = async (req, res, next) => {
  try {
    const db = await getDB();
    const postData = req.body;
    const authUserId = getAuthenticatedUserId(req);
    const { image_url: imageUrlFromBody } = req.body;
    const normalizedContent = String(postData?.content ?? "").trim();
    const normalizedPostType = normalizePostType(postData?.post_type);

    let image_url = null;

    if (req.file) {
      image_url = req.file.secure_url || req.file.path;
    } else if (imageUrlFromBody) {
      image_url = imageUrlFromBody.trim();
    }

    ensureAuthenticatedUser(authUserId);

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

    await invalidatePostCollections(result.insertId);

    return res.status(201).json({
      message: "Post added successfully",
      postId: result.insertId,
      image_url,
      post_type: normalizedPostType,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError({
        code: "POST_CREATE_FAILED",
        message: "Error adding post",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const allpost = async (req, res, next) => {
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
          message: "No se encontraron posts.",
          status: 404,
          details: { page, limit },
        })
      );
    }

    return res.status(200).json({
      data: result,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(
      new AppError({
        code: "POSTS_LIST_FAILED",
        message: "Error retrieving posts",
        status: 500,
        details: error?.code || error?.message || null,
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

    if (Number.isNaN(userId)) {
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

    if (!result || result.length === 0) {
      return next(
        new AppError({
          code: "POSTS_NOT_FOUND",
          message: "No se encontraron posts.",
          status: 404,
          details: { page, limit },
        })
      );
    }

    return res.status(200).json({
      message: "Posts retrieved successfully",
      data: result,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(
      new AppError({
        code: "POSTS_LIST_FAILED",
        message: "Error retrieving posts",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const postById = async (req, res, next) => {
  try {
    const db = await getDB();
    const postId = ensureValidPostId(req.params.id);
    const cacheKey = `post:detail:${postId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return res.status(200).json(cached);
    }

    const result = await getPostById(db, postId);

    if (!result) {
      return next(
        new AppError({
          code: "POST_NOT_FOUND",
          message: "Post no encontrado.",
          status: 404,
          details: { postId },
        })
      );
    }

    const response = {
      message: "Post retrieved successfully",
      post: result,
    };

    await setCache(cacheKey, 120, response);

    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError({
        code: "POSTS_LIST_FAILED",
        message: "Error retrieving posts",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const updatePostById = async (req, res, next) => {
  try {
    const db = await getDB();
    const authUserId = getAuthenticatedUserId(req);
    const postId = ensureValidPostId(req.params.postId);
    const nextContent = `${req.body?.content ?? ""}`.trim();
    const nextPostType = resolveValidatedPostType(req.body?.post_type);

    ensureAuthenticatedUser(authUserId);

    const post = await getPostById(db, postId);
    ensurePostOwnership(post, authUserId, "editar");

    if (!nextContent) {
      return next(
        new AppError({
          code: "POST_DATA_EMPTY",
          message: "No post data provided",
          status: 400,
        })
      );
    }

    if (req.body?.post_type && !nextPostType) {
      return next(
        new AppError({
          code: "POST_TYPE_INVALID",
          message: "Invalid post type",
          status: 400,
          details: { post_type: req.body?.post_type ?? null },
        })
      );
    }

    const updatedPost = await updatePost(db, {
      postId,
      userId: authUserId,
      content: nextContent,
      postType: nextPostType || post.post_type,
    });

    await invalidatePostCollections(postId);

    return res.status(200).json({
      ok: true,
      message: "Post actualizado correctamente",
      data: updatedPost,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError({
        code: "POST_UPDATE_FAILED",
        message: "No se pudo actualizar la publicacion",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const getSavedPostsController = async (req, res, next) => {
  try {
    const db = await getDB();
    const authUserId = getAuthenticatedUserId(req);
    const { page, limit, offset } = pagination(req);
    const postTypeFilter = resolveValidatedPostType(
      req.query.postType ?? req.query.post_type
    );

    ensureAuthenticatedUser(authUserId);

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

    const [savedPosts, total] = await Promise.all([
      getSavedPosts(db, {
        currentUserId: authUserId,
        limit,
        offset,
        postType: postTypeFilter,
      }),
      countSavedPosts(db, {
        currentUserId: authUserId,
        postType: postTypeFilter,
      }),
    ]);

    if (!savedPosts.length) {
      return next(
        new AppError({
          code: "POSTS_NOT_FOUND",
          message: "No se encontraron posts guardados.",
          status: 404,
          details: { page, limit },
        })
      );
    }

    return res.status(200).json({
      ok: true,
      data: savedPosts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError({
        code: "SAVED_POSTS_LIST_FAILED",
        message: "No se pudieron obtener los posts guardados",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const getSavedPostIdsController = async (req, res, next) => {
  try {
    const db = await getDB();
    const authUserId = getAuthenticatedUserId(req);

    ensureAuthenticatedUser(authUserId);

    const savedPostIds = await getSavedPostIds(db, authUserId);

    return res.status(200).json({
      ok: true,
      data: savedPostIds,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError({
        code: "SAVED_POST_IDS_FAILED",
        message: "No se pudo obtener el estado de guardados",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const savePostById = async (req, res, next) => {
  try {
    const db = await getDB();
    const authUserId = getAuthenticatedUserId(req);
    const postId = ensureValidPostId(req.params.postId);

    ensureAuthenticatedUser(authUserId);

    const post = await getPostById(db, postId);

    if (!post) {
      return next(
        new AppError({
          code: "POST_NOT_FOUND",
          message: "Post no encontrado",
          status: 404,
          details: { postId },
        })
      );
    }

    const savedPostIds = await savePost(db, {
      currentUserId: authUserId,
      postId,
    });

    return res.status(201).json({
      ok: true,
      message: "Post guardado correctamente",
      data: {
        savedPostIds,
        postId,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError({
        code: "SAVE_POST_FAILED",
        message: "No se pudo guardar el post",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const removeSavedPostById = async (req, res, next) => {
  try {
    const db = await getDB();
    const authUserId = getAuthenticatedUserId(req);
    const postId = ensureValidPostId(req.params.postId);

    ensureAuthenticatedUser(authUserId);

    const result = await unsavePost(db, {
      currentUserId: authUserId,
      postId,
    });

    if (!result?.affectedRows) {
      return next(
        new AppError({
          code: "SAVED_POST_NOT_FOUND",
          message: "El post no estaba guardado",
          status: 404,
          details: { postId },
        })
      );
    }

    return res.status(200).json({
      ok: true,
      message: "Post removido de guardados",
      data: {
        postId,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError({
        code: "UNSAVE_POST_FAILED",
        message: "No se pudo remover el post de guardados",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const pinPostById = async (req, res, next) => {
  try {
    const db = await getDB();
    const authUserId = getAuthenticatedUserId(req);
    const postId = ensureValidPostId(req.params.postId);

    ensureAuthenticatedUser(authUserId);

    const post = await getPostById(db, postId);
    ensurePostOwnership(post, authUserId, "fijar");

    const explicitPinned = req.body?.pinned;
    const pinned =
      typeof explicitPinned === "boolean"
        ? explicitPinned
        : !Boolean(Number(post.is_pinned));

    const updatedPost = await setPinnedPost(db, {
      currentUserId: authUserId,
      postId,
      pinned,
    });

    await invalidatePostCollections(postId);

    return res.status(200).json({
      ok: true,
      message: pinned ? "Post fijado correctamente" : "Post desfijado correctamente",
      data: updatedPost,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError({
        code: "PIN_POST_FAILED",
        message: "No se pudo actualizar el estado fijado del post",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};

export const deletePostById = async (req, res, next) => {
  try {
    const db = await getDB();
    const postId = ensureValidPostId(req.params.id);
    const authUserId = getAuthenticatedUserId(req);

    ensureAuthenticatedUser(authUserId);

    const post = await getPostById(db, postId);
    ensurePostOwnership(post, authUserId, "eliminar");

    const result = await deletePost(db, postId);

    if (result.affectedRows === 0) {
      return next(
        new AppError({
          code: "POST_NOT_FOUND",
          message: "Post not found",
          status: 404,
          details: { postId },
        })
      );
    }

    await invalidatePostCollections(postId);

    return res.status(200).json({
      message: "Post deleted successfully",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError({
        code: "POST_DELETE_FAILED",
        message: "Error deleting post",
        status: 500,
        details: error?.code || error?.message || null,
      })
    );
  }
};
