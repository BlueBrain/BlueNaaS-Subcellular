import tempfile
import os
import json

import shutil
from pysb.importers import bngl
from pysb.export import export

from .model_to_bngl import model_to_bngl
from .types import ModelFormat


def get_exported_model(model: dict, model_format: ModelFormat):
    if model_format == "bngl":
        return model_to_bngl(model)
    if model_format == "ebngl":
        return json.dumps(model)
    if model_format == "pysb_flat":
        pysb_model = pysb_model_from_bngl_str(model_to_bngl(model))
        return export(pysb_model, "pysb_flat")
    if model_format == "sbml":
        pysb_model = pysb_model_from_bngl_str(model_to_bngl(model))
        return export(pysb_model, "sbml")
    return ""


def pysb_model_from_bngl_str(bngl_str: str):
    tmp_dir = tempfile.mkdtemp()
    os.chdir(tmp_dir)

    with open("model.bngl", "w") as model_file:
        model_file.write(bngl_str)

    pysb_model = bngl.model_from_bngl(os.path.join(os.getcwd(), "model.bngl"))

    shutil.rmtree(tmp_dir)

    return pysb_model
