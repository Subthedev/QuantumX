#!/usr/bin/env python3
import subprocess
import sys

print("\n" + "="*60)
print("🚀 IGNITEX TEST SERVER")
print("="*60)
print("\n📋 INSTRUCTIONS:")
print("   1. Server will start in 3 seconds")
print("   2. Look for: ➜  Local:   http://localhost:8080/")
print("   3. COPY that URL")
print("   4. PASTE it in your browser")
print("\n💡 Press CTRL+C to stop server")
print("="*60 + "\n")

try:
    subprocess.run(['npm', 'run', 'dev'])
except KeyboardInterrupt:
    print("\n\n✅ Server stopped")
    sys.exit(0)
