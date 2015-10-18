/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
describe("LocalSignaling", function() {
    
    beforeEach(function() {
        //reset all opened rooms fore each test so they don't interfere
        LocalSignalingChan.sRooms = {};
    });
    
    it("ServerOpenClose", function()
    {
        var server = new LocalSignalingChan();
        
        var latestMessageType = null;
        var latestMessage = null;
        
        server.Open("Test", function(lMsgType, lMsg) 
        {
            latestMessageType = lMsgType;
            latestMessage = lMsg;
            
        });
        
        expect(latestMessageType).toBe(SignalingMessageType.Connected);
        expect(latestMessage).toBe(null);
        
        
        var messageContent = "test";
        server.SendMessage(messageContent);
        expect(latestMessageType).toBe(SignalingMessageType.UserMessage);
        expect(latestMessage).toBe(messageContent);
        
        server.Close();
        expect(latestMessageType).toBe(SignalingMessageType.Closed);
        expect(latestMessage).toBe(null);
  });
    it("ServerClient", function()
    {
        var testRoomName = "TestRoom";
        var server = new LocalSignalingChan();
        var client = new LocalSignalingChan();
        
        var latestServerMessageType = null;
        var latestServerMessage = null;
        
        server.Open(testRoomName, function(lMsgType, lMsg) 
        {
            latestServerMessageType = lMsgType;
            latestServerMessage = lMsg;
            
        });
        expect(latestServerMessageType).toBe(SignalingMessageType.Connected);
        expect(latestServerMessage).toBe(null);
        
        var latestClientMessageType = null;
        var latestClientMessage = null;
        
        client.Connect(testRoomName, function(lMsgType, lMsg) 
        {
            latestClientMessageType = lMsgType;
            latestClientMessage = lMsg;
        });
        expect(latestClientMessageType).toBe(SignalingMessageType.Connected);
        expect(latestClientMessage).toBe(null);
        
        
        var messageContent = "test";
        server.SendMessage(messageContent);
        expect(latestServerMessageType).toBe(SignalingMessageType.UserMessage);
        expect(latestServerMessage).toBe(messageContent);
        expect(latestClientMessageType).toBe(SignalingMessageType.UserMessage);
        expect(latestClientMessage).toBe(messageContent);
        
        var messageContent = "test2";
        client.SendMessage(messageContent);
        expect(latestServerMessageType).toBe(SignalingMessageType.UserMessage);
        expect(latestServerMessage).toBe(messageContent);
        expect(latestClientMessageType).toBe(SignalingMessageType.UserMessage);
        expect(latestClientMessage).toBe(messageContent);
        
        
        server.Close();
        expect(latestServerMessageType).toBe(SignalingMessageType.Closed);
        expect(latestServerMessage).toBe(null);
        expect(latestClientMessageType).toBe(SignalingMessageType.Closed);
        expect(latestClientMessage).toBe(null);

    });
});