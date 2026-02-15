from typing import Dict, List
from app.db.models.multiplier_config import MultiplierConfigs
from app.db.models.prediction import Predictions
from app.db.models.prediction_event import PredictionEvents
from app.db.models.prediction_position import PredictionPositions
from app.db.models.race_event import RaceEvents
from app.db.models.race_position import RacePositions
from app.db.models.race_result import RaceResults


def get_podium_drivers(positions_list: List[RacePositions]) -> List[str | None]:
    """
    Extrae los pilotos en las posiciones 1, 2 y 3.
    Devuelve una lista [1º, 2º, 3º] o None en esa posición si falta.
    """
    
    # Retornamos [P1, P2, P3] usando .get() por si acaso falta alguno
    return [p.driver_name for p in sorted(positions_list, key=lambda x: x.position)][:3]

def calculate_base_points(prediction_positions: List[PredictionPositions], race_positions: List[RacePositions]) -> int:
    real_map = {
        race_position.driver_name: race_position.position
        for race_position in race_positions
    }

    total = 0

    for prediction_position in prediction_positions:
        real_pos = real_map.get(prediction_position.driver_name)
        if not real_pos:
            continue

        diff = abs(prediction_position.position - real_pos)

        if diff == 0:
            total += 3
        elif diff == 1:
            total += 1

    return total

def build_event_map(events: List[RaceEvents | PredictionEvents]) -> Dict[str, str]:
    """
    Devuelve: {event_type: value}
    """
    return {
        e.event_type: e.value
        for e in events
    }

def get_correct_events(prediction_events: List[PredictionEvents], race_events: List[RaceEvents]) -> List[str]:
    real_events = build_event_map(race_events)
    correct = []

    for pe in prediction_events:
        if pe.event_type in real_events:
            if str(pe.value) == str(real_events[pe.event_type]):
                correct.append(pe.event_type)

    return correct

def calculate_multiplier(correct_events: List[str], multiplier_configs: List[MultiplierConfigs]) -> float:
    multiplier = 1.0

    for mc in multiplier_configs:
        if mc.event_type in correct_events:
            multiplier *= mc.multiplier

    return multiplier

def evaluate_podium(prediction_positions: List[PredictionPositions], race_positions: List[RacePositions]) -> Dict[str, bool]:
    pred_podium = get_podium_drivers(prediction_positions)
    real_podium = get_podium_drivers(race_positions)

    if None in pred_podium or None in real_podium:
        return {
            "PODIUM_PARTIAL": False,
            "PODIUM_TOTAL": False
        }

    partial = set(pred_podium) == set(real_podium)
    total = pred_podium == real_podium

    return {
        "PODIUM_PARTIAL": partial,
        "PODIUM_TOTAL": total
    }


def calculate_prediction_score(
    prediction: Predictions,
    race_result: RaceResults,
    multiplier_configs: List[MultiplierConfigs]
) -> Dict[str, int | float | List[str]]:
    base_points = calculate_base_points(
        prediction.positions,
        race_result.positions
    )

    # Eventos declarativos
    correct_events = get_correct_events(
        prediction.events,
        race_result.events
    )

    # Eventos automáticos (podio)
    podium_result = evaluate_podium(
        prediction.positions,
        race_result.positions
    )

    if podium_result["PODIUM_TOTAL"]:
        correct_events.append("PODIUM_TOTAL")
    elif podium_result["PODIUM_PARTIAL"]:
        correct_events.append("PODIUM_PARTIAL")

    multiplier = calculate_multiplier(
        correct_events,
        multiplier_configs
    )

    final_points = int(base_points * multiplier)

    return {
        "base_points": base_points,
        "multiplier": multiplier,
        "final_points": final_points,
        "correct_events": correct_events
    }
