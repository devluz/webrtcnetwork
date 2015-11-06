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


/// <summary>
/// Contains a complete chat example.
/// It can either run in the editor using the old unity network or in the browser as
/// WebGL/HTML5 using WebRtc.
/// 
/// The chat app will report during start which system it uses.
/// 
/// The user can enter a room name and click the "Open room" button to start a server and wait for
/// incomming connections or use the "Join room" button to join an already existing room.
/// 
/// Note: Unity network uses random numbers / guid to idendify a server. The room name entered by the user
/// will be ignored.
/// 
/// 
/// As the system implements a server/client style connection all messages will first be sent to the
/// server and the server delivers it to each client. The server side ConnectionId is used to
/// idendify a user.
/// 
/// 
/// </summary>
public class ChatApp : MonoBehaviour
{
    /// <summary>
    /// Input field used to enter the room name.
    /// </summary>
    public InputField uRoomName;

    /// <summary>
    /// Input field to enter a new message.
    /// </summary>
    public InputField uMessageField;

    /// <summary>
    /// Output message list to show incomming and sent messages + output messages of the
    /// system itself.
    /// </summary>
    public MessageList uOutput;

    /// <summary>
    /// Join button to connect to a server.
    /// </summary>
    public Button uJoin;

    /// <summary>
    /// Send button.
    /// </summary>
    public Button uSend;

    /// <summary>
    /// Open room button to start a server.
    /// </summary>
    public Button uOpenRoom;

    /// <summary>
    /// Shutdown button. Disconnects all connections + shuts down the server if started.
    /// </summary>
    public Button uShutdown;

    /// <summary>
    /// The network interface. Either UnityNetwork or 
    /// </summary>
    private IBasicNetwork mNetwork = null;

    /// <summary>
    /// True if the user opened an own room allowing incomming connections
    /// </summary>
    private bool mIsServer = false;


    /// <summary>
    /// You can change the firebase version here (give this to the WebRtcNetwork constructor)
    /// </summary>
    private string mWebRtcConfig = "{ \"Signaling\" :  { \"name\" : \"FirebaseSignalingChan\", \"conf\" : \"https://incandescent-inferno-5269.firebaseio.com/webrtcnetwork0_9/\"}}";


	private void Start ()
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

    /// <summary>
    /// Called if the Exit button is pressed. Quits the scene and shuts everything down.
    /// </summary>
    public void Exit()
    {
        //make sure to shutdown the network. This is usually not needed but (tested at version 5.2.1 4p) unity doesn't call
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
        //draws the debug console (or the show button in the corner to open it)
        DebugHelper.DrawConsole();
    }


    /// <summary>
    /// Adds a new message to the message view
    /// </summary>
    /// <param name="text"></param>
    private void Append(string text)
    {
        uOutput.AddTextEntry(text);
    }

    private void FixedUpdate()
    {
        //check each fixed update if we have got new events
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
                //print to the console for debugging
                Debug.Log(evt);

                //check every message
                switch (evt.Type)
                {
                    case NetEventType.ServerInitialized:
                        {
                            //server initialized message received
                            //this is the reaction to StartServer -> switch gui mode
                            mIsServer = true;
                            string address = evt.Info;
                            Append("Server started. Address: " + address);
                            uRoomName.text = "" + address;
                            SetGuiState(false);
                        } break;
                    case NetEventType.ServerInitFailed:
                        {
                            //user tried to start the server but it failed
                            //maybe the user is offline or signaling server down?
                            mIsServer = false;
                            Append("Server start failed.");
                            SetGuiState(true);
                        } break;
                    case NetEventType.ServerClosed:
                        {
                            //server shut down. reaction to "Shutdown" call or
                            //StopServer or the connection broke down
                            mIsServer = false;
                            Append("Server closed.");
                            SetGuiState(true);
                        } break;
                    case NetEventType.NewConnection:
                        {
                            //either user runs a client and connected to a server or the
                            //user runs the server and a new client connected
                            Append("New local connection! ID: " + evt.ConnectionId);

                            //if server -> send announcement to everyone and use the local id as username
                            if(mIsServer)
                            {
                                //user runs a server. announce to everyone the new connection
                                //using the server side connection id as idendification
                                string msg = "New user " + evt.ConnectionId + " joined the room.";
                                Append(msg);
                                SendString(msg);
                            }
                            SetGuiState(false);
                        } break;
                    case NetEventType.ConnectionFailed:
                        {
                            //Outgoing connection failed. Inform the user.
                            Append("Connection failed");
                            SetGuiState(true);
                        } break;
                    case NetEventType.Disconnected:
                        {
                            //A connection was disconnected
                            //If this was the client then he was disconnected from the server
                            //if it was the server this just means that one of the clients left
                            Append("Local Connection ID " + evt.ConnectionId + " disconnected");
                            if(mNetwork.IsServer == false)
                            {
                                SetGuiState(true);
                            }
                            else
                            {
                                string userLeftMsg = "User " + evt.ConnectionId + " left the room.";

                                //show the server the message
                                Append(userLeftMsg);

                                //other users left? inform them 
                                if (mNetwork.Connections.Count > 0)
                                {
                                    SendString(userLeftMsg);
                                }
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

    /// <summary>
    /// Changes the gui depending on if the user is connected
    /// or disconnected
    /// </summary>
    /// <param name="isDisconnected">true = user is connected. false = user isn't connected</param>
    private void SetGuiState(bool isDisconnected)
    {
        uJoin.interactable = isDisconnected;
        uOpenRoom.interactable = isDisconnected;

        uSend.interactable = !isDisconnected;
        uShutdown.interactable = !isDisconnected;
        uMessageField.interactable = !isDisconnected;
    }

    /// <summary>
    /// Join button pressed. Tries to join a room.
    /// </summary>
    public void Join()
    {
        mNetwork.Connect(uRoomName.text);
        Append("Connect to " + uRoomName.text);
    }

    /// <summary>
    /// Open room button pressed.
    /// 
    /// Opens a room / starts a server
    /// </summary>
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
    /// <param name="msg">String containing the message to send</param>
    /// <param name="reliable">false to use unrealiable messages / true to use reliable messages</param>
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

    /// <summary>
    /// Shutdown button pressed. Shuts the network down.
    /// </summary>
    public void Shutdown()
    {
        if (mNetwork != null)
            mNetwork.Shutdown();
    }

}
