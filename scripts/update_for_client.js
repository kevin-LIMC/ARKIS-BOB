const sql = require('mssql');
const config = {
    server: 'codigoplus.database.windows.net',
    database: 'ARKIS_BOB',
    user: 'codificador',
    password: 'J4053k123',
    options: { encrypt: true, trustServerCertificate: false }
};

async function updateSchema() {
    try {
        await sql.connect(config);
        console.log('Conectado a la BD...');

        // 1. Agregar Rol Cliente
        console.log('Agregando Rol Cliente...');
        await sql.query`
            IF NOT EXISTS (SELECT 1 FROM Seguridad.roles WHERE nombre_rol = 'Cliente')
            BEGIN
                INSERT INTO Seguridad.roles (nombre_rol, descripcion, permisos)
                VALUES ('Cliente', 'Acceso para clientes externos', 'dashboard,catalogo,mis_reservas')
            END
        `;

        // 2. Agregar columnas a Materiales
        console.log('Actualizando tabla Materiales...');
        await sql.query`
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'Almacen' AND TABLE_NAME = 'materiales' AND COLUMN_NAME = 'precio_venta')
            BEGIN
                ALTER TABLE Almacen.materiales ADD precio_venta DECIMAL(18,2) DEFAULT 0.00, imagen_url NVARCHAR(MAX)
            END
        `;

        // 3. Crear tabla de Reservas
        console.log('Creando tabla de Reservas...');
        await sql.query`
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'Operaciones' AND TABLE_NAME = 'reservas')
            BEGIN
                CREATE TABLE Operaciones.reservas (
                    id_reserva INT PRIMARY KEY IDENTITY(1,1),
                    id_usuario INT FOREIGN KEY REFERENCES Seguridad.usuarios(id_usuario),
                    id_material INT FOREIGN KEY REFERENCES Almacen.materiales(id_material),
                    cantidad DECIMAL(18,2),
                    precio_total DECIMAL(18,2),
                    fecha_reserva DATETIME DEFAULT GETDATE(),
                    estado NVARCHAR(50) DEFAULT 'Pendiente'
                )
            END
        `;

        // 4. Actualizar datos de ejemplo (precios e imágenes)
        console.log('Insertando datos de ejemplo...');
        await sql.query`
            UPDATE Almacen.materiales SET precio_venta = 35.50, imagen_url = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400' WHERE codigo_material = 'MAT-001'
            UPDATE Almacen.materiales SET precio_venta = 62.00, imagen_url = 'https://images.unsplash.com/photo-1590006245316-08183796f6e5?q=80&w=400' WHERE codigo_material = 'MAT-002'
            UPDATE Almacen.materiales SET precio_venta = 2.50, imagen_url = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400' WHERE codigo_material = 'MAT-003'
        `;

        console.log('--- Esquema actualizado con éxito ---');
        process.exit(0);
    } catch (err) {
        console.error('Error actualizando esquema:', err);
        process.exit(1);
    }
}

updateSchema();
