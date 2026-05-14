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
    options: { encrypt: true, trustServerCertificate: false, connectTimeout: 15000 }
};

async function test() {
    console.log('Probando conexión a:', config.server);
    try {
        const pool = await sql.connect(config);
        console.log('✓ CONEXIÓN EXITOSA');
        const res = await pool.request().query('SELECT TOP 1 nombre_completo FROM Seguridad.usuarios');
        console.log('✓ QUERY EXITOSA:', res.recordset[0]);
        await sql.close();
    } catch (err) {
        console.error('✗ ERROR DE CONEXIÓN:', err.message);
    }
}
test();
