import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = window.location.origin;
    socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("🔌 WebSockets: Connected to Snapserve server!");
    });

    // Global Admin Toast Listener for Instant Real-Time Notifications
    socket.on("admin:notification", (notification: any) => {
      console.log("🔔 WebSockets Notification received:", notification);
      if (notification?.message) {
        toast.success(notification.message, {
          duration: 6000,
          description: "Document status updated in real-time!",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("🔌 WebSockets: Disconnected");
    });
  }

  return socket;
}

export function joinDocumentRoom(documentId: string) {
  const s = getSocket();
  if (s && documentId) {
    s.emit("join-document", documentId);
  }
}

export function leaveDocumentRoom(documentId: string) {
  const s = getSocket();
  if (s && documentId) {
    s.emit("leave-document", documentId);
  }
}
