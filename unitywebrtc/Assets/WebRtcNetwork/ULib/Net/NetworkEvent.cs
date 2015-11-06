/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Luz.ULib.Net
{
    /// <summary>
    /// Type of the received network event.
    /// </summary>
    public enum NetEventType : byte
    {
        Invalid = 0,
        UnreliableMessageReceived = 1,
        ReliableMessageReceived = 2,
        ServerInitialized = 3,//confirmation that the server was started. other people will be able to connect
        ServerInitFailed = 4,//server couldn't be started
        ServerClosed = 5,//server was closed. no new incomming connections
        NewConnection = 6,//new incomming or outgoing connection etablished
        ConnectionFailed = 7,//outgoing connection failed
        Disconnected = 8,//a connection was disconnected
        FatalError = 100, //not yet used
        Warning = 101,//not yet used
        Log = 102 //not yet used
    }

    /// <summary>
    /// Contains information about events received by the network.
    /// 
    /// The type of the network event decides the content it can contain.
    /// 
    /// Most important are:
    /// 
    /// UnreliableMessageReceived / ReliableMessageReceived:
    /// A new message was received. The property MessageData will return
    /// a buffer + byte array containing the data received.
    /// 
    /// ServerInitialized:
    /// A call to StartServer was successful. The Info property will return the address
    /// the server can be accessed by.
    /// 
    /// 
    /// </summary>
    public struct NetworkEvent
    {
        private NetEventType type;

        /// <summary>
        /// Returns the type of the message.
        /// </summary>
        public NetEventType Type
        {
            get
            {
                return type;
            }
        }

        private ConnectionId connectionId;

        /// <summary>
        /// Returns the related connection id or ConnecitonId.Invalid if there is none.
        /// </summary>
        public ConnectionId ConnectionId
        {
            get
            {
                return connectionId;
            }
        }


        private object data;

        /// <summary>
        /// Returns an object belonging to the event.
        /// This can be a MessageDataBuffer containing a byte array or a string.
        /// </summary>
        public object RawData
        {
            get { return data; }
        }
        /// <summary>
        /// Returns the content of the messages if the event type is
        /// UnreliableMessageReceived or ReliableMessageReceived.
        /// 
        /// null for all other message types.
        /// </summary>
        public MessageDataBuffer MessageData
        {
            get
            {
                return data as MessageDataBuffer;
            }
        }

        /// <summary>
        /// Contains additional information or null
        /// Only used so far for NetEventType.ServerInitialized to return the servers address information.
        /// </summary>
        public string Info
        {
            get
            {
                return data as string;
            }
        }

        /// <summary>
        /// Creates a new network event of a certain type setting 
        /// connection id to invalid and data to null.
        /// 
        /// Internal only. Do not use.
        /// </summary>
        /// <param name="t">The type of this event</param>
        internal NetworkEvent(NetEventType t)
        {
            type = t;
            connectionId = ConnectionId.INVALID;
            data = null;
        }

        /// <summary>
        /// Creates a network event with the given content
        /// 
        /// Internal only. Do not use.
        /// </summary>
        /// <param name="t">Typename</param>
        /// <param name="conId">ConnectionId the event is from / relates to</param>
        /// <param name="dt">Data. String or MessageDataBuffer</param>
        internal NetworkEvent(NetEventType t, ConnectionId conId, object dt)
        {
            type = t;
            connectionId = conId;
            data = dt;
        }

        /// <summary>
        /// Converts the event to string. Use for debugging only.
        /// </summary>
        /// <returns>A string representation of the network event.</returns>
        public override string ToString()
        {
            StringBuilder datastring = new StringBuilder();
            datastring.Append("NetworkEvent type: ");
            datastring.Append(type);
            datastring.Append(" connection: ");
            datastring.Append(connectionId);
            datastring.Append(" data: ");

            if (data is ByteArrayBuffer)
            {
                ByteArrayBuffer msg = (ByteArrayBuffer)data;

                //datastring.Append(Encoding.ASCII.GetString(msg.array, msg.offset, msg.positionWrite));
                datastring.Append(BitConverter.ToString(msg.array, 0, msg.positionWrite));

            }
            else
            {
                datastring.Append(data);
            }
            return datastring.ToString();
        }
    }
}
