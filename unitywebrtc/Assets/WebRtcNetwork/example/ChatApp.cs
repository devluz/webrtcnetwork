/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
using UnityEngine;
using System.Collections;
using UnityEngine.UI;
using Luz.ULib.Net;
using System.Text;
using System;
using Luz.Net;
using Luz.ULib.Tools;

public class ChatApp : MonoBehaviour
{
    public InputField uRoomName;
    public InputField uMessageField;
    public MessageList uOutput;


    public Button uJoin;
    public Button uOpenRoom;
    public Button uShutdown;


    private IBasicNetwork mNetwork = null;
    private bool mIsServer = false;
    /// <summary>
    /// You can change the firebase version here (give this to the WebRtcNetwork constructor)
    /// </summary>
    private string mWebRtcConfig = "{ \"Signaling\" :  { \"name\" : \"FirebaseSignalingChan\", \"conf\" : \"https://incandescent-inferno-5269.firebaseio.com/webrtcnetwork0_9/\"}}";


	void Start ()
    {
        DebugHelper.ActivateConsole();


        if(WebRtcNetwork.IsAvailable() == false)
        {
            //if the libray isn't available this could mean the JS part of the library is missing
            //(wrong template, webrtcnetworplugin.js not included -> try adding it via ExternalEval)
            Append("Try to initialize WebRTCNetwork");
            WebRtcNetwork.InjectJsCode();
        }

        if (WebRtcNetwork.IsAvailable())
        {
            //default version
            //mNetwork = new WebRtcNetwork();
            
            //custom configuration
            mNetwork = new WebRtcNetwork(mWebRtcConfig);
            Append("WebRtcNetwork available");
        }
        else
        {
            Append("WebRtcNetwork not available");

            if(UnityNetwork.IsAvailable())
            {
                mNetwork = UnityNetwork.Get();
                Append("Using unity network instead. TESTING ONLY! You can't connect to browsers.");
                Append("Build a WebGL example to use WebRTC!");
            }
            else
            {
                Append("No network module available. Build and run a WebGL version or switch the platform to Standalone to use the Debugversion.");
            }
        }
	}

    public void Exit()
    {
        //make sure to shutdown the network. This is usually not needed but at version 5.2.1 4p unity doesn't call
        //destructors reliably
        if (mNetwork != null)
        {
            mNetwork.Shutdown();
            if (mNetwork is WebRtcNetwork)
                ((WebRtcNetwork)mNetwork).Dispose();
        }
        Application.LoadLevel("menuscene");
    }

    private void OnGUI()
    {
        DebugHelper.DrawConsole();
    }


    /// <summary>
    /// 
    /// </summary>
    /// <param name="text"></param>
    private void Append(string text)
    {
        uOutput.AddTextEntry(text);
    }

    private void FixedUpdate()
    {
        HandleNetwork();
    }
    private void HandleNetwork()
    {
        //check if the network was created
        if (mNetwork != null)
        {
            //first update it to read the data from the underlaying network system
            mNetwork.Update();

            //handle all new events that accured since the last update
            NetworkEvent evt;
            while (mNetwork.Dequeue(out evt))
            {
                Debug.Log(evt);

                switch (evt.Type)
                {
                    case NetEventType.ServerInitialized:
                        {
                            mIsServer = true;
                            string address = evt.Info;
                            Append("Server started. Address: " + address);
                            uRoomName.text = "" + address;
                            SetGuiState(false);
                        } break;
                    case NetEventType.ServerInitFailed:
                        {
                            mIsServer = false;
                            Append("Server start failed.");
                            SetGuiState(true);
                        } break;
                    case NetEventType.ServerClosed:
                        {
                            mIsServer = false;
                            Append("Server closed.");
                            SetGuiState(true);
                        } break;
                    case NetEventType.NewConnection:
                        {
                            Append("New local connection! ID: " + evt.ConnectionId);

                            //if server -> send announcement to everyone and use the local id as username
                            if(mIsServer)
                            {
                                string msg = "New user " + evt.ConnectionId + " joined the room.";
                                Append(msg);
                                SendString(msg);
                            }
                            SetGuiState(false);
                        } break;
                    case NetEventType.ConnectionFailed:
                        {
                            Append("Connection failed");
                            SetGuiState(true);
                        } break;
                    case NetEventType.Disconnected:
                        {
                            Append("Local Connection ID " + evt.ConnectionId + " disconnected");
                            if(mNetwork.IsServer == false)
                            {
                                SetGuiState(true);
                            }
                        } break;
                    case NetEventType.ReliableMessageReceived:
                    case NetEventType.UnreliableMessageReceived:
                        {
                            HandleIncommingMessage(ref evt);
                        } break;
                }
            }

            //finish this update by flushing the messages out
            mNetwork.Flush();
        }
    }

    private void HandleIncommingMessage(ref NetworkEvent evt)
    {
        MessageDataBuffer buffer = (MessageDataBuffer)evt.MessageData;

        string msg = Encoding.UTF8.GetString(buffer.Buffer, 0, buffer.ContentLength);

        //if server -> forward the message to everyone else including the sender
        if (mIsServer)
        {
            //we use the server side connection id to idendify the client
            string idAndMessage = evt.ConnectionId + ":" + msg;
            SendString(idAndMessage);
            Append(idAndMessage);
        }
        else
        {
            //client received a message from the server -> simply print
            Append(msg);
        }

        //return the buffer so the network can reuse it
        buffer.Dispose();
    }

    private void SetGuiState(bool isDisconnected)
    {
        uJoin.interactable = isDisconnected;
        uOpenRoom.interactable = isDisconnected;

        uShutdown.interactable = !isDisconnected;
    }
    public void Join()
    {
        mNetwork.Connect(uRoomName.text);
        Append("Connect to " + uRoomName.text);
    }

    public void OpenRoom()
    {
        if(mNetwork is WebRtcNetwork)
        {
            ((WebRtcNetwork)mNetwork).StartServer(uRoomName.text);
        }
        else
        {
            mNetwork.StartServer();
        }
        
        Debug.Log("StartServer " + uRoomName.text);
    }

    /// <summary>
    /// This is called if the send button
    /// </summary>
    public void SendButtonPressed()
    {
        //get the message written into the text field
        string msg = uMessageField.text;

        if(msg.StartsWith("/disconnect"))
        {
            string[] slt = msg.Split(' ');
            if(slt.Length >= 2)
            {
                ConnectionId conId;
                if (short.TryParse(slt[1], out conId.id))
                {
                    mNetwork.Disconnect(conId);
                }
            }
        }

        //if we are the server -> add 0 in front as the server id
        if(mIsServer)
        {
            //the server has the authority thus -> we can print it directly adding the 0 as server id
            msg = "0: " + msg;
            Append(msg);
            SendString(msg);
        }
        else
        {
            //clients just send it directly to the server. the server will decide what to do with it
            SendString(msg);
        }
        uMessageField.text = "";
    }

    /// <summary>
    /// Sends a string as UTF8 byte array to all connections
    /// </summary>
    /// <param name="msg"></param>
    /// <param name="reliable"></param>
    private void SendString(string msg, bool reliable = true)
    {
        if (mNetwork == null || mNetwork.Connections == null || mNetwork.Connections.Count == 0)
        {
            Append("No connection. Can't send message.");
        }
        else
        {
            byte[] msgData = Encoding.UTF8.GetBytes(msg);
            foreach (ConnectionId id in mNetwork.Connections)
            {
                mNetwork.SendData(id, msgData, 0, msgData.Length, reliable);
            }
        }
    }


    public void Shutdown()
    {
        if (mNetwork != null)
            mNetwork.Shutdown();
    }

}
