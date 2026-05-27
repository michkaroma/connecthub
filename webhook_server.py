#!/usr/bin/env python3
import http.server
import subprocess
import hmac
import hashlib

SECRET = b'TON_SECRET_WEBHOOK'
PORT = 9000

class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        sig = 'sha256=' + hmac.new(SECRET, body, hashlib.sha256).hexdigest()
        received = self.headers.get('X-Hub-Signature-256', '')
        if not hmac.compare_digest(sig, received):
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b'Forbidden')
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')
        subprocess.Popen(['/bin/bash', '/var/www/html/connecthub/deploy.sh'],
                        stdout=open('/tmp/deploy.log','w'),
                        stderr=subprocess.STDOUT)
    def log_message(self, *args):
        pass

http.server.HTTPServer(('', PORT), WebhookHandler).serve_forever()
