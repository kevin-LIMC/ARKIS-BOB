const sql = require('mssql/msnodesqlv8');
const config = {
    driver: 'msnodesqlv8',
    connectionString: 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=BOB_CONSTRUYE;Trusted_Connection=Yes;'
};
async function check() {
    try {
        await sql.connect(config);
        const result = await sql.query('SELECT username, password FROM Seguridad.usuarios');
        console.log(JSON.stringify(result.recordset, null, 2));
    } catch(e) { console.error(e); }
    process.exit(0);
}
check();
