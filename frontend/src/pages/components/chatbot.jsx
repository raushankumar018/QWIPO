import React, { useState, useRef, useEffect } from "react";
import axios from 'axios'

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! How can I assist you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';

  const handleToggleChat = () => setIsOpen(!isOpen);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (!token) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Please login to get started with chatbot" },
        ]);
        return;
      }
      const response = await axios.post(`${API_BASE}/api/recommendations/chatbot`, {
        data: {
          query: input,
          history: messages
        }
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = response.data.items;
      const botMessage = { sender: "bot", text: data };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, I'm having trouble connecting. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999
    }}>
      {/* Chat Icon - Always Visible */}
      <div
        style={{
          position: "absolute",
          bottom: "0",
          right: "0",
          transition: "bottom 0.3s ease",
          cursor: "pointer",
          zIndex: 10000,
        }}
      >
        <img
          width="60"
          height="60"
          src="https://img.icons8.com/fuzzy/100/chatbot-head.png"
          alt="chatbot-head"
          style={{
            cursor: "pointer",
            transition: "transform 0.3s ease",
            marginBottom: isOpen ? "0px" : "70px",
            marginRight: isOpen ? "0px" : "5px",
          }}
          onClick={handleToggleChat}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        />
        {!isOpen && (
          <div
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#10B981",
              animation: "pulse 2s infinite",
            }}
          />
        )}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            width: "450px",
            height: "600px",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: "#1a1a1a",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            border: "1px solid #333",
            marginBottom: "70px",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 20px",
              background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "16px",
              borderBottom: "1px solid #333",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                  animation: "pulse 2s infinite",
                }}
              />
              <span>Qwipo Assistant</span>
            </div>
            <button
              onClick={handleToggleChat}
              style={{
                height: "25px",
                width: "25px",
                background: "none",
                border: "none",
                color: "#999",
                fontSize: "18px",
                cursor: "pointer",
                padding: "5px",
                borderRadius: "4px",
                transition: "all 0.2s ease",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#333")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              ×
            </button>
          </div>

          {/* Messages Container */}
          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              padding: "20px",
              overflowY: "auto",
              background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              // Scrollbar styling
              scrollbarWidth: "thin",
              scrollbarColor: "#10B981 #2d2d2d",
            }}
            className="custom-scrollbar"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                {msg.sender === "bot" && (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      marginTop: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#10B981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#000",
                      flexShrink: 0,
                    }}
                  >
                    AI
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "75%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <span
  style={{
    padding: "12px 16px",
    borderRadius: "18px",
    wordBreak: "break-word",
    backgroundColor: msg.sender === "user"
      ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
      : "#2d2d2d",
    color: msg.sender === "user" ? "#fff" : "#e5e5e5",
    border: msg.sender === "user" ? "none" : "1px solid #404040",
    boxShadow: msg.sender === "user"
      ? "0 2px 10px rgba(16, 185, 129, 0.3)"
      : "0 2px 8px rgba(0,0,0,0.2)",
    lineHeight: "1.6",
    fontSize: "14px",
  }}
>
  {msg.sender === "bot" && msg.text.includes("*") ? (
    <ul style={{ paddingLeft: "18px", margin: 0 }}>
      {msg.text.split("*").filter(Boolean).map((item, idx) => (
        <li key={idx} style={{ marginBottom: "6px" }}>{item.trim()}</li>
      ))}
    </ul>
  ) : (
    msg.text
  )}
</span>

                </div>
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "#10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#000",
                    flexShrink: 0,
                  }}
                >
                  AI
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "18px",
                    backgroundColor: "#2d2d2d",
                    border: "1px solid #404040",
                  }}
                >
                  <div style={{ display: "flex", gap: "4px" }}>
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#10B981",
                        animation: "bounce 1.4s infinite ease-in-out",
                      }}
                    />
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#10B981",
                        animation: "bounce 1.4s infinite ease-in-out",
                        animationDelay: "0.2s",
                      }}
                    />
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#10B981",
                        animation: "bounce 1.4s infinite ease-in-out",
                        animationDelay: "0.4s",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: "15px",
              borderTop: "1px solid #333",
              backgroundColor: "#1a1a1a",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-end",
              }}
            >
              <textarea
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #404040",
                  backgroundColor: "#2d2d2d",
                  color: "#fff",
                  resize: "none",
                  fontSize: "14px",
                  outline: "none",
                  minHeight: "44px",
                  maxHeight: "100px",
                  transition: "border-color 0.2s ease",
                }}
                rows={1}
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                onFocus={(e) => (e.target.style.borderColor = "#10B981")}
                onBlur={(e) => (e.target.style.borderColor = "#404040")}
                disabled={isLoading}
              />
              <button
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  color: "#fff",
                  fontWeight: "600",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: isLoading ? 0.7 : 1,
                  minWidth: "60px",
                }}
                onClick={handleSend}
                disabled={isLoading}
                onMouseOver={(e) => !isLoading && (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseOut={(e) => !isLoading && (e.currentTarget.style.transform = "scale(1)")}
              >
                {isLoading ? "..." : "Send"}
              </button>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#666",
                textAlign: "center",
                marginTop: "8px",
              }}
            >
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        /* Custom scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #2d2d2d;
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 3px;
          transition: all 0.3s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #34D399 0%, #10B981 100%);
        }

        .custom-scrollbar::-webkit-scrollbar-corner {
          background: #1a1a1a;
        }

        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #10B981 #2d2d2d;
        }
      `}</style>
    </div>
  );
};

export default ChatBot;