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
        console.log('Creando tabla de mensajes internos...');
        
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mensajes' AND schema_id = SCHEMA_ID('Seguridad'))
            BEGIN
                CREATE TABLE Seguridad.mensajes (
                    id_mensaje INT PRIMARY KEY IDENTITY(1,1),
                    id_emisor INT NOT NULL,
                    id_receptor INT NULL, -- NULL significa que es para Soporte General (Admin)
                    asunto NVARCHAR(100) NOT NULL,
                    contenido NVARCHAR(MAX) NOT NULL,
                    fecha_envio DATETIME DEFAULT GETDATE(),
                    leido BIT DEFAULT 0,
                    FOREIGN KEY (id_emisor) REFERENCES Seguridad.usuarios(id_usuario),
                    FOREIGN KEY (id_receptor) REFERENCES Seguridad.usuarios(id_usuario)
                );
            END
        `);
        console.log('Operación completada.');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sql.close();
    }
}
run();
