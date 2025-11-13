export interface EventDto {
    title: string;
    description?: string;
    start: Date;
    end: Date;
    allDay: boolean;
    color?: string;
    type: 'personal' | 'work' | 'reminder' | 'holiday' | 'booking';
    location?: string;
    guestEmails?: string[];
}

export interface UpdateEventDto {
    title?: string;
    description?: string;
    start?: Date;
    end?: Date;
    allDay?: boolean;
    color?: string;
    type?: 'personal' | 'work' | 'reminder' | 'holiday' | 'booking';
    location?: string;
}

export interface AddGuestsDto {
    guestEmails: string[];
}

export interface RemoveGuestsDto {
    guestEmails: string[];
}
