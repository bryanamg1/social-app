export const notificationSocket = (io) => {
    const nsp = io.of('/notifications');
    nsp.on('connection', socket =>{
        console.log('✅ Usuario conectado');
        
        socket.on('subscribe', userId =>{
            socket.join(`user_${userId}`);
            console.log(`usuario subscrito a la sala user_${userId}`);
            
        });

        socket.on('disconnect',() =>{
            console.log(`❌ Usuario desconectado`);
            
        })
    });
};