import { Pool } from "pg";
import { PgUnitOfWork } from "../persistence/db/PgUnitOfWork";
import { getDatabaseUrl } from "../../composition/config.js"

export class DatabaseFactory {
    private static pool: Pool | null = null;

    static createPool(): Pool {
        if (!this.pool) {
            this.pool = new Pool({
                connectionString: getDatabaseUrl(),
                max: 10, // Máximo de conexiones en el pool
                idleTimeoutMillis: 30000, // Tiempo antes de liberar conexiones inactivas
                connectionTimeoutMillis: 2000, // Tiempo máximo para establecer una conexión
            });

            this.pool.on('error', (err: Error) => {
                console.error('Error en la conexión de base de datos:', err);
                process.exit(-1); // Salir del proceso si hay un error en la conexión
            });
        }

        return this.pool;
    }

    static createUnitOfWork(): PgUnitOfWork {
        const pool = this.createPool();
        return new PgUnitOfWork(pool);
    }

    static async closePool(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
}