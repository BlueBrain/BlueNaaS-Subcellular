
import json
import numpy as np


class NumpyAwareJSONEncoder(json.JSONEncoder):
    '''JSON encode numpy instances'''
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)
