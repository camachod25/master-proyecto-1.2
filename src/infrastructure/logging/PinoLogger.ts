import pino from 'pino';
import { Logger, LoggerContext } from '../../application/ports/Logger';

export class PinoLogger implements Logger {
    private readonly pinoInstance: pino.Logger;

    constructor(pinoInstance?: pino.Logger) {
        this.pinoInstance = pinoInstance ?? pino({
            name: 'master-proyecto-1.2',
            level: process.env.LOG_LEVEL ?? 'info',
            transport: process.env.NODE_ENV === 'production' ? {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            } : undefined
        });
    };

    info(message: string, obj?: object): void {
        if (obj) {
            this.pinoInstance.info(obj, message);
        } else {
            this.pinoInstance.info(message);
        }
    }

    warn(message: string, obj?: object): void {
        if (obj) {
            this.pinoInstance.warn(obj, message);
        } else {
            this.pinoInstance.warn(message);
        }
    }

    error(message: string, obj?: object): void {
        if (obj) {
            this.pinoInstance.error(obj, message);
        } else {
            this.pinoInstance.error(message);
        }
    }
    
    debug(message: string, obj?: object): void {
        if (obj) {
            this.pinoInstance.debug(obj, message);
        } else {
            this.pinoInstance.debug(message);
        }
    }
    
    child(context: LoggerContext): Logger {
        const childPino = this.pinoInstance.child(context);
        return new PinoLogger(childPino);
    }
}