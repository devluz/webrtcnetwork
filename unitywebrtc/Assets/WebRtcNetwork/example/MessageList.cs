/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.UI;

/// <summary>
/// Shows a list of a text prefab.
/// 
/// Used to show the messages that are sent/received in the ChatApp.
/// </summary>
public class MessageList : MonoBehaviour
{
    /// <summary>
    /// References to the "Text" prefab.
    /// 
    /// Needs to contain RectTransform and Text element.
    /// </summary>
    public GameObject uEntryPrefab;

    /// <summary>
    /// List of all text lines contained
    /// </summary>
    private Queue<RectTransform> mElements = new Queue<RectTransform>();

    /// <summary>
    /// Reference to the own rect transform
    /// </summary>
    private RectTransform mOwnTransform;

    /// <summary>
    /// Number of messages until the older messages will be deleted.
    /// </summary>
    private int mMaxMessages = 60;


    private void Awake()
    {
        mOwnTransform = this.GetComponent<RectTransform>();
    }

    /// <summary>
    /// Allows the Chatapp to add new entires to the list
    /// </summary>
    /// <param name="text">Text to be added</param>
    public void AddTextEntry(string text)
    {
        GameObject ngp = Instantiate(uEntryPrefab);
        Text t = ngp.GetComponentInChildren<Text>();
        t.text = text;
        RectTransform transform = ngp.GetComponent<RectTransform>();
        AddRectTransform(transform);
        Refresh();
    }

    /// <summary>
    /// Adds the new element
    /// </summary>
    /// <param name="rect"></param>
    private void AddRectTransform(RectTransform rect)
    {
        rect.SetParent(mOwnTransform, false);
        mElements.Enqueue(rect);

    }

    /// <summary>
    /// Destroys old messages if needed and repositions the existing messages.
    /// </summary>
    private void Refresh()
    {
        while(mElements.Count > mMaxMessages)
        {
            Destroy(mElements.Dequeue().gameObject);
        }


        float pos = 0;

        foreach (RectTransform rect in mElements)
        {
            SetPosition(rect, ref pos);
        }

        if(Mathf.Abs(pos) > mOwnTransform.rect.height)
        {
            Vector2 v = mOwnTransform.sizeDelta;

            v.y = Mathf.Abs(pos);
            mOwnTransform.sizeDelta = v;
        }
    }

    /// <summary>
    /// Positions a single element
    /// </summary>
    /// <param name="tra">transform to be positioned</param>
    /// <param name="position">Y position. Will be increased by the height of the current transform</param>
    private void SetPosition(RectTransform tra, ref float position)
    {
        Vector2 pos = tra.anchoredPosition;
        pos = new Vector2(0, position);
        tra.anchoredPosition = pos;

        position -= tra.rect.height;
    }
}
