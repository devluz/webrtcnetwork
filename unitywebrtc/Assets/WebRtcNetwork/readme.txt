Introduction:
	WebRTC Network is a plugin for Unity WebGL that allows two browsergames to connect 
	DIRECTLY to each other and send reliable/unreliable messages using WebRTC Datachannels.
	This makes is well suited for any fast paced real time multiplayer games.

	WebRTC still requires a server to initialize the connection between two users.
	This version will automatically use a test server for this purpose (not suitable for a release version!).
	You can change the default server by using a firebase account (free for up to 30 CCU),
	websockets (coming soon) or your own system. If you have any questions feel free to contact me.

	Features:
	- Very simple programming interface. These are all methods you need: Start/StopServer, Connect, Disconnect, SendMessage + a Dequeue method to read incomming network events!
	- Send messages reliable or unreliable
	- Additional UnityNetwork class that allows you to test your network code outside of the browser
	- Contains a complete chat app as an example
	Note that Google and Mozilla treat WebRTC still as an experimental technology.

Setup:
	Make sure you tick "Run in background" in your player settings.
	+ add the example scenes to your build settings.
	
Examples:
	The examples are stored in the folder WebRtcNetwork\example.
	This folder contains a chat application in the (chatscene.unity using ChatApp.cs)
	and test scenario to make sure the library works properly (menuscene.unity using LocalTest.cs).
	
	ChatApp:
		To start this app simply add it to the scenes list in your build settings at the top. To make sure
		the app uses WebRTC you need to build a WebGL build and then run it in firefox or chrome. 
		It will use the old Unity network library to run in the editor and other platforms so you can
		test your network code without having to build a WebGL build first.
		
		The chat app allows a user to create a room or join a room. After entering a room the users can
		send chat messages to everyone in the room. The user that created the room will act as a server 
		and relay the messages to all connected users.
		
		Use this example to learn how to use the library to send any data across the network. Keep in mind
		that naming a room is only possible in a browser not in unity editor as the unity network library
		doesn't support this feature. Also if you want to use the library in the editor make sure
		WebGL isn't selected as platform as this will block the editors network functionality.
	
	Test scenario:
		If you believe the library doesn't work properly you should try running the scene "menuscene.unity"
		in a WebGL build. It allows you to run a test to check if the library itself works properly in your
		browser and build configuration. You can find the documentation for the test in the file "LocalTest.cs".
		
Other folders and files:
	Assets/WebRtcNetwork/ULib:
		Contains the C# side of the library. 
		
		IBasicNetwork.cs defines the interface of the library
		WebRtcNetwork.cs implements the network functionality inside the browser in WebGL builds
		UnityNetwork.cs implements the network functionality for other platforms (for testing purposes)
		DebugHelper.cs shows a "Show" button in the right corner which will open the unity console outside
						of the UnityEditor for easy debugging!
						
		For detailed documentation please open the cs files. They are fully documented.
		
	Assets/WebRtcNetwork/Plugins:
		The folder contains a WebGL plugin "WebRtcNetwork.jslib" which allows the library to access js 
		functions of the browser.
		
	Assets/WebRtcNetwork/Resources:
		Stores a file "webrtcnetworkplugin.txt" which is automatically generated. It contains the browser side
		code of the library and can be injected into the website via WebRtcNetwork.InjectJsCode().
		This is only needed if your website doesn't include the needed js files.
		
	Assets/WebGLTemplates/WebRtcNetwork:
		Contains a template that makes sure all javascript files needed for the library are included into the
		WebGL build. You should use this instead of calling WebRtcNetwork.InjectJsCode() if possible.

The basics (based on ChatApp.cs, please use the example to learn more!):
	
	First we need an instance that allows us to access the library. 
		//check if the browser side library is available
		if(WebRtcNetwork.IsAvailable() == false)
        {
			//not yet available? try to inject the java script side
            WebRtcNetwork.InjectJsCode();
        }

		//available now?
        if (WebRtcNetwork.IsAvailable())
        {
            mNetwork = new WebRtcNetwork(mWebRtcConfig);
        }
        else
        {
			//browser side isn't available -> use unity network if possible
            if(UnityNetwork.IsAvailable())
            {
                mNetwork = UnityNetwork.Get();
            }
            else
            {
                //error can't create an instance
            }
        }
		
	Configuration:
		The browser side library needs a string to configure the library and determine which
		servers are suppose to be used to delegate the connection between multiple clients.
		
		The string should look like the following (JSON format + escaped \" for c#):
		
		string mWebRtcConfig = 	"{ \"Signaling\" :  { \"name\" : \"FirebaseSignalingChan\", \"conf\" : \"https://incandescent-inferno-5269.firebaseio.com/webrtcnetwork0_9/\"}}";
		
		Simply use this string and replace "https://incandescent-inferno-5269.firebaseio.com/webrtcnetwork0_9/" with your own 
		firebase account.
		
	After you created the library you can use the methods:
		void StartServer()
			to allow incoming connections
		
		ConnectionId Connect(string address)
			to connect to a server
		
		bool Dequeue(out NetworkEvent evt);
			to handle incoming network events such as confirmation that the server was initialized (+ its address)
			as well as successful, failed outgoing connections
		
	If you established a connection to another peer use:
		
		void SendData(ConnectionId id, byte[] data, int offset, int length, bool reliable);
			to send a byte array to the other side. The needed connection id is delivered by the
			NewConnection NetworkEvent via Dequeue or can be accessed via the Connections property.
			
You have questions or problems using the library?
	You can find up to date contact information at http://because-why-not.com/about/
	or via the open source version of this library: https://github.com/devluz/webrtcnetwork

