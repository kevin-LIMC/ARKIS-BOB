const sql = require('mssql');
const config = {
    server: 'codigoplus.database.windows.net',
    database: 'ARKIS_BOB',
    options: { encrypt: true, trustServerCertificate: false },
    authentication: { type: 'default', options: { userName: 'codificador', password: 'J4053k123' } }
};

async function updateRoles() {
    try {
        await sql.connect(config);
        console.log('Connected to DB');

        await sql.query(`UPDATE Seguridad.roles SET permisos = 'dashboard,obras,presupuesto,alertas' WHERE nombre_rol = 'Ingeniero'`);
        await sql.query(`UPDATE Seguridad.roles SET permisos = 'dashboard,inventario,alertas' WHERE nombre_rol = 'Almacenero'`);
        await sql.query(`UPDATE Seguridad.roles SET permisos = 'dashboard,gastos,reportes,proveedores,alertas' WHERE nombre_rol = 'Contador'`);
        await sql.query(`UPDATE Seguridad.roles SET permisos = 'dashboard,personal,alertas' WHERE nombre_rol = 'Supervisor'`);
        
        console.log('Roles permissions updated successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error updating roles:', err);
        process.exit(1);
    }
}

updateRoles();
