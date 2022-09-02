import json
import tempfile
import os
import shutil
from contextlib import contextmanager

import numpy as np
from bson.objectid import ObjectId


class ExtendedJSONEncoder(json.JSONEncoder):
    """JSON encode numpy instances."""

    def default(self, o):
        if isinstance(o, np.ndarray):
            return o.tolist()
        if isinstance(o, ObjectId):
            return str(o)
        return json.JSONEncoder.default(self, o)


@contextmanager
def tempdir():
    tmp_dir = ""
    try:
        tmp_dir = tempfile.mkdtemp()
        os.chdir(tmp_dir)
        yield tmp_dir
    finally:
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir)


@contextmanager
def umask(mask=0):
    old_mask = os.umask(mask)
    try:
        yield
    finally:
        os.umask(old_mask)
