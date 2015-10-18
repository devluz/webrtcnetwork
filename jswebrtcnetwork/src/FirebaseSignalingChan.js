/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
/**Allows the use of a Firebase account as signaling channel.
 * 
 * @param {type} lUrl your firebase account URL e.g. https://incandescent-inferno-5269.firebaseio.com/webrtcnetwork0_9/
 * 
 */
function FirebaseSignalingChan(lUrl)
{
    var mHandler;
    
    var mIsRoomOwner = false;
    var mConnecting = false;
    var mRunning = false;
    
    var mTimeout = 10000;
    var mConnectTimeoutId = null;
    var mCleanupTimer = null;
    var mFirebase = null;


    var mUrl = 'https://incandescent-inferno-5269.firebaseio.com/webrtcnetwork0_9/';
    if(lUrl != null)
        mUrl = lUrl;
    
    /**Opens a new room. Result will be:
     * * SignalingMessageType.Connected if the room is opened
     * * SignalingMessageType.Closed if the room is already opened
     * 
     * @param {type} lName
     * @param {type} lHandler a function(SignalingMessageType, messageContent(string));
     * @returns {undefined}
     */
    this.Open = function(lName, lHandler)
    {
        mHandler = lHandler;
        mIsRoomOwner = true;
        mConnecting = true;
        StartFirebase(lName);
        mFirebase.onDisconnect().remove();
    };
    
    function StartConnectTimeout()
    {
        mConnectTimeoutId = setTimeout(function()
        {
            if(mConnecting)
            {
                mConnecting = false;
                mFirebase.off('value', RecMessage);
                mFirebase.off('child_added', RecMessage);
                mFirebase = null;
                mHandler(SignalingMessageType.Closed, null);
            }
            mConnectTimeoutId = null;
        }, mTimeout);
    }
    function ClearConnectTimeout()
    {
        clearTimeout(mConnectTimeoutId);
        mConnectTimeoutId = null;
    }
    function StartFirebase(lName)
    {
        mFirebase = new Firebase(mUrl + lName);
        mFirebase.channel = lName;
        mFirebase.on('value', RecValue);
        
        //just in case. the value handler can be called during the on call and close the channel immediately
        if(mFirebase != null) 
            mFirebase.on('child_added', RecMessage);
        StartConnectTimeout();
    }
    
    /**Same as open but it only connects to an existing room
     * 
     * @param {type} lName
     * @param {type} lHandler
     * @returns {undefined}
     */
    this.Connect = function(lName, lHandler)
    {
        mHandler = lHandler;
        mIsRoomOwner = false;
        mConnecting = true;
        StartFirebase(lName);
        //mFirebase.onDisconnect().remove();
    };
    
    function DeleteMessageLog()
    {
        mFirebase.set('{o:open}');
    }
    function RecValue(lFirebaseMsg)
    {
        var lMsg = lFirebaseMsg.val();
        
        if(mConnecting && mIsRoomOwner)
        {
            mConnecting = false;
            ClearConnectTimeout();
            if(lMsg == null)
            {
                mRunning = true;
                //nothing stored means -> room was just opened
                mHandler(SignalingMessageType.Connected, null);
                //set random content that isn't a message so others see its opened
                DeleteMessageLog();
            }else
            {
                //something is already stored at this address -> room already in use
                mHandler(SignalingMessageType.Closed, null);
            }
        }else if(mConnecting && mIsRoomOwner === false)
        {
            mConnecting = false;
            ClearConnectTimeout();
            if(lMsg != null)
            {
                mRunning = true;
                //room is open -> connect
                mHandler(SignalingMessageType.Connected, null);
            }else
            {
                
                //nothing stored means -> room was just opened
                mHandler(SignalingMessageType.Closed, null);
            }
        }else if(mRunning && mIsRoomOwner === false && lMsg == null)
        {
            //client side just noticed that the server shut down (all data deleted)
            
            mHandler(SignalingMessageType.Closed, null);
        }
    }
    
    function RecMessage(lFirebaseMsg)
    {
        if(mIsRoomOwner)
        {
            //cleanup content after no message received for 15 sec
            
            //remove old timer if one is set
            if(mCleanupTimer != null)
                clearTimeout(mCleanupTimer);
            
            //setup new timer that cleanup
            mCleanupTimer = setTimeout(function()
            {
                //make sure the whole thing is still running
                if(mRunning == true && mFirebase != null)
                    DeleteMessageLog();
                mCleanupTimer = null;
            }, 15000);
        }
        
        var lMsg = lFirebaseMsg.val();
        if(mRunning)
        {
            if(lMsg != null)
            {
                //check if it is a message for our protocol
                if(typeof lMsg.m === 'string')
                    mHandler(SignalingMessageType.UserMessage, lMsg.m);
            }else if(lMsg == null && mIsRoomOwner == false)
            {
                //room content removed -> closed
                InternalClose();
            }
        }
        
    };
    
    /**Closes the signaling channel
     * 
     * @returns {undefined}
     */
    this.Close = function()
    {
        if(mFirebase != null && mIsRoomOwner)
        {
            
            mFirebase.remove();
        }
        InternalClose();
    };
    
    function InternalClose()
    {
        
        if(mRunning)
        {
            mHandler(SignalingMessageType.Closed, null);
        }
        mRunning = false;
        mFirebase = null;
        
    }
    
    
    /**Sends a message over the signaling channel.
     * This can either be a broadcast to everyone in the room or be done more
     * securely by allowing only someone who connects to send to the server
     * and the other way around. The used protocol can work with both.
     * 
     * @param {type} lMessage
     * @returns {undefined}
     */
    this.SendMessage = function(lMessage)
    {
        //mFirebase.push({key : "message", value : lMessage});
        if(mRunning && mFirebase != null)
        {
            var msg = {m : lMessage};
            mFirebase.push(msg);
        }
        
        
    };
}
