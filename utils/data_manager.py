
import json
import os

DATA_FILE = "tournaments.json"

def load_data():
    if not os.path.exists(DATA_FILE):
        return {"active": None, "tournaments": {}}
    
    
    if os.path.getsize(DATA_FILE) == 0:
        return {"active": None, "tournaments": {}}
        
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            
            return {"active": None, "tournaments": {}}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)