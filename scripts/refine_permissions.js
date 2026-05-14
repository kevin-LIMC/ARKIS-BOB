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

async function run() {
    try {
        await sql.connect(config);
        console.log('Actualizando permisos de roles...');

        // Ingeniero: agregar personal
        await sql.query(`UPDATE Seguridad.roles SET permisos = 'dashboard,obras,presupuesto,personal,alertas' WHERE nombre_rol = 'Ingeniero'`);
        
        // Supervisor: agregar obras
        await sql.query(`UPDATE Seguridad.roles SET permisos = 'dashboard,obras,personal,alertas' WHERE nombre_rol = 'Supervisor'`);
        
        // Contador: agregar personal
        await sql.query(`UPDATE Seguridad.roles SET permisos = 'dashboard,gastos,reportes,proveedores,personal,alertas' WHERE nombre_rol = 'Contador'`);

        console.log('¡Permisos actualizados exitosamente!');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sql.close();
    }
}
run();
