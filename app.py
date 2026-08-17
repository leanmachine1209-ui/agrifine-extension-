"""Entry point for `python app.py` and `gunicorn app:app`."""

from your_application.wsgi import app, application, main

__all__ = ["app", "application", "main"]

if __name__ == "__main__":
    main()
