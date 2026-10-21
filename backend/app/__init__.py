"""
PharmaSync CARE — Flask Application Factory
Initializes CORS, database connection pool, blueprints, frontend static serving, and centralized error handlers.
"""

from pathlib import Path
from flask import Flask, send_from_directory, request
from flask_cors import CORS
from app.config import Config
from app.database import init_db
from app.utils.response import error_response


def create_app(config_class=Config):
    """Creates and configures a Flask application instance."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize Database manager
    init_db(config_class)

    # Configure CORS for local development origins
    CORS(app, resources={
        r"/api/*": {
            "origins": config_class.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Accept", "X-Client-App", "X-User-Id", "Authorization"]
        },
        r"/*": {
            "origins": config_class.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Accept", "X-Client-App", "X-User-Id", "Authorization"]
        }
    })

    # Register Blueprints with /api prefix
    from app.routes.health import health_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.facilities import facilities_bp
    from app.routes.medicines import medicines_bp
    from app.routes.inventory import inventory_bp
    from app.routes.shortages import shortages_bp
    from app.routes.matching import matching_bp
    from app.routes.allocations import allocations_bp
    from app.routes.transfers import transfers_bp
    from app.routes.simulations import simulations_bp
    from app.routes.optimization import optimization_bp
    from app.routes.audit import audit_bp
    from app.routes.auth import auth_bp

    blueprints = [
        health_bp,
        dashboard_bp,
        facilities_bp,
        medicines_bp,
        inventory_bp,
        shortages_bp,
        matching_bp,
        allocations_bp,
        transfers_bp,
        simulations_bp,
        optimization_bp,
        audit_bp,
        auth_bp
    ]

    for bp in blueprints:
        app.register_blueprint(bp, url_prefix='/api')

    # Root health redirect / direct check
    @app.route('/health', methods=['GET'])
    def root_health():
        from app.routes.health import check_health
        return check_health()

    # Serve Static Frontend Files from Flask root
    frontend_dir = Path(__file__).resolve().parent.parent.parent / 'frontend'

    @app.route('/', methods=['GET'])
    def root_index():
        accept = request.headers.get('Accept', '')
        # If client explicitly requests HTML (like web browsers)
        if 'text/html' in accept and (frontend_dir / 'index.html').exists():
            return send_from_directory(str(frontend_dir), 'index.html')
        from app.utils.response import success_response
        return success_response(data={
            "application": "PharmaSync CARE Backend API",
            "version": "2.5.0",
            "documentation": "/api/health"
        })

    @app.route('/<path:path>', methods=['GET'])
    def serve_static_frontend(path):
        if path.startswith('api/'):
            return error_response(code="NOT_FOUND", message=f"API route '/{path}' not found.", status_code=404)
        file_path = frontend_dir / path
        if file_path.exists() and file_path.is_file():
            return send_from_directory(str(frontend_dir), path)
        if (frontend_dir / 'index.html').exists() and 'text/html' in request.headers.get('Accept', ''):
            return send_from_directory(str(frontend_dir), 'index.html')
        return error_response(code="NOT_FOUND", message=f"Path '/{path}' not found.", status_code=404)

    # Centralized Error Handlers
    @app.errorhandler(400)
    def bad_request(err):
        return error_response(code="BAD_REQUEST", message="Bad request payload or parameters.", status_code=400)

    @app.errorhandler(404)
    def not_found(err):
        return error_response(code="NOT_FOUND", message="The requested API endpoint was not found on this server.", status_code=404)

    @app.errorhandler(405)
    def method_not_allowed(err):
        return error_response(code="METHOD_NOT_ALLOWED", message="HTTP method not allowed on this endpoint.", status_code=405)

    @app.errorhandler(500)
    def internal_error(err):
        return error_response(code="INTERNAL_SERVER_ERROR", message="An unexpected internal server error occurred.", status_code=500)

    return app
