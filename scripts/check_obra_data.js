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
    try {
        await sql.connect(config);
        const res = await sql.query(`SELECT TOP 5 nombre_proyecto, monto_contrato FROM Operaciones.obras`);
        console.log(res.recordset);
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
check();
