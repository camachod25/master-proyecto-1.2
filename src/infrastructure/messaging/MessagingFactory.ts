import { EventBus } from "../../application/ports/EventBus";
import { OutBoxEventBus } from "./OutBoxEventBus.js";
import { NoopEventBus } from "./NoopEventBus.js";
import { OutBoxDispatcher } from "./OutBoxDispatcher.js";
import { DatabaseFactory } from "../database/DataBaseFactory.js";

export class MessagingFactory {
    static createEventBus(type: 'outbox' | 'noop' = 'outbox'): EventBus {
        if (type === 'noop') {
            return new NoopEventBus();
        }

        const pool = DatabaseFactory.createPool();
        return new OutBoxEventBus(pool);
    }

    static createOutBoxDispatcher(batchSize = 100, intervalMs = 5000): OutBoxDispatcher {
        return new OutBoxDispatcher(batchSize, intervalMs);
    }
}
