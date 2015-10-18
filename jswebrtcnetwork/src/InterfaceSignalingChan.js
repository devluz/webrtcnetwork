/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */

/**Definition of the interface. This just exists to make it easier to create
 * custom signaling channels.
 * 
 * @returns {InterfaceSignalingChan}
 */
function InterfaceSignalingChan()
{
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
    };
    
    /**Same as open but it only connects to an existing room
     * 
     * @param {type} lName
     * @param {type} lHandler
     * @returns {undefined}
     */
    this.Connect = function(lName, lHandler)
    {
    };
    
    /**Closes the signaling channel
     * Will return SignalingMessageType.Closed via handler.
     * @returns {undefined}
     */
    this.Close = function()
    {
    };
    
    
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
    };
}