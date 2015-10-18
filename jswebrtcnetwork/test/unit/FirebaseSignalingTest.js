/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
describe("FirebaseSignaling", function()
{
    //testing the signaling channel. turned off by default as they use network
    //and are very slow
    
    it("ServerOpenClose", function(done)
    {
        var server = new FirebaseSignalingChan();
        
        var latestMessageType = null;
        var latestMessage = null;
        
        
        
        
        server.Open("Test", function(lMsgType, lMsg) 
        {
            latestMessageType = lMsgType;
            latestMessage = lMsg;
            
        });
        
        
        WaitFor(function(){return latestMessageType != null;}, 5000, "Server didn't open", function()
        {
            expect(latestMessageType).toBe(SignalingMessageType.Connected);
            latestMessageType = null;
            server.Close();
            WaitForClose();
        });
        
        function WaitForClose()
        {
            WaitFor(function(){return latestMessageType != null;}, 3000, "Server didn't close", function()
            {
                expect(latestMessageType).toBe(SignalingMessageType.Closed);
                server.Close();
                done();
            });    
        }
    }, 10000);
    
    
    it("ServerOpen Connect ServerClose", function(done)
    {
        var server = new FirebaseSignalingChan();
        var client = new FirebaseSignalingChan();
        
        var latestMessageType = null;
        var latestMessage = null;
        var clientLatestMessageType = null;
        var clientLatestMessage = null;
        
        
        
        
        server.Open("Test", function(lMsgType, lMsg) 
        {
            latestMessageType = lMsgType;
            latestMessage = lMsg;
            
        });
        
        
        WaitFor(function(){return latestMessageType != null;}, 5000, "Server didn't open", function()
        {
            expect(latestMessageType).toBe(SignalingMessageType.Connected);
            latestMessageType = null;
            clientLatestMessageType = null;
            
            
            client.Connect("Test", function(lMsgType, lMsg) 
            {
                clientLatestMessageType = lMsgType;
                clientLatestMessage = lMsg;
            });
            WaitForClientConnect();
        });
        
        function WaitForClientConnect()
        {
            WaitFor(function(){return clientLatestMessageType != null;}, 3000, "Client didn't connect", function()
            {
                expect(clientLatestMessageType).toBe(SignalingMessageType.Connected);
                latestMessageType = null;
                clientLatestMessageType = null;
                
                server.Close();
                WaitForServerClose();
                
            });    
        }
        
        function WaitForServerClose()
        {
            WaitFor(function(){return latestMessageType != null;}, 3000, "Server didn't close", function()
            {
                expect(latestMessageType).toBe(SignalingMessageType.Closed);
                WaitForClientClose();
            });    
        }        
        function WaitForClientClose()
        {
            WaitFor(function(){return clientLatestMessageType != null;}, 3000, "Client didn't close", function()
            {
                expect(clientLatestMessageType).toBe(SignalingMessageType.Closed);
                done();
            });    
        }
        
    }, 10000);
  
    it("Send Message test", function(done)
    {
        var server = new FirebaseSignalingChan();
        var client = new FirebaseSignalingChan();
        
        var latestMessageType = null;
        var latestMessage = null;
        var clientLatestMessageType = null;
        var clientLatestMessage = null;
        
        
        
        
        server.Open("Test", function(lMsgType, lMsg) 
        {
            latestMessageType = lMsgType;
            latestMessage = lMsg;
            
        });
        
        
        WaitFor(function(){return latestMessageType != null;}, 5000, "Server didn't open", function()
        {
            expect(latestMessageType).toBe(SignalingMessageType.Connected);
            latestMessageType = null;
            clientLatestMessageType = null;
            
            
            client.Connect("Test", function(lMsgType, lMsg) 
            {
                clientLatestMessageType = lMsgType;
                clientLatestMessage = lMsg;
            });
            WaitForClientConnect();
        });
        
        function WaitForClientConnect()
        {
            WaitFor(function(){return clientLatestMessageType != null;}, 3000, "Client didn't connect", function()
            {
                expect(clientLatestMessageType).toBe(SignalingMessageType.Connected);
                latestMessageType = null;
                clientLatestMessageType = null;
                
                client.SendMessage("test message");
                WaitForMessageOnServer();
                
            });    
        }
        function WaitForMessageOnServer()
        {
            WaitFor(function(){return latestMessageType != null;}, 100, "Server didn't receive message", function()
            {
                expect(latestMessageType).toBe(SignalingMessageType.UserMessage);
                expect(latestMessage).toBe("test message");
                
                //end test here because there can be undefined messages on the server side
                done();
            });    
        }
  }, 10000);
});