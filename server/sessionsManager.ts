import WebSocket from "ws"; // Corrected import
// Create a singleton for sessions management
export interface Session {
    ws: WebSocket;
    status: string;
    activeCode: string | null;
    name?: string;
    parameters?: Record<string, any>;
    debugInfo: {
        lastExecutionError: string;
        lastPreloadResult: string;
        lastPlayerLibraryError: string;
    };
}

export class SessionsManager {
    private static instance: SessionsManager;
    private sessionsMap = new Map<string, Session>();

    private constructor() {
    }

    public static getInstance(): SessionsManager {
        if (!SessionsManager.instance) {
            SessionsManager.instance = new SessionsManager();
        }
        return SessionsManager.instance;
    }

    public get(id: string): Session | undefined {
        return this.validateDebugData(this.sessionsMap.get(id));
    }

    public set(id: string, data: Session) {
        const validatedData = this.validateDebugData(data);
        if (validatedData) {
            this.sessionsMap.set(id, validatedData);
        }
    }

    public delete(id: string) {
        return this.sessionsMap.delete(id);
    }

    public has(id: string) {
        return this.sessionsMap.has(id);
    }

    public get size() {
        return this.sessionsMap.size;
    }

    public entries() {
        return this.sessionsMap.entries();
    }

    public keys() {
        return this.sessionsMap.keys();
    }

    // Set name for a session
    public setName(id: string, name: string): boolean {
        const session = this.get(id);
        if (session) {
            session.name = name;
            return true;
        }
        return false;
    }

    // Get name for a session
    public getName(id: string): string | undefined {
        const session = this.get(id);
        return session?.name;
    }

    // Set parameters
    public setParameters(id: string, parameters: Record<string, any>): boolean {
        const session = this.get(id);
        if (session) {
            session.parameters = parameters;
            return true;
        }
        return false;
    }

    // Get parameters
    public getParameters(id: string): Record<string, any> | undefined {
        const session = this.get(id);
        return session?.parameters;
    }

    // Set parameter
    public setParameter(id: string, name: string, value: any): boolean {
        const session = this.get(id);
        if (session) {
            if (!session.parameters)
                session.parameters = {}
            session.parameters[name] = value;
            return true;
        }
        return false;
    }

    // Get parameter
    public getParameter(id: string, name: string): any | undefined {
        const session = this.get(id);
        return session?.parameters?.[name];
    }

    private validateDebugData(data: Session | undefined) {
        if (!data) return undefined;

        if (!data.debugInfo) {
            data.debugInfo = {
                lastExecutionError: "",
                lastPreloadResult: "",
                lastPlayerLibraryError: ""
            }; // Initialize debug info if not present
        }
        if (!data.debugInfo.lastExecutionError)
            data.debugInfo.lastExecutionError = "";
        if (!data.debugInfo.lastPreloadResult)
            data.debugInfo.lastPreloadResult = "";
        if (!data.debugInfo.lastPlayerLibraryError)
            data.debugInfo.lastPlayerLibraryError = "";

        return data
    }

    getAllParameters(sessionId: any) {
        const session = this.get(sessionId);
        return session?.parameters;
    }
}

// Then use it throughout your code
export const sessionsManager = SessionsManager.getInstance();
