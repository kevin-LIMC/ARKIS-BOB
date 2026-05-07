const sql = require('mssql');
const config = {
    server: 'codigoplus.database.windows.net',
    database: 'ARKIS_BOB',
    options: { encrypt: true, trustServerCertificate: false },
    authentication: { type: 'default', options: { userName: 'codificador', password: 'J4053k123' } }
};
async function update() {
    try {
        await sql.connect(config);
        await sql.query("UPDATE Finanzas.gastos SET id_partida = 1 WHERE id_obra = 1 AND id_partida IS NULL");
        console.log('Update complete');
    } catch(e) { console.error('ERROR:', e.message); }
    process.exit(0);
}
update();
