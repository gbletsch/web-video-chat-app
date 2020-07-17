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
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        userVideo.current.srcObject = stream
        userStream.current = stream

        socketRef.current = io.connect("https://server-video-chat-app.herokuapp.com/")
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
  })

  function callUser(userID) {
    peerRef.current = createPeer(userID)
    userStream.current.getTracks().forEach(track => {
      peerRef.current.addTrack(track, userStream.current)
    })
  }

  function createPeer(userID) {
    const constraints = {
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
    }

    // const constraints = {
    //   iceServers: [
    //     { url: 'stun:stun01.sipphone.com' },
    //     { url: 'stun:stun.ekiga.net' },
    //     { url: 'stun:stun.fwdnet.net' },
    //     { url: 'stun:stun.ideasip.com' },
    //     { url: 'stun:stun.iptel.org' },
    //     { url: 'stun:stun.rixtelecom.se' },
    //     { url: 'stun:stun.schlund.de' },
    //     { url: 'stun:stun.l.google.com:19302' },
    //     { url: 'stun:stun1.l.google.com:19302' },
    //     { url: 'stun:stun2.l.google.com:19302' },
    //     { url: 'stun:stun3.l.google.com:19302' },
    //     { url: 'stun:stun4.l.google.com:19302' },
    //     { url: 'stun:stunserver.org' },
    //     { url: 'stun:stun.softjoys.com' },
    //     { url: 'stun:stun.voiparound.com' },
    //     { url: 'stun:stun.voipbuster.com' },
    //     { url: 'stun:stun.voipstunt.com' },
    //     { url: 'stun:stun.voxgratia.org' },
    //     { url: 'stun:stun.xten.com' },
    //     {
    //       url: 'turn:numb.viagenie.ca',
    //       credential: 'muazkh',
    //       username: 'webrtc@live.com'
    //     },
    //     {
    //       url: 'turn:192.158.29.39:3478?transport=udp',
    //       credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    //       username: '28224511:1379330808'
    //     },
    //     {
    //       url: 'turn:192.158.29.39:3478?transport=tcp',
    //       credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    //       username: '28224511:1379330808'
    //     }
    //   ]
    // }

    const peer = new RTCPeerConnection(constraints)
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
          sdp: peerRef.current.localDescription
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
          peerRef.current.addTrack(track, userStream.current)
        })
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
      .catch(error => console.error('error on handleNewIceCandidateMsg', error))
  }

  function handleTrackEvent(e) {
    console.log('event', e.streams[0]);
    partnerVideo.current.srcObject = e.streams[0]
    console.log('partner', partnerVideo);
  }

  return (
    <div>
      <video autoPlay ref={userVideo} title='mine' />
      <video autoPlay ref={partnerVideo} title='other' />
    </div>
  )
}

export default Room