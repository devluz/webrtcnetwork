/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
describe("CAPIWebRtcNetworkTest", function() {
    // full scenario test for the CAPI. might be slow as it uses webrtc
    beforeEach(function() {
        //reset all opened rooms fore each test so they don't interfere
        LocalSignalingChan.sRooms = {};
    });
    
    
    it("CAPI create and release", function()
    {
        //expect(gCAPIWebRtcNetworkInstances[lIndex]).toBe(null);
        var lServer = CAPIWebRtcNetworkCreate("");
        expect(gCAPIWebRtcNetworkInstances[lServer]).toBeDefined();
        CAPIWebRtcNetworkRelease(lServer);
        expect(gCAPIWebRtcNetworkInstances[lServer]).not.toBeDefined();
    });
    
    
    
    it("CAPIWebRtcNetworkConnectMessages", function(done)
    {
        
        var lServer = CAPIWebRtcNetworkCreate("");
        var lClient = CAPIWebRtcNetworkCreate("");
        var roomName = "testname";
        CAPIWebRtcNetworkStartServer(lServer, roomName);
        var lNetEvent;
        var step = 0;
        var serverSideConId = -1;
        var clientSideConId = -1;
        
        //guess this is the simplest way to test it
        //enforcing order of events on server and client but not inbetween
        setInterval(function()
        {
            //always first handle server events. if there are none then client
            switch(step) {
                case 0: //wait for server to be connected
                        {
                            lNetEvent = CAPIWebRtcNetworkDequeue(lServer);
                            if(lNetEvent == null)
                                break;

                            //except the server to be initialized correctly
                            expect(lNetEvent.netEventType).toBe(NetEventType.ServerInitialized);

                            //connect client
                            lNetEvent = CAPIWebRtcNetworkConnect(lClient, roomName);
                            step++;
                        }
                    break;
                case 1:
                
                        {
                            lNetEvent = CAPIWebRtcNetworkDequeue(lServer);
                            if(lNetEvent == null)
                                break;
                            //expect the server to notice the incomming connection
                            expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                            serverSideConId = lNetEvent.connectionId;
                            step++;
                        }
                    break;
                case 2:
                        {
                            lNetEvent = CAPIWebRtcNetworkDequeue(lClient);
                            if(lNetEvent == null)
                                break;
                            //expect the client to notice the new connection
                            expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                            clientSideConId = lNetEvent.connectionId;


                            //send reliable from client to server and server to client
                            var data = new Uint8Array(1);
                            data[0] = 42;
                            CAPIWebRtcNetworkSendData(lClient, clientSideConId, data, true);
                            
                            data[0] = 43;
                            CAPIWebRtcNetworkSendData(lServer, serverSideConId, data, true);
                            step++;
                        }
                    break;
                case 3:
                        {
                            lNetEvent = CAPIWebRtcNetworkDequeue(lServer);
                            if(lNetEvent == null)
                                break;
                            
                            expect(lNetEvent.netEventType).toBe(NetEventType.ReliableMessageReceived);
                            expect(lNetEvent.data).not.toBe(null);
                            console.debug(lNetEvent.data);
                            expect(lNetEvent.data[0]).toBe(42);
                            step++;
                        }
                    break;
                case 4:
                        {
                            lNetEvent = CAPIWebRtcNetworkDequeue(lClient);
                            if(lNetEvent == null)
                                break;
                            
                            expect(lNetEvent.netEventType).toBe(NetEventType.ReliableMessageReceived);
                            expect(lNetEvent.data).not.toBe(null);
                            console.debug(lNetEvent.data);
                            expect(lNetEvent.data[0]).toBe(43);
                            
                            
                            
                            
                            var data = new Uint8Array(1);
                            data[0] = 44;
                            CAPIWebRtcNetworkSendDataEm(lClient, clientSideConId, data, 0, data.length, false);
                            
                            
                            
                            data[0] = 45;
                            CAPIWebRtcNetworkSendDataEm(lServer, serverSideConId, data, 0, data.length, false);
                            
                            step++;
                        }
                    break;
                case 5:
                        {
                            lNetEvent = CAPIWebRtcNetworkDequeue(lServer);
                            if(lNetEvent == null)
                                break;
                            
                            expect(lNetEvent.netEventType).toBe(NetEventType.UnreliableMessageReceived);
                            expect(lNetEvent.data).not.toBe(null);
                            console.debug(lNetEvent.data);
                            expect(lNetEvent.data[0]).toBe(44);
                            step++;
                        }
                    break;
                case 6:
                        {
                            lNetEvent = CAPIWebRtcNetworkDequeue(lClient);
                            if(lNetEvent == null)
                                break;
                            
                            expect(lNetEvent.netEventType).toBe(NetEventType.UnreliableMessageReceived);
                            expect(lNetEvent.data).not.toBe(null);
                            console.debug(lNetEvent.data);
                            expect(lNetEvent.data[0]).toBe(45);
                            done();
                        }
                    break;
                default:
                    done.fail("invalid step");
            }
            
            console.log("step " + step + "/7");
        }, 10);
    }, 10000);
    
});

