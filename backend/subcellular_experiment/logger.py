import logging
import os
from tornado.log import enable_pretty_logging

enable_pretty_logging()


def get_logger(module_name):
    logger = logging.getLogger(module_name)
    logger.setLevel(logging.DEBUG if os.getenv("DEBUG", "") else logging.INFO)
    return logger


def log_many(message, *loggers):
    for logger in loggers:
        logger(message)
