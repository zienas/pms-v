// This represents a WebSocket message from the backend.
interface WebSocketMessage {
    type: 'ship_position_update';
    payload: {
        imo: string;
        portId: string;
        lat: number;
        lon: number;
    };
}

type Subscriber = (message: WebSocketMessage) => void;

class WebSocketService {
    private subscribers: Set<Subscriber> = new Set();
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectInterval: number = 5000; // Initial reconnect interval
    private maxReconnectInterval: number = 30000; // Max reconnect interval (30 seconds)
    private reconnectAttempts: number = 0;
    private reconnectTimeoutId: number | null = null;
    private hasStarted: boolean = false;

    constructor(url: string) {
        this.url = url;
        // DO NOT connect automatically. Defer until start() is called.
    }

    public start() {
        if (this.hasStarted) {
            return;
        }
        this.hasStarted = true;
        this.connect();
    }

    private connect = () => {
        // Prevent multiple connection attempts
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        // Clean up previous connection if it exists
        if (this.ws) {
            this.ws.removeEventListener('open', this.onOpen);
            this.ws.removeEventListener('message', this.onMessage);
            this.ws.removeEventListener('error', this.onError);
            this.ws.removeEventListener('close', this.onClose);
        }

        console.log(`[WS] Connecting to ${this.url}...`);
        this.ws = new WebSocket(this.url);

        this.ws.addEventListener('open', this.onOpen);
        this.ws.addEventListener('message', this.onMessage);
        this.ws.addEventListener('error', this.onError);
        this.ws.addEventListener('close', this.onClose);
    };

    private onOpen = () => {
        console.log('[WS] Connection established.');
        // Reset reconnect attempts on a successful connection.
        this.reconnectAttempts = 0;
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
    };

    private onMessage = (event: MessageEvent) => {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);
            // Basic validation to ensure it's a message we can handle
            if (message.type && message.payload) {
                this.broadcast(message);
            } else {
                 console.warn('[WS] Received malformed message:', event.data);
            }
        } catch (error) {
            console.error('[WS] Error parsing message:', event.data, error);
        }
    };

    private onError = (error: Event) => {
        // Change from console.error to console.warn to be less alarming.
        console.warn('[WS] WebSocket error occurred. The browser console may have more specific details. The `close` event that follows will provide a reason code.');
        // The browser will automatically trigger a 'close' event after an 'error' event.
        // No need to manually close here.
    };
    
    private onClose = (event: CloseEvent) => {
        let logMessage: string;

        if (event.code === 1006) {
            // For abnormal closures (the most common error when the server is down),
            // provide a more user-friendly, less alarming message.
            logMessage = `[WS] Connection attempt failed. This is expected if the optional WebSocket backend server at ${this.url} is not running. Live ship position updates will be unavailable.`;
        } else {
            logMessage = `[WS] Connection closed. Code: ${event.code}, Reason: '${event.reason || "No reason given"}', Clean closure: ${event.wasClean}`;
        }
        
        console.log(logMessage);

        // Schedule a reconnection attempt with exponential backoff if one isn't already scheduled.
        if (this.hasStarted && !this.reconnectTimeoutId) {
            this.reconnectAttempts++;
            // Calculate next reconnect time: 5s, 10s, 20s, 30s, 30s...
            const backoffTime = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectInterval);
            
            console.log(`[WS] Will attempt to reconnect in ${backoffTime / 1000} seconds... (Attempt ${this.reconnectAttempts})`);
            this.reconnectTimeoutId = window.setTimeout(this.connect, backoffTime);
        }
    };
    
    private broadcast(message: WebSocketMessage) {
        this.subscribers.forEach(callback => {
            try {
                callback(message);
            } catch (error) {
                console.error("[WS] Error in subscriber callback:", error);
            }
        });
    }

    public subscribe(callback: Subscriber): Subscriber {
        this.subscribers.add(callback);
        return callback;
    }

    public unsubscribe(callback: Subscriber) {
        this.subscribers.delete(callback);
    }

    public close() {
        this.hasStarted = false;
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }
        this.ws?.close();
    }
}

// In a real application, this URL would come from an environment variable.
// This is the standard port for local WebSocket development.
const WEBSOCKET_URL = 'ws://localhost:8080';

// Export a singleton instance of the service
export const webSocketService = new WebSocketService(WEBSOCKET_URL);