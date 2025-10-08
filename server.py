#!/usr/bin/env python3
"""
Lightweight Flask server for testing the built React app
Run: python3 server.py
"""
from flask import Flask, send_from_directory, send_file
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='dist')
CORS(app)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_file(os.path.join(app.static_folder, 'index.html'))

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'public, max-age=31536000' if 'assets' in response.headers.get('Content-Type', '') else 'no-cache'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

if __name__ == '__main__':
    print("\n🚀 IgniteX Test Server Starting...")
    print("📦 Building production bundle first...")
    os.system('npm run build')
    print("\n✅ Build complete!")
    print("🌐 Server running at: http://localhost:5000")
    print("🌐 Network access: http://0.0.0.0:5000")
    print("\nPress CTRL+C to stop\n")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
