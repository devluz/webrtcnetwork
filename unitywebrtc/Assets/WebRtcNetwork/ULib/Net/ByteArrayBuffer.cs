/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using UnityEngine;

namespace Luz.ULib.Net
{

    internal class ByteArrayBuffer : MessageDataBuffer
    {
        internal byte[] array;
        internal int positionWrite;
        internal int positionRead;

        //MessageDataBuffer interface
        public byte[] Buffer
        {
            get
            {
                if (mDisposed)
                    throw new InvalidOperationException("Object is already disposed. No further use allowed.");
                return array;
            }
        }

        public int ContentLength
        {
            get
            {
                if (mDisposed)
                    throw new InvalidOperationException("Object is already disposed. No further use allowed.");
                return positionWrite;
            }
        }



        private bool mFromPool = true;
        private bool mDisposed = false;

        public bool IsDisposed
        {
            get { return mDisposed; }
        }

        private ByteArrayBuffer(int size)
        {
            mFromPool = true;
            array = new byte[size];
            positionWrite = 0;
            positionRead = 0;
        }
        public ByteArrayBuffer(byte[] arr)
        {
            mFromPool = false; //in case we have a pool system soon. all created with this constructor werent taken from the pool!!! mainly comes from unitys RPC function in UnityNetwork
            array = arr;
            positionRead = 0;
            positionWrite = arr.Length;
        }
        private void Reset()
        {
            mDisposed = false;
            positionRead = 0;
            positionWrite = 0;
        }
        ~ByteArrayBuffer()
        {
            if (mDisposed == false && mFromPool == true)
            {
                Debug.LogWarning("ByteArrayBuffer wasn't disposed.");
            }
        }

        public void CopyFrom(byte[] arr, int srcOffset, int len)
        {
            System.Buffer.BlockCopy(arr, srcOffset, this.array, 0, len);
            this.positionWrite = len;
        }

        private static List<ByteArrayBuffer>[] sPool = new List<ByteArrayBuffer>[32];

        static ByteArrayBuffer()
        {
            for (int i = 0; i < sPool.Length; i++)
            {
                sPool[i] = new List<ByteArrayBuffer>();
            }
        }



        static int[] MultiplyDeBruijnBitPosition = 
        {
  0, 1, 28, 2, 29, 14, 24, 3, 30, 22, 20, 15, 25, 17, 4, 8, 
  31, 27, 13, 23, 21, 19, 16, 7, 26, 12, 18, 6, 11, 5, 10, 9
        };
        private static int GetPower(uint anyPowerOfTwo)
        {
            uint index = (anyPowerOfTwo * 0x077CB531U) >> 27;
            return MultiplyDeBruijnBitPosition[(int)index];
        }
        private static uint NextPowerOfTwo(uint v)
        {
            v |= v >> 1;
            v |= v >> 2;
            v |= v >> 4;
            v |= v >> 8;
            v |= v >> 16;
            v++;
            return v;
        }


        //List<ByteArrayBuffer> sPool[] = new List<ByteArrayBuffer>();
        public static ByteArrayBuffer Get(int size)
        {
            uint pw = NextPowerOfTwo((uint)size);
            if (pw < 128)
                pw = 128;

            int index = GetPower(pw);

            if (sPool[index].Count == 0)
            {
                return new ByteArrayBuffer((int)pw);
            }
            else
            {
                List<ByteArrayBuffer> sizedPool = sPool[index];
                ByteArrayBuffer buff = sizedPool[sizedPool.Count - 1];
                sizedPool.RemoveAt(sizedPool.Count - 1);
                buff.Reset();
                return buff;
            }
            //int powerOfTwo = 
        }

        public void Dispose()
        {
            if (mDisposed)
                throw new InvalidOperationException("Object is already disposed. No further use allowed.");
            mDisposed = true;
            if (mFromPool)
            {
                int index = GetPower((uint)array.Length);
                sPool[index].Add(this);
            }
        }

    }

}
