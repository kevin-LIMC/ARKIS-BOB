const sql = require('mssql/msnodesqlv8');
const config = {
    driver: 'msnodesqlv8',
    connectionString: 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=BOB_CONSTRUYE;Trusted_Connection=Yes;'
};
async function check() {
    try {
        await sql.connect(config);
        const res = await sql.query('SELECT COUNT(*) as n FROM Operaciones.obras');
        console.log('Obras:', res.recordset[0].n);
        const res2 = await sql.query('SELECT COUNT(*) as n FROM Operaciones.partidas_presupuestarias');
        console.log('Partidas:', res2.recordset[0].n);
    } catch(e) { console.error(e); }
    process.exit(0);
}
check();
