"""
Structured JSON logging for Grafana Loki.
Logs are written to stdout in JSON format so Promtail/Loki can index them.
"""
import logging
import sys
import structlog


def configure_logging() -> None:
    """Configure structlog for JSON output (Loki-friendly)."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = "wiki_service"):
    """Return a structlog logger with service name bound."""
    return structlog.get_logger(name)
