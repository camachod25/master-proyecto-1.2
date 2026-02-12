import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import pkg from 'pg';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsDir = join(__dirname, '../db/migrations');

async function runMigrations(): Promise<void> {
  // Configurar conexión a la BD
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'orders_db',
  });

  try {
    // Leer todos los archivos del directorio de migraciones
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter((file) => extname(file) === '.sql')
      .sort(); // Ordenar alfabéticamente (001_, 002_, etc.)

    if (sqlFiles.length === 0) {
      console.log('✓ No hay migraciones para ejecutar');
      return;
    }

    console.log(`\n📦 Ejecutando ${sqlFiles.length} migración(es)...\n`);

    // Ejecutar cada archivo SQL en orden
    for (const file of sqlFiles) {
      const filePath = join(migrationsDir, file);
      const sql = await readFile(filePath, 'utf-8');

      try {
        await pool.query(sql);
        console.log(`✓ ${file} ejecutada correctamente`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`✗ Error en ${file}:`);
        console.error(`  ${errorMessage}`);
        throw error;
      }
    }

    console.log(`\n✓ Todas las migraciones ejecutadas exitosamente\n`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('\n❌ Error durante la migración:');
    console.error(errorMessage);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
runMigrations();
