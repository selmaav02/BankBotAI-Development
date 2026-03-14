from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

RASA_API_URL = "http://localhost:5005/webhooks/rest/webhook"


@app.route("/")
def home():
    return render_template("chat.html")


@app.route("/webhook", methods=["POST"])
def webhook():
    user_message = request.json.get("message", "")
    sender = request.json.get("sender", "user")

    if not user_message.strip():
        return jsonify([{"text": "Please type a message."}])

    try:
        response = requests.post(
            RASA_API_URL,
            json={"sender": sender, "message": user_message},
            timeout=30,
        )
        response.raise_for_status()
        bot_responses = response.json()

        if not bot_responses:
            return jsonify([{"text": "I'm sorry, I didn't understand that. Could you rephrase?"}])

        return jsonify(bot_responses)

    except requests.exceptions.ConnectionError:
        return jsonify([{"text": "⚠️ Connection error. The chatbot server is not responding. Please make sure Rasa is running."}]), 503
    except requests.exceptions.Timeout:
        return jsonify([{"text": "⚠️ Request timed out. Please try again."}]), 504
    except Exception as e:
        return jsonify([{"text": f"⚠️ An error occurred: {str(e)}"}]), 500


@app.route("/health")
def health():
    """Check if Rasa server is reachable."""
    try:
        r = requests.get("http://localhost:5005/", timeout=5)
        return jsonify({"status": "online"}), 200
    except Exception:
        return jsonify({"status": "offline"}), 503


if __name__ == "__main__":
    print("\n✅ Bank Assistant Web UI is running!")
    print("🌐 Open http://localhost:5000 in your browser")
    print("⚠️  Make sure Rasa is running: rasa run --enable-api --cors \"*\"\n")
    app.run(debug=True, port=5000)
