/* 
 * Copyright (C) 2015 Christoph Kutza
 * 
 * Please refer to the LICENSE file for license information
 */

/** Helper for unity tests for systems that need polling.
 * 
 * @param {type} lCondition a function returning true or false
 * false -> system keeps polling or times out after a while
 * true -> system calls lOnContinue handler
 * @param {type} lTimeout time until timeout in ms
 * @param {type} lFailMessage error message to print if the timeout is triggered
 * @param {type} lOnContinue function to call if the condition is true. used to check the results
 * 
 */
function WaitFor(lCondition, lTimeout, lFailMessage, lOnContinue)
{
    
    var interval = 10;
    var time = 0;
    var intervalId;
    
    
    
    intervalId = setInterval(function()
    {
        var result = lCondition();
        if(result)
        {
            //console.debug("condition true" + result);
            clearInterval(intervalId);
            lOnContinue();
            return;
        }else
        {
            //console.debug("poll" + result + time);
        }
        
        time += interval;
        if(time > lTimeout)
        {
            clearInterval(intervalId);
            fail(lFailMessage);
        }
    }, interval);
}
