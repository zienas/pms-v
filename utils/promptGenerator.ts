import type { Ship, Berth, Alert, ShipMovement } from '../types';

export const generateVesselSummaryPrompt = (
  ship: Ship,
  movements: ShipMovement[],
  berthMap: Map<string, string>
): string => {
  const recentMovements = movements
    .filter(m => m.shipId === ship.id)
    .slice(0, 5) // Get the 5 most recent movements
    .map(m => `- ${new Date(m.timestamp).toLocaleString()}: ${m.details.message}`)
    .join('\n');

  const currentBerth = ship.berthIds.map(id => berthMap.get(id)).join(', ') || 'Not berthed';

  return `
Generate a concise summary for a port operations log. The vessel is named "${ship.name}" (IMO: ${ship.imo}).

Current Status:
- Status: ${ship.status}
- Location: ${currentBerth}
- ETA: ${new Date(ship.eta).toLocaleString()}
- ETD: ${new Date(ship.etd).toLocaleString()}
- Pilot Assigned: ${ship.pilotId ? 'Yes' : 'No'}
- Carrying Dangerous Goods: ${ship.hasDangerousGoods ? 'Yes' : 'No'}

Recent Activity (last 5 events):
${recentMovements || 'No recent movements logged.'}

Based on this data, provide a brief, professional summary of the vessel's current situation.
  `.trim();
};

export const generateBerthOccupancyPrompt = (
  berth: Berth,
  occupyingShip: Ship | null,
  occupancyPercentage: number
): string => {
  return `
Analyze the status of a port berth for a daily report. The berth is named "${berth.name}".

Berth Details:
- Type: ${berth.type}
- Max Vessel Length: ${berth.maxLength}m
- Max Vessel Draft: ${berth.maxDraft}m

Current Status:
- Occupied: ${occupyingShip ? 'Yes' : 'No'}
${occupyingShip ? `- Occupying Vessel: ${occupyingShip.name} (IMO: ${occupyingShip.imo})` : ''}
${occupyingShip ? `- Vessel Status: ${occupyingShip.status}` : ''}

Historical Data:
- 24-Hour Occupancy Rate: ${occupancyPercentage.toFixed(1)}%

Based on this information, generate a short analysis. If the occupancy rate is high (over 80%), mention that it is a high-traffic area. If it's currently occupied, state the vessel's name.
  `.trim();
};


export const generateAlertIncidentPrompt = (
  alert: Alert,
  ship: Ship | null
): string => {
  return `
Draft a preliminary incident report based on a system alert for a Port Vessel Management System.

Alert Details:
- Type: ${alert.type}
- Timestamp: ${new Date(alert.timestamp).toLocaleString()}
- Message: "${alert.message}"

Vessel Information (if applicable):
- Name: ${ship?.name || 'N/A'}
- IMO: ${ship?.imo || 'N/A'}
- Current Status: ${ship?.status || 'N/A'}
- Position: ${ship?.lat && ship.lon ? `${ship.lat.toFixed(4)}, ${ship.lon.toFixed(4)}` : 'N/A'}

Based on the alert, generate a formal, structured incident report draft. Include sections for "Incident Summary," "Vessel(s) Involved," and "Initial Recommended Action." The recommended action should be based on the alert message (e.g., for a pilot warning, the action is to "Assign a pilot immediately").
  `.trim();
};
