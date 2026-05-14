const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    authentication: {
        type: 'default',
        options: { 
            userName: process.env.DB_USER, 
            password: process.env.DB_PASS 
        }
    },
    options: { encrypt: true, trustServerCertificate: false }
};

async function run() {
    try {
        await sql.connect(config);
        console.log('Agregando columna imagen_url a Equipos.maquinaria...');
        await sql.query(`
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'Equipos' AND TABLE_NAME = 'maquinaria' AND COLUMN_NAME = 'imagen_url'
            )
            BEGIN
                ALTER TABLE Equipos.maquinaria ADD imagen_url NVARCHAR(MAX) NULL;
            END
        `);
        console.log('¡Columna agregada exitosamente!');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sql.close();
    }
}
run();
