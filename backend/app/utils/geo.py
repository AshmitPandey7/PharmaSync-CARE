"""
PharmaSync CARE — Geographic Calculation Utilities
Implements standard Haversine distance formula for coordinate pairs.
"""

import math


def calculate_distance_km(coord1, coord2):
    """
    Calculates geographic distance in kilometers between two (lat, lon) coordinates
    using the Haversine spherical formula.

    :param coord1: Tuple or list of [latitude, longitude]
    :param coord2: Tuple or list of [latitude, longitude]
    :return: Distance in kilometers rounded to 1 decimal place
    """
    if not coord1 or not coord2:
        return 0.0

    lat1, lon1 = float(coord1[0]), float(coord1[1])
    lat2, lon2 = float(coord2[0]), float(coord2[1])

    # Earth radius in kilometers
    R = 6371.0

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)

    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = R * c

    return round(distance, 1)
