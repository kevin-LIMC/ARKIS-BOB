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

async function check() {
    const table = process.argv[2] || 'Finanzas.gastos';
    try {
        await sql.connect(config);
        const res = await sql.query(`SELECT TOP 0 * FROM ${table}`);
        console.log(`Columns for ${table}:`, Object.keys(res.recordset.columns));
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
check();
