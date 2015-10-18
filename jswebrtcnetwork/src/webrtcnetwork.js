/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */

/*
 * Multiple parts
 * 
 * C style API
 * 
 * WebRtcNetwork object
 * 
 * Signaling
 *  * improvement   -> Connect to signaling server
 *                  -> try to open a room
 *                  -> wait for result. room might be already in use
 *                  -> wait for request from a client
 *                  -> then give the client an id + create the channel
 *                  -> reply the request with a connection offer
 *                  -> wait for reply containing the channel id
 *                  -> do the handshaking
 *                  -> open the channels
 *                  -> add it to the list after both channels are open
 *                  
 *                  
 * Messages structure
 *  from
 *  to
 *  type
 *  data
 * 
 * what about meta messages? e.g. user disconnected or a conformation
 * that the connection was etablished?
 */

    var gSdpConstraints = 
        { 
            'mandatory': { 'OfferToReceiveAudio': false, 'OfferToReceiveVideo': false}
        };        
        

    //configuration for the peer to ensure that chrome and firefox get along
    var gConnectionConfig = 
        {
            'optional': [
                            {'DtlsSrtpKeyAgreement': true}, 
                            //{'RtpDataChannels': true} //this is required in firefox but not allowed in chrome?
                        ] 
        };
//finding the right name for each browser
var AnyRTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || 
           window.webkitRTCPeerConnection || window.msRTCPeerConnection;
var AnyRTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || 
   window.webkitRTCIceCandidate;

var AnyRTCSessionDesc = window.RTCSessionDescription || window.mozRTCSessionDescription || 
       window.webkitRTCSessionDescription;
       
var SignalingMessageType = {
    Invalid : 0,
    Connected : 1,
    Closed : 2,
    UserMessage : 3
};



var WebRtcNetworkConnection = function(lId, lPeer, lReliable, lUnreliable)
{
    this.id = lId;
    this.peer = lPeer;
    this.reliableChannel = lReliable;
    this.unreliableChannel = lUnreliable;
};

var NetEventType =
{
        Invalid : 0,
        UnreliableMessageReceived : 1,
        ReliableMessageReceived : 2,
        ServerInitialized : 3,
        ServerInitFailed : 4,
        ServerClosed : 5,
        NewConnection : 6,
        ConnectionFailed : 7,
        Disconnected : 8,
        FatalError : 100, //system shutdown because of an error
        Warning : 101,
        Log : 102
};

var NetEvent = function(lNetEventType, lConnectionId, lData)
{
    this.netEventType = lNetEventType;
    this.connectionId = lConnectionId;
    this.data = lData;
};

var WebRtcClientConnector = function(lSignalingChan, lIceConfig)
{
    var mSignalingChan = lSignalingChan;
    
    var mIceConfig = {"iceServers":[{"url":"stun:stun.l.google.com:19302"}]};
    if(lIceConfig != null)
        mIceConfig = lIceConfig;
    
    var mPeer;
    var mReliableChannel;
    var mUnreliableChannel;
    var mConnector;
    
    var mIsConnecting = false;
    
    var mTimeout = 10000;
    
    this.OnConnected = null;
    this.OnConnectionFailed = null;
    this.OnLog;
    
    var self = this;
    
    this.Connect = function(lName)
    {
        mIsConnecting = true;
        
        //setup the peer
        var lPeer = new AnyRTCPeerConnection(mIceConfig, gConnectionConfig);
        var lReliable = lPeer.createDataChannel("reliable");
        lReliable.binaryType = "arraybuffer";
        var lUnreliable = lPeer.createDataChannel("unreliable", {maxRetransmits: 0, ordered:false});
        lUnreliable.binaryType = "arraybuffer";
        
        //setup the connector
        var lConnector = new JSONConnectorProtocol(lPeer, gSdpConstraints);
        
        
        lConnector.OnMessageDelivery = mSignalingChan.SendMessage;
        lConnector.OnError = OnConnectionFailedInternal;
        lConnector.OnLog = function(lMsg)
        {
            Log("JSONConnectorProtocolProtocol: " + lMsg);
        };
        
        
        var lReliableConnected = false;
        var lUnreliableConnected = false;
        
        lReliable.onopen = function()
        {
            Log("Reliable.onopen");
            lReliableConnected = true;
            if(lReliableConnected && lUnreliableConnected)
            {
                OnConnectedInternal(lConnector, lPeer, lReliable, lUnreliable);
            }
        };
        lUnreliable.onopen = function()
        {
            Log("Unreliable.onopen");
            lUnreliableConnected = true;
            if(lReliableConnected && lUnreliableConnected)
            {
                OnConnectedInternal(lConnector, lPeer, lReliable, lUnreliable);
            }
        };
        
        
        mConnector = lConnector;
        mPeer = lPeer;
        mReliableChannel = lReliable;
        mUnreliableChannel = lUnreliable;
        
        //everything setup -> start the connection
        
        mSignalingChan.Connect(lName, OnSignalingMessage);
        
        setTimeout(function()
        {
            if(mIsConnecting)
            {
                Log("Client peer timed out at stage " + lConnector.GetState());
                //still connecting after timeout? stop now
                OnConnectionFailedInternal();
            }
        }, mTimeout);
    };
    

    
    function OnSignalingMessage(lMsgType, lMsg)
    {
        
        if(lMsgType == SignalingMessageType.Connected)
        {
            Log("SignalingMessageType.Connected");
            //signaling connected -> send out the offer
            mConnector.SendOffer();
        }else if(lMsgType == SignalingMessageType.Closed)
        {
            Log("SignalingMessageType.Closed");
            //signaling channel closed
            //this is a problem if we were just in the middle of the
            //connection process
            if(mIsConnecting)
            {
                OnConnectionFailedInternal("Signaling connection failed.");
            }
        }else if(lMsgType == SignalingMessageType.UserMessage)
        {
            Log("UserMessage received:" + lMsg);
            
            mConnector.OnMessageReceived(lMsg);
        }
    }
    
    
    //new client connection opened
    function OnConnectedInternal()
    {
        mIsConnecting = false;
        Log("OnConnectedInternal client connected");
        self.OnConnected(mPeer, mReliableChannel, mUnreliableChannel);
        mSignalingChan.Close();
        mUnreliableChannel = null;
        mReliableChannel = null;
        mPeer = null;
        mConnector.Cleanup();
        mConnector = null;
    }
    /**Called when the client connection failed. There are three reasons for that
     * * webrtc called because an internal error
     * * timeout called it
     * * the signaling channel was closed while trying to connect
     * 
     * @param {type} lMsg
     * @returns {undefined}
     */
    function OnConnectionFailedInternal(lMsg)
    {
        Log("OnConnectionFailedInternal:" + lMsg);
        if(mIsConnecting == false)
            return;
        mIsConnecting = false;
        if(mPeer != null)
            mPeer.close();
        
        mUnreliableChannel = null;
        mReliableChannel = null;
        mPeer = null;
        mConnector.Cleanup();
        mConnector = null;
        
        if(self.OnConnectionFailed != null)
            self.OnConnectionFailed(lMsg);
    }
    
    
    function Log(lMsg)
    {
        if(self.OnLog != null)
        {
            self.OnLog(lMsg);
        }
    }
    
};

//wraps around any signal channel and handles all requests received by it
//returns connected peers if the connection was successful
var WebRtcServerConnector = function(lSignalingChan, lIceConfig)
{
    var mSignalingChan = lSignalingChan;
    
    var mIceConfig = {"iceServers":[{"url":"stun:stun.l.google.com:19302"}]};
    if(lIceConfig != null)
        mIceConfig = lIceConfig;
    
    
    //connector waiting for an incomming connection (server)
    var mWaitingConnector;
    //JSONConnectorProtocols not yet etablished but in the connection process
    var mConnectingPeers = [];
    var mTimeout = 10000;
    var self = this;
    
    var mInitializing = false;
    var mInitTimeoutId = null;
    var mRunning = false;
    
    var mName;
    
    //external events
    this.OnServerStarted;
    this.OnServerStartFailed;
    this.OnServerStopped;
    this.OnNewConnection;
    this.OnLog;
    
    this.StartServer = function(lName)
    {
        mName = lName;
        mInitializing = true;
        mSignalingChan.Open(lName, OnSignalingMessage);
        //TODO: call this after the channel is confirmed to be open
        PrepareWaitingConnector();
        
        //setup a timeout
        mInitTimeoutId = setTimeout(function()
        {
            mInitTimeoutId = null;
            //still initializing?
            if(mInitializing)
            {
                //timeout -> treat it the same way as a close event from the
                //signaling channel
                OnSignalingClosed();
            }
        }, mTimeout);
    };
    
    this.GetName = function()
    {
        return mName;
    };
    
    this.StopServer = function()
    {
        Log("StopServer");
        mSignalingChan.Close();
        OnSignalingClosed(); // send out event immediatly
    };
    
    //creates a new server waiting connector to await a new client connecting
    function PrepareWaitingConnector()
    {
        var lPeer = new AnyRTCPeerConnection(mIceConfig, gConnectionConfig);
        var lConnector = new JSONConnectorProtocol(lPeer, gSdpConstraints);
        var lReliableChannel = null;
        var lUnreliableChannel = null;
        lPeer.ondatachannel  = function(ev)
        {
            if(ev.channel.label == "reliable")
            {
                ev.channel.onopen = function()
                {
                    Log("reliable.onopen");
                    lReliableChannel = ev.channel;
                    if(lReliableChannel && lUnreliableChannel)
                    {
                        OnConnectionOpened(lConnector, lPeer, lReliableChannel, lUnreliableChannel);
                    }
                    
                };
            }else if(ev.channel.label == "unreliable")
            {
                ev.channel.onopen = function()
                {
                    Log("unreliable.onopen");
                    lUnreliableChannel = ev.channel;
                    if(lReliableChannel && lUnreliableChannel)
                    {
                        OnConnectionOpened(lConnector, lPeer, lReliableChannel, lUnreliableChannel);
                    }
                };
            }
        };
        lConnector.OnMessageDelivery = mSignalingChan.SendMessage;
        lConnector.OnStartConnecting = OnStartConnecting;
        lConnector.OnLog = function(lMsg)
        {
            Log("Connector: " + lMsg);
        };
        
        mWaitingConnector = lConnector;
        mWaitingConnector.WaitForOffer();
        //TODO: OnError and OnLog 
    };
    

    
    function OnSignalingMessage(lMsgType, lMsg)
    {
        if(lMsgType == SignalingMessageType.Connected)
        {
            Log("SignalingMessageType.Connected");
            OnSignalingConnected();
        }else if(lMsgType == SignalingMessageType.Closed)
        {
            Log("SignalingMessageType.Closed");
            OnSignalingClosed();
        }else if(lMsgType == SignalingMessageType.UserMessage)
        {
            Log("UserMessage received:" + lMsg);
            if(mWaitingConnector != null)
                mWaitingConnector.OnMessageReceived(lMsg);

            for(var index = 0; index < mConnectingPeers.length; index++)
            {
                mConnectingPeers[index].OnMessageReceived(lMsg);
            }
        }
    }
    
    
    function OnSignalingConnected()
    {
        if(mInitializing)
        {
            mInitializing = false;
            mRunning = true;
            if(mInitTimeoutId != null)
            {
                clearTimeout(mInitTimeoutId);
                mInitTimeoutId = null;
            }
            //send out event
            if(self.OnServerStarted != null)
                self.OnServerStarted(self);
        }
    }
    
    //Called either by the the closed message of the signaling system
    //or manually while stopping the server
    function OnSignalingClosed()
    {
        //Closed during init process? connection to the signaling probably failed
        if(mInitializing)
        {
            if(mInitTimeoutId != null)
            {
                clearTimeout(mInitTimeoutId);
                mInitTimeoutId = null;
            }
            mInitializing = false;
            //send out server closed event
            if(self.OnServerStartFailed != null)
            {
                self.OnServerStartFailed(self);
            }
        }
        
        //server was fully running -> send server stopped event
        if(mRunning)
        {
            mRunning = false;
            //send out server closed event
            if(self.OnServerStopped != null)
                self.OnServerStopped(self);
        }
    }
    
    //this is called when the server connector that waits for a connection
    //received an offer and starts the connection process
    //it will be added to the connecting list and a new connector will
    //be created that waits for a new connection
    function OnStartConnecting()
    {
        //waiting connector received a connection -> add it to the list of connecting peers
        var lConnector = mWaitingConnector;
        AddToConnectingPeers(lConnector);
        
        //clear and recreate a new connector that waits
        mWaitingConnector = null;
        PrepareWaitingConnector();
    }
    
    //new server connection opened
    function OnConnectionOpened(lConnector, lPeer, lReliable, lUnreliable)
    {
        
        //remove it from the list
        var index = mConnectingPeers.indexOf(lConnector);
        if(index != -1)
        {
            mConnectingPeers.splice(index, 1);
        }
        
        Log("OnNewConnection");
        //send it to the outside for use
        if(self.OnNewConnection != null)
            self.OnNewConnection(lPeer, lReliable, lUnreliable);
    }
    //this adds the connector to a list of connectors that are currently
    //connecting to the system. 
    //and setsup timeout + behaviour during timeout
    function AddToConnectingPeers(lConnector)
    {
        setTimeout(function()
        {
            var index = mConnectingPeers.indexOf(lConnector);
            if(index != -1)
            {
                //its still not finished -> timeout
                Log("New peer timed out at stage " + lConnector.GetState());

                //remove it
                mConnectingPeers.splice(index, 1);

                //close the peer just in case
                var lPeer = lConnector.GetPeer();
                lPeer.close();
            }
        }, mTimeout);

        mConnectingPeers.push(lConnector);
    }
    
    
    function Log(lMsg)
    {
        if(self.OnLog != null)
        {
            self.OnLog(lMsg);
        }
    }
    
};



/**
 * This class is the main interface. It allows to either create a server or to
 * connect to one using the same system.
 * 
 * Currently, the server side can accept multiple connections but the client 
 * side can only create one outgoing connection. Similar to typical
 * stockets in any programming language. 
 * 
 * In the future it will support one server + multiple client connections at the
 * same time.
 * @param {type} lConfig
 * @returns {WebRtcNetwork}
 */
var WebRtcNetwork = function(lConfig)
{
    var self = this;
    this.OnLog = null;
    var mServer = null;
    var mClient = null;
    var mEventQueue = [];
    var mConnections = {};
    var mSignalingCreator = null;
    var mNextId = 1;
    
    
    var mConfig = {
            Signaling : {
                        name : "FirebaseSignalingChan",
                        conf : null
                    },
            IceConfig : {"iceServers":[{"url":"stun:stun.l.google.com:19302"}]}
        };
        
    
    function Setup(lConf)
    {
        if(lConf != null )
        {
            if(lConf.Signaling != null && (typeof lConf.Signaling.name == 'string'))
            {
                //copy the whole content. this is signaling specific
                //only name needs to be defined
                mConfig.Signaling = lConf.Signaling;
            }
            if(lConf.IceConfig != null)
            {
                mConfig.IceConfig = lConf.IceConfig;
            }
        }
        //this will be given to other modules that may need to create a signaling
        //channel without knowing the specifics about how to
        mSignalingCreator = function()
        {
            return new window[mConfig.Signaling.name](mConfig.Signaling.conf);
        };
    }
    Setup(lConfig);
    
    
    this.StartServer = function(lRoom)
    {
        var lSignaling = mSignalingCreator();
        mServer = new WebRtcServerConnector(lSignaling, mConfig.IceConfig);
        mServer.OnServerStarted = OnServerStarted;
        mServer.OnServerStartFailed = OnServerStartFailed;
        mServer.OnServerStopped = OnServerStopped;
        mServer.OnNewConnection = OnServerNewConnection;
        mServer.OnLog = function(lMsg)
        {
            Log("ServerConnector: " + lMsg);
        };
        mServer.StartServer(lRoom);
    };
    this.Shutdown = function()
    {
        Log("Shutdown");
        //TODO: Disconnect all, stop server if started
        for (var id in mConnections)
        {
            var con = mConnections[id];
            this.Disconnect(id);
            //force the complete removal now even though webrtc might not yet react
            OnDisconnect(con); 
        }
        if(mServer != null)
        {
            mServer.StopServer();
            mServer = null;
        }
    };
    
    this.Connect = function(lRoom)
    {
        //get an id already so we can return it to the user
        //this helps recognizing later if this particular connection failed
        //or got connected. in case the user tries to create multiple
        //connection at the same time (not yet supported but in the future it will be)
        var id = mNextId;
        
        mNextId++;
        var lSignaling = mSignalingCreator();
        mClient = new WebRtcClientConnector(lSignaling, mConfig.IceConfig);
        mClient.OnLog = function(lMsg)
        {
            Log("ClientConnector: " + lMsg);
        };
        mClient.OnConnected = function(lPeer, lReliable, lUnreliable)
        {
            OnClientConnected(id, lPeer, lReliable, lUnreliable);
        };
        mClient.OnConnectionFailed = function(lMsg)
        {
            OnClientConnectionFailed(id, lMsg);
        };
        mClient.Connect(lRoom);
        return id;
    };
    
    this.Dequeue = function()
    {
        if(mEventQueue.length == 0)
        {
            return null;
        }else
        {
            return mEventQueue.shift();
        }
    };
    
    /**Returns the next NetEvent without removing it form the queue.
     * 
     * This method is not part of the public interface!!!
     * 
     * @returns returns NetEvent 
     */
    this.PeekEvent = function()
    {
        if(mEventQueue.length == 0)
        {
            return null;
        }else
        {
            return mEventQueue[0];
        }
    };
    
    this.Disconnect = function(lId)
    {
        if(lId in mConnections)
        {
            mConnections[lId].peer.close();
        }
    };
    
    this.SendData = function(lConId, lUint8ArrayData, lReliable)
    {
        if(lConId in mConnections)
        {
            if(lReliable)
            {
                mConnections[lConId].reliableChannel.send(lUint8ArrayData);
            }
            else
            {
                mConnections[lConId].unreliableChannel.send(lUint8ArrayData);
            }
        }
    };
    
    function OnServerStarted(lServerConnector)
    {
        //send out server initialized event
        var evt = new NetEvent(NetEventType.ServerInitialized, -1, lServerConnector.GetName());
        AddEvent(evt);
    }
    
    function OnServerStartFailed()
    {
        var evt = new NetEvent(NetEventType.ServerInitFailed, -1, null);
        AddEvent(evt);
    }
    
    function OnServerStopped()
    {
        var evt = new NetEvent(NetEventType.ServerClosed, -1, null);
        AddEvent(evt);
    }
    
    function OnServerNewConnection(lPeer, lReliable, lUnreliable)
    {
        //server hasn't assigned an id yet -> do that here
        AddConnection(mNextId, lPeer, lReliable, lUnreliable);
        mNextId++;
        
    }
    
    /**Used to setup client and server connection.
     * 
     * @param {type} id the id allocated for this connection
     * @param {type} lPeer the peer
     * @param {type} lReliable reliable data channel
     * @param {type} lUnreliable unreliable data channel
     */
    function AddConnection(id, lPeer, lReliable, lUnreliable)
    {
        var lNewConnection = new WebRtcNetworkConnection(id,  lPeer, lReliable, lUnreliable);
        lReliable.onmessage = function(ev)
        {
            OnMessage(lNewConnection, true, ev);
        };
        lUnreliable.onmessage = function(ev)
        {
            OnMessage(lNewConnection, false, ev);
        };
        lReliable.onclose = function(ev)
        {
            OnDisconnect(lNewConnection);
        };
        lUnreliable.onclose = function(ev)
        {
            OnDisconnect(lNewConnection);
        };
        lReliable.onerror = function(ev)
        {
            console.debug("WebRTC error in connection " + id + " reliable channel: " + ev);
        };
        lUnreliable.onerror = function(ev)
        {
            console.debug("WebRTC error in connection " + id + " unreliable channel: " + ev);
        };
        lPeer.oniceconnectionstatechange = function(ev)
        {
            if(lPeer.iceConnectionState == 'disconnected' || lPeer.iceConnectionState == "closed")
            {
                OnDisconnect(lNewConnection);
            }
        };
        
        mConnections[lNewConnection.id] = lNewConnection;
        
        var evt = new NetEvent(NetEventType.NewConnection, id, null);
        AddEvent(evt);
    }
    function OnClientConnected(id, lPeer, lReliable, lUnreliable)
    {
        //nothing special todo here -> just call add directly
        AddConnection(id, lPeer, lReliable, lUnreliable);
    }
    function OnClientConnectionFailed(id, lMsg)
    {
        //id was never used but the user can use it to see which connection
        //attempt failed
        var evt = new NetEvent(NetEventType.ConnectionFailed, id, lMsg);
        AddEvent(evt);
    }
    
    function AddEvent(evt)
    {
        Log("New Event: " + evt.netEventType);
        mEventQueue.push(evt);
    }
    
    function OnMessage(lConnection, lIsReliable, lEvent)
    {
        ToUint8Array(lEvent.data, function(lMsgAsUint8Array) {
            if(lConnection.id in mConnections)
            {
                if(lIsReliable)
                {
                    var evt = new NetEvent(NetEventType.ReliableMessageReceived, lConnection.id, lMsgAsUint8Array);
                    AddEvent(evt);
                }
                else
                {
                    var evt = new NetEvent(NetEventType.UnreliableMessageReceived, lConnection.id, lMsgAsUint8Array);
                    AddEvent(evt);
                }
            }
        });
    }
    
    /**Converts arraybuffer (chrome) or blob (firefox) to the Uint8Array we 
     * defined as our interface format
     * 
     * @param {type} lArrayBufferOrBlob
     * @returns {undefined}
     */
    function ToUint8Array(lArrayBufferOrBlob, resultHandler)
    {
        if(lArrayBufferOrBlob instanceof ArrayBuffer)
        {
            var indata = new Uint8Array(lArrayBufferOrBlob);
            resultHandler(indata);
        }else if(lArrayBufferOrBlob instanceof Blob)
        {    
            var fileReader = new FileReader();
            fileReader.onload = function()
            {
                var indata = new Uint8Array(this.result);
                resultHandler(indata);
            };
            fileReader.readAsArrayBuffer(lArrayBufferOrBlob);
        }else
        {
            console.debug("ERROR: nEvt.data is not an array buffer");
            resultHandler(null);
        }
    }
    
    /**This will force the connection to be removed from the mConnections list.
     * It will be called multiple times for anything that causes the connection
     * to be terminated
     * e.g. 
     * * one of the data channels closes
     * * user disconnects on purpose (which causes the data channels to close thus calls it at least twice)
     * * in chrome the data channels dont close if the window gets closed thus oniceconnectionstatechange
     *      is used to find the disconnect and cal this method
     * 
     * 
     * This method closes data channels and the peer + removes the references
     * @param {type} lConnection
     * @returns {undefined}
     */
    function OnDisconnect(lConnection)
    {
        //check first if the connection is still in here. 
        if(lConnection.id in mConnections)
        {
            var evt = new NetEvent(NetEventType.Disconnected, lConnection.id, null);
            AddEvent(evt);
            delete mConnections[lConnection.id];
            
            //TODO: remove all handlers?
            
            if(lConnection.reliableChannel.readyState != "closed")
                lConnection.reliableChannel.close();
            if(lConnection.unreliableChannel.readyState != "closed")
                lConnection.unreliableChannel.close();
            if(lConnection.peer.signalingState != "closed")
            {
                lConnection.peer.close();
            }
            
            Log("Connection id: " + lConnection.id + " disconnected.");
        }
    }
    
    function Log(lMsg)
    {
        if(self.OnLog != null)
        {
            self.OnLog(lMsg);
        }
    }
};



/** C API style interface to WebRTCNetwork allows to use this system in
 * other programming languages.
 * 
 */

var gCAPIWebRtcNetworkInstances = {};
var gCAPIWebRtcNetworkInstancesNextIndex = 1;
function CAPIWebRtcNetworkIsAvailable()
{
    if(typeof AnyRTCPeerConnection === 'undefined')
    {
        return false;
    }
    return true;
}
function CAPIWebRtcNetworkCreate(lConfiguration)
{
    var lIndex = gCAPIWebRtcNetworkInstancesNextIndex;
    gCAPIWebRtcNetworkInstancesNextIndex++;
    
    if(typeof lConfiguration !== 'string' || lConfiguration.length === 0)
    {
        gCAPIWebRtcNetworkInstances[lIndex] = new WebRtcNetwork();
    }
    else
    {
        //console.log("using lConfiguration" + lConfiguration + "typeof" + (typeof lConfiguration));
        var conf = JSON.parse(lConfiguration);
        gCAPIWebRtcNetworkInstances[lIndex] = new WebRtcNetwork(conf);
    }
    gCAPIWebRtcNetworkInstances[lIndex].OnLog = function(lMsg)
    {
        console.debug(lMsg);
    };
    return lIndex;
}

function CAPIWebRtcNetworkRelease(lIndex)
{
    if(lIndex in gCAPIWebRtcNetworkInstances)
    {
        gCAPIWebRtcNetworkInstances[lIndex].Shutdown();
        delete gCAPIWebRtcNetworkInstances[lIndex];
    }
}

function CAPIWebRtcNetworkConnect(lIndex, lRoom)
{
    return gCAPIWebRtcNetworkInstances[lIndex].Connect(lRoom);
}

function CAPIWebRtcNetworkStartServer(lIndex, lRoom)
{
    gCAPIWebRtcNetworkInstances[lIndex].StartServer(lRoom);
}

function CAPIWebRtcNetworkDisconnect(lIndex, lConnectionId)
{
    gCAPIWebRtcNetworkInstances[lIndex].Disconnect(lConnectionId);
}

function CAPIWebRtcNetworkShutdown(lIndex)
{
    gCAPIWebRtcNetworkInstances[lIndex].Shutdown();
}

function CAPIWebRtcNetworkSendData(lIndex, lConnectionId, lUint8ArrayData, lReliable)
{
    gCAPIWebRtcNetworkInstances[lIndex].SendData(lConnectionId, lUint8ArrayData, lReliable);
}

//helper for emscripten
function CAPIWebRtcNetworkSendDataEm(lIndex, lConnectionId, lUint8ArrayData, lUint8ArrayDataOffset, lUint8ArrayDataLength, lReliable)
{
    console.debug("SendDataEm: " + lReliable + " length " + lUint8ArrayDataLength  + " to " + lConnectionId);
    var arrayBuffer = new Uint8Array(lUint8ArrayData.buffer, lUint8ArrayDataOffset, lUint8ArrayDataLength);
    gCAPIWebRtcNetworkInstances[lIndex].SendData(lConnectionId, arrayBuffer, lReliable);
}


function CAPIWebRtcNetworkDequeue(lIndex)
{
    return gCAPIWebRtcNetworkInstances[lIndex].Dequeue();
}

/**Allows to peek into the next event to figure out its length and allocate
 * the memory needed to store it before calling
 *      CAPIWebRtcNetworkDequeueEm
 * 
 * @param {type} lIndex
 * @returns {Number}
 */
function CAPIWebRtcNetworkPeekEventDataLength(lIndex)
{
    var lNetEvent = gCAPIWebRtcNetworkInstances[lIndex].PeekEvent();
    return CAPIWebRtcNetworkCheckEventLength(lNetEvent);
}
//helper
function CAPIWebRtcNetworkCheckEventLength(lNetEvent)
{
    if(lNetEvent == null)
    {
        //invalid event
        return -1;
    }else if(lNetEvent.data == null)
    {
        //no data
        return 0;
    }else if(typeof lNetEvent.data === "string") 
    {
        //no user strings are allowed thus we get away with counting the characters
        //(ASCII only!)
        return lNetEvent.data.length;
    }else //message event types 1 and 2 only? check for it?
    {
        //its not null and not a string. can only be a Uint8Array if we didn't
        //mess something up in the implementation
        
        return lNetEvent.data.length;
    }
}
function CAPIWebRtcNetworkEventDataToUint8Array(data, dataUint8Array, dataOffset, dataLength)
{
    //data can be null, string or Uint8Array
    //return value will be the length of data we used
    if(data == null)
    {
        return 0;
    }else if((typeof data) === "string")
    {
        //in case we don't get a large enough array we need to cut off the string
        var i = 0;
        for (i = 0; i < data.length && i < dataLength; i++)
        {
            dataUint8Array[dataOffset + i] = data.charCodeAt(i);
        }
        return i;
    }
    else
    {
        var i = 0;
        //in case we don't get a large enough array we need to cut off the string
        for (i = 0; i < data.length && i < dataLength; i++)
        {
            dataUint8Array[dataOffset + i] = data[i];
        }
        return i;
    }
}

//Version for emscripten or anything that doesn't have a garbage collector.
 // The memory for everything needs to be allocated before the call.

function CAPIWebRtcNetworkDequeueEm(lIndex, lTypeIntArray, lTypeIntIndex, lConidIntArray, lConidIndex, lDataUint8Array, lDataOffset, lDataLength, lDataLenIntArray, lDataLenIntIndex)
{
    var nEvt = CAPIWebRtcNetworkDequeue(lIndex);
    if(nEvt == null)
        return false;
    
    lTypeIntArray[lTypeIntIndex] = nEvt.netEventType;
    lConidIntArray[lConidIndex] = nEvt.connectionId;
    
    //console.debug("event" + nEvt.netEventType);
    var length = CAPIWebRtcNetworkEventDataToUint8Array(nEvt.data, lDataUint8Array, lDataOffset, lDataLength);
    lDataLenIntArray[lDataLenIntIndex] = length; //return the length if so the user knows how much of the given array is used
    
    return true;
}









