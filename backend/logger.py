import logging
import os
import sys

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

_formatter = logging.Formatter(
    fmt="%(asctime)s  %(levelname)-5s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(_formatter)


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(LOG_LEVEL)
    if not logger.handlers:
        logger.addHandler(_handler)
    return logger
