"""Instituições disponíveis para contas Brightline."""

INSTITUTIONS = (
    {"id": "hctco-unifeso", "name": "HCTCO · UNIFESO"},
    {"id": "hospital-sao-jose-teresopolis", "name": "Hospital São José · Teresópolis"},
    {
        "id": "hospital-beneficencia-portuguesa-teresopolis",
        "name": "Hospital Beneficência Portuguesa · Teresópolis",
    },
    {"id": "outro-hospital", "name": "Outro hospital"},
)

INSTITUTION_IDS = frozenset(item["id"] for item in INSTITUTIONS)
INSTITUTION_NAMES = {item["id"]: item["name"] for item in INSTITUTIONS}


def validate_institutions(value):
    if not isinstance(value, list) or not value:
        raise ValueError("Selecione pelo menos uma instituição.")
    if any(not isinstance(item, str) or item not in INSTITUTION_IDS for item in value):
        raise ValueError("Uma ou mais instituições não estão disponíveis.")
    if len(set(value)) != len(value):
        raise ValueError("Instituições duplicadas.")
    return value
