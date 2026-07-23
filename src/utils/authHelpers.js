export const getAuthenticatedUserId = (req) => {
  const userId = Number(req.user?.user_id ?? req.user?.id ?? req.user?.user?.id);

  return Number.isInteger(userId) && userId > 0 ? userId : null;
};

export const getRouteUserId = (value) => {
  const userId = Number.parseInt(value, 10);

  return Number.isInteger(userId) && userId > 0 ? userId : null;
};

export const isSameUser = (leftUserId, rightUserId) => {
  return Number(leftUserId) === Number(rightUserId);
};
