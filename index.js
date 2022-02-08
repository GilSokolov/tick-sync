const dgram = require('dgram');
const {convertSymbolMessage, formatSymbol} = require('./utils');
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.createServer(app);
const { Server } = require("socket.io");
const EventEmitter = require('events');
const io = new Server(httpServer);

const PORT = 41234;

const server = dgram.createSocket('udp4');

const abaliableSymbols = [];

const subscribers = new EventEmitter();


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

        subscribers.emit(formatedSymbols.symbol, formatedSymbols);
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
    const callbacks = {}; 

    const unsubscribe = (symbol) => {
        subscribers.removeListener(symbol, callbacks[symbol]);
        delete callbacks[symbol];
    }

    // unsubscrive from all on disconnect
    socket.on('disconnect', () => {
        Object.keys(callbacks).forEach(symbol => unsubscribe(symbol));
    });

    // send all available symbols
    socket.emit('onSymbols', abaliableSymbols);

    // subscribe to symbol if not subscribed
    socket.on('subscribe', (symbol) => {
        if (!callbacks[symbol]) {
            callbacks[symbol] = (data) => {
                socket.emit('onTick', data)
            }
            
            subscribers.on(symbol, callbacks[symbol]);
        }
    });

    // unsubscribe to symbol if subscribed
    socket.on('unsubscribe', (symbol) => {
        if (callbacks[symbol]) {
            unsubscribe(symbol);
        }
    });


});

httpServer.listen(3000, () => {
  console.log('listening on *:3000');
});

// dgram server
server.bind(PORT);