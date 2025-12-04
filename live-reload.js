const socket = new WebSocket("ws://localhost:8001");
socket.addEventListener("close", () => {
  location.reload();
});
