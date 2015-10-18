/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */



//receives and sends json messages and delivers it in the right format to a peer
//this other systems could implement different communication technologies or 
//treat the peers in browser specific ways
//the connector will will return a finished event either after an error, success or timeout

var ConnectorMessageType = {
    Invalid : 0,
    Offer : 1,
    Answer : 2,
    Ice : 3
};


var JSONConnectorProtocol = function(lPeer, lSdpConstraints)
{
    var mPeer = lPeer;
    var mSdpConstraints = lSdpConstraints;
    
    
    this.OnMessageDelivery = null;
    this.OnLog = null;
    this.OnError = null;
    this.OnStartConnecting = null;
    
    
    var self = this;
    //we set this to invalid just in case we work with a very chaoitic 
    //message transmission system that could receive messages before we even
    //decided yet if we want to offer or wait for an offer
    var mExpectedMessageType = ConnectorMessageType.Invalid;
    
    
    var mOwnId;
    var mConId;
    
    /*Will immediately send out an offer and try to connect to who ever
     * reacts.
     * 
     * 
     * @returns {undefined}
     */
    this.SendOffer = function()
    {
        mPeer.onicecandidate = OnIceCandidate;
        mOwnId = GetRandomId();
        mExpectedMessageType =  ConnectorMessageType.Answer;
        mPeer.createOffer(function (generatedOffer)
        {
            Log("createOffer");
            mPeer.setLocalDescription(generatedOffer);
            
            
                var lMsg= {
                    mtype: ConnectorMessageType.Offer,
                    from : mOwnId,
                    data: generatedOffer
                };
            self.OnMessageDelivery(JSON.stringify(lMsg));
        }, OnWebRtcFail, mSdpConstraints);
        //TODO: protocol
        if(self.OnStartConnecting != null)
            self.OnStartConnecting();
    };
    
    this.Cleanup = function()
    {    
        //make sure to remove the references to the peer.
        mPeer.onicecandidate = null;
        mPeer = null;
        
        self.OnMessageDelivery = null;
        self.OnLog = null;
        self.OnError = null;
        self.OnStartConnecting = null;
    };
    
    this.GetState = function()
    {
        return mExpectedMessageType;
    };
    
    /**Sets the connector in wait mode. It will listen to all messages
     * it receives through OnMessageReceived until it finds an offer to
     * start etablishing a connection.
     * 
     * @returns {undefined}
     */
    this.WaitForOffer = function()
    {
        Log("WaitForOffer");
        mPeer.onicecandidate = OnIceCandidate;
        mOwnId = GetRandomId();
        mExpectedMessageType =  ConnectorMessageType.Offer;
        
        //do nothing. just wait
    };    
    
    this.GetPeer = function()
    {
        return mPeer;
    };
    //Called by the peer after offer and answer were exchanged
    function OnIceCandidate(e)
    {
        Log("onicecandidate");
        if (!e || !e.candidate) return;
        
        var lMsg= {
            mtype: ConnectorMessageType.Ice,
            from : mOwnId,
            to : mConId,
            data: e.candidate
        };
        self.OnMessageDelivery(JSON.stringify(lMsg));
        
    }
    
    //called by the signaling channel if a message is received
    this.OnMessageReceived = function(lMsg)
    {
        var content = JSON.parse(lMsg);
        if(mExpectedMessageType === ConnectorMessageType.Offer
                && content.mtype == ConnectorMessageType.Offer)
        {
            //we have got an offer -> store the offer id and send out an answer
            mConId = content.from;
            
            //expect ice messages from the offerer
            mExpectedMessageType =  ConnectorMessageType.Ice;
            
            if(self.OnStartConnecting != null)
                self.OnStartConnecting();
            //first set the offer as session description
            mPeer.setRemoteDescription(new AnyRTCSessionDesc(content.data), function()
            {
                Log("setRemoteDescription offer");
                //generate the answer
                mPeer.createAnswer(function (generatedAnswer) 
                {
                    Log("createAnswer");
                    //same as with offer -> set the answer as local descriptor
                    mPeer.setLocalDescription(generatedAnswer);
                    
                    //answer message
                    var lMsg= {
                        mtype: ConnectorMessageType.Answer,
                        from : mOwnId, //we include the offerer id so it is clear we answer this particular offer
                        to : mConId,
                        data: generatedAnswer
                    };
                    
                    //deliver the message
                    self.OnMessageDelivery(JSON.stringify(lMsg));
                    
                }, OnWebRtcFail, mSdpConstraints);//error handler if mPeer.createAnswer fails
                
            }, OnWebRtcFail); //error handler if setRemoteDescription
            
        }
        else if(mExpectedMessageType === ConnectorMessageType.Answer
                && content.mtype == ConnectorMessageType.Answer
                && content.to == mOwnId)
        {
            //add the id of the answerer to better filter out messages
            mConId = content.from;
            //wait for ice messages
            mExpectedMessageType =  ConnectorMessageType.Ice;
            //TODO sending here
            mPeer.setRemoteDescription(new AnyRTCSessionDesc(content.data), function()
            {
                Log("setRemoteDescription answer");
                //done?
            }, OnWebRtcFail);
        }
        else if(mExpectedMessageType === ConnectorMessageType.Ice
                && content.mtype == ConnectorMessageType.Ice
                /*&& content.to == mOwnId*/
                && content.from == mConId)
        {
            Log("addIceCandidate");
            mPeer.addIceCandidate(new AnyRTCIceCandidate(content.data));
        }else
        {
            //message ignored
            //as it is suppose to be used with random chat libraries this
            //is normal as it might get its own messages back or other 
            //people/connections send other things around
        }
        
    };
    
    //called by webrtc to report any errors
    function OnWebRtcFail(lDomErr)
    {
        if(self.OnError != null)
        {
            self.OnError(lDomErr);
        }
    }
    function Log(lMsg)
    {
        if(self.OnLog != null)
        {
            self.OnLog(lMsg);
        }
    }
    function GetRandomId()
    {
        return Math.floor((Math.random() * 16777216));
    }
    
    
    
};