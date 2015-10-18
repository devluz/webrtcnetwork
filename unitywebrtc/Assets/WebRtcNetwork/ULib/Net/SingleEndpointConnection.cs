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
    
#if !UNITY_WEBGL
    public class SingleEndpointConnection : MonoBehaviour
    {
        private NetworkView receiver;

        public NetworkView Receiver
        {
            get { return receiver; }
            set
            {receiver = value; }
        }
        private NetworkView sender;

        public NetworkView Sender
        {
            get { return sender; }
            set { sender = value; }
        }
        private NetworkPlayer connectedUser;

        public NetworkPlayer ConnectedUser
        {
            get { return connectedUser; }
            set { connectedUser = value; }
        }
        private UnityNetwork parent;

        public UnityNetwork Parent
        {
            get { return parent; }
            set { parent = value; }
        }
        
        public float uRefreshPerSecondSent = 16;
        public float uDebugRefreshPerSecondRec = 0;
        private int mRefreshSentSum = 0;
        private int mRefreshRecSum = 0;
        private float mLastAverage = 0;
        private void Awake()
        {

        }
        private void Start()
        {

        }
        private void Update()
        {
            mLastAverage += Time.deltaTime;
            if(mLastAverage > 1)
            {
                uDebugRefreshPerSecondRec = (uDebugRefreshPerSecondRec + mRefreshRecSum / mLastAverage) * 0.5f;
                uRefreshPerSecondSent = (uRefreshPerSecondSent + mRefreshSentSum / mLastAverage) * 0.5f;
                mLastAverage = 0;
                mRefreshRecSum = 0;
                mRefreshSentSum = 0;
            }
        }

        public void Init()
        {
            this.receiver.observed = this;
            this.sender.observed = this;
            if(Network.isServer)
                RefreshScope();
        }

        public void OnSerializeNetworkView(BitStream stream, NetworkMessageInfo info)
        {
            if(stream.isReading)
            {
                mRefreshRecSum++;
            }
            else
            {
                mRefreshSentSum++;
            }
            parent.SingleEndpoint_OnSerialize(stream, ConnectedUser);
        }
        public void RefreshScope()
        {
            for(int i = 0; i < Network.connections.Length; i++)
            {
                if(connectedUser == Network.connections[i])
                {
                    sender.SetScope(Network.connections[i], true);
                }
                else
                {
                    sender.SetScope(Network.connections[i], false);
                }
            }
        }

    }
#endif
}
