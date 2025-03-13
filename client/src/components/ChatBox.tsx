import React from "react";

interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  created_at: string;
}

interface ChatBoxProps {
  messages: Message[];
  username: string;
  userId: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ChatBox: React.FC<ChatBoxProps> = ({ messages, username, userId }) => {
  // Format time to be displayed in message
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col-reverse">
      {messages.length === 0 ? (
        <p className="text-gray-500 text-center my-4">
          No messages yet. Start a conversation!
        </p>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`my-2 p-3 rounded-lg max-w-3/4 ${
              message.sender_id === userId
                ? "bg-blue-500 text-white self-end"
                : "bg-gray-200 self-start"
            }`}
          >
            {/* Show sender name for messages not from the current user */}
            {message.sender_id !== userId && (
              <div className="font-bold text-sm">{message.sender_name}</div>
            )}
            <div className="break-words">{message.content}</div>
            <div className="text-xs mt-1 opacity-75 text-right">
              {formatTime(message.created_at)}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ChatBox;
