# WebRTCNetwork
A simple and well defined API to access WebRTC DataChannels from Unity or Emscripten

## for Unity

The unity version is contained in an example project (folder unitywebrtc). Simply open the project in Unity
and build the WebGL version. It should run without any additional changes.

### WebRtcNetwork

This is the main class of the system. It allows you to start a allow incomming connections
or connect to another system.
The connections are unlike websockets direct connections. It allows tcp style ordered, reliable 
data transfer or udp style unordered, unreliable messages.

The way a connection is etablished is rather different from other libraries due to the structure
of WebRTC. While TCP and UDP use the IP address+port to connect directly, WebRTC needs a 
custom signaling server that delegates the etablishment between two systems. Handling
of ip addresses, ports and NAT traversal is all done automatically.

The example uses a test signaling server so it should work immediately. You can setup
your own signaling server using a socket.io server (code in socketiosignalingserver)
or a firebase account (free for 30CCU)

Note: As WebRTC is a browser functionality the WebRtc class won't work in the Unity Editor or
any other build. See UnityNetwork

### UnityNetwork

Unity Network is a helper class that allows you to similate the behaviour of WebRTCNetwork in
Unity Editor or builds that support unity network. It won't work while set up for "WebGL" though! 
Make sure it isn't set in the build settings!
The chat example shows how you can use this class to test your network code locally. I would not
recomment using this class in any release builds as it might not be unstable.
Also note that unity network doesn't support multiple servers/connections at the same time thus
you can only create one single instance and only start a server or connect to a single server. It
also doesn't support connection via a choosen name. After creating a server the ServerInitialzied
event will return a randomly choosen number that can be used to connect.
