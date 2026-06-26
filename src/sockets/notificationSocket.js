import {
  authenticateSocket,
  getSocketUserId,
} from "./socketAuth.js";

export const notificationSocket = (io) => {
  const nsp = io.of("/notifications");

  nsp.use(authenticateSocket);

  nsp.on("connection", (socket) => {
    console.log("Usuario conectado a /notifications");

    socket.on("subscribe", (payload) => {
      const authenticatedUserId = getSocketUserId(socket);
      const requestedUserId = Number(payload?.userId ?? payload);

      if (Number.isNaN(authenticatedUserId)) {
        return socket.emit("notification:error", {
          code: "NOTIFICATIONS_SUBSCRIBE_UNAUTHORIZED",
          message: "Usuario autenticado invalido",
        });
      }

      if (
        !Number.isNaN(requestedUserId) &&
        requestedUserId !== authenticatedUserId
      ) {
        return socket.emit("notification:error", {
          code: "NOTIFICATIONS_SUBSCRIBE_FORBIDDEN",
          message: "No puedes suscribirte a otra sala",
        });
      }

      const room = `user_${authenticatedUserId}`;

      socket.join(room);
      socket.emit("notification:subscribed", {
        ok: true,
        room,
        userId: authenticatedUserId,
      });
    });

    socket.on("disconnect", () => {
      console.log("Usuario desconectado de /notifications");
    });
  });
};
