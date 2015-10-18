/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
describe("JSONConnectorProtocolTest", function() {
//just one test that runs the full connectin process in json
//split this in individual tests later
    
    it("JSONConnectorProtocolTestFull", function(done)
    {
        
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
            
        
        var mPeerConnectionA = new AnyRTCPeerConnection(IceConfig, ConnectionConfig);
        
        //need to setup this first so the browser knows what to write into the offer
        var mPeerConnectionAReliable = mPeerConnectionA.createDataChannel("reliable", {reliable: true});
        mPeerConnectionAReliable.binaryType = "arraybuffer";
        var mPeerConnectionAUnreliable = mPeerConnectionA.createDataChannel("unreliable", {reliable: false});
        mPeerConnectionAUnreliable.binaryType = "arraybuffer";
        
        var mPeerConnectionB = new AnyRTCPeerConnection(IceConfig, ConnectionConfig);
        
        
        
        var ConAReliable = false;
        var ConAUnreliable = false;
        var ConBReliable = false;
        var ConBUnreliable = false;
                
        mPeerConnectionAReliable.onopen = function()
        {
            console.log("mPeerConnectionAReliable.onopen");
            ConAReliable = true;
        };
        mPeerConnectionAUnreliable.onopen = function()
        {
            console.log("mPeerConnectionAUnreliable.onopen");
            ConAUnreliable = true;
        };
        
        mPeerConnectionB.ondatachannel  = function(ev)
        {
            if(ev.channel.label == "reliable")
            {
                ev.channel.onopen = function()
                {
                    ConBReliable = true;
                    console.log("mPeerConnectionBReliable.onopen");
                };
            }else if(ev.channel.label == "unreliable")
            {
                ev.channel.onopen = function()
                {
                    ConBUnreliable = true;
                    console.log("mPeerConnectionBUnreliable.onopen");
                    
                    if(ConAReliable && ConAUnreliable && ConBReliable && ConBUnreliable)
                    {
                        done();
                    }
                };
            }
        };
        
        
        function FromAToB(lMsg)
        {
            console.debug("FromAToB: " + lMsg);
            mConnectorB.OnMessageReceived(lMsg);
        }
        function FromBToA(lMsg)
        {
            console.debug("FromBToA: " + lMsg);
            mConnectorA.OnMessageReceived(lMsg);
        }
        var mConnectorA = new JSONConnectorProtocol(mPeerConnectionA, SdpConstraints);
        mConnectorA.OnMessageDelivery = FromAToB;
        mConnectorA.OnError = function(lError, lConnector)
        {
            done.fail(lError);
        };
        mConnectorA.OnStartConnecting = function()
        {
            console.debug("mConnectorA.OnStartConnecting");
        };
        var mConnectorB = new JSONConnectorProtocol(mPeerConnectionB, SdpConstraints);
        mConnectorB.OnMessageDelivery = FromBToA;
        mConnectorA.OnError = function(lError, lConnector)
        {
            done.fail(lError);
        };
        mConnectorB.OnStartConnecting = function()
        {
            console.debug("mConnectorB.OnStartConnecting");
        };
        
        
        //A needs to be the one that sends the offer as it is the one that is configuratated
        //to create a data channel
        mConnectorB.WaitForOffer();
        mConnectorA.SendOffer();
        
        
        
    });
});
