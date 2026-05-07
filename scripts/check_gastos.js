const sql = require('mssql');
const config = {
    server: 'codigoplus.database.windows.net',
    database: 'ARKIS_BOB',
    options: { encrypt: true, trustServerCertificate: false },
    authentication: { type: 'default', options: { userName: 'codificador', password: 'J4053k123' } }
};
async function check() {
    try {
        await sql.connect(config);
        const cols = await sql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='Finanzas' AND TABLE_NAME='gastos'");
        console.log('=== COLUMNAS DE Finanzas.gastos ===');
        cols.recordset.forEach(c => console.log(`- ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    } catch(e) { console.error('ERROR:', e.message); }
    process.exit(0);
}
check();
