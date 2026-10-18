"""Instituições disponíveis para contas Brightline."""

INSTITUTIONS = (
    {"id": "hctco-unifeso", "name": "HCTCO · UNIFESO"},
    {"id": "hospital-sao-jose-teresopolis", "name": "Hospital São José · Teresópolis"},
    {
        "id": "hospital-beneficencia-portuguesa-teresopolis",
        "name": "Hospital Beneficência Portuguesa · Teresópolis",
    },
    {"id": "outro-hospital", "name": "Outro hospital"},
    {"id": "asl-softhouse", "name": "Asl Softhouse"},
)

INSTITUTION_IDS = frozenset(item["id"] for item in INSTITUTIONS)
INSTITUTION_NAMES = {item["id"]: item["name"] for item in INSTITUTIONS}


def link_user_institutions(conn, user_id, institution_ids):
    conn.execute("DELETE FROM institutions WHERE user_id=%s", (user_id,))
    names = [INSTITUTION_NAMES[item] for item in institution_ids]
    if not names:
        return
    conn.execute(
        "INSERT INTO institutions(user_id, name) SELECT %s, name FROM unnest(%s::text[]) AS name",
        (user_id, names),
    )


def validate_institutions(value):
    if not isinstance(value, list) or not value:
        raise ValueError("Selecione pelo menos uma instituição.")
    if any(not isinstance(item, str) or item not in INSTITUTION_IDS for item in value):
        raise ValueError("Uma ou mais instituições não estão disponíveis.")
    if len(set(value)) != len(value):
        raise ValueError("Instituições duplicadas.")
    return value
