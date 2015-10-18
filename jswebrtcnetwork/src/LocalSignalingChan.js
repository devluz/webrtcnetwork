/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */


/**
 * Constructor/Class for creating a local signaling channel
 * (acts as a server at the same time)
 * 
 * 
 * - Open will open a new room or return a closed message if the room is already open
 * - Connect will join a room or return a closed message
 * - Incomming events are:
 *          * Connected if either opening or connecting to a room was successful
 *          * Closed if connecting or opening failed or the network connection closed
 *          * UserMessage if a message was received. This is suppose to be handled by a different system
 *
 * They are suppose to work like a forum. you can either open a post and wait for responses 
 * or you respond to other peoples post thus in theory the signaling channel could
 * build on top of a forum or chat system, or even email tracking a subject as room name
 * 
 * 
 * Security is up to the underlaying system of the signaling channel. It can
 * ensure nothing and just use a room name to find each other in a big public
 * chat or it filters for only messages with the correct room name + assignes
 * ID's to the user that opens a room and the user that joins it to only allow
 * point to point connections (most save)
 * 
 * The LocalSignalingChan provices only some security by enforcing
 * that only one person can open a room but it relays messages to everyone
 * connected thus others could interfere
 * 
 * 
 * 
 */
function LocalSignalingChan()
{
    var mRoomName = null;
    var mHandler = null;
    var mIsRoomOwner = false;
    var mRunning = false;
    
    
    this.Open = function(lName, lHandler)
    {
        if(lName in LocalSignalingChan.sRooms)
        {
            //room name already in use
            //TODO: Send error via OnSignalingMessage
            //or check first if the object is still active?
            lHandler(SignalingMessageType.Closed, null);
        }else
        {
            mIsRoomOwner = true;
            mRoomName = lName;
            mHandler = lHandler;
            LocalSignalingChan.sRooms[lName] = [this];
            mRunning = true;
            mHandler(SignalingMessageType.Connected, null);
        }
    };
    
    
    this.Connect = function(lName, lHandler)
    {
        if(lName in LocalSignalingChan.sRooms)
        {
            mIsRoomOwner = false;
            mRoomName = lName;
            mHandler = lHandler;
            LocalSignalingChan.sRooms[lName].push(this);
            mRunning = true;
            mHandler(SignalingMessageType.Connected, null);
        }else
        {
            //TODO: send out error here. room is missing
            lHandler(SignalingMessageType.Closed, null);
        }
    };
    
    this.Close = function()
    {
        if(mRunning == false)
            return;
        if(mIsRoomOwner)
        {
            //close all except the own one to avoid stack overflow
            var lChannels = LocalSignalingChan.sRooms[mRoomName];
            for(var index = 0; index < lChannels.length; index++)
            {
                if(lChannels[index] != this)
                {
                    lChannels[index].Close();
                }
            }
            
            //delete the whole room
            delete LocalSignalingChan.sRooms[mRoomName];
            //disconnect all
        }else
        {
            var lChannels = LocalSignalingChan.sRooms[mRoomName];
            for(var index = 0; index < lChannels.length; index++)
            {
                if(lChannels[index] == this)
                {
                    lChannels.splice(index, 1);
                }
            }
        }
        
        mRunning = false;
        mHandler(SignalingMessageType.Closed, null);
    };
    
    this.RecMessage = function(lMessage)
    {
        mHandler(SignalingMessageType.UserMessage, lMessage);
    };
    
    //public method. Sends a message to all others connected to this room
    this.SendMessage = function(lMessage)
    {
        //iterate over all local signal channels using the same room name
        //also itself and relay the message
        var lChannels = LocalSignalingChan.sRooms[mRoomName];
        for(var index = 0; index < lChannels.length; index++)
        {
            //lChannels[index].mHandler(lMessage);
            lChannels[index].RecMessage(lMessage);
        }
    };
}
LocalSignalingChan.sRooms = {};