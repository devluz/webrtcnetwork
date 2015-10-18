/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
describe("WebRtcNetworkTest", function() {
//tests most of WebRtcNetwork
//uses webrtc and relies on stun server thus might be slow
//or even time out. No way around without mocking webrtc
    var lServer;
    var lClient;
    var lNetEvent;
    var roomName = "testname";
    
        
    function NextServerEvent()
    {
        return (lNetEvent = lServer.Dequeue()) != null;
    }
    function NextClientEvent()
    {
        return (lNetEvent = lClient.Dequeue()) != null;
    }
    
    beforeEach(function() {
        //reset all opened rooms fore each test so they don't interfere
        LocalSignalingChan.sRooms = {};
        
        //LocalSignalingChan
        var lConfig =
                {
                    Signaling : {name : "LocalSignalingChan"}
                };
        lServer = new WebRtcNetwork(lConfig);
        lClient = new WebRtcNetwork(lConfig);
    });
    
   it("Start and stop server", function()
    {
        lServer.StartServer(roomName);
        
        lNetEvent = lServer.Dequeue();
        expect(lNetEvent).not.toBe(null);
        expect(lNetEvent.netEventType).toBe(NetEventType.ServerInitialized);
        lServer.Shutdown();
        
        lNetEvent = lServer.Dequeue();
        expect(lNetEvent).not.toBe(null);
        expect(lNetEvent.netEventType).toBe(NetEventType.ServerClosed);
    });
        
   it("Connect fail", function()
    {
        lClient.Connect(roomName);
        
        lNetEvent = lClient.Dequeue();
        expect(lNetEvent).not.toBe(null);
        expect(lNetEvent.netEventType).toBe(NetEventType.ConnectionFailed);
    });
    it("Server start connect disconnect", function(done)
    {
        
        lServer.StartServer(roomName);
        WaitFor(NextServerEvent, 5000, "server didn't start in time", function()
        {
            expect(lNetEvent).not.toBe(null);
            expect(lNetEvent.netEventType).toBe(NetEventType.ServerInitialized);
            
            WaitForClientConnect();
        });
        
        function WaitForClientConnect()
        {
            lClient.Connect(roomName);
            WaitFor(NextClientEvent, 8000, "wait for client connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                
                WaitForServerConnect();
            });
        }
        
        function WaitForServerConnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                lClient.Disconnect(lNetEvent.connectionId);
                
                WaitForClientDisconnect();
            });
        }
        
        function WaitForClientDisconnect()
        {
            WaitFor(NextClientEvent, 100, "wait for client disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                
                WaitForServerDisconnect();
            });
        }
        function WaitForServerDisconnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                
                done();
            });
        }
    });
    
    it("Server start connect client shutdown", function(done)
    {
        lServer.StartServer(roomName);
        WaitFor(NextServerEvent, 5000, "server didn't start in time", function()
        {
            expect(lNetEvent).not.toBe(null);
            expect(lNetEvent.netEventType).toBe(NetEventType.ServerInitialized);
            
            WaitForClientConnect();
        });
        
        function WaitForClientConnect()
        {
            lClient.Connect(roomName);
            WaitFor(NextClientEvent, 8000, "wait for client connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                
                WaitForServerConnect();
            });
        }
        
        function WaitForServerConnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                
                lClient.Shutdown();
                
                WaitForClientDisconnect();
            });
        }
        
        function WaitForClientDisconnect()
        {
            WaitFor(NextClientEvent, 100, "wait for client disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                
                WaitForServerDisconnect();
            });
        }
        function WaitForServerDisconnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                
                done();
            });
        }
    }, 10000);
    
    it("Server start connect server shutdown", function(done)
    {
        lServer.StartServer(roomName);
        WaitFor(NextServerEvent, 5000, "server didn't start in time", function()
        {
            expect(lNetEvent).not.toBe(null);
            expect(lNetEvent.netEventType).toBe(NetEventType.ServerInitialized);
            
            WaitForClientConnect();
        });
        
        function WaitForClientConnect()
        {
            lClient.Connect(roomName);
            WaitFor(NextClientEvent, 8000, "wait for client connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                
                WaitForServerConnect();
            });
        }
        
        function WaitForServerConnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                
                lServer.Shutdown();
                
                WaitForClientDisconnect();
            });
        }
        
        function WaitForClientDisconnect()
        {
            WaitFor(NextClientEvent, 100, "wait for client disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                
                WaitForServerDisconnect();
            });
        }
        function WaitForServerDisconnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                lClient.Disconnect(lNetEvent.connectionId);
                WaitForServerShutdown();
            });
        }
        function WaitForServerShutdown()
        {
            WaitFor(NextServerEvent, 100, "wait for server shutdown", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.ServerClosed);
                lClient.Disconnect(lNetEvent.connectionId);
                done();
            });
        }
    }, 10000);
    

    it("Server start connect client disconnect", function(done)
    {
        lServer.StartServer(roomName);
        WaitFor(NextServerEvent, 5000, "server didn't start in time", function()
        {
            expect(lNetEvent).not.toBe(null);
            expect(lNetEvent.netEventType).toBe(NetEventType.ServerInitialized);
            
            WaitForClientConnect();
        });
        
        function WaitForClientConnect()
        {
            lClient.Connect(roomName);
            WaitFor(NextClientEvent, 8000, "wait for client connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                
                WaitForServerConnect();
            });
        }
        
        function WaitForServerConnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                
                lClient.Disconnect(lNetEvent.connectionId);
                
                WaitForClientDisconnect();
            });
        }
        
        function WaitForClientDisconnect()
        {
            WaitFor(NextClientEvent, 100, "wait for client disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                
                WaitForServerDisconnect();
            });
        }
        function WaitForServerDisconnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                
                done();
            });
        }
    }, 10000);
    
    
    it("Server start connect message disconnect", function(done)
    {
        lServer.StartServer(roomName);
        WaitFor(NextServerEvent, 5000, "server didn't start in time", function()
        {
            expect(lNetEvent).not.toBe(null);
            expect(lNetEvent.netEventType).toBe(NetEventType.ServerInitialized);
            
            WaitForClientConnect();
        });
        
        function WaitForClientConnect()
        {
            lClient.Connect(roomName);
            WaitFor(NextClientEvent, 8000, "wait for client connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                
                WaitForServerConnect();
            });
        }
        
        function WaitForServerConnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server connection", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.NewConnection);
                
                       
                var data = new Uint8Array(1);
                data[0] = 42;
                lServer.SendData(lNetEvent.connectionId, data, true);
                
                WaitForClientMessageReceived();
            });
        }
        
        function WaitForClientMessageReceived()
        {                     
            
            WaitFor(NextClientEvent, 100, "wait for client message received", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.ReliableMessageReceived);
                expect(lNetEvent.data[0]).toBe(42);
                
                //TODO check content
                
                var data = new Uint8Array(1);
                data[0] = 43;
                lClient.SendData(lNetEvent.connectionId, data, false);
                
                WaitForServerMessageReceived();
            });
        }
        function WaitForServerMessageReceived()
        {
            WaitFor(NextServerEvent, 100, "wait for server message received", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.UnreliableMessageReceived);
                expect(lNetEvent.data[0]).toBe(43);
                
                //TODO check content
                
                lServer.Disconnect(lNetEvent.connectionId);
                WaitForServerDisconnect();
            });
        }
        function WaitForServerDisconnect()
        {
            WaitFor(NextServerEvent, 100, "wait for server disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                
                WaitForClientDisconnect();
            });
        }
        function WaitForClientDisconnect()
        {
            WaitFor(NextClientEvent, 100, "wait for client disconnected", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.Disconnected);
                
                lServer.Shutdown();
                WaitForServerShutdown();
            });
        }
        function WaitForServerShutdown()
        {
            WaitFor(NextServerEvent, 100, "wait for server shutdown", function()
            {
                expect(lNetEvent).not.toBe(null);
                expect(lNetEvent.netEventType).toBe(NetEventType.ServerClosed);
                
                done();
            });
        }
    }, 10000);
    
});

