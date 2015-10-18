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
        ServerInitialized = 3,
        ServerInitFailed = 4,
        ServerClosed = 5,
        NewConnection = 6,
        ConnectionFailed = 7,
        Disconnected = 8,
        FatalError = 100, //not yet used
        Warning = 101,//not yet used
        Log = 102 //not yet used
    }

    /// <summary>
    /// Contains information about events received by the network.
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

        internal NetworkEvent(NetEventType t)
        {
            type = t;
            connectionId = ConnectionId.INVALID;
            data = null;
        }
        internal NetworkEvent(NetEventType t, ConnectionId conId, object dt)
        {
            type = t;
            connectionId = conId;
            data = dt;
        }


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
