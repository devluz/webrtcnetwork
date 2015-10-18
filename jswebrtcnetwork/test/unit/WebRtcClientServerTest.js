/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
describe("WebRtcClientConnectorServerTest", function() {
//tests the connect process of client / server
//TODO: add a test for multiple clients / one server
    it("ClientServerConnection", function(done)
    {        
        var calls = 0;
        function OnServerStarted()
        {
            calls++;
            console.debug("OnServerStarted");
        }
        function OnServerStopped(lMsg)
        {
            console.error("OnServerStopped: " + lMsg);
            done.fail();
        }
        function OnServerNewConnection()
        {
            calls++;
            if(calls == 3)
                done();
            console.debug("OnServerNewConnection");
        }
        
        function OnClientConnected()
        {
            calls++;
            if(calls == 3)
                done();
            console.debug("OnClientConnected");
        }
        function OnClientConnectionFailed(lMsg)
        {
            console.error("OnClientConnectionFailed " + lMsg);
            done.fail();
        }
            
        var serverSignaling = new LocalSignalingChan();
        var server = new WebRtcServerConnector(serverSignaling);
        server.OnServerStarted =  OnServerStarted;
        server.OnServerStopped = OnServerStopped;
        server.OnNewConnection = OnServerNewConnection;
        server.OnLog = function(lMsg)
        {
            console.log("Server: " + lMsg);
        };
        
        var clientSignaling = new LocalSignalingChan();
        var client = new WebRtcClientConnector(clientSignaling);
        client.OnConnected = OnClientConnected;
        client.OnConnectionFailed = OnClientConnectionFailed;
        client.OnLog = function(lMsg)
        {
            console.log("Client: " + lMsg);
        };
        
        //start
        server.StartServer("testroom");
        client.Connect("testroom");
    }, 5000);
});
