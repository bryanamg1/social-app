let ioInstance = null;

export const setIO = (io) => {
    ioInstance = io;
};

export const getIO = () => {
     if (!ioInstance) {
    throw new Error("Socket.io no ha sido inicializado todavía");
}
    return ioInstance;
};
