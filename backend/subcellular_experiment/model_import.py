
import tempfile
import subprocess
import os

import shutil

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
