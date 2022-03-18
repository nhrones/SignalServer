
?? After rtc-connect, should disconnect sse-connection??
Must signal other player of close!

## Do heatbeat
```js
// heartbeat
const time = () => {
    broadcast('time', new Date);
    setTimeout(time, uptimeTimeout);
 };
time();
```
To cancel a stream from the server, respond with a 
non "text/event-stream" Content-Type or return an HTTP status other 
than 200 OK (e.g. 404 Not Found).