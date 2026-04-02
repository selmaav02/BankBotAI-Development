from flask import Flask, render_template, request, jsonify, session, redirect, url_for, make_response
import requests
import os
import csv
import io
import yaml
from flask import Response
from database import init_db, log_query, get_all_queries, get_query_count, get_stats, get_all_faqs, add_faq, delete_faq, update_faq

app = Flask(__name__)
app.secret_key = os.urandom(24)

RASA_API_URL = "http://localhost:5005/webhooks/rest/webhook"
RASA_PARSE_URL = "http://localhost:5005/model/parse"

# Default admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

# Path to training data files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOMAIN_PATH = os.path.join(BASE_DIR, "domain.yml")
NLU_PATH = os.path.join(BASE_DIR, "data", "nlu.yml")

# Initialize database on startup
init_db()


@app.route("/")
def home():
    return render_template("chat.html")


# ===== ADMIN AUTH ROUTES =====

@app.route("/admin")
def admin_login_page():
    """Show login page, or redirect to dashboard if already logged in."""
    if session.get("admin_logged_in"):
        return redirect(url_for("admin_dashboard"))
    response = make_response(render_template("admin_login.html"))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.route("/admin/login", methods=["POST"])
def admin_login():
    """Handle admin login."""
    data = request.get_json()
    username = data.get("username", "")
    password = data.get("password", "")

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session["admin_logged_in"] = True
        session["admin_username"] = username
        return jsonify({"success": True, "message": "Login successful"})
    else:
        return jsonify({"success": False, "message": "Invalid username or password"}), 401


@app.route("/admin/dashboard")
def admin_dashboard():
    """Show admin dashboard (protected)."""
    if not session.get("admin_logged_in"):
        return redirect(url_for("admin_login_page"))
    response = make_response(render_template("admin.html"))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.route("/admin/logout")
def admin_logout():
    """Logout admin and redirect to login page."""
    session.pop("admin_logged_in", None)
    session.pop("admin_username", None)
    return redirect(url_for("admin_login_page"))


# ===== ADMIN API ROUTES =====

@app.route("/admin/api/stats")
def admin_api_stats():
    """Get dashboard statistics from the database."""
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    stats = get_stats()

    # Count intents and entities from domain.yml
    try:
        with open(DOMAIN_PATH, "r", encoding="utf-8") as f:
            domain = yaml.safe_load(f)
        intent_count = len(domain.get("intents", []))
        entity_count = len(domain.get("entities", []))
    except Exception:
        intent_count = 0
        entity_count = 0

    stats["intent_count"] = intent_count
    stats["entity_count"] = entity_count

    return jsonify(stats)


@app.route("/admin/api/queries")
def admin_api_queries():
    """Get query logs from database."""
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    search = request.args.get("search", "")
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))

    queries = get_all_queries(limit=limit, offset=offset, search=search)
    total = get_query_count()

    return jsonify({"queries": queries, "total": total})


@app.route("/admin/api/training-data")
def admin_api_training_data():
    """Read intents and examples from nlu.yml."""
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    try:
        with open(NLU_PATH, "r", encoding="utf-8") as f:
            nlu_data = yaml.safe_load(f)

        intents = []
        for item in nlu_data.get("nlu", []):
            if "intent" in item and "examples" in item:
                examples_raw = item["examples"].strip()
                examples = [line.lstrip("- ").strip() for line in examples_raw.split("\n") if line.strip() and line.strip() != "-"]
                intents.append({
                    "name": item["intent"],
                    "examples": examples
                })

        return jsonify({"intents": intents})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/admin/api/faqs")
def admin_api_faqs():
    """Get all FAQs from database."""
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    faqs = get_all_faqs()
    return jsonify({"faqs": faqs})


@app.route("/admin/api/faqs", methods=["POST"])
def admin_api_add_faq():
    """Add a new FAQ."""
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    question = data.get("question", "").strip()
    answer = data.get("answer", "").strip()

    if not question or not answer:
        return jsonify({"error": "Both question and answer are required"}), 400

    add_faq(question, answer)
    return jsonify({"success": True, "message": "FAQ added successfully"})


@app.route("/admin/api/faqs/<int:faq_id>", methods=["DELETE"])
def admin_api_delete_faq(faq_id):
    """Delete a FAQ."""
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    delete_faq(faq_id)
    return jsonify({"success": True, "message": "FAQ deleted"})


@app.route("/admin/api/export/csv")
def admin_api_export_csv():
    """Export query logs as CSV download."""
    if not session.get("admin_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    queries = get_all_queries(limit=10000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Query", "Intent", "Confidence", "Response", "Sender ID", "Timestamp"])

    for q in queries:
        writer.writerow([
            q["id"],
            q["query"],
            q["intent"],
            f'{q["confidence"] * 100:.1f}%',
            q["response"],
            q["sender_id"],
            q["timestamp"]
        ])

    csv_content = output.getvalue()
    output.close()

    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=chatbot_query_logs.csv"}
    )


# ===== CHAT ROUTES =====

@app.route("/webhook", methods=["POST"])
def webhook():
    user_message = request.json.get("message", "")
    sender = request.json.get("sender", "user")

    if not user_message.strip():
        return jsonify([{"text": "Please type a message."}])

    # Parse the message to get intent and confidence for logging
    intent_name = ""
    confidence = 0.0
    try:
        parse_response = requests.post(
            RASA_PARSE_URL,
            json={"text": user_message},
            timeout=5
        )
        if parse_response.ok:
            parse_data = parse_response.json()
            intent_info = parse_data.get("intent", {})
            intent_name = intent_info.get("name", "")
            confidence = intent_info.get("confidence", 0.0)
    except Exception:
        pass  # Don't fail the main request if parsing fails

    try:
        response = requests.post(
            RASA_API_URL,
            json={"sender": sender, "message": user_message},
            timeout=30,
        )
        response.raise_for_status()
        bot_responses = response.json()

        if not bot_responses:
            bot_response_text = "I'm sorry, I didn't understand that. Could you rephrase?"
            log_query(user_message, intent_name, confidence, bot_response_text, sender)
            return jsonify([{"text": bot_response_text}])

        # Collect all response texts for logging
        all_texts = " | ".join([r.get("text", "") for r in bot_responses if r.get("text")])
        log_query(user_message, intent_name, confidence, all_texts, sender)

        return jsonify(bot_responses)

    except requests.exceptions.ConnectionError:
        error_msg = "⚠️ Connection error. The chatbot server is not responding. Please make sure Rasa is running."
        log_query(user_message, intent_name, confidence, error_msg, sender)
        return jsonify([{"text": error_msg}]), 503
    except requests.exceptions.Timeout:
        error_msg = "⚠️ Request timed out. Please try again."
        log_query(user_message, intent_name, confidence, error_msg, sender)
        return jsonify([{"text": error_msg}]), 504
    except Exception as e:
        error_msg = f"⚠️ An error occurred: {str(e)}"
        log_query(user_message, intent_name, confidence, error_msg, sender)
        return jsonify([{"text": error_msg}]), 500


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
    print("🔐 Admin Panel: http://localhost:5000/admin")
    print("⚠️  Make sure Rasa is running: rasa run --enable-api --cors \"*\"\n")
    app.run(debug=True, port=5000)
