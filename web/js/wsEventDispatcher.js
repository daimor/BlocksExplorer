/*
The MIT License (MIT)

Copyright (c) 2014 Ismael Celis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
-------------------------------*/
/*
Simplified WebSocket events dispatcher (no channels, no users)

var socket = new FancyWebSocket();

// bind to server events
socket.bind('some_event', function(data){
  alert(data.name + ' says: ' + data.message)
});

// broadcast events to all connected users
socket.send( 'some_event', {name: 'ismael', message : 'Hello world'} );
*/

export class FancyWebSocket {

  constructor(url) {
    this.conn = new WebSocket(url)

    // dispatch to the right handlers
    this.conn.onmessage = (evt) => {
      var json = JSON.parse(evt.data)
      this.dispatch(json.event, json.data)
    }

    this.conn.onclose = () => {
      console.log('WebSocket Connection closed');
      this.dispatch('close', null)
    }
    this.conn.onopen = () => {
      this.dispatch('open', null)
    }

    this.callbacks = {}

    this.bind('ping', function() {
      console.log('pong');
    });


  }

  dispatch(event_name, message) {
    var chain = this.callbacks[event_name]
    if (typeof chain === 'undefined') return // no callbacks for this event
    for (var i = 0; i < chain.length; i++) {
      chain[i](message)
    }
  }

  bind(event_name, callback) {
    this.callbacks[event_name] = this.callbacks[event_name] || []
    this.callbacks[event_name].push(callback)
    return this // chainable
  }

  send(event_name, event_data) {
    var payload = JSON.stringify({
      event: event_name,
      data: event_data
    })
    this.conn.send(payload) // <= send JSON data to socket server
    return this
  }
}

