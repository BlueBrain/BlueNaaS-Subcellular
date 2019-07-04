
import tempfile
import os

from pysb.importers import bngl
from pysb.export import export
import shutil

from .bngl_extended_model import BnglExtModel


def get_exported_model(model_dict, model_format):
    if model_format == 'bngl':
        return get_exported_bngl_model(model_dict)
    elif model_format == 'pysb_flat':
        return get_exported_pysb_model(model_dict)
    elif model_format == 'sbml':
        return get_exported_sbml_model(model_dict)


def get_exported_bngl_model(model_dict):
    bnglModel = BnglExtModel(model_dict)
    return bnglModel.to_bngl()


def get_exported_pysb_model(model_dict):
    bnglModel = BnglExtModel(model_dict)
    model = pysb_model_from_bngl_str(bnglModel.to_bngl())
    return export(model, 'pysb_flat')


def get_exported_sbml_model(model_dict):
    bnglModel = BnglExtModel(model_dict)
    model = pysb_model_from_bngl_str(bnglModel.to_bngl())
    return export(model, 'sbml')


def pysb_model_from_bngl_str(bngl_str):
    tmp_dir = tempfile.mkdtemp()
    os.chdir(tmp_dir)

    with open('model.bngl', 'w') as model_file:
        model_file.write(bngl_str)

    pysb_model = bngl.model_from_bngl(os.path.join(os.getcwd(), 'model.bngl'))

    shutil.rmtree(tmp_dir)

    return pysb_model
