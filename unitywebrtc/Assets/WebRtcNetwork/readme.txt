To get the example running after importing the package do the following:

Step 1: Add the scenes
	* Add the scenes provided in Assets\UnityWebRTC\example in your Build Settings
	* Use the scene "menuscene.unity" as starting scene

Step 2: Add the needed js files 
	* Use the prepared WebGL template:
		* extract the WebGLTemplates.zip into your Asset folder so the resulting path is Asset/WebGLTemplates
		* In Build Settings -> WebGL -> Player Settings -> Choose the WebRtcNetwork as template
	
	* or change your own template to include the following:
			include the following js files into your own template: 
				<script src="https://cdn.firebase.com/js/client/2.3.0/firebase.js"></script>
				<script src="http://4science.co/webrtcnetwork/webrtcnetworkplugin.js"></script>
Step 3:
	* Build a WebGL build and run it in firefox or chrome. WebRTC only runs in the browser itself not in the editor!
		If you want to test something inside the Editor you can use the class UnityNetwork(make sure you select Standalone in build settings)