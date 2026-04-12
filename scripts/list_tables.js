const sql = require('mssql/msnodesqlv8');
const config = {
    driver: 'msnodesqlv8',
    connectionString: 'Driver={SQL Server};Server=localhost\\SQLEXPRESS;Database=BOB_CONSTRUYE;Trusted_Connection=Yes;'
};
async function list() {
    try {
        await sql.connect(config);
        const res = await sql.query('SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES');
        console.log(JSON.stringify(res.recordset, null, 2));
    } catch(e) { console.error(e); }
    process.exit(0);
}
list();
