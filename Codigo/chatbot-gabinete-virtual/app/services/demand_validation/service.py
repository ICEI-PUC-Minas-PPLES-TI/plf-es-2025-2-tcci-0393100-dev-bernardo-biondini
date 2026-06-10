from collections.abc import Iterable

from app.services.demand_validation.base import DemandData, DemandValidator


class DemandValidationService:
    def __init__(self, validators: Iterable[DemandValidator]) -> None:
        self.validators = list(validators)

    async def validate(self, demand: DemandData) -> None:
        for validator in self.validators:
            await validator.validate(demand)
