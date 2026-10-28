"""
PharmaSync CARE — Shipment Tracking Repository (MongoDB)
Manages simulated tracking checkpoints, route geometry, and persistent
event history for inter-facility medicine transfers.
"""

import uuid
from datetime import datetime, timezone
from app.repositories.base_repository import BaseRepository
from app.repositories.facility_repository import FacilityRepository
from app.utils.geo import calculate_distance_km

# Curated high-fidelity route corridors in Bengaluru
KNOWN_CORRIDORS = {
    # Apex Central Hospital (FAC-001) -> Green Valley Health Centre (FAC-003)
    ("FAC-001", "FAC-003"): [
        {"name": "Apex Central Hospital - Central Dispatch Bay", "coordinates": [12.9716, 77.5946], "stage": "DISPATCHED", "description": "Consignment inspected and loaded into transit carrier"},
        {"name": "Lalbagh West Gate Transit Corridor", "coordinates": [12.9520, 77.5860], "stage": "IN_TRANSIT", "description": "En route via South Central arterial route"},
        {"name": "Jayanagar 4th Block Logistics Hub Inspection", "coordinates": [12.9298, 77.5838], "stage": "TRANSIT_HUB", "description": "Temperature and chain-of-custody seal verified"},
        {"name": "Banashankari / Outer Ring Road Junction", "coordinates": [12.9180, 77.5750], "stage": "OUT_FOR_DELIVERY", "description": "Approaching destination health centre delivery zone"},
        {"name": "Green Valley Health Centre - Receiving Dock", "coordinates": [12.9150, 77.5820], "stage": "DELIVERED", "description": "Carrier arrived at clinic receiving dock; ready for pharmacist inspection"}
    ],
    # District Medical Logistics Hub (FAC-006) -> Green Valley Health Centre (FAC-003)
    ("FAC-006", "FAC-003"): [
        {"name": "District Medical Logistics Hub - Gate 2 Freight Bay", "coordinates": [13.0100, 77.5500], "stage": "DISPATCHED", "description": "Consignment dispatched from regional supply depot"},
        {"name": "Yeshwanthpur Industrial Express Corridor", "coordinates": [12.9880, 77.5550], "stage": "IN_TRANSIT", "description": "Transit vehicle en route south via Tumkur corridor"},
        {"name": "Vijayanagar Central Inspection Post", "coordinates": [12.9640, 77.5360], "stage": "TRANSIT_HUB", "description": "Cold-chain data logger verified at transit checkpoint"},
        {"name": "Nayandahalli / Mysuru Road Junction", "coordinates": [12.9420, 77.5250], "stage": "OUT_FOR_DELIVERY", "description": "Out for delivery towards Green Valley rural cluster"},
        {"name": "Green Valley Health Centre - Pharmacy Bay", "coordinates": [12.9150, 77.5820], "stage": "DELIVERED", "description": "Arrived at destination receiving dock"}
    ],
    # City Care Community Pharmacy (FAC-002) -> St. Jude Charitable Dispensary (FAC-005)
    ("FAC-002", "FAC-005"): [
        {"name": "City Care Pharmacy - Express Outward Counter", "coordinates": [12.9822, 77.6080], "stage": "DISPATCHED", "description": "Batch packaged and handed to courier runner"},
        {"name": "Cantonment Station Transit Link", "coordinates": [12.9760, 77.5970], "stage": "IN_TRANSIT", "description": "Courier en route through central healthcare sector"},
        {"name": "Cubbon Road Distribution Checkpoint", "coordinates": [12.9710, 77.5860], "stage": "TRANSIT_HUB", "description": "Midpoint package inspection verified intact"},
        {"name": "Russell Market Sector Access Road", "coordinates": [12.9665, 77.5760], "stage": "OUT_FOR_DELIVERY", "description": "Final delivery leg approaching charitable dispensary"},
        {"name": "St. Jude Charitable Dispensary - Inward Dock", "coordinates": [12.9640, 77.5710], "stage": "DELIVERED", "description": "Courier handed consignment to dispensary in-charge"}
    ],
    # Apex Central Hospital (FAC-001) -> St. Jude Charitable Dispensary (FAC-005)
    ("FAC-001", "FAC-005"): [
        {"name": "Apex Central Hospital - Central Dispatch Bay", "coordinates": [12.9716, 77.5946], "stage": "DISPATCHED", "description": "Consignment dispatched from hospital pharmacy"},
        {"name": "KR Market Medical Corridor", "coordinates": [12.9680, 77.5850], "stage": "IN_TRANSIT", "description": "Transit vehicle en route"},
        {"name": "Chickpet Distribution Inspection Post", "coordinates": [12.9660, 77.5780], "stage": "TRANSIT_HUB", "description": "Carrier custody log signed"},
        {"name": "Old Town Approach Link", "coordinates": [12.9648, 77.5730], "stage": "OUT_FOR_DELIVERY", "description": "Vehicle approaching St. Jude Dispensary"},
        {"name": "St. Jude Charitable Dispensary - Pharmacy Gate", "coordinates": [12.9640, 77.5710], "stage": "DELIVERED", "description": "Delivered to dispensary intake team"}
    ]
}


class TrackingRepository(BaseRepository):

    def __init__(self):
        super().__init__('tracking_events')
        self.fac_repo = FacilityRepository()

    def generate_route_checkpoints(self, sender_id, recipient_id, sender_coords, recipient_coords):
        """Generates realistic route checkpoints between two facilities."""
        pair_key = (sender_id, recipient_id)
        if pair_key in KNOWN_CORRIDORS:
            return [dict(cp) for cp in KNOWN_CORRIDORS[pair_key]]

        # Interpolate 5 checkpoints between arbitrary coordinates
        s_lat, s_lng = sender_coords
        r_lat, r_lng = recipient_coords

        return [
            {
                "name": "Donor Facility Dispatch Dock",
                "coordinates": [round(s_lat, 6), round(s_lng, 6)],
                "stage": "DISPATCHED",
                "description": "Shipment packaged and released from donor facility"
            },
            {
                "name": "Regional Highway Transit Corridor",
                "coordinates": [round(s_lat + 0.25 * (r_lat - s_lat) + 0.003, 6), round(s_lng + 0.25 * (r_lng - s_lng) - 0.002, 6)],
                "stage": "IN_TRANSIT",
                "description": "Transit vehicle moving along arterial corridor"
            },
            {
                "name": "District Inspection & Transit Hub",
                "coordinates": [round(s_lat + 0.50 * (r_lat - s_lat), 6), round(s_lng + 0.50 * (r_lng - s_lng), 6)],
                "stage": "TRANSIT_HUB",
                "description": "Intermediate logistics hub check-in; cold-chain verified"
            },
            {
                "name": "Destination Sub-Sector Delivery Access",
                "coordinates": [round(s_lat + 0.75 * (r_lat - s_lat) - 0.002, 6), round(s_lng + 0.75 * (r_lng - s_lng) + 0.002, 6)],
                "stage": "OUT_FOR_DELIVERY",
                "description": "Courier entered recipient facility delivery sector"
            },
            {
                "name": "Recipient Facility Inward Receiving Bay",
                "coordinates": [round(r_lat, 6), round(r_lng, 6)],
                "stage": "DELIVERED",
                "description": "Consignment delivered to recipient receiving dock"
            }
        ]

    def get_events_for_transfer(self, transfer_id):
        """Retrieves stored tracking event history for a transfer."""
        cursor = self.collection.find({"transferId": transfer_id}).sort("timestamp", 1)
        events = []
        for doc in cursor:
            events.append({
                "id": doc.get('id') or str(doc.get('_id')),
                "transferId": doc.get('transferId'),
                "checkpointIndex": doc.get('checkpointIndex', 0),
                "checkpointName": doc.get('checkpointName', ''),
                "stage": doc.get('stage', ''),
                "coordinates": doc.get('coordinates', []),
                "timestamp": doc.get('timestamp'),
                "temperature": doc.get('temperature', '4.2°C Cold-Chain Verified'),
                "notes": doc.get('notes', '')
            })
        return events

    def log_event(self, transfer_id, checkpoint_index, checkpoint_data, note="", temperature="4.2°C Cold-Chain Verified"):
        """Logs a persistent tracking event for the transfer."""
        ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        event_doc = {
            "id": f"TRK-{str(uuid.uuid4())[:8].upper()}",
            "transferId": transfer_id,
            "checkpointIndex": checkpoint_index,
            "checkpointName": checkpoint_data['name'],
            "stage": checkpoint_data['stage'],
            "coordinates": checkpoint_data['coordinates'],
            "timestamp": ts,
            "temperature": temperature,
            "notes": note or checkpoint_data.get('description', '')
        }
        res = self.collection.insert_one(dict(event_doc))
        clean_event = dict(event_doc)
        clean_event['_id'] = str(res.inserted_id)
        return clean_event

    def clear_events_for_transfer(self, transfer_id):
        """Clears events for simulation reset."""
        self.collection.delete_many({"transferId": transfer_id})
