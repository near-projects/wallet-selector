import React from "react";
import type { Message } from "../interfaces";
import styles from "./Messages.module.css";

interface MessagesProps {
  messages: Array<Message>;
}

const Messages: React.FC<MessagesProps> = ({ messages }) => {
  return (
    <div className={styles.messagesContainer}>
      <h2>Messages</h2>
      <div className={styles.messagesList}>
        {messages.map((message, i) => (
          <div
            key={i}
            className={`${styles.messageCard} ${
              message.premium ? styles.premiumCard : ""
            }`}
          >
            <div className={styles.messageHeader}>
              <strong className={styles.sender}>{message.sender}</strong>
              <span className={styles.timestamp}>
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <p className={styles.messageText}>{message.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Messages;
