"""Gunicorn defaults so `gunicorn your_application.wsgi` binds Render's PORT."""

import os

bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"
accesslog = "-"
errorlog = "-"
capture_output = True
