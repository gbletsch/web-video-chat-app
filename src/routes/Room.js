import React, { useEffect, useRef } from 'react'
import io from 'socket.io-client'

const Room = (props) => {
  const userVideo = useRef()
  const partnerVideo = useRef()
  const socketRef = useRef()
  const otherUser = useRef()
  const peerRef = useRef()

  const userStream = useRef()

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        userVideo.current.srcObject = stream
        userStream.current = stream

        socketRef.current = io.connect('/') // tem que mudar esse endereço???
        socketRef.current.emit('join room', props.match.params.roomID)

        socketRef.current.on('other user', userID => {
          callUser(userID)
          otherUser.current = userID
        })

        socketRef.current.on('user joined', userID => {
          otherUser.current = userID
        })

        socketRef.current.on('offer', handleReceiveCall)
        socketRef.current.on('answer', handleAnswer)
        socketRef.current.on('ice-candidate', handleNewIceCandidateMsg)

      })
  }, [])

  function callUser(userID) {
    peerRef.current = createPeer(userID)
    userStream.current.getTracks().forEach(track => {
      peerRef.current.addTrack(track, userStream.current)
    })
  }

  function createPeer(userID) {
    peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.stunprotocol.org'
        },
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
        },
      ]
    })
    peer.onicecandidate = handleICECandidateEvent
    peer.ontrack = handleTrackEvent
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID)

    return peer
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
          sdp: socketRef.current.localDescription
        }
        socketRef.current.emit('offer', payload)
      })
      .catch(error => console.error('error on handleNegotiationNeededEvent:', error))
  }

  function handleReceiveCall(incoming) {
    peerRef.current = createPeer()
    const desc = new RTCSessionDescription(incoming.sdp)
    peerRef.current.setRemoteDescription(desc)
      .then(() => {
        userStream.current.getTracks().forEach(track => {
          peerRef.current.addTrack(track, userStream.current.current)
        })
      })
      .then(() => {
        const payload = {
          target: incoming.id,
          caller: socketRef.current.id,
          sdp: peerRef.current.localDescription
        }
        socketRef.current.emit('answer', payload)
      })
      .catch(error => console.error('error on handleReceiveCall', error))
  }

  function handleAnswer(message) {
    const desc = new RTCSessionDescription(message.sdp)
    peerRef.current.setRemoteDescription(desc)
      .catch(error => console.error('error on handleAnswer', error))
  }

  function handleICECandidateEvent(e) {
    if (e.candidate) {
      const payload = {
        target: otherUser.current,
        candidate: e.candidate
      }
      socketRef.current.emit('ice-candidate', payload)
    }
  }

  function handleNewIceCandidateMsg(incoming) {
    const candidate = new RTCIceCandidate(incoming) // não é incoming.candidate???
    peerRef.current.addIceCandidate(candidate)
      .catch('error on handleNewIceCandidateMsg', error)
  }

  function handleTrackEvent(e) {
    partnerVideo.current.srcObject = e.streams[0]
  }

  return (
    <div>
      <video ref={userVideo} autoPlay />
      <video ref={partnerVideo} autoPlay />
    </div>
  )
}

export default Room