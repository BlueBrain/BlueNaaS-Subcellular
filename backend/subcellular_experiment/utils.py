import json
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
