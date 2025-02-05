# WebRTC Chat

Welcome to **WebRTC Chat**, a simple peer-to-peer chat application using WebRTC.

## Features
- Host and Peer-based connection setup
- Secure authentication using a host-generated auth code
- Real-time messaging
- Minimal UI with easy navigation

## Installation
1. Clone this repository:
   ```sh
   git clone https://github.com/killuazoldyckreal/WebRtc.git
   cd WebRtc
   ```
2. Open `index.html` in a browser to start the application.

## Usage
### 1. Host
- Open `host.html`.
- Enter your name and click **Create Auth Code**.
- Share the generated auth code with the peer.
- Wait for the peer to connect and start chatting.

### 2. Peer
- Open `peer.html`.
- Enter your name and click **Enter Host Auth Code**.
- Paste the auth code received from the host.
- Once connected, start chatting.

## Technologies Used
- **HTML, CSS, JavaScript** for frontend
- **WebRTC** for peer-to-peer communication

## License
This project is licensed under a **[Custom License](LICENSE.md)**. This means you can use, modify, and share the project for non-commercial purposes, but commercial use is prohibited.

## Credits
This project was inspired by the original WebRTC Chat by [Ronnie Reagan](https://ronnie-reagan.github.io/WebRTC-Chat/).
