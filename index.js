//server side for chat
var express=require('express');
var app=express();
var socket = require('socket.io');
app.use(express.static('public'));
var server = app.listen(8080);
var queue = {};    // list of sockets waiting for peers
var rooms = {};    // map socket.id => room
var names = {};    // map socket.id => name
var allUsers = {}; // map socket.id => socket
var io = socket(server);

console.log('on server');
function findPeerForLoneSocket(socket) {
    
	if (queue.id!=undefined && names[queue.id]!=undefined) {
        // somebody is in queue, pair them!
		var peer = queue;
        var room = socket.id + '#' + peer.id;
        // join them both
        peer.join(room);
        socket.join(room);
        // register rooms to their names
        rooms[peer.id] = room;
        rooms[socket.id] = room;
        // exchange names between the two of them and start the chat
        peer.emit('chat start', {'name': names[socket.id], 'room':room});
        socket.emit('chat start', {'name': names[peer.id], 'room':room});
		console.log('room is '+room+' between '+names[socket.id]+' and '+names[peer.id]);
		queue={};
    } else {
        // queue is empty, add our lone socket
		if(socket){
			queue=socket;
			console.log(queue.id+' loner user');
		}	
    }
	
}

io.on('connection', function (socket) {
	
    console.log('User '+socket.id+' connected');
	
    socket.on('login', function (data) {
        names[socket.id] = data.name;
        allUsers[socket.id] = socket;
        // now check if sb is in queue
		console.log('user '+data.name);
        findPeerForLoneSocket(socket);
    });
	
    socket.on('sendMessage', function (data) {
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit('sendMessage', data);
    });

	socket.on('typing', function (data) {   
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit('typing',data);
    });
	
	socket.on('nottyping', function () {   
        var room = rooms[socket.id];
        socket.broadcast.to(room).emit('nottyping');
	});	
	
	socket.on('disconnect', function () {
		var room = rooms[socket.id];
		console.log('roomwas: '+room);
		console.log('userdisconnected: '+names[socket.id]);
		delete names[socket.id];
		delete allUsers[socket.id];
		if(room){
			socket.broadcast.to(room).emit('chat end');
			var peerID = room.split('#');
			peerID = peerID[0] === socket.id ? peerID[1] : peerID[0];
			// current socket left, add the other one to the queue
			findPeerForLoneSocket(allUsers[peerID]);
			
		}	
		console.log('users left: '+JSON.stringify(names));
    });
	
	
});