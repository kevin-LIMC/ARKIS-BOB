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
        console.log('Agregando columna id_usuario a Operaciones.trabajadores...');
        await sql.query(`
            IF NOT EXISTS (
                SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'Operaciones' AND TABLE_NAME = 'trabajadores' AND COLUMN_NAME = 'id_usuario'
            )
            BEGIN
                ALTER TABLE Operaciones.trabajadores ADD id_usuario INT NULL;
                ALTER TABLE Operaciones.trabajadores ADD CONSTRAINT FK_Trabajadores_Usuarios FOREIGN KEY (id_usuario) REFERENCES Seguridad.usuarios(id_usuario);
            END
        `);
        console.log('¡Columna agregada exitosamente!');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sql.close();
    }
}
run();
