export interface AIChatRequestDTO {
    message: string;
    sessionId?: string;
}

export interface AIChatResponseDTO {
    success: boolean;
    data: {
        response: string;
        sessionId: string;
    };
    authenticated: boolean;
}
