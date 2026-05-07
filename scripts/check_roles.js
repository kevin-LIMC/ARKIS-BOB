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
        const roles = await sql.query("SELECT * FROM Config.roles");
        console.log('--- Roles ---');
        console.log(roles.recordset);
        
        const cols = await sql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='usuarios'");
        console.log('--- Usuarios Schema ---');
        console.log(cols.recordset);
    } catch(e) { console.error('ERROR:', e.message); }
    process.exit(0);
}
check();
