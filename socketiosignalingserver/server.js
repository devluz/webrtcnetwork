/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
 
 var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//just for debugging purposes
var connectionCount = 0;

//here we keep track of the rooms
var rooms = {};

//to allow cross domains / e.g. connects from a unity game hosted on any domain
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  return next();
});

//public folder contains a chat based ok the socket io example to test this script
//uncomment to test
//app.use(express.static('public'));

//wait for connections via socket.io
io.on('connection', function(socket) {
    
    console.log('a user connected');
    connectionCount++;
    
    var lRoomName = null;
    var lRoomOwner = false;
    

    //event to open a new room and add the user
	//user will get disconnected immediately if there isn't a room available (part of the definition of SignalingChan)
    socket.on('open room', function(msg) {
        //room name still free? 
        if((msg in rooms) == false)
        {
            //open the room
            rooms[msg] = [socket]; //room owner is always index 0
            lRoomName = msg;
            lRoomOwner = true;
            
            console.log('room opened: ' + msg);
            socket.emit('room opened', msg);
        }
        else
        {
            //disconnect the user if it failed
            socket.disconnect();
        }
    });
    
	//join event. either joins an existing room. if there is none -> disconnect
    socket.on('join room', function(msg) {
        //does the room exist?
        if(msg in rooms)
        {
            //join the room
            rooms[msg].push(socket);
            lRoomName = msg;
            lRoomOwner = false;
            
            console.log('joined room: ' + msg);
            socket.emit('room joined', msg);
        }
        else
        {
            //disconnect the user if it failed
            socket.disconnect();
        }
    });
    
	//msg sends a message to everyone in the room
    socket.on('msg', function(msg) {
        
		if(lRoomName != null) //check if user is actually in a room
		{
			var socketsInRoom = rooms[lRoomName];
			for(var index = 0; index < socketsInRoom.length; index++)
			{
				socketsInRoom[index].emit('msg', msg);
			}
		}
    });
    
	//disconnect evet
    socket.on('disconnect', function() {
        
        if(lRoomOwner)
        {
            console.log('TODO: disconnect every socket in the room and then remove the room');
            var socketsInRoom = rooms[lRoomName];
            delete rooms[lRoomName];
            
            for(var index = 1; index < socketsInRoom.length; index++)
            {
                socketsInRoom[index].disconnect();
            }
            
        }else{
            console.log('remove own socket from room list');
            
            //room still exists or was closed?
            if(lRoomName != null && lRoomName in rooms)
            {
                //remove the element
                var index = rooms[lRoomName].indexOf(socket);
                if(index != -1)
                {
                    rooms[lRoomName].splice(index, 1);
                }
            }
        }
        console.log('user disconnected');
        connectionCount--;
    });
});

//process.env.PORT will be replaced with a pipe by azure
var port = process.env.PORT || 3000;

http.listen(port, function(){
    
    console.log('listening on *:' + port);
    
});

