# [WebRTC Chat](https://ronnie-reagan.github.io/WebRTC-Chat/)

This project provides a **WebRTC-based chat service** that enables secure and private communication between a "Host" and a "Peer." The code for this project is provided strictly for use within the offered service. Users are not allowed to use, modify, or redistribute the code outside of the intended service.

---

## **Features**

- **Host Role**: The host creates a connection offer and waits for the peer to respond with an answer.
- **Peer Role**: The peer receives the host's offer, generates a connection answer, and establishes communication.
- **Real-Time Chat**: Exchange messages securely once the connection is established.
- **Peer-to-Peer Data Channels**: Direct communication between the host and peer, bypassing intermediaries.

---

## **Usage**

To use the service, follow these steps:

1. Open this [link](https://ronnie-reagan.github.io/WebRTC-Chat/).
2. Follow the instructions for the **Host** and **Peer** setup below.

---

### **Step 1: Set Up the Host**

1. Click **"Open [Host](https://ronnie-reagan.github.io/WebRTC-Chat/host.html) Page"**.
2. Generate a connection offer by clicking **"Generate Offer"**.
3. Copy the generated offer and share it with the Peer securely (e.g., through a note, email, or another communication method).

---

### **Step 2: Set Up the Peer**

1. Click **"Open [Peer](https://ronnie-reagan.github.io/WebRTC-Chat/peer.html) Page"**.
2. Paste the Host's offer into the **Offer** field.
3. Click **"Generate Answer"** to create a connection answer.
4. Share the answer back with the Host using the same secure method.

---

### **Step 3: Communicate**

- Once both sides have exchanged offers and answers, the connection will be established.
- You can start sending messages securely using the chat interface.

---

## **Privacy & Security**

This service prioritizes secure and private communication. However, users should take additional steps to ensure maximum security:

1. **Key Exchange**:
   - For the highest security, exchange the Host's offer and Peer's answer through a trusted, offline method like a handwritten note.

2. **VPN and Tor**:
   - For anonymity and IP protection, use a VPN, or combine a VPN with the Tor network for added privacy.

3. **Avoid Public Networks**:
   - Ensure you're using a secure, private network to prevent eavesdropping.

4. **WebRTC IP Protection**:
   - Verify your WebRTC setup does not leak your IP address (use tools to test for WebRTC leaks).

5. **One-Time Keys**:
   - To prevent reuse, consider using a new offer and answer for each session.

---

## **Licensing**

This project is licensed under a **custom license**:
- Use of the software is permitted only through the provided service.
- Redistribution, modification, or reverse engineering of the code is strictly prohibited.
- For full terms, see the [LICENSE](https://github.com/Ronnie-Reagan/WebRTC-Chat?tab=License-1-ov-file) file.

---

## **Disclaimer**

This software is provided **"as is"**, without any guarantees or warranties of any kind. The author is not liable for any damages or issues arising from its use.

---

## **Contact**

For questions, feedback, or support, please contact the author.
