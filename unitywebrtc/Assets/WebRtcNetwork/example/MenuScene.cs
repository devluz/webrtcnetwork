/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
using UnityEngine;
using System.Collections;
using Luz.ULib.Tools;

public class MenuScene : MonoBehaviour {

	// Use this for initialization
	void Start ()
    {
        DebugHelper.ActivateConsole();
        Debug.Log("Started ...");
	}
    private void OnGUI()
    {
        DebugHelper.DrawConsole();
    }

    public void LoadChat()
    {
        Application.LoadLevel("chatscene");
    }
}
