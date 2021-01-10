import base64
import io
import uuid

import pandas as pd

from .logger import get_logger


L = get_logger(__name__)


# structures type: {'membrane', 'compartment'}
# molecule agentType: {'ion', 'protein', 'protein family', 'protein multimer', 'metabolite'}
REVISION_STRUCTURE = {
    "structures": ["name", "type", "uniProtId", "goId", "description"],
    "parameters": ["name", "definition", "description", "comments"],
    "functions": ["name", "definition", "description", "comments"],
    "molecules": [
        "name",
        "agentType",
        "definition",
        "pubChemId",
        "cid",
        "uniProtId",
        "geneName",
        "description",
        "comments",
    ],
    "species": [
        "name",
        "definition",
        "concentration",
    ],
    "observables": ["name", "definition", "comments"],
    "reactions": ["name", "definition", "kf", "kr", "description", "comments"],
    "diffusions": ["name", "definition", "rate", "description", "comments"],
}


def revision_from_excel(base64_encoded_xlsx_data):
    table_data_bytes = base64.b64decode(base64_encoded_xlsx_data)
    table_io = io.BytesIO(table_data_bytes)

    revision_data = {}

    for sheet_name in REVISION_STRUCTURE:
        try:
            L.debug(f"reading {sheet_name} sheet")
            sheet_data = pd.read_excel(
                table_io, sheet_name=sheet_name, keep_default_na=False
            ).to_dict(orient="records")
            L.debug(f"done reading {sheet_name} sheet")

            revision_data[sheet_name] = [
                {
                    **{prop: str(entity.get(prop, "")) for prop in REVISION_STRUCTURE[sheet_name]},
                    "entityId": str(uuid.uuid4()),
                }
                for entity in sheet_data
                if entity["name"] == ""
            ]
        except Exception as error:
            revision_data[sheet_name] = []

    L.debug("done processing importing revision data from an excel source")

    return revision_data
