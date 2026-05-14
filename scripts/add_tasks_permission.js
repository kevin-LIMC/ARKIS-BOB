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
        console.log('Agregando permiso de tareas a todos los roles...');

        const roles = await sql.query(`SELECT id_rol, nombre_rol, permisos FROM Seguridad.roles WHERE nombre_rol != 'Cliente' AND permisos != '*'`);
        
        for (let r of roles.recordset) {
            const nuevosPermisos = r.permisos.includes('tareas') ? r.permisos : 'tareas,' + r.permisos;
            const request = new sql.Request();
            request.input('permisos', sql.NVarChar, nuevosPermisos);
            request.input('id', sql.Int, r.id_rol);
            await request.query(`UPDATE Seguridad.roles SET permisos = @permisos WHERE id_rol = @id`);
            console.log(`Actualizado ${r.nombre_rol}`);
        }

        console.log('¡Permisos de tareas agregados!');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sql.close();
    }
}
run();
