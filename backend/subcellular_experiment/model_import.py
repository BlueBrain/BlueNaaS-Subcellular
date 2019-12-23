
import tempfile
import subprocess
import os
import base64
import io
import uuid

import shutil

import pandas as pd

from .logger import get_logger


L = get_logger(__name__)

SBML_TRANSLATOR_PATH = '/opt/subcellular-experiment/sbmlTranslator'

def from_sbml(sbml_str):
    tmp_dir = tempfile.mkdtemp()
    os.chdir(tmp_dir)

    with open('model.xml', 'w') as sbml_file:
        sbml_file.write(sbml_str)

    translator_run = subprocess.run(
        [SBML_TRANSLATOR_PATH, '-i', 'model.xml', '-a', '-o', 'model.bngl'],
        check=False,
        capture_output=True
    )

    bngl_str = None if (translator_run.returncode is not 0) or (not os.path.isfile('model.bngl')) else open('model.bngl').read()

    shutil.rmtree(tmp_dir)

    return {
        'bngl': bngl_str,
        'stdout': translator_run.stdout.decode('utf-8'),
        'stderr': translator_run.stderr.decode('utf-8')
    }


# structures type: {'membrane', 'compartment'}
# molecule agentType: {'ion', 'protein', 'protein family', 'protein multimer', 'metabolite'}
REVISION_STRUCTURE = {
    'structures': ['name', 'type', 'uniProtId', 'goId', 'description'],
    'parameters': ['name', 'definition', 'description', 'comments'],
    'functions': ['name', 'definition', 'description', 'comments'],
    'molecules': ['name', 'agentType', 'definition', 'pubChemId', 'cid', 'uniProtId', 'geneName', 'description', 'comments'],
    'species': ['name', 'definition', 'concentration', ],
    'observables': ['name', 'definition', 'comments'],
    'reactions': ['name', 'definition', 'kf', 'kr', 'description', 'comments'],
    'diffusions': ['name', 'definition', 'rate', 'description', 'comments']
}

def revision_from_excel(base64_encoded_xlsx_data):
    table_data_bytes = base64.b64decode(base64_encoded_xlsx_data)
    table_io = io.BytesIO(table_data_bytes)

    revision_data = {}

    for sheet_name in REVISION_STRUCTURE.keys():
        try:
            L.debug(f'reading {sheet_name} sheet')
            sheet_data = pd.read_excel(
                table_io,
                sheet_name=sheet_name,
                keep_default_na=False
            ).to_dict(orient='records')
            L.debug(f'done reading {sheet_name} sheet')

            revision_data[sheet_name] = [
                {
                    **{
                        prop: str(entity.get(prop, ''))
                        for prop
                        in REVISION_STRUCTURE[sheet_name]
                    },
                    'entityId': str(uuid.uuid4())
                }
                for entity
                in sheet_data
                if entity['name'] is not ''
            ]
        except Exception as error:
            revision_data[sheet_name] = []

    L.debug('done processing importing revision data from an excel source')

    return revision_data
