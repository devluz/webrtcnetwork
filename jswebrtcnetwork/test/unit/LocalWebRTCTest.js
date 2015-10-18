/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
describe("LocalWebRTC", function() {
//just a test to find errors in the use of webrtc. doesn't test code of the project

    it("FullScenario", function(done)
    {
        //getting rtc class names of various browsers
        var AnyRTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || 
                   window.webkitRTCPeerConnection || window.msRTCPeerConnection;
        var AnyRTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || 
           window.webkitRTCIceCandidate;
        
        var AnyRTCSessionDesc = window.RTCSessionDescription || window.mozRTCSessionDescription || 
               window.webkitRTCSessionDescription;
           
        
        
        //TODO: 
        var IceConfig = {"iceServers":[{"url":"stun:stun.l.google.com:19302"}]};
        
        //configuration for the peer to ensure that chrome and firefox get along
        var ConnectionConfig = 
            {
                'optional': [
                                {'DtlsSrtpKeyAgreement': true}, 
                                //{'RtpDataChannels': true} //this is required in firefox but not allowed in chrome?
                            ] 
            };

        //this setups the "services" that are offered -> no audio, no video we only use data channels
        //used while 2 peers are connecting
        var SdpConstraints = 
            { 
                'mandatory': { 'OfferToReceiveAudio': false, 'OfferToReceiveVideo': false}
            };
        function OnFailture(domError)
        {
            done.fail(domError);
            //error callback used while creating offers/answers
        }
        
        
        var mPeerConnectionA = new AnyRTCPeerConnection(IceConfig, ConnectionConfig);
        //need to setup this first so the browser knows what to write into the offer
        var mDataChannelReliable = mPeerConnectionA.createDataChannel("reliable", {reliable: true});
        mDataChannelReliable.binaryType = "arraybuffer";
        var mDataChannelUnreliable = mPeerConnectionA.createDataChannel("unreliable", {reliable: false});
        mDataChannelUnreliable.binaryType = "arraybuffer";
        
        
        
        var mPeerConnectionB = new AnyRTCPeerConnection(IceConfig, ConnectionConfig);
        mPeerConnectionA.onicecandidate = function(e)
        {
            console.log("mPeerConnectionA.onicecandidate");
            if (!mPeerConnectionA || !e || !e.candidate) return;
            //deliver the message to the other connection
            mPeerConnectionB.addIceCandidate(new AnyRTCIceCandidate(e.candidate));
                
        };
        mPeerConnectionB.onicecandidate = function(e)
        {
            console.log("mPeerConnectionB.onicecandidate");
            if (!mPeerConnectionB || !e || !e.candidate) return;
            //deliver the message to the other connection
            mPeerConnectionA.addIceCandidate(new AnyRTCIceCandidate(e.candidate));
        };
        
        mPeerConnectionA.oniceconnectionstatechange = function()
        {
            console.log("mPeerConnectionA.oniceconnectionstatechange " + mPeerConnectionA.iceConnectionState);
            if(mPeerConnectionA.iceConnectionState == 'connected'
                || mPeerConnectionA.iceConnectionState == 'completed')
            {
                done();
            }
        };
        mPeerConnectionB.oniceconnectionstatechange = function()
        {
            console.log("mPeerConnectionB.oniceconnectionstatechange " + mPeerConnectionB.iceConnectionState);
            if(mPeerConnectionB.iceConnectionState == 'connected'
                || mPeerConnectionB.iceConnectionState == 'completed')
            {
                done();
            }
        };
        
        
        //make connection a create an offer for connection B
        mPeerConnectionA.createOffer(function (generatedOffer)
        {
            console.log("mPeerConnectionA.createOffer");
            //set the local session description
            mPeerConnectionA.setLocalDescription(generatedOffer);
            
            //send the offer to the other peer
            
            //set the offer. after this is done it will call the next callback to create an answer
            mPeerConnectionB.setRemoteDescription(new AnyRTCSessionDesc(generatedOffer), function()
            {
                console.log("mPeerConnectionB.setRemoteDescription");
                //on success
                //LOG("offer remote description set");
                //generate an answer and set it as local description
                mPeerConnectionB.createAnswer(function (generatedAnswer) 
                {
                    console.log("mPeerConnectionB.createAnswer");
                    //same as with offer -> set the answer as local descriptor
                    mPeerConnectionB.setLocalDescription(generatedAnswer);
                    
                    //TODO sending here
                    mPeerConnectionA.setRemoteDescription(new AnyRTCSessionDesc(generatedAnswer), function()
                    {
                        console.log("mPeerConnectionA.setRemoteDescription");
                        //done?
                    }, OnFailture);

                }, OnFailture, SdpConstraints);//if it fails send the error and shut down
            }, OnFailture); //if it fails send the error and shut down

        }, OnFailture, SdpConstraints); //error callback and peer configuration
        
        
    }, 10000);
    
});