const dgram = require('dgram');
const {convertSymbolMessage, formatSymbol} = require('./utils');
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(httpServer);

const PORT = 41234;

const server = dgram.createSocket('udp4');

const abaliableSymbols = [];


server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

// messages from mt4
server.on('message', (msg, rinfo) => {
    const message  = msg.toString();

    // when new tick arrives
    if (message.includes('OnTick')) {
        const [fn, data] = message.split('>>');

        // convert to tick object
        const symbol = convertSymbolMessage(data);
        const formatedSymbols = formatSymbol(symbol);

        io.to(formatedSymbols.symbol).emit('onTick', formatedSymbols);
    }

    // when expert adviser attached to chart
    if (message.includes('OnSubscribe')) {
        const [fn, data] = message.split('>>');
        const index = abaliableSymbols.indexOf(data);

        if (index === -1) {
            abaliableSymbols.push(data);
            console.log('MT4 subscribed to:', data);
            io.emit('onSymbols', abaliableSymbols);
        }
       
    }

    // when expert adviser removed from chart
    if (message.includes('OnUnsubscribe')) {
        const [fn, data] = message.split('>>');
        const index = abaliableSymbols.indexOf(data);

        if (index !== -1) {
            abaliableSymbols.splice(index, 1);
            console.log('MT4 unsubscribed from:', data);
            io.emit('onSymbols', abaliableSymbols);
        }
    }
    
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

// express server to serve html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


// when new user connects to the socket
io.on('connection', (socket) => {
    // unsubscrive from all on disconnect
    socket.on('disconnect', () => {
        socket.rooms.forEach(room => {
            socket.leave(room);
        });
    });

    // send all available symbols
    socket.emit('onSymbols', abaliableSymbols);

    // subscribe to symbol if not subscribed
    socket.on('subscribe', (symbol) => {
       socket.join(symbol);
    });

    // unsubscribe to symbol if subscribed
    socket.on('unsubscribe', (symbol) => {
        socket.leave(symbol);
    });
});



httpServer.listen(3000, () => {
  console.log('listening on *:3000');
});

// dgram server
server.bind(PORT);
