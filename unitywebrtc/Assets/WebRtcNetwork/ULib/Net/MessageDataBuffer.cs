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

    /** This interface is used to return message data.
     * 
     * Use MessageDataBuffer.Buffer only to read data between
     * the index 0 and MessageDataBuffer.ContentLength.
     * 
     * After reading use Dispose to allow the network to
     * reuse this buffer and spare the Garbage Collector
     * the work.
     * 
     * Make sure not to keep any references to
     * MessageDataBuffer.Buffer after calling Dispose!
     * 
     * If you need to store the byte array creata a copy
     * of the content before using Dispose.
     * 
     * 
     * 
     */
    public interface MessageDataBuffer : IDisposable
    {
        /// <summary>
        /// Returns the buffer that contains the message data.
        /// Don't use Buffer.Length! The buffer might be longer than the actualy message.
        /// use ContentLength to get the length of the content
        /// </summary>
        byte[] Buffer
        {
            get;
        }

        /// <summary>
        /// Returns the length of the buffers content.
        /// </summary>
        int ContentLength
        {
            get;
        }
    }
}
