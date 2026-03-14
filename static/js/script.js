// ===== DOM Elements =====
const messagesArea = document.getElementById("messagesArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const errorBanner = document.getElementById("errorBanner");
const errorText = document.getElementById("errorText");
const currentDate = document.getElementById("currentDate");

// ===== State =====
let isConnected = true;
let retryTimer = null;
const SENDER_ID = "user_" + Math.random().toString(36).substr(2, 9);

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", () => {
    // Set current date
    const now = new Date();
    currentDate.textContent = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // Focus input
    userInput.focus();

    // Send welcome message
    setTimeout(() => {
        addBotMessage("Hello! I'm your virtual banking assistant. How can I help you today?");
    }, 500);

    // Check health
    checkHealth();
    setInterval(checkHealth, 30000);
});

// ===== Enter key =====
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ===== Get Time String =====
function getTimeString() {
    return new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

// ===== Add Bot Message =====
function addBotMessage(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper bot";
    wrapper.innerHTML = `
        <div class="bot-avatar">
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white" opacity="0.3"/>
                <path d="M12 6c-1.1 0-2 .9-2 2v1H8v2h8v-2h-2V8c0-1.1-.9-2-2-2zm-4 7v4h8v-4H8z" fill="white"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-bubble">${escapeHtml(text)}</div>
            <span class="message-time">${getTimeString()}</span>
        </div>
    `;
    messagesArea.appendChild(wrapper);
    scrollToBottom();
}

// ===== Add User Message =====
function addUserMessage(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper user";
    wrapper.innerHTML = `
        <div class="message-content">
            <div class="message-bubble">${escapeHtml(text)}</div>
            <span class="message-time">${getTimeString()}</span>
        </div>
    `;
    messagesArea.appendChild(wrapper);
    scrollToBottom();
}

// ===== Typing Indicator =====
function showTyping() {
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper bot";
    wrapper.id = "typingIndicator";
    wrapper.innerHTML = `
        <div class="bot-avatar">
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white" opacity="0.3"/>
                <path d="M12 6c-1.1 0-2 .9-2 2v1H8v2h8v-2h-2V8c0-1.1-.9-2-2-2zm-4 7v4h8v-4H8z" fill="white"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    messagesArea.appendChild(wrapper);
    scrollToBottom();
}

function hideTyping() {
    const el = document.getElementById("typingIndicator");
    if (el) el.remove();
}

// ===== Send Message =====
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Add user message
    addUserMessage(text);
    userInput.value = "";
    userInput.focus();

    // Disable input while processing
    sendBtn.disabled = true;
    showTyping();

    try {
        const response = await fetch("/webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, sender: SENDER_ID }),
        });

        hideTyping();

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
            // Add each bot response with a small delay between them
            for (let i = 0; i < data.length; i++) {
                if (i > 0) {
                    await delay(400);
                }
                if (data[i].text) {
                    addBotMessage(data[i].text);
                }
                if (data[i].image) {
                    addBotMessage(`[Image: ${data[i].image}]`);
                }
            }
        } else {
            addBotMessage("I'm sorry, I didn't understand that. Could you rephrase?");
        }

        setOnline();

    } catch (error) {
        hideTyping();
        console.error("Error:", error);
        showConnectionError();
    }

    sendBtn.disabled = false;
}

// ===== Connection Status =====
function setOnline() {
    isConnected = true;
    statusDot.className = "status-dot online";
    statusText.textContent = "Online";
    errorBanner.style.display = "none";
    if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
    }
}

function showConnectionError() {
    isConnected = false;
    statusDot.className = "status-dot offline";
    statusText.textContent = "Offline";
    errorBanner.style.display = "flex";

    let countdown = 5;
    errorText.textContent = `Connection error. Retrying in ${countdown} seconds...`;

    if (retryTimer) clearInterval(retryTimer);

    retryTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(retryTimer);
            retryTimer = null;
            errorText.textContent = "Retrying...";
            checkHealth();
        } else {
            errorText.textContent = `Connection error. Retrying in ${countdown} seconds...`;
        }
    }, 1000);
}

async function checkHealth() {
    try {
        const res = await fetch("/health", { method: "GET", signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.status === "online") {
            setOnline();
        } else {
            if (isConnected) showConnectionError();
        }
    } catch {
        if (isConnected) showConnectionError();
    }
}

// ===== Helpers =====
function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, "<br>");
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
