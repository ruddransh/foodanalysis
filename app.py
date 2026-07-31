from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import base64
import os
from io import BytesIO
from PIL import Image
import json
import hashlib
from datetime import datetime
import sqlite3
import requests

from google import genai
from google.genai import types
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from pydantic import BaseModel
from typing import List

class FoodCheckResult(BaseModel):
    is_food: bool
    reason: str

class NutritionalInfo(BaseModel):
    calories: int
    protein: str
    carbohydrates: str
    fat: str
    fiber: str

class FoodAnalysisResult(BaseModel):
    food_name: str
    ingredients: List[str]
    portion_size: str
    nutritional_info: NutritionalInfo
    confidence: str
    notes: str

app = Flask(__name__)
CORS(app)

GEMINI_MODEL = "gemini-2.5-flash"


def get_api_key():
    """Get the Gemini API key from the environment."""
    return os.environ.get("GEMINI_API_KEY") or os.environ.get("OPEN_AI_KEY")


def call_gemini(prompt, image_base64, response_schema=None, timeout=90):
    """Send a request to Gemini using the google-genai library."""
    api_key = get_api_key()
    if not api_key:
        raise Exception("Missing API key. Set GEMINI_API_KEY or OPEN_AI_KEY in your environment.")

    client = genai.Client(api_key=api_key)
    image_bytes = base64.b64decode(image_base64)

    config_params = {
        "temperature": 0.1,
        "max_output_tokens": 4096,
        "response_mime_type": "application/json",
    }
    if response_schema:
        config_params["response_schema"] = response_schema

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            prompt,
            types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/jpeg",
            ),
        ],
        config=types.GenerateContentConfig(**config_params)
    )

    if not response.text:
        raise Exception("Gemini API returned an empty response.")

    return response.text

# Database setup
def init_db():
    """Initialize SQLite database for history"""
    conn = sqlite3.connect('food_history.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS food_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_hash TEXT UNIQUE,
            food_name TEXT,
            ingredients TEXT,
            portion_size TEXT,
            calories INTEGER,
            protein TEXT,
            carbohydrates TEXT,
            fat TEXT,
            fiber TEXT,
            confidence TEXT,
            notes TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

def get_image_hash(image_data):
    """Generate MD5 hash of image for comparison"""
    return hashlib.md5(image_data).hexdigest()

def save_to_history(image_hash, result):
    """Save analysis result to database"""
    try:
        conn = sqlite3.connect('food_history.db')
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO food_analysis 
            (image_hash, food_name, ingredients, portion_size, calories, 
             protein, carbohydrates, fat, fiber, confidence, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            image_hash,
            result['food_name'],
            json.dumps(result['ingredients']),
            result['portion_size'],
            result['nutritional_info']['calories'],
            result['nutritional_info']['protein'],
            result['nutritional_info']['carbohydrates'],
            result['nutritional_info']['fat'],
            result['nutritional_info']['fiber'],
            result['confidence'],
            result.get('notes', '')
        ))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving to history: {e}")
        return False

def get_from_history(image_hash):
    """Retrieve analysis from database if it exists"""
    try:
        conn = sqlite3.connect('food_history.db')
        c = conn.cursor()
        c.execute('SELECT * FROM food_analysis WHERE image_hash = ?', (image_hash,))
        row = c.fetchone()
        conn.close()
        
        if row:
            return {
                'food_name': row[2],
                'ingredients': json.loads(row[3]),
                'portion_size': row[4],
                'nutritional_info': {
                    'calories': row[5],
                    'protein': row[6],
                    'carbohydrates': row[7],
                    'fat': row[8],
                    'fiber': row[9]
                },
                'confidence': row[10],
                'notes': row[11],
                'from_history': True,
                'analyzed_date': row[12]
            }
        return None
    except Exception as e:
        print(f"Error retrieving from history: {e}")
        return None

def get_all_history():
    """Get all history records"""
    try:
        conn = sqlite3.connect('food_history.db')
        c = conn.cursor()
        c.execute('SELECT * FROM food_analysis ORDER BY timestamp DESC LIMIT 50')
        rows = c.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            history.append({
                'id': row[0],
                'food_name': row[2],
                'ingredients': json.loads(row[3]),
                'portion_size': row[4],
                'nutritional_info': {
                    'calories': row[5],
                    'protein': row[6],
                    'carbohydrates': row[7],
                    'fat': row[8],
                    'fiber': row[9]
                },
                'confidence': row[10],
                'notes': row[11],
                'timestamp': row[12]
            })
        return history
    except Exception as e:
        print(f"Error getting history: {e}")
        return []

@app.route('/api/history/clear', methods=['DELETE'])
def clear_history():
    """Clear all history records"""
    try:
        conn = sqlite3.connect('food_history.db')
        c = conn.cursor()
        c.execute('DELETE FROM food_analysis')
        conn.commit()
        conn.close()
        return jsonify({
            "success": True,
            "message": "History cleared successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def encode_image(image_file):
    """Convert uploaded image to base64 format with quality optimization"""
    image = Image.open(image_file)
    
    # Optimal size for GPT-4 Vision
    max_size = (2048, 2048)
    if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    # Ensure minimum size for good recognition
    min_size = 512
    if image.size[0] < min_size or image.size[1] < min_size:
        ratio = max(min_size / image.size[0], min_size / image.size[1])
        new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    
    # Convert to RGB if necessary
    if image.mode not in ('RGB', 'RGBA'):
        image = image.convert('RGB')
    
    # Save with high quality
    buffered = BytesIO()
    image.save(buffered, format="JPEG", quality=95)
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def check_if_food(image_base64):
    """First check if the image contains food"""
    prompt = """Analyze this image and determine if it contains food or a meal.

Respond with ONLY a JSON object in this exact format:
{
  "is_food": true/false,
  "reason": "Brief explanation of what you see"
}

Examples:
- If it's a burger, pizza, salad, etc.: {"is_food": true, "reason": "Image shows a burger with visible ingredients"}
- If it's a person, car, landscape, etc.: {"is_food": false, "reason": "Image shows a landscape, not food"}
- If it's a plate/utensils only: {"is_food": false, "reason": "Image shows empty plate/utensils without food"}

Be strict - only return true if there is actual food visible in the image."""

    try:
        response_text = call_gemini(prompt, image_base64, response_schema=FoodCheckResult)
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(response_text)
        return result

    except Exception as e:
        print(f"Error in food detection: {e}")
        return {"is_food": True, "reason": "Unable to verify, proceeding with analysis"}

def analyze_food_with_gpt4(image_base64):
    """Send image to Gemini for detailed food analysis"""
    prompt = """You are an expert nutritionist and food identification specialist. Analyze this food image with HIGH PRECISION and provide detailed nutritional information.

CRITICAL INSTRUCTIONS FOR FOOD IDENTIFICATION:
1. Be VERY SPECIFIC yet concise with food names (keep food_name under 80 characters, e.g. "Vegetarian Indian Thali" or "Grilled Chicken Burger"). List specific dishes/items inside the "ingredients" array rather than making the main title excessively long.
2. Distinguish between similar items:
   - "Burger" vs "Sandwich" - A burger has a round bun and patty, sandwich has regular bread
   - "Chicken Burger" vs "Chicken Sandwich" - Use "burger" if it has a round bun
   - "Pizza" - specify type (Margherita, Pepperoni, etc.)
   - "Pasta" - specify type (Spaghetti, Penne, Fettuccine, etc.)
   - Include preparation method when visible (Grilled, Fried, Baked, etc.)

2. CONFIDENCE LEVEL - Be honest and specific:
   - "high" - Food is clearly visible, well-lit, standard presentation, you can identify all components
   - "medium" - Some uncertainty about ingredients or portion size, but main item is clear
   - "low" - Poor image quality, unusual presentation, or genuinely unclear what the food is

3. Look at SPECIFIC DETAILS:
   - Bun shape (round = burger, rectangular = sandwich)
   - Cooking style (char marks = grilled, golden = fried, etc.)
   - Toppings and garnishes
   - Serving style and plating

Provide your analysis matching the required JSON schema accurately."""

    try:
        response_text = call_gemini(prompt, image_base64, response_schema=FoodAnalysisResult)
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(response_text)
        return result

    except json.JSONDecodeError as e:
        print(f"Raw Gemini response: {response_text}")
        raise Exception(f"Failed to parse Gemini response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Gemini API error: {str(e)}")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Food Recognition API",
        "version": "2.0.0"
    }), 200

@app.route('/api/history', methods=['GET'])
def get_history():
    """Get all analysis history"""
    history = get_all_history()
    return jsonify({
        "success": True,
        "history": history,
        "count": len(history)
    }), 200

@app.route('/api/history/<int:record_id>', methods=['DELETE'])
def delete_history_record(record_id):
    """Delete a specific history record"""
    try:
        conn = sqlite3.connect('food_history.db')
        c = conn.cursor()
        c.execute('DELETE FROM food_analysis WHERE id = ?', (record_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Record deleted"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/analyze-food', methods=['POST'])
def analyze_food_endpoint():
    """Main endpoint to analyze food images"""
    try:
        # Validate image file presence
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file provided. Please upload an image."
            }), 400
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({
                "success": False,
                "error": "No image selected"
            }), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_ext = image_file.filename.rsplit('.', 1)[1].lower() if '.' in image_file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                "success": False,
                "error": f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
            }), 400
        
        # Read image data for hashing
        image_file.seek(0)
        image_data = image_file.read()
        image_hash = get_image_hash(image_data)
        
        # Check if this image was analyzed before
        print(f"Checking history for image hash: {image_hash}")
        cached_result = get_from_history(image_hash)
        
        if cached_result:
            print("Found in history! Returning cached result.")
            return jsonify({
                "success": True,
                "data": cached_result,
                "from_cache": True
            }), 200
        
        # Reset file pointer for encoding
        image_file.seek(0)
        
        # Encode image to base64
        print("Encoding new image...")
        image_base64 = encode_image(image_file)
        
        # First check if it's actually food
        print("Checking if image contains food...")
        food_check = check_if_food(image_base64)
        
        if not food_check.get('is_food', False):
            return jsonify({
                "success": False,
                "is_food": False,
                "error": "This image does not appear to contain food. Please upload an image of a food item.",
                "reason": food_check.get('reason', 'Not a food item')
            }), 400
        
        # Analyze food with GPT-4 Vision
        print("Analyzing food with GPT-4 Vision...")
        result = analyze_food_with_gpt4(image_base64)
        
        # Save to history
        print("Saving to history...")
        save_to_history(image_hash, result)
        
        return jsonify({
            "success": True,
            "data": result,
            "from_cache": False
        }), 200
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({
        "success": False,
        "error": "File is too large. Maximum size is 16MB."
    }), 413

@app.errorhandler(500)
def internal_error(e):
    """Handle internal server errors"""
    return jsonify({
        "success": False,
        "error": "Internal server error occurred"
    }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Food Recognition API Server with History")
    print("=" * 60)
    print(f"Server running on: http://localhost:5000")
    print(f"Health check: http://localhost:5000/health")
    print(f"API endpoint: http://localhost:5000/api/analyze-food")
    print(f"History endpoint: http://localhost:5000/api/history")
    print("=" * 60)
    
    # Configure max file size (16MB)
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
    
    app.run(debug=True, host='0.0.0.0', port=5000)