// ═══════════════════════════════════════════════════════════════════════════
//  WEBRTC SIGNALING — Socket.IO-Based SDP & ICE Candidate Routing
//
//  Enables peer-to-peer video/audio calls between the client (victim)
//  and the police dashboard during an active emergency.
//
//  Room scheme: webrtc-{trackingId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Setup WebRTC signaling handlers on a Socket.IO server instance
 */
function setupWebRTCSignaling(io) {
  io.on('connection', (socket) => {

    // ── Join a WebRTC room for a specific emergency ──
    socket.on('webrtc-join', ({ trackingId, role }) => {
      const room = `webrtc-${trackingId}`;
      socket.join(room);
      console.log(`[WebRTC] ${role} joined room ${room} (socket: ${socket.id})`);

      // Notify other participants
      socket.to(room).emit('webrtc-peer-joined', {
        peerId: socket.id,
        role
      });
    });

    // ── SDP Offer (client → police dashboard) ──
    socket.on('webrtc-offer', ({ trackingId, sdp }) => {
      const room = `webrtc-${trackingId}`;
      console.log(`[WebRTC] SDP Offer received in room ${room}`);
      socket.to(room).emit('webrtc-offer', {
        sdp,
        from: socket.id
      });
    });

    // ── SDP Answer (police dashboard → client) ──
    socket.on('webrtc-answer', ({ trackingId, sdp }) => {
      const room = `webrtc-${trackingId}`;
      console.log(`[WebRTC] SDP Answer received in room ${room}`);
      socket.to(room).emit('webrtc-answer', {
        sdp,
        from: socket.id
      });
    });

    // ── ICE Candidate exchange ──
    socket.on('webrtc-ice-candidate', ({ trackingId, candidate }) => {
      const room = `webrtc-${trackingId}`;
      socket.to(room).emit('webrtc-ice-candidate', {
        candidate,
        from: socket.id
      });
    });

    // ── Leave WebRTC room ──
    socket.on('webrtc-leave', ({ trackingId }) => {
      const room = `webrtc-${trackingId}`;
      socket.leave(room);
      console.log(`[WebRTC] Socket ${socket.id} left room ${room}`);
      socket.to(room).emit('webrtc-peer-left', {
        peerId: socket.id
      });
    });

    // ── Cleanup on disconnect ──
    socket.on('disconnect', () => {
      // Socket.IO auto-removes from rooms, but we notify peers
      const rooms = [...socket.rooms].filter(r => r.startsWith('webrtc-'));
      rooms.forEach(room => {
        socket.to(room).emit('webrtc-peer-left', {
          peerId: socket.id
        });
      });
    });
  });

  console.log('[WebRTC] ✅ Signaling handlers registered');
}

module.exports = { setupWebRTCSignaling };
