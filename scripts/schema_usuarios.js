const sql = require('mssql');
let dbConfig = {
    server: 'codigoplus.database.windows.net',
    database: 'ARKIS_BOB',
    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    authentication: {
        type: 'default',
        options: { userName: 'codificador', password: 'J4053k123' }
    }
};

async function checkSchema() {
    try {
        await sql.connect(dbConfig);
        console.log("--- Seguridad.usuarios columns ---");
        const res1 = await sql.query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'Seguridad' AND TABLE_NAME = 'usuarios'
        `);
        console.table(res1.recordset);

        console.log("--- Seguridad.roles columns ---");
        const res2 = await sql.query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'Seguridad' AND TABLE_NAME = 'roles'
        `);
        console.table(res2.recordset);
        
        console.log("--- Roles data ---");
        const res3 = await sql.query(`SELECT * FROM Seguridad.roles`);
        console.table(res3.recordset);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkSchema();
