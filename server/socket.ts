import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

export function setupSocketIO(server: HttpServer) {
  const io = new SocketIOServer(server, {
    path: "/api/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Track online users per character room
  const roomCounts = new Map<string, number>();

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;

    socket.on("join-character", (characterUid: string) => {
      if (currentRoom) {
        socket.leave(currentRoom);
        const prev = (roomCounts.get(currentRoom) ?? 1) - 1;
        roomCounts.set(currentRoom, Math.max(0, prev));
        io.to(currentRoom).emit("online-count", Math.max(0, prev));
      }
      currentRoom = `char:${characterUid}`;
      socket.join(currentRoom);
      const count = (roomCounts.get(currentRoom) ?? 0) + 1;
      roomCounts.set(currentRoom, count);
      io.to(currentRoom).emit("online-count", count);
    });

    socket.on("leave-character", (characterUid: string) => {
      const room = `char:${characterUid}`;
      socket.leave(room);
      const count = Math.max(0, (roomCounts.get(room) ?? 1) - 1);
      roomCounts.set(room, count);
      io.to(room).emit("online-count", count);
      if (currentRoom === room) currentRoom = null;
    });

    socket.on("character-change", (characterUid: string) => {
      const room = `char:${characterUid}`;
      // Broadcast to everyone else in the room (not the sender)
      socket.to(room).emit("character-updated");
    });

    socket.on("disconnect", () => {
      if (currentRoom) {
        const count = Math.max(0, (roomCounts.get(currentRoom) ?? 1) - 1);
        roomCounts.set(currentRoom, count);
        io.to(currentRoom).emit("online-count", count);
      }
    });
  });

  return io;
}
