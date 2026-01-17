const net = require('net');
const server = net.createServer();

server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('PORT_IN_USE');
    } else {
        console.log('ERROR:' + err.message);
    }
    process.exit(1);
});

server.once('listening', () => {
    console.log('PORT_FREE');
    server.close();
    process.exit(0);
});

server.listen(3000);
