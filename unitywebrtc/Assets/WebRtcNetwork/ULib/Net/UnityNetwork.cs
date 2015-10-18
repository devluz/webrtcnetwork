/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
#pragma warning disable 0618
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using UnityEngine;

namespace Luz.ULib.Net
{
#if !UNITY_WEBGL
    public class UnityNetwork : MonoBehaviour, IBasicNetwork
    {
        private float mDebugTimeout = 5;
        private float mDebugConnectingStart = 0;
        private bool mDebugConnecting = false; //set to true after connecting and false again after error or etablished to find a bug that causes it to get stuck during connecting
        public static bool IsAvailable()
        {
            return true;
        }

        private static UnityNetwork sInstance;
        public static UnityNetwork Get()
        {
            if (sInstance == null)
            {
                GameObject go = new GameObject("UnityNetwork");
                NetworkView view = go.AddComponent<NetworkView>();
                view.stateSynchronization = NetworkStateSynchronization.Off;

                sInstance = go.AddComponent<UnityNetwork>();
            }

            return sInstance;
        }

        public static String sName = "Unity";



        private ConnectionId mLastId = new ConnectionId();
        private Dictionary<NetworkPlayer, ConnectionId> mPlayerToConnectionId = new Dictionary<NetworkPlayer, ConnectionId>();

        private Dictionary<ConnectionId, SingleEndpointConnection> mKnownPlayers = new Dictionary<ConnectionId, SingleEndpointConnection>();
        private Dictionary<ConnectionId, SingleEndpointConnection> _KnownPlayers
        {
            get { return mKnownPlayers; }
        }

        public bool IsRunning
        {
            get
            {
                return Network.isClient || Network.isServer;
            }
        }
        public bool IsServer
        {
            get
            {
                return Network.isServer;
            }
        }
        public IList<ConnectionId> Connections
        {
            get
            {
                List<ConnectionId> list = new List<ConnectionId>();
                list.AddRange(_KnownPlayers.Keys);
                return list;
            }
        }

        public float uTargetSendRate = 16;
        public float uUnityConfigSendRate = 16;
        public float uActualAverageSendRate = 16;

        public static readonly int UserIdError = -1;
        public static readonly int UserIdAll = -2;


        private Dictionary<ConnectionId, Queue<ByteArrayBuffer>> mOutgoingUnreliableMessages = new Dictionary<ConnectionId, Queue<ByteArrayBuffer>>();





        private Queue<NetworkEvent> mEvents = new Queue<NetworkEvent>();
        private NetworkView glNetworkView;
        private string mConnectionInfo = null;
        public string _ConnectionInfo
        {
            get
            {
                return mConnectionInfo;
            }
        }


        private void Awake()
        {
            DontDestroyOnLoad(this.gameObject);
            glNetworkView = this.GetComponent<NetworkView>();
        }


        ~UnityNetwork()
        {
            //Debug.Log("UnityNetwork destroyed!!!!!!!!!!");
        }
        private void OnDestroy()
        {
            Network.Disconnect();
        }



        public ConnectionId Connect(string address)
        {
            mEvents.Clear();
            ConnectToGuid(address);
            return ConnectionId.INVALID;
        }

        public void ConnectToGuid(string guid)
        {
            mEvents.Clear();
            NetworkConnectionError err = Network.Connect(guid);
            Debug.Log("ConnectTo" + err);
            if (err != NetworkConnectionError.NoError)
            {
                NetworkEvent ev = new NetworkEvent(NetEventType.ConnectionFailed, ConnectionId.INVALID, "Error " + err);
                mEvents.Enqueue(ev);
            }
            else
            {
                mDebugConnectingStart = Time.time;
                mDebugConnecting = true;
            }
        }

        public void StartServer()
        {
            StartServer(3487);
        }
        public void StartServer(int port)
        {
            mEvents.Clear();
            NetworkConnectionError err = Network.InitializeServer(8, port, true);
            Debug.Log("InitializeServer" + err);
            if (err != NetworkConnectionError.NoError)
            {
                NetworkEvent ev = new NetworkEvent(NetEventType.ServerInitFailed, ConnectionId.INVALID, "Error " + err);
                mEvents.Enqueue(ev);
            }
        }

        public void Shutdown()
        {

            foreach (var v in mKnownPlayers)
            {
                Destroy(v.Value.gameObject);
            }
            mKnownPlayers.Clear();
            mEvents.Clear();
            mOutgoingUnreliableMessages.Clear();
            Network.Disconnect();
            Debug.Log("Unity network shutdown");
        }

        /// <summary>
        /// Used to initialize the UnityNetwork class after the server was started or the client connected.
        /// </summary>
        public void TakeSession()
        {
            if(Network.isServer)
            {
                foreach(NetworkPlayer player in Network.connections)
                {
                    InitializeConnection(player);
                }
            }
            else if (Network.isClient)
            {
                OnConnectedToServer();
            }
            else
            {
                throw new InvalidOperationException("No network running.");
            }
        }


        public void SendData(ConnectionId userId, byte[] data, int offset, int length, bool reliable)
        {
            //if(Network.isServer && method == DeliveryMode.Unreliable && userId != UserIdAll)
            //{
            //    throw new InvalidOperationException("Unity only allows to send to all clients at once from server.");
            //}
            //if(Network.isClient && method == DeliveryMode.Unreliable && (_KnownPlayers.ContainsKey(userId) == false ||_KnownPlayers[userId].player != Network.connections[0]))
            //{
            //    throw new InvalidOperationException("Can only send to server");
            //}



            if (reliable)
            {
                NetworkPlayer pl = this.mKnownPlayers[userId].ConnectedUser;
                NetworkView nv = GetComponent<NetworkView>();
                

                nv.RPC("DeliverMessage", pl, data);
            }
            else
            {
                Queue<ByteArrayBuffer> userOut;
                bool found = mOutgoingUnreliableMessages.TryGetValue(userId, out userOut);
                if(found == false)
                {
                    userOut = new Queue<ByteArrayBuffer>();
                    mOutgoingUnreliableMessages.Add(userId, userOut);
                }
                ByteArrayBuffer msg = ByteArrayBuffer.Get(length);
                msg.CopyFrom(data, offset, length);
                userOut.Enqueue(msg);
            }
        }

        [RPC]
        public void DeliverMessage(byte[] data, NetworkMessageInfo info)
        {
            ConnectionId sender = NetworkPlayerToConnectionId(info.sender);
            ByteArrayBuffer bab = new ByteArrayBuffer(data);
            NetworkEvent ev = new NetworkEvent(NetEventType.ReliableMessageReceived, sender, bab);
            mEvents.Enqueue(ev);
        }

        private void OnPlayerConnected(NetworkPlayer player)
        {
            foreach(var v in mKnownPlayers)
            {
                v.Value.RefreshScope();
            }
        }



        [RPC]
        public void InitializeConnection(NetworkPlayer player)
        {

            //this runs on server side
            Debug.Log("New client connected. Initializing ...");
            ConnectionId playerid = NextConnectionId();
            mPlayerToConnectionId[player] = playerid;


            GameObject go = new GameObject("UnityPlayerConnection" + player);
            go.transform.parent = this.gameObject.transform;
            SingleEndpointConnection connection = go.AddComponent<SingleEndpointConnection>();
            connection.Parent = this;
            connection.ConnectedUser = player;


            NetworkView sender = connection.gameObject.AddComponent<NetworkView>();
            sender.viewID = Network.AllocateViewID();
            //sender.observed = this;
            sender.stateSynchronization = NetworkStateSynchronization.Unreliable;

            //immediately turn off the sender on server side as it would spam to every client by default.
            //it will be turned on for the correct state after the client confirmed the createn of the counterpart
            for (int i = 0; i < Network.connections.Length; i++)
                sender.SetScope(Network.connections[i], false);

            connection.Sender = sender;
            mKnownPlayers[playerid] = connection;
            this.glNetworkView.RPC("AddClientSide", player, sender.viewID);

        }

        private void OnConnectedToServer()
        {
            mDebugConnecting = false;

            Debug.Log("Connected to server.  Initializing ...");

            for (int i = 0; i < Network.connections.Length; i++)
            {
                NetworkPlayer player = Network.connections[i];
                GameObject go = new GameObject("UnityPlayerConnection" + player);
                go.transform.parent = this.gameObject.transform;
                SingleEndpointConnection connection = go.AddComponent<SingleEndpointConnection>();
                connection.Parent = this;
                connection.ConnectedUser = player;

                ConnectionId playerid = NextConnectionId();
                mPlayerToConnectionId[player] = playerid;
                mKnownPlayers[playerid] = connection;
            }



            this.glNetworkView.RPC("InitializeConnection", RPCMode.Server, Network.player);
        }

        /// <summary>
        /// Will be called by the server on the client side to allow the client to receive messages from server
        /// </summary>
        /// <param name="id"></param>
        /// <param name="info"></param>
        [RPC]
        public void AddClientSide(NetworkViewID recieverId, NetworkMessageInfo info)
        {
            NetworkViewID senderViewId = Network.AllocateViewID();
            this.glNetworkView.RPC("AddServerSide", info.sender, senderViewId);

            NetworkPlayer player = info.sender;
            ConnectionId playerid = NetworkPlayerToConnectionId(player);
            SingleEndpointConnection endpoint = mKnownPlayers[playerid];

            NetworkView reciever = endpoint.gameObject.AddComponent<NetworkView>();
            reciever.viewID = recieverId;
            reciever.stateSynchronization = NetworkStateSynchronization.Unreliable;

            NetworkView sender = endpoint.gameObject.AddComponent<NetworkView>();
            sender.viewID = senderViewId;
            sender.stateSynchronization = NetworkStateSynchronization.Unreliable;

            endpoint.Receiver = reciever;
            endpoint.Sender = sender;
            endpoint.Init();


            Debug.Log("Connection to " + playerid + " initialized");
            NetworkEvent ev = new NetworkEvent(NetEventType.NewConnection, playerid, null);
            mEvents.Enqueue(ev);
        }

        private ConnectionId NextConnectionId()
        {
            mLastId.id++;
            return mLastId;
        }

        [RPC]
        public void AddServerSide(NetworkViewID id, NetworkMessageInfo info)
        {
            ConnectionId playerid = NetworkPlayerToConnectionId(info.sender);
            SingleEndpointConnection endpoint = mKnownPlayers[playerid];

            NetworkView reciever = endpoint.gameObject.AddComponent<NetworkView>();
            reciever.viewID = id;
            //reciever.observed = this;
            reciever.stateSynchronization = NetworkStateSynchronization.Unreliable;

            endpoint.Receiver = reciever;
            endpoint.Init();



            Debug.Log("Connection to " + playerid + " initialized");

            mPlayerToConnectionId[info.sender] = playerid;
            NetworkEvent ev = new NetworkEvent(NetEventType.NewConnection, playerid, null);
            mEvents.Enqueue(ev);
        }

        float mLastAjustment = 0;

        public void Update()
        {
            if (Time.time - mLastAjustment > 1.0f)
            {


                float sum = 0;
                int count = 0;
                foreach(var con in mKnownPlayers)
                {
                    sum += con.Value.uRefreshPerSecondSent;
                    count++;
                }
                if(count > 0)
                {
                    float average = sum / count;
                    uActualAverageSendRate = (uActualAverageSendRate + average) * 0.5f;
                    float dif = uTargetSendRate - uActualAverageSendRate;
                    if (uActualAverageSendRate > uTargetSendRate)
                    {
                        uUnityConfigSendRate += dif / 8.0f;
                        Network.sendRate = uUnityConfigSendRate;
                    }else
                    {
                        uUnityConfigSendRate += dif / 8.0f;
                        Network.sendRate = uUnityConfigSendRate;
                    }
                }

                mLastAjustment = Time.time;

            }
        }

        private ConnectionId NetworkPlayerToConnectionId(NetworkPlayer pl)
        {
            ConnectionId result;
            if(mPlayerToConnectionId.TryGetValue(pl, out result))
            {
                return result;
            }else{
                return ConnectionId.INVALID;
            }
        }


        private void OnServerInitialized()
        {
            mConnectionInfo = "" + Network.player.guid;
            Debug.Log("OnServerInitialized GUID: " + mConnectionInfo);
            NetworkEvent ev = new NetworkEvent(NetEventType.ServerInitialized, ConnectionId.INVALID, mConnectionInfo);
            mEvents.Enqueue(ev);
        }


        private void OnFailedToConnect(NetworkConnectionError error)
        {
            mDebugConnecting = false;
            string mErrorMessage = "Could not connect to server: " + error;
            NetworkEvent ev = new NetworkEvent(NetEventType.ConnectionFailed, ConnectionId.INVALID, mErrorMessage);
            mEvents.Enqueue(ev);
            Debug.Log(mErrorMessage);
        }
        private void OnDisconnectedFromServer(NetworkDisconnection info)
        {
            string errormessage;
            if (Network.isServer)
            {
                errormessage = "Server connection disconnected";
                NetworkEvent tev = new NetworkEvent(NetEventType.ServerClosed, ConnectionId.INVALID, errormessage);
                mEvents.Enqueue(tev);
            }
            else
            {
                NetworkEvent tev = new NetworkEvent(NetEventType.Disconnected, ConnectionId.INVALID, null);
                mEvents.Enqueue(tev);
            }

        }

        private void OnPlayerDisconnected(NetworkPlayer player)
        {
            NetworkEvent ev = new NetworkEvent(NetEventType.Disconnected, NetworkPlayerToConnectionId(player), null);
            mEvents.Enqueue(ev);

            if(mKnownPlayers.ContainsKey(ev.ConnectionId))
            {
                mPlayerToConnectionId.Remove(player);
                Destroy(mKnownPlayers[ev.ConnectionId].gameObject);
                mKnownPlayers.Remove(ev.ConnectionId);
            }


        }
        public void SingleEndpoint_OnSerialize(BitStream stream, NetworkPlayer senderOrReceiver)
        {
            //doesnt work. server sends messages automatically to all others


            if (stream.isReading)
            {
                char countin = (char)0;
                stream.Serialize(ref countin);
                int count = (int)countin;
                //Debug.Log(count + " packages sent");
                for (int k = 0; k < count; k++)
                {
                    int length = 0;
                    short lengthin = 0;
                    stream.Serialize(ref lengthin);
                    length = ((int)(ushort)lengthin); //just making sure it converts the - values back into high positive values
                    ByteArrayBuffer msg = ByteArrayBuffer.Get(length);



                    for (int i = 0; i < length; i++)
                    {
                        char c = 'v';
                        stream.Serialize(ref c);
                        msg.array[i] = (byte)c;
                        msg.positionWrite++;
                    }
                    NetworkEvent ev = new NetworkEvent(NetEventType.UnreliableMessageReceived, NetworkPlayerToConnectionId(senderOrReceiver), msg);
                    mEvents.Enqueue(ev);
                }
            }
            else
            {
                Queue<ByteArrayBuffer> userOut;
                ConnectionId userid;
                userid = NetworkPlayerToConnectionId(senderOrReceiver);
                
                // NetworkPlayerToInt(senderOrReceiver);

                bool found = mOutgoingUnreliableMessages.TryGetValue(userid, out userOut);

                if (found && userOut.Count > 0)
                {
                    char count = (char)0;
                    if (userOut.Count > 255)
                    {
                        Debug.LogWarning("Too many messages at once");
                        count = (char)255;
                    }else
                    {
                        count = (char)userOut.Count;
                    }

                    stream.Serialize(ref count);

                    for(int i = 0; userOut.Count > 0 && i < 256; i++)
                    {
                        ByteArrayBuffer msg = userOut.Dequeue();

                        short length = (short)msg.positionWrite;

                        stream.Serialize(ref length);
                        for (int k = 0; k < length; k++)
                        {
                            char c = (char)msg.array[k];
                            stream.Serialize(ref c);
                        }
                        msg.Dispose();
                    }
                    //Debug.Log(count + " messages sent to " + userid);

                }

            }
        }

        public bool Dequeue(out NetworkEvent evt)
        {
            //this is a try to solve an error in unity network which fails to connect but doesn't
            //send any message after a certain time after connectin we just give up.
            if (mDebugConnecting)
            {
                if(Time.time > (mDebugTimeout + mDebugConnectingStart))
                {
                    Network.Disconnect();
                    OnFailedToConnect(NetworkConnectionError.ConnectionFailed);
                }
            }

            if (mEvents.Count == 0)
            {
                evt = new NetworkEvent();
                return false;
            }
            evt = mEvents.Dequeue();
            return true;
        }


        public void Flush()
        {

        }

        public void Disconnect(ConnectionId id)
        {
            SingleEndpointConnection esc = null;
            mKnownPlayers.TryGetValue(id, out esc);
            if (esc != null)
            {
                Network.CloseConnection(esc.ConnectedUser, true);
            }
        }
    }
#else
    public class UnityNetwork : MonoBehaviour, IBasicNetwork
    {

        public float uTargetSendRate = 16;
        public float uUnityConfigSendRate = 16;
        public float uActualAverageSendRate = 16;
        
        public static bool IsAvailable()
        {
            return false;
        }
        public static UnityNetwork Get()
        {
            return null;
        }
        public void Connect(string address)
        {
            throw new NotImplementedException();
        }

        public bool _IsRunning
        {
            get { throw new NotImplementedException(); }
        }

        public bool _IsServer
        {
            get { throw new NotImplementedException(); }
        }

        public IEnumerable<ConnectionId> _Connection
        {
            get { throw new NotImplementedException(); }
        }


        public bool Dequeue(out NetworkEvent evt)
        {
            throw new NotImplementedException();
        }

        public void SendData(ConnectionId userId, byte[] data, int offset, int length, bool reliable)
        {
            throw new NotImplementedException();
        }

        public void Shutdown()
        {
            throw new NotImplementedException();
        }

        public void StartServer(int port)
        {
            throw new NotImplementedException();
        }
        public void ConnectTo(string guid)
        {
            throw new NotImplementedException();
        }
        public void ConnectTo(string ip, int port)
        {
            throw new NotImplementedException();
        }

        public void TakeSession()
        {
            throw new NotImplementedException();
        }


        public string _ConnectionInfo
        {
            get { throw new NotImplementedException(); }
        }


        public void Flush()
        {
            throw new NotImplementedException();
        }


        public void StartServer()
        {
            throw new NotImplementedException();
        }

        public IList<ConnectionId> Connections
        {
            get { throw new NotImplementedException(); }
        }

        public bool IsRunning
        {
            get { throw new NotImplementedException(); }
        }

        public bool IsServer
        {
            get { throw new NotImplementedException(); }
        }

        ConnectionId IBasicNetwork.Connect(string name)
        {
            throw new NotImplementedException();
        }

        public void Update()
        {
            throw new NotImplementedException();
        }


        public void Disconnect(ConnectionId id)
        {
            throw new NotImplementedException();
        }
    }
#endif
}
