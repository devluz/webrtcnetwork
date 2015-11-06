/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
using System;
using System.Collections.Generic;

namespace Luz.ULib.Net
{
    /// <summary>
    /// Interface to a network that doesn't enforce storing any states.
    /// 
    /// Anything more is reusable between multiple different networks.
    /// </summary>
    public interface INetwork
    {
        /// <summary>
        /// This will return the incomming network events. Call this method and handle the incommen events until it returns false.
        /// </summary>
        /// <param name="evt"></param>
        /// <returns>Returns true if the parameter evt contains a new event. False if there are no events to process left.</returns>
        bool Dequeue(out NetworkEvent evt);

        /// <summary>
        /// Sends buffered data.
        /// </summary>
        void Flush();

        /// <summary>
        /// Sends the content if a byte array to the given connection.
        /// </summary>
        /// <param name="id">The id of the recipient</param>
        /// <param name="data">Byte array containing the data to send</param>
        /// <param name="offset">The index in data where the network should start to send</param>
        /// <param name="length">Length in bytes you want to send</param>
        /// <param name="reliable">True to send a reliable message(tcp style) and false to send unreliable (udp style)</param>
        void SendData(ConnectionId id, byte[] data, int offset, int length, bool reliable);

        /// <summary>
        /// Disconnects the given connection
        /// </summary>
        /// <param name="id">Id of the connection to disconnect.</param>
        void Disconnect(ConnectionId id);

        /// <summary>
        /// Disconnects all connection and shutsdown the server if started.
        /// Dequeue will still return the confirmation messages such as Disconnected event for each connection.
        /// 
        /// </summary>
        void Shutdown();

        /// <summary>
        /// Call this every frame if you intend to read incomming messages using Dequeue. This will make
        /// sure all data is read received by the network.
        /// </summary>
        void Update();
    }
    /// <summary>
    /// Shared interface for WebRtcNetwork and UnityNetwork.
    /// 
    /// Keep in mind that in the current version the network can only act as a server (StartServer method) or 
    /// as a client (via Connect method).
    /// </summary>
    public interface IBasicNetwork : INetwork
    {
        /// <summary>
        /// List of all known connections
        /// </summary>
        IList<ConnectionId> Connections { get; }

        /// <summary>
        /// True if the system either runs in server mode or in client mode and is connected to a server.
        /// </summary>
        bool IsRunning { get; }

        /// <summary>
        /// True if the network runs in server mode and allows incomming connections.
        /// </summary>
        bool IsServer { get; }

        /// <summary>
        /// Starts a new server. After the server is started the Dequeue method will return a
        /// ServerInitialized event with the address in the Info field.
        /// 
        /// If the server fails to start it will return a ServerInitFailed event. If the
        /// server is closed due to an error or the Shutdown method a ServerClosed event
        /// will be triggered.
        /// </summary>
        void StartServer();


        /// <summary>
        /// Connects to a given address or roomname.
        /// 
        /// This call will result in one of those 2 events in response:
        /// * NewConnection if the connection was etablished
        /// * ConnectionFailed if the connection failed.
        /// 
        /// 
        /// </summary>
        /// <param name="address">A string that idendifies the target.</param>
        /// <returns>Returns the Connection id the etablished connection will have (only supported by WebRtcNetwork).</returns>
        ConnectionId Connect(string address);
    }
}
