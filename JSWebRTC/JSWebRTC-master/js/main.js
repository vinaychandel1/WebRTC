'use strict';

var isConnectedToHost = false;
var isInitiator = false;
var isSuperNode = false;
var calledOnce = false;
var offering = false;
var answering = false;
var initW,initH;

var remoteStream = null;
var isNodeCap = 0;
var localStream;
var clientId;
var pc = {};

var eliList =[];
var localPeerList = [];

//Configuring TURN and STUN servers
var pcConfig = {
  iceServers: [{
    urls: [ "stun:bn-turn1.xirsys.com" ]
 }, {
    username: "EGywpVtgSANGHb9Z0YWZi89zcs4jMkrn8rTcNNzSIdrD5mBQm8qzfAsCDCC8SpXqAAAAAF6n_TF3aGl0ZXdpejEz",
    credential: "2b5a506a-8936-11ea-882b-9646de0e6ccd",
    urls: [
        "turn:bn-turn1.xirsys.com:80?transport=udp",
        "turn:bn-turn1.xirsys.com:3478?transport=udp",
        "turn:bn-turn1.xirsys.com:80?transport=tcp",
        "turn:bn-turn1.xirsys.com:3478?transport=tcp",
        "turns:bn-turn1.xirsys.com:443?transport=tcp",
        "turns:bn-turn1.xirsys.com:5349?transport=tcp"
    ]
 }]
};

//Setting up the room name:
var room = 'foo';
// Could prompt for room name:
// room = prompt('Enter room name:');

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

//Getting the user media, video and audio

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  mixVideos();
}
var constraints = {
  video: true
};

console.log('Getting user media with constraints', constraints);
//Initiliazing socket to talk with the signaling server
var socket = io.connect();

socket.on('created', function(room,sid) {
  console.log('Created room ' + room);
  clientId =sid;
  isSuperNode = true;
  isConnectedToHost = true;
  isInitiator = true;
  enableScreen.style.display = "block"
  disableScreen.style.display = "block"
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
});

socket.on('joined', function(room,sid,numClients) {
  console.log('joined: ' + room);
  if(numClients <= 1){
    isSuperNode = true;
  }
  clientId =sid;
  hangupButton.style.display = "block"
  enableScreen.style.display = "block"
  disableScreen.style.display = "block"
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////
function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}
// This client receives a message
socket.on('message', function(message) {
  console.log('Client received message:', message);
  //if (message === 'got user media') {
    //maybeStart();}
  if(message.type === 'offer') {
    if(message.specific === clientId){
      if(message.isSuperNode === false)
        isNodeCap++;
      createPeerConnection(message.userid,message.username,message.isSuperNode);
      pc.peerConnection.addStream(pc.mixer.getMixedStream());
      pc.peerConnection.setRemoteDescription(new RTCSessionDescription(message));
      console.log("Offer Received");
      localPeerList.push(pc);
      callButton.style.display = 'none'
      console.log("List is : ");
      console.log(localPeerList);
	    doAnswer(message.userid);
    }
  }else if (message.type === 'answer') {
    if(message.specific === clientId){
      if(message.isSuperNode === false)
        isNodeCap++;
      pc.peerConnection.setRemoteDescription(new RTCSessionDescription(message));
      console.log("Answer Received");
      localPeerList.push(pc);
      console.log("List is : ");
      console.log(localPeerList);
    }
  }else if (message.type === 'broadcastid') {
    broadcastIdReceived(message.userid,message.username,message.isSuperNode);
  }else if (message.type === 'grantedpermission') {
    permissonGranted(message.specific);
  }else if(message.type === 'replyingtobroadcast'){
    replyToBroadCastReceived(message.userid,message.username,message.isSuperNode,message.specific);
  }else if (message.type === 'askpermission') {
   askedPermission(message);
  }
  /*else if (message.type === 'candidate') {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pc.peerConnection.addIceCandidate(candidate);
  }*/
  else if (message === 'bye') {
    //handleRemoteHangup();
  }
});
function replyToBroadCastReceived(userid,username,isSN,specific){
  if(clientId === specific){
    eliList.push(userid);
    if(calledOnce === false){
      doCall(eliList[0],username,isSN);
      calledOnce = true;
    }
  }
}
function broadcastIdReceived(userid,username,isSN){
  if(isConnectedToHost && isSuperNode && isSN){
    doCall(userid,username,isSN);
  }
  else if(isConnectedToHost && isSuperNode && (isNodeCap<=4) && !isSN){
    replyToId(userid,clientId,isSuperNode);
  }
}
function replyToId(userid,clientId,isSuperNode){
  var myObj = {type: 'replyingtobroadcast', userid: clientId,roomname : rname.value,username:uname.value,isSuperNode:isSuperNode,specific:userid};
  socket.emit("message",myObj);
}
function permissonGranted(specific){
  if(clientId === specific){
    isConnectedToHost = true;
    broadcastId();
  }
}
function broadcastId() {
  var myObj = {type: 'broadcastid', userid: clientId,roomname:rname.value,username:uname.value,isSuperNode:isSuperNode};
  socket.emit("message",myObj);
}
function askedPermission(message){
  if(isInitiator){
    if (confirm(message.username + ' wants to join the room!')) {
      var myObj = {type: 'grantedpermission', specific: message.userid};
      socket.emit("message",myObj);
    } else {
      //TODO : Show Rejected Message
    }
  }
}
////////////////////////////////////////////////////
//Finding Buttons and stuff
var localVideo = document.querySelector('#localVideo');
var startButton = document.querySelector('#startButton');
var callButton = document.querySelector('#callButton');
var hangupButton = document.querySelector('#hangupButton');
var enableScreen = document.querySelector('#enableScreenShare');
var disableScreen = document.querySelector('#disableScreenShare');
var rname = document.querySelector('#rname');
var uname = document.querySelector('#uname');

callButton.style.display = "none"
hangupButton.style.display = "none"
enableScreen.style.display = "none"
disableScreen.style.display = "none"

// Add click event handlers for buttons.
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);
enableScreen.addEventListener('click',enableScreenShare)
disableScreen.addEventListener('click',disableScreenShare)

//Button Click Functions
function enableScreenShare()
{
  navigator.mediaDevices.getDisplayMedia(
    {
      audio:false,
      video:true
    }
  )
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}
function disableScreenShare()
{
  navigator.mediaDevices.getUserMedia(
    {
      audio:false,
      video:true
    }
  )
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}
function startAction(){
	if (room !== '') {
    if(rname.value === '')
    {
      alert("Roomname can't be empty");
      return;
    }
    if(uname.value === '')
    {
      alert("Username can't be empty");
      return;
    }
    navigator.mediaDevices.getUserMedia(
      {video: true,
      audio :false })
    .then(
      function(stream)
      {
        gotStream(stream);
        if(!isInitiator)
          callButton.style.display = "block"
      }
      )
    .catch(function(e) {
      alert('getUserMedia() error: ' + e.name);
    });
		socket.emit('create or join', room);
		console.log('What to create or  join room', room);
	}
}
function callAction(){
  askPermission();
}
function askPermission(){
  var myObj = {type: 'askpermission', roomname: room,username:uname.value, userid: clientId};
  socket.emit("message",myObj);
}
function hangupAction(){}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection(userid,username,isSN) {
  try {
    var obj ={};
    obj.peerConnection = new RTCPeerConnection(pcConfig);
    obj.mixer = new MultiStreamsMixer([localStream]);
    obj.mixer.startDrawingFrames();
    obj.connectionWith = userid;  
    obj.username = username;
    obj.isSuperNode = isSN;
    obj.peerConnection.onicecandidate = handleIceCandidate
    obj.peerConnection.onaddstream = handleRemoteStreamAdded;
    obj.peerConnection.onremovestream = handleRemoteStreamRemoved;
    pc = Object.assign({},obj);
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  //console.log('icecandidate event: ', event);
  if (event.candidate === null && offering) {
    sendMessage({
      type: "offer",
      userid:clientId,
      roomname : rname.value,
      username : uname.value,
      specific: pc.connectionWith,
      isSuperNode : isSuperNode,
      sdp: pc.peerConnection.localDescription.sdp
    });
    offering = false;
  }
  else if(event.candidate === null && answering)
  {
      sendMessage({
      type: "answer",
      userid:clientId,
      roomname : rname.value,
      username : uname.value,
      specific: pc.connectionWith,
      isSuperNode : isSuperNode,
      sdp: pc.peerConnection.localDescription.sdp
    });
    answering = false;
  } 
  else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}
function doCall(userid,username,isSN) {
  createPeerConnection(userid,username,isSN);
  pc.peerConnection.addStream(pc.mixer.getMixedStream());
  //if(isSuperNode && !isInitiator)
  console.log('Sending offer to peer');
  //pc.createOffer(setLocalAndSendMessage(sessionDescription,userid), handleCreateOfferError);
  pc.peerConnection.createOffer().then(function(offer){
    pc.peerConnection.setLocalDescription(offer);
    offering = true;
  });
}

function doAnswer(userid) {
  console.log('Sending answer to peer.');
  pc.peerConnection.createAnswer().then(function(offer){
    pc.peerConnection.setLocalDescription(offer);
    answering = true;
  });
}

function handleRemoteStreamAdded(event) {
  remoteStream = event.stream;
  console.log('Remote stream added.');
  var c = document.getElementById ("videos");
  var v = document.createElement ("video");
  v.id = pc.connectionWith;
  v.className = pc.isSuperNode;
  v.autoplay = true;
  v.style.height = "100px";
  v.style.width = "100px";
  v.defaultMuted = true;
  v.addEventListener('loadedmetadata', function() {
      initW =this.videoWidth;
      initH = this.videoHeight;
      v.style.height = initH + "px";
      v.style.width = initW + "px";
  });
  v.onresize = function() {
      console.log(v.videoHeight + "  " + v.videoWidth);
      console.log(initH+ "  " +initW);
      if(initH != v.videoHeight || initW !=v.videoWidth)
      {
        v.style.height = parseInt(v.style.height, 10)*2 + "px";
        v.style.width = parseInt(v.style.height, 10)*2 + "px";
      }
  };
  c.appendChild (v);
  v.srcObject = remoteStream;
  //There must a very effiecient way to do this, but this one works for now
  mixVideos();
}
function mixVideos()
{
  if(isSuperNode)
  {
	  var nums = document.getElementById("videos");
	  var listItem = nums.getElementsByTagName("video");
	  var numList = [];
	  for (var i=0; i < listItem.length; i++) {
		  if(listItem[i].id != "localVideo")
			numList.push(listItem[i]);
	  }
	  for(var i =0;i<localPeerList.length;i++){
		localPeerList[i].mixer.resetVideoStreams(localStream);
		  for(var j=0;j<numList.length;j++){
        if(localPeerList[i].connectionWith != numList[j].id){
          if(localPeerList[i].isSuperNode){
            if(numList[j].className === 'false'){
            localPeerList[i].mixer.appendStreams(numList[j].srcObject);
            }
          }
          else{
            localPeerList[i].mixer.appendStreams(numList[j].srcObject);
          }
        }
		  }
	  }
  }
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated..');
  stop();
  isInitiator = false;
}

function stop() {
  pc.peerConnection.close();
  pc.peerConnection = null;
}