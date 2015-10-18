/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.UI;

public class MessageList : MonoBehaviour
{

    private Queue<RectTransform> mElements = new Queue<RectTransform>();
    private RectTransform mOwnTransform;
    public GameObject uEntryPrefab;

    private int mMaxMessages = 60;


    private void Awake()
    {
        mOwnTransform = this.GetComponent<RectTransform>();
    }


	
	// Update is called once per frame
	void Update ()
    {
	
	}

    public void AddTextEntry(string text)
    {
        GameObject ngp = Instantiate(uEntryPrefab);
        Text t = ngp.GetComponentInChildren<Text>();
        t.text = text;
        RectTransform transform = ngp.GetComponent<RectTransform>();
        AddRectTransform(transform);
        Refresh();
    }

    private void AddRectTransform(RectTransform rect)
    {
        rect.SetParent(mOwnTransform, false);
        mElements.Enqueue(rect);

    }

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

    private void SetPosition(RectTransform tra, ref float position)
    {
        Vector2 pos = tra.anchoredPosition;
        pos = new Vector2(0, position);
        tra.anchoredPosition = pos;

        position -= tra.rect.height;
    }
}
