// frontend/src/api/client.ts
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { store } from '../store';
import { showNotification } from '../store/notificationSlice';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
    baseURL: import.meta.env.DEV ? 'http://localhost:8000' : '',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        // Add any auth headers if needed
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        const message = error.response?.data?.detail || error.message || 'An error occurred';

        // Show notification for errors
        store.dispatch(showNotification({
            message,
            severity: 'error',
        }));

        return Promise.reject(error);
    }
);

// WebSocket connection helper
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(endpoint: string) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.DEV ? 'localhost:8000' : window.location.host;
        this.url = `${protocol}//${host}${endpoint}`;
    }

    connect(onMessage: (data: any) => void, onOpen?: () => void, onClose?: () => void) {
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                if (onOpen) onOpen();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                } catch (error) {
                    console.error('WebSocket message parse error:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                if (onClose) onClose();
                this.attemptReconnect(onMessage, onOpen, onClose);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }

    private attemptReconnect(onMessage: (data: any) => void, onOpen?: () => void, onClose?: () => void) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        this.reconnectTimeout = setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connect(onMessage, onOpen, onClose);
        }, delay);
    }

    send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}