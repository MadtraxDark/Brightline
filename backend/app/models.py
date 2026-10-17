from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, SecretStr, model_validator

Urgency = Literal["critical", "urgent", "actionable"]
Status = Literal["detected", "notified", "read", "action_taken", "closed", "escalated"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GroundTruth(StrictModel):
    finding: str = Field(min_length=1)
    urgency: Urgency


class ReportInput(StrictModel):
    report_id: str = Field(min_length=1, max_length=100)
    modality: str = Field(min_length=1)
    radiologist: str = Field(min_length=1)
    ordering_physician: str = Field(min_length=1)
    text: str = Field(min_length=1, max_length=100000)
    flagged_by_radiologist: bool
    ground_truth: list[GroundTruth] = Field(default_factory=list)


class FindingInput(StrictModel):
    finding: str = Field(min_length=1)
    evidence: str = Field(min_length=1)
    urgency: Urgency
    deadline_hours: int = Field(strict=True)
    confidence: Literal["high", "medium", "low"]

    @model_validator(mode="after")
    def deadline_matches(self):
        if self.deadline_hours != {"critical": 1, "urgent": 24, "actionable": 720}[self.urgency]:
            raise ValueError("Prazo incompatível com a urgência")
        return self


class ExtractionInput(StrictModel):
    report_id: str
    findings: list[FindingInput]


class ImportInput(StrictModel):
    reports: list[ReportInput] = Field(min_length=1, max_length=500)
    extractions: dict[str, ExtractionInput]

    @model_validator(mode="after")
    def validate_contract(self):
        ids = [r.report_id for r in self.reports]
        if len(set(ids)) != len(ids) or set(ids) != set(self.extractions):
            raise ValueError("IDs dos laudos e extrações devem coincidir, sem duplicação")
        for report in self.reports:
            extracted = self.extractions[report.report_id]
            if extracted.report_id != report.report_id:
                raise ValueError("ID da extração incompatível")
            names = set()
            for finding in extracted.findings:
                if not finding.evidence.strip() or finding.evidence not in report.text:
                    raise ValueError("Evidência deve aparecer literalmente no laudo")
                name = finding.finding.strip().casefold()
                if not name or name in names:
                    raise ValueError("Achado vazio ou duplicado")
                names.add(name)
        return self


class Credentials(StrictModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: SecretStr = Field(min_length=6, max_length=256)


class RefreshInput(StrictModel):
    refresh_token: SecretStr


class AcknowledgeInput(StrictModel):
    by: str = Field(min_length=1, max_length=200)


class ActionInput(StrictModel):
    action: str = Field(min_length=1, max_length=5000)
    close: bool = False
