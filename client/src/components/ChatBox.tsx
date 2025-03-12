import React from "react";

interface Message {
  id: number;
  content: string;
  username: string;
  created_at: string;
}

interface ChatBoxProps {
  messages: Message[];
  username: string;
  roomName: string | null;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, username, roomName }) => {
  return (
    <div className="flex flex-col-reverse">
      {messages.length === 0 ? (
        <p className="text-gray-500 text-center my-4">
          {roomName
            ? `No messages in room ${roomName} yet. Start a conversation!`
            : "No messages yet. Start a conversation!"}
        </p>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`my-2 p-3 rounded-lg ${
              message.username === username
                ? "bg-blue-500 text-white self-end"
                : "bg-gray-200 self-start"
            }`}
          >
            <div className="font-bold">{message.username}</div>
            <div>{message.content}</div>
            <div className="text-xs mt-1 opacity-75">
              {new Date(message.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ChatBox;
