/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
using UnityEngine;
using System.Collections;
using Luz.Net;
using Luz.ULib.Net;
using System.Text;

/// <summary>
/// Contains a test scenario. You can run this via the menuscene.scene file.
/// Only works in a WebGL build!
/// 
/// Local test will start one WebRtcNetwork as an echo server and one as a client.
/// It will then connect, send a reliable/ unreliable message, test if those messages
/// are received on the other and then disconnect again.
///
/// Should end with ------------All tests successful!------------- in the debug console
/// </summary>
public class LocalTest : MonoBehaviour
{
    private WebRtcNetwork mServer;
    private WebRtcNetwork mClient;

    private string mReliableTestMessage = ">>>RELIABLE MESSAGE<<<";
    private string mUnreliableTestMessage = ">>>UNRELIABLE MESSAGE<<<";



    public enum State
    {
        Uninitialized,
        ServerInit,
        ConnectClient,
        ReliableMessage,
        UnreliableMessage,
        TestSuccessful
    }

    /// <summary>
    /// State of the test.
    /// 
    /// </summary>
    private State mState = State.Uninitialized;

    /// <summary>
    /// Called via UI
    /// </summary>
    public void StartTestButtonPressed()
    {
        if (WebRtcNetwork.IsAvailable() == false)
        {
            WebRtcNetwork.InjectJsCode();
        }

        //Starts the test after 1 sec waiting to give the java script side of the library
        //time to download needed libraries
        //waiting time not needed if everything is included properly in the webgl template/sorrounding website
        StartCoroutine(CoroutineStartTestDelayed());
    }
    private IEnumerator CoroutineStartTestDelayed()
    {
        yield return new WaitForSeconds(1);
        StartTest();
    }

    private void StartTest()
    {

        if (WebRtcNetwork.IsAvailable() == false)
        {
            Debug.LogWarning("WebRtcNetwork not available. Please run it in WebGL to test WebRtcNetwork!");
        }
        else
        {
            Debug.Log("WebRtcNetwork available. Starting test.");
            mServer = new WebRtcNetwork();
            mClient = new WebRtcNetwork();
            Debug.Log("Instance created");

            mState = State.ServerInit;
            Debug.Log("Start test " + mState);
            mServer.StartServer();
        }
    }

    private void FixedUpdate()
    {
        
        if(mServer != null)
        {
            mServer.Update();

            NetworkEvent evt; 
            while(mServer.Dequeue(out evt))
            {
                Debug.Log("Server received event " + evt);
                if(evt.Type == NetEventType.ServerInitialized)
                {

                    Debug.Log("Test " + mState + " successful!");
                    //server is started -> connect client
                    mState = State.ConnectClient;
                    Debug.Log("Start test " + mState);
                    mClient.Connect(evt.Info);
                }
                else if (evt.Type == NetEventType.ReliableMessageReceived)
                {
                    MessageDataBuffer buff = evt.MessageData;
                    Debug.Log("server reliable message received:" + ToString(buff));
                    mServer.SendData(evt.ConnectionId, buff.Buffer, 0, buff.ContentLength, true);
                    buff.Dispose();
                }
                else if (evt.Type == NetEventType.UnreliableMessageReceived)
                {
                    MessageDataBuffer buff = (MessageDataBuffer)evt.MessageData;
                    Debug.Log("server unreliable message received:" + ToString(buff));
                    mServer.SendData(evt.ConnectionId, buff.Buffer, 0, buff.ContentLength, false);
                    buff.Dispose();
                }
                else if (evt.Type == NetEventType.Disconnected)
                {
                    Debug.Log("Shutdown server");
                    mServer.Shutdown();

                    StartCoroutine(CoroutineCleanup());
                }
            }
        }

        
        if(mClient != null)
        {
            mClient.Update();
            NetworkEvent evt; 
            while(mClient.Dequeue(out evt))
            {
                Debug.Log("Client received event " + evt);

                if(evt.Type == NetEventType.NewConnection)
                {
                    //send out test message

                    Debug.Log("Test " + mState + " successful!");
                    mState = State.ReliableMessage;
                    Debug.Log("Start test " + mState);
                    byte[] data2 = Encoding.ASCII.GetBytes(mReliableTestMessage);
                    mClient.SendData(evt.ConnectionId, data2, 0, data2.Length, true);
                }
                else if (evt.Type == NetEventType.ReliableMessageReceived)
                {
                    MessageDataBuffer buff = evt.MessageData;

                    string recMessage = ToString(buff);
                    Debug.Log("client reliable message received:" + recMessage);
                    if (mReliableTestMessage == recMessage)
                    {
                        Debug.Log("Reliable channel works");
                    }
                    else
                    {
                        Debug.LogError("Expected " + mReliableTestMessage + " not " + recMessage);
                    }
                    buff.Dispose();

                    Debug.Log("Test " + mState + " successful!");
                    mState = State.UnreliableMessage;
                    Debug.Log("Start test " + mState);
                    byte[] data1 = Encoding.ASCII.GetBytes(mUnreliableTestMessage);
                    mClient.SendData(evt.ConnectionId, data1, 0, data1.Length, false);

                }
                else if (evt.Type == NetEventType.UnreliableMessageReceived)
                {
                    MessageDataBuffer buff = evt.MessageData;
                    string recMessage = ToString(buff);
                    Debug.Log("client unreliable message received:" + recMessage);
                    if (mUnreliableTestMessage == recMessage)
                    {
                        Debug.Log("Unreliable channel works");
                    }
                    else
                    {
                        Debug.LogError("Expected " + mUnreliableTestMessage + " not " + recMessage);
                    }
                    buff.Dispose();

                    Debug.Log("Test " + mState + " successful!");
                    mState = State.TestSuccessful;
                    Debug.Log("All tests done!");

                    Debug.Log("Shutdown client");
                    mClient.Shutdown();
                }
            }
        }
    }

    private IEnumerator CoroutineCleanup()
    {
        yield return new WaitForSeconds(5);
        mServer.Dispose();
        mClient.Dispose();
        mServer = null;
        mClient = null;
        if (mState == State.TestSuccessful)
        {
            Debug.Log("------------All tests successful!-------------");
        }
    }

    private string ToString(MessageDataBuffer buff)
    {
        if (buff == null)
            return "no data";
        if (buff.Buffer == null)
            return "content empty";
        string content = Encoding.ASCII.GetString(buff.Buffer, 0, buff.ContentLength);
        return content;
    }
}
