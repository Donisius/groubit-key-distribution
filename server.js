const express = require('express');
const path = require('path')
const app = express();
const http = require('http');
const server = http.createServer(app);
const socketio =  require('socket.io')
const io = new socketio(server);

let users = {};

app.use('/', express.static(path.join(__dirname, 'client')))

io.on('connection', (socket) => {
    console.log(`New connection formed from ${socket.id}`);
    socket.emit('connected');

    socket.on('login', (data) => {
        users[data.username] = socket.id;
        console.log(`New user registered: ${data.username}`);
        io.emit('users_updated', { users: Object.keys(users) });
    });

    socket.on('message', ({ from, recipient, message }) => {
        const recipientId = users[recipient];
        io.to(recipientId).emit('receive_message', { from, message });
    });

    // Groubit 'channel'
    socket.on('groubits', ({ from, recipient, groubits }) => {
        const recipientId = users[recipient];
        io.to(recipientId).emit('recieve_groubits', { from, groubits });
    });

    socket.on('verify_bases', ({ from, recipient, bases }) => {
        const recipientId = users[recipient];
        io.to(recipientId).emit('recieve_bases', { from, bases });
    });

    socket.on('classified_bases', ({ from, recipient, classifiedBases }) =>{
        const recipientId = users[recipient];
        io.to(recipientId).emit('recieve_classified_bases', { from, classifiedBases });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected ${socket.id}`);
        delete users[Object.keys(users).find(key => users[key] === socket.id)];
        io.emit('users_updated', { users: Object.keys(users) });
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
