import React, { useEffect, useRef } from 'react'
import io from 'socket.io-client'

import {
  STUN_TURN_CONSTRAINTS,
  // SERVER_URL
} from '../assets/Constants'

const Room = (props) => {
  const { roomID } = props.match.params
  const localvideo = useRef()
  const partnerVideo = useRef()
  const userStream = useRef()
  const socketRef = useRef()
  const peerRef = useRef()
  const otherUser = useRef()


  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {

        localvideo.current.srcObject = stream
        userStream.current = stream

        // socketRef.current = io.connect('http://localhost:8000')
        socketRef.current = io.connect('https://server-video-chat-app.herokuapp.com/')

        socketRef.current.emit('join room', roomID)

        socketRef.current.on('other user', userID => {
          callUser(userID)
          otherUser.current = userID
        })

        socketRef.current.on('offer', handleReceiveCall)

        socketRef.current.on('answer', handleAnswer)

        socketRef.current.on('ice-candidate', handleNewIceCandidateMsg)

      })
      .catch(error => console.error(error))
    console.log('useEffect');

  })

  function callUser(userID) {
    peerRef.current = createPeer(userID)
    userStream.current.getTracks()
      .forEach(track => peerRef.current.addTrack(track, userStream.current))
  }

  function createPeer(userID) {
    const peer = new RTCPeerConnection(STUN_TURN_CONSTRAINTS)
    peer.onicecandidate = handleICECandidateEvent
    peer.ontrack = handleTrackEvent
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID)
    return peer
  }

  function handleICECandidateEvent(event) {
    if (event.candidate) {
      const payload = {
        target: otherUser.current,
        candidate: event.candidate
      }
      socketRef.current.emit("ice-candidate", payload)
    }
  }

  function handleTrackEvent(event) {
    partnerVideo.current.srcObject = event.streams[0]
  }

  function handleNegotiationNeededEvent(userID) {
    peerRef.current.createOffer()
      .then(offer => {
        return peerRef.current.setLocalDescription(offer)
      })
      .then(() => {
        const payload = {
          target: userID,
          caller: socketRef.current.id,
          sdp: peerRef.current.localDescription
        }
        socketRef.current.emit('offer', payload)
      })
      .catch(e => console.error(e))
  }

  function handleReceiveCall(incoming) {
    peerRef.current = createPeer()
    const desc = new RTCSessionDescription(incoming.sdp)
    peerRef.current.setRemoteDescription(desc)
      .then(() => {
        userStream.current.getTracks()
          .forEach(track => peerRef.current.addTrack(track, userStream.current))
      })
      .then(() => {
        return peerRef.current.createAnswer()
      })
      .then(answer => {
        return peerRef.current.setLocalDescription(answer)
      })
      .then(() => {
        const payload = {
          target: incoming.caller,
          caller: socketRef.id,
          sdp: peerRef.current.localDescription
        }
        socketRef.current.emit('answer', payload)
      })
  }

  function handleAnswer(message) {
    const desc = new RTCSessionDescription(message.sdp)
    peerRef.current.setRemoteDescription(desc)
      .catch(console.error)
  }

  function handleNewIceCandidateMsg(payload) {
    const candidate = new RTCIceCandidate(payload)
    peerRef.current.addIceCandidate(candidate)
      .catch(error => console.error(error))
  }

  return (
    <div className="room">
      <h3 style={{ 'width': '100%', 'textAlign': 'center' }}>Room {roomID}</h3>
      <video ref={localvideo} title='my video' className="room__video" autoPlay />
      <video ref={partnerVideo} title='other video' className="room__video" autoPlay />
    </div>
  )
}

export default Room