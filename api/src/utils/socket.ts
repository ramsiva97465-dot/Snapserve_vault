import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    console.log(`🔌 WebSockets: Client connected (${socket.id})`);

    socket.on("join-document", (documentId: string) => {
      if (documentId) {
        socket.join(`doc:${documentId}`);
        console.log(`🔌 WebSockets: Socket ${socket.id} joined doc:${documentId}`);
      }
    });

    socket.on("leave-document", (documentId: string) => {
      if (documentId) {
        socket.leave(`doc:${documentId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 WebSockets: Client disconnected (${socket.id})`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function notifyDocumentSigned(data: {
  documentId: string;
  documentTitle: string;
  signerName: string;
  signerEmail?: string;
  status: string;
}) {
  if (!io) return;

  // Broadcast to document room
  io.to(`doc:${data.documentId}`).emit("document:signed", data);

  // Broadcast to global admin channel
  io.emit("admin:notification", {
    type: "DOCUMENT_SIGNED",
    message: `🎉 ${data.signerName} has signed "${data.documentTitle}"`,
    data,
    timestamp: new Date().toISOString(),
  });
}
