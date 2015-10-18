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
    /// Connection id idendifies one specific endpoint in a IBaseNetwork.
    /// 
    /// They can only be used locally for a single instance of IBaseNetwork!
    /// </summary>
    [Serializable]
    public struct ConnectionId
    {
        public static readonly ConnectionId INVALID = new ConnectionId() { id = -1 };
        public short id;

        public override bool Equals(object obj)
        {
            if(obj is ConnectionId)
            {
                ConnectionId o = (ConnectionId)obj;
                return o == this;
            }
            return false;
        }

        public override int GetHashCode()
        {
            return id.GetHashCode();
        }
        public static bool operator ==(ConnectionId i1, ConnectionId i2)
        {
            return i1.id == i2.id;
        }
        public static bool operator !=(ConnectionId i1, ConnectionId i2)
        {
            bool areEqual = i1 == i2;
            return !areEqual;
        }
        public static bool operator <(ConnectionId i1, ConnectionId i2)
        {
            return i1.id < i2.id;
        }
        public static bool operator >(ConnectionId i1, ConnectionId i2)
        {
            return i1.id > i2.id;
        }
        public static bool operator <=(ConnectionId i1, ConnectionId i2)
        {
            return i1.id <= i2.id;
        }
        public static bool operator >=(ConnectionId i1, ConnectionId i2)
        {
            return i1.id >= i2.id;
        }

        public override string ToString()
        {
            return id.ToString();
        }
    }
}
