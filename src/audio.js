/**
 * Copyright 2014 Sense Tecnic Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var utils = require('./utils');
var lame = require('lame');
var Speaker = require('speaker');

var fs = require('fs');
var http = require('http');
var https = require('https');

module.exports = function(RED) {
  "use strict";

  function AudioNode(n) {
    RED.nodes.createNode(this,n);

    let node = this

    node.source = n.source;

    node.decoder = new lame.Decoder()
    node.speaker = new Speaker()

    node.speaker.on('close', function(){
      node.playing = false
    })

    node.speaker.on('open', function(){
      node.playing = true
    })

    node.decoder.pipe(node.speaker)

    node.on('close', function(){
      if (node.request){
        node.request.abort()
      }
      if (node.speaker){
        node.speaker.end()
      }
    })

    node.on("input",function(msg) {
      if (!msg){
        msg = {payload: {}}
      }

      if (!msg.payload){
        msg.payload = {}
      }

      if (typeof msg.payload === 'string'){
        node.source = msg.payload
      }

      if (!node.source){
        node.error('No audio source specified')
        return
      }

      if (node.playing){
        node.warn('One audio is still playing, dropping!')
        return
      }

      if (utils.isLocalFile(node.source)){
        fs.createReadStream(node.source)
        .on('error', function(){
          node.error('Audio source not readable nor found: '+ node.source)
        })
        .pipe(node.decoder)
      } else {
        node.request = (node.source.startsWith('https://') ? https : http)
        .get(node.source, function(response) {
          response.pipe(node.decoder)
        }).on('error', function(e) {
          node.error("Streaming error: " + e.message);
        })
      }
    })
  }

  RED.nodes.registerType("audio", AudioNode)

  RED.httpAdmin.post("/audio/:id", RED.auth.needsPermission("audio"), function(req,res) {
    var node = RED.nodes.getNode(req.params.id);
    if (node != null) {
      try {
          node.receive();
          res.sendStatus(200);
      } catch(err) {
          res.sendStatus(500);
          node.error("audio node failed " + err);
      }
    } else {
        res.sendStatus(404);
    }
  });

}
