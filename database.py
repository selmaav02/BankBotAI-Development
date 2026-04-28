"""
Database module for BankBot Admin Panel.
Uses SQLite to store query logs, FAQs, and analytics data.
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chatbot_admin.db")


def get_db():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize the database tables."""
    conn = get_db()
    cursor = conn.cursor()

    # Query logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS query_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            intent TEXT DEFAULT '',
            confidence REAL DEFAULT 0.0,
            response TEXT DEFAULT '',
            sender_id TEXT DEFAULT '',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # FAQs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS faqs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Insert default FAQs if the table is empty
    cursor.execute("SELECT COUNT(*) FROM faqs")
    if cursor.fetchone()[0] == 0:
        default_faqs = [
            ("What are INB's working hours?",
             "Indian National Bank (INB) branches are open Monday to Saturday, 9:30 AM to 4:30 PM. Sunday and national holidays are closed."),
            ("How do I reset my INB internet banking password?",
             "Visit the INB NetBanking portal, click Forgot Password, and follow the OTP-based verification using your registered mobile number."),
            ("What documents are required to open a savings account at INB?",
             "You need: Aadhaar Card, PAN Card, Passport-size Photograph, and Address Proof (utility bill or rent agreement)."),
            ("What is the minimum balance for an INB savings account?",
             "The minimum average quarterly balance for a regular INB savings account is Rs.5,000. Zero-balance accounts are also available."),
            ("How can I block a lost or stolen INB card?",
             "You can block your INB card immediately through the mobile app, by calling our 24/7 helpline at 1800-INB-XXXX, or by chatting with this assistant."),
        ]
        cursor.executemany("INSERT INTO faqs (question, answer) VALUES (?, ?)", default_faqs)

    conn.commit()
    conn.close()
    print("Database initialized at:", DB_PATH)


# ===== QUERY LOG FUNCTIONS =====

def log_query(query, intent="", confidence=0.0, response="", sender_id=""):
    """Log a user query to the database."""
    conn = get_db()
    conn.execute(
        "INSERT INTO query_logs (query, intent, confidence, response, sender_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        (query, intent, confidence, response, sender_id, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    )
    conn.commit()
    conn.close()


def get_all_queries(limit=100, offset=0, search=""):
    """Get all logged queries with optional search filter."""
    conn = get_db()
    if search:
        rows = conn.execute(
            "SELECT * FROM query_logs WHERE query LIKE ? OR intent LIKE ? ORDER BY timestamp DESC LIMIT ? OFFSET ?",
            (f"%{search}%", f"%{search}%", limit, offset)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM query_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?",
            (limit, offset)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_query_count():
    """Get total number of logged queries."""
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM query_logs").fetchone()[0]
    conn.close()
    return count


def get_stats():
    """Get dashboard statistics."""
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM query_logs").fetchone()[0]
    high_conf = conn.execute("SELECT COUNT(*) FROM query_logs WHERE confidence >= 0.7").fetchone()[0]
    avg_conf = conn.execute("SELECT AVG(confidence) FROM query_logs").fetchone()[0] or 0
    fallback_count = conn.execute("SELECT COUNT(*) FROM query_logs WHERE intent = 'nlu_fallback' OR intent = ''").fetchone()[0]

    # Intent distribution (top 10)
    intent_dist = conn.execute(
        "SELECT intent, COUNT(*) as count FROM query_logs WHERE intent != '' GROUP BY intent ORDER BY count DESC LIMIT 10"
    ).fetchall()

    # Confidence distribution
    conf_high = conn.execute("SELECT COUNT(*) FROM query_logs WHERE confidence >= 0.9").fetchone()[0]
    conf_med = conn.execute("SELECT COUNT(*) FROM query_logs WHERE confidence >= 0.7 AND confidence < 0.9").fetchone()[0]
    conf_low = conn.execute("SELECT COUNT(*) FROM query_logs WHERE confidence < 0.7").fetchone()[0]

    conn.close()

    success_rate = (high_conf / total * 100) if total > 0 else 0
    fallback_rate = (fallback_count / total * 100) if total > 0 else 0

    return {
        "total_queries": total,
        "success_rate": round(success_rate, 1),
        "avg_confidence": round(avg_conf * 100, 1),
        "fallback_rate": round(fallback_rate, 1),
        "intent_distribution": [{"intent": r["intent"], "count": r["count"]} for r in intent_dist],
        "confidence_distribution": {
            "high": conf_high,
            "medium": conf_med,
            "low": conf_low,
            "high_pct": round((conf_high / total * 100) if total > 0 else 0),
            "medium_pct": round((conf_med / total * 100) if total > 0 else 0),
            "low_pct": round((conf_low / total * 100) if total > 0 else 0),
        }
    }


# ===== FAQ FUNCTIONS =====

def get_all_faqs():
    """Get all FAQs."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM faqs ORDER BY id ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_faq(question, answer):
    """Add a new FAQ."""
    conn = get_db()
    conn.execute(
        "INSERT INTO faqs (question, answer) VALUES (?, ?)",
        (question, answer)
    )
    conn.commit()
    conn.close()


def delete_faq(faq_id):
    """Delete a FAQ by ID."""
    conn = get_db()
    conn.execute("DELETE FROM faqs WHERE id = ?", (faq_id,))
    conn.commit()
    conn.close()


def update_faq(faq_id, question, answer):
    """Update an existing FAQ."""
    conn = get_db()
    conn.execute(
        "UPDATE faqs SET question = ?, answer = ?, updated_at = ? WHERE id = ?",
        (question, answer, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), faq_id)
    )
    conn.commit()
    conn.close()
