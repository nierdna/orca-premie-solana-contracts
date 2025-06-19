import {
    OrderMatchedEvent,
    TokenMarketCreatedEvent,
    TokenMappedEvent,
    TradeSettledEvent,
    OrderCancelledEvent,
    TradeCancelledEvent,
    SolanaEventData,
    IBlockchainEvent
} from '../types/events';

/**
 * Type definition cho event constructor functions
 */
export type EventConstructor = new (data: any) => IBlockchainEvent;

/**
 * Centralized mapping cho tất cả event constructors
 * Sử dụng để tránh trùng lặp switch case trong các files khác nhau
 */
export const EVENT_CONSTRUCTORS: Record<string, EventConstructor> = {
    'OrdersMatched': OrderMatchedEvent,
    'TokenMarketCreated': TokenMarketCreatedEvent,
    'TokenMapped': TokenMappedEvent,
    'TradeSettled': TradeSettledEvent,
    'OrderCancelled': OrderCancelledEvent,
    'TradeCancelled': TradeCancelledEvent,
};

/**
 * Factory function để tạo event object từ Solana event data
 * Đây là single source of truth cho event creation logic
 */
export function createEventFromData(eventData: SolanaEventData | any): IBlockchainEvent | any {
    const EventClass = EVENT_CONSTRUCTORS[eventData.name];

    if (EventClass) {
        return new EventClass(eventData);
    } else {
        console.warn(`Unknown event type: ${eventData.name}. Returning raw data.`);
        return eventData;
    }
}

/**
 * Helper function để register thêm event constructor
 * Useful cho extending functionality hoặc custom events
 */
export function registerEventConstructor(eventName: string, constructor: EventConstructor) {
    EVENT_CONSTRUCTORS[eventName] = constructor;
    console.log(`Registered event constructor for: ${eventName}`);
}

/**
 * Helper function để unregister event constructor
 */
export function unregisterEventConstructor(eventName: string) {
    if (EVENT_CONSTRUCTORS[eventName]) {
        delete EVENT_CONSTRUCTORS[eventName];
        console.log(`Unregistered event constructor for: ${eventName}`);
    }
}

/**
 * Get tất cả supported event types
 */
export function getSupportedEventTypes(): string[] {
    return Object.keys(EVENT_CONSTRUCTORS);
}

/**
 * Check if event type is supported
 */
export function isEventTypeSupported(eventName: string): boolean {
    return eventName in EVENT_CONSTRUCTORS;
}

/**
 * Get event constructor by name
 */
export function getEventConstructor(eventName: string): EventConstructor | undefined {
    return EVENT_CONSTRUCTORS[eventName];
}

/**
 * Validate event data structure trước khi create event
 */
export function validateEventData(eventData: any): boolean {
    if (!eventData || typeof eventData !== 'object') {
        return false;
    }

    // Check for Solana format
    if ('data' in eventData && 'name' in eventData && 'slot' in eventData) {
        return true;
    }

    // Check for Ethereum format
    if ('eventName' in eventData && 'blockNumber' in eventData && 'args' in eventData) {
        return true;
    }

    return false;
}

/**
 * Safe event creation với error handling
 */
export function safeCreateEvent(eventData: any): IBlockchainEvent | null {
    try {
        if (!validateEventData(eventData)) {
            console.error('Invalid event data structure:', eventData);
            return null;
        }

        const event = createEventFromData(eventData);

        // Validate created event
        if (event && typeof event.isValid === 'function' && !event.isValid()) {
            console.error('Created event failed validation:', event);
            return null;
        }

        return event;
    } catch (error) {
        console.error('Error creating event:', error);
        return null;
    }
}

/**
 * Batch create events từ array data
 */
export function createEventsFromBatch(eventDataArray: any[]): (IBlockchainEvent | null)[] {
    return eventDataArray.map(data => safeCreateEvent(data));
}

/**
 * Filter events by type từ batch results
 */
export function filterEventsByType<T extends IBlockchainEvent>(
    events: (IBlockchainEvent | null)[],
    eventType: string
): T[] {
    return events.filter((event): event is T =>
        event !== null && event.eventName === eventType
    ) as T[];
}

/**
 * Group events by type
 */
export function groupEventsByType(events: (IBlockchainEvent | null)[]): Record<string, IBlockchainEvent[]> {
    const grouped: Record<string, IBlockchainEvent[]> = {};

    events.forEach(event => {
        if (event !== null) {
            if (!grouped[event.eventName]) {
                grouped[event.eventName] = [];
            }
            grouped[event.eventName].push(event);
        }
    });

    return grouped;
} 