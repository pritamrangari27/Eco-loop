import sqlite3
import os
from config.settings import DB_PATH

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            indoor_temp REAL,
            outdoor_temp REAL,
            energy REAL,
            occupancy INTEGER,
            pmv REAL,
            strategy TEXT,
            reason TEXT,
            action TEXT,
            estimated_savings REAL
        )
    ''')
    conn.commit()
    conn.close()

def log_decision(telemetry, strategy, reason, action, savings):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO decisions (indoor_temp, outdoor_temp, energy, occupancy, pmv, strategy, reason, action, estimated_savings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        telemetry.get('indoor_temp'),
        telemetry.get('outdoor_temp'),
        telemetry.get('energy'),
        telemetry.get('occupancy'),
        telemetry.get('pmv'),
        strategy,
        reason,
        action,
        savings
    ))
    conn.commit()
    conn.close()

def get_history(limit=50):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM decisions ORDER BY timestamp DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
