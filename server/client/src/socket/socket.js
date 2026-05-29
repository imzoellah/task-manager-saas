import { io } from "socket.io-client";

export const socket = io(
  "https://task-manager-saas-production-1ae9.up.railway.app"
);