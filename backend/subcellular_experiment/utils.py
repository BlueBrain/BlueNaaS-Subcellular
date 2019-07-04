
import json
import numpy as np
from bson.objectid import ObjectId


class ExtendedJSONEncoder(json.JSONEncoder):
    '''JSON encode numpy instances'''
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, ObjectId):
            return str(obj)
        return json.JSONEncoder.default(self, obj)
