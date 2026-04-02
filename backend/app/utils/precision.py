from decimal import Decimal, ROUND_HALF_UP
from typing import Union

NumberLike = Union[int, float, str, Decimal]

QUANTITY_DECIMALS = 3
_ZERO_EPSILON = Decimal("0.0005")
_QUANTITY_STEP = Decimal("0.001")


def _to_decimal(value: NumberLike) -> Decimal:
    return Decimal(str(value))


def normalize_quantity(value: NumberLike) -> float:
    """Normalize quantity to 3 decimals and snap tiny residue to zero."""
    dec = _to_decimal(value)
    if abs(dec) < _ZERO_EPSILON:
        return 0.0

    normalized = dec.quantize(_QUANTITY_STEP, rounding=ROUND_HALF_UP)
    if abs(normalized) < _ZERO_EPSILON:
        return 0.0

    return float(normalized)


def normalize_positive_quantity(value: NumberLike) -> float:
    """Normalize quantity for fields that must remain strictly positive."""
    normalized = normalize_quantity(value)
    if normalized <= 0:
        raise ValueError("Quantity must be greater than 0 after rounding to 3 decimals")
    return normalized
