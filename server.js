require('dotenv').config();
const express = require('express');
const path = require('path');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Configuración compatible con Render y Windows
let dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    authentication: {
        type: 'default',
        options: { 
            userName: process.env.DB_USER, 
            password: process.env.DB_PASS 
        }
    }
};

// En Azure/Render usaremos una cadena de conexión simple
const connectionString = process.env.DATABASE_URL;

// Conexión global a la base de datos (Pool)
let pool;
async function getPool() {
    if (!pool) {
        try {
            console.log('--- CONECTANDO A SQL SERVER ---');
            pool = await sql.connect(connectionString || dbConfig);
            console.log('✓ POOL DE CONEXIONES LISTO');
        } catch (err) {
            console.error('✗ ERROR AL CREAR POOL:', err.message);
            throw err;
        }
    }
    return pool;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ==========================================
// API ENDPOINTS (V2)
// ==========================================

// Endpoint de Estadísticas para el Dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const pool = await getPool();
        const stats = await pool.request().query(`
            SELECT 
                ISNULL(SUM(monto_contrato), 0) as presupuesto_total,
                ISNULL((SELECT SUM(monto_total) FROM Finanzas.gastos), 0) as gasto_total,
                (SELECT COUNT(*) FROM Operaciones.obras) as total_obras,
                (SELECT COUNT(*) FROM Auditoria.alertas WHERE leida = 0) as total_alertas
            FROM Operaciones.obras
        `);
        res.json(stats.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Datos para Gráficas del Dashboard
app.get('/api/dashboard/charts', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        
        // Gastos por Mes
        const gastosMes = await sql.query`
            SELECT 
                FORMAT(fecha_gasto, 'yyyy-MM') as mes,
                SUM(monto_total) as total
            FROM Finanzas.gastos
            GROUP BY FORMAT(fecha_gasto, 'yyyy-MM')
            ORDER BY mes ASC
        `;
        
        // Presupuesto por Obra
        const presObra = await sql.query`
            SELECT 
                o.codigo_obra as obra,
                ISNULL(SUM(p.cantidad_estimada * p.precio_unitario), 0) as total
            FROM Operaciones.obras o
            LEFT JOIN Operaciones.partidas_presupuestarias p ON o.id_obra = p.id_obra
            GROUP BY o.codigo_obra
            HAVING SUM(p.cantidad_estimada * p.precio_unitario) > 0
        `;
        
        res.json({
            gastos: gastosMes.recordset,
            presupuesto: presObra.recordset
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registro Público de Usuarios (Clientes)
app.post('/api/auth/register', async (req, res) => {
    const { username, password, nombre_completo, correo } = req.body;
    
    try {
        if (!username || !password || !nombre_completo || !correo) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await sql.connect(connectionString || dbConfig);
        
        // 1. Obtener el ID del rol 'Cliente'
        const rolRes = await sql.query`SELECT id_rol FROM Seguridad.roles WHERE nombre_rol = 'Cliente'`;
        const idRolCliente = rolRes.recordset.length > 0 ? rolRes.recordset[0].id_rol : null;

        if (!idRolCliente) {
            return res.status(500).json({ error: 'Error: El rol Cliente no está configurado en el sistema.' });
        }

        // 2. Verificar si el username ya existe
        const existente = await sql.query`SELECT id_usuario FROM Seguridad.usuarios WHERE username = ${username}`;
        if (existente.recordset.length > 0) {
            return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
        }

        // 3. Insertar el nuevo usuario
        await sql.query`
            INSERT INTO Seguridad.usuarios (username, password, nombre_completo, correo, id_rol, activo, fecha_creacion)
            VALUES (${username}, ${hashedPassword}, ${nombre_completo}, ${correo}, ${idRolCliente}, 1, GETDATE())
        `;

        res.json({ success: true, message: 'Usuario registrado exitosamente' });
    } catch (err) {
        console.error('ERROR REGISTER:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login real
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('user', sql.NVarChar, username)
            .query(`
            SELECT u.*, r.nombre_rol, r.permisos 
            FROM Seguridad.usuarios u
            JOIN Seguridad.roles r ON u.id_rol = r.id_rol
            WHERE u.username = @user
        `);
        
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                // REGISTRAR SESIÓN
                try {
                    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                    await sql.query`
                        INSERT INTO Seguridad.Sesiones (id_usuario, fecha_inicio, ultima_actividad, estado, ip_address)
                        VALUES (${user.id_usuario}, GETDATE(), GETDATE(), 'Activa', ${ip})
                    `;
                    // También actualizamos el último acceso en la tabla usuarios
                    await sql.query`UPDATE Seguridad.usuarios SET ultimo_acceso = GETDATE() WHERE id_usuario = ${user.id_usuario}`;
                } catch (sessErr) {
                    console.error('Error registrando sesión:', sessErr);
                }

                delete user.password;
                res.json(user);
            } else {
                res.status(401).json({ error: 'Contraseña incorrecta' });
            }
        } else {
            res.status(401).json({ error: 'Usuario no encontrado' });
        }
    } catch (err) {
        console.error('ERROR LOGIN:', err);
        res.status(500).json({ 
            error: 'Error interno del servidor', 
            details: err.message,
            stack: err.stack 
        });
    }
});

// Obtener Obras (con progreso real)
app.get('/api/obras', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                o.*, 
                o.monto_contrato as presupuesto_total,
                o.monto_contrato,
                c.razon_social as cliente_nombre,
                e.nombre as estado_nombre,
                ISNULL((SELECT SUM(monto_total) FROM Finanzas.gastos WHERE id_obra = o.id_obra), 0) as total_gastado
            FROM Operaciones.obras o
            LEFT JOIN Operaciones.clientes c ON o.id_cliente = c.id_cliente
            LEFT JOIN Config.estados_obra e ON o.id_estado_obra = e.id_estado
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear Nueva Obra
app.post('/api/obras', async (req, res) => {
    const { codigo_obra, nombre_proyecto, direccion, id_cliente, id_tipo_obra, id_estado_obra, monto_contrato } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('cod', sql.NVarChar, codigo_obra)
            .input('nom', sql.NVarChar, nombre_proyecto)
            .input('dir', sql.NVarChar, direccion)
            .input('cli', sql.Int, id_cliente)
            .input('tip', sql.Int, id_tipo_obra)
            .input('est', sql.Int, id_estado_obra)
            .input('mon', sql.Decimal(18,2), monto_contrato)
            .query(`
            INSERT INTO Operaciones.obras (codigo_obra, nombre_proyecto, direccion, id_cliente, id_tipo_obra, id_estado_obra, monto_contrato)
            VALUES (@cod, @nom, @dir, @cli, @tip, @est, @mon)
        `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener una Obra por ID
app.get('/api/obras/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`SELECT * FROM Operaciones.obras WHERE id_obra = ${id}`;
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar Obra
app.put('/api/obras/:id', async (req, res) => {
    const { id } = req.params;
    const { codigo_obra, nombre_proyecto, direccion, id_cliente, id_tipo_obra, id_estado_obra, monto_contrato } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .input('cod', sql.NVarChar, codigo_obra)
            .input('nom', sql.NVarChar, nombre_proyecto)
            .input('dir', sql.NVarChar, direccion)
            .input('cli', sql.Int, id_cliente)
            .input('tip', sql.Int, id_tipo_obra)
            .input('est', sql.Int, id_estado_obra)
            .input('mon', sql.Decimal(18,2), monto_contrato)
            .query(`
            UPDATE Operaciones.obras 
            SET codigo_obra = @cod, 
                nombre_proyecto = @nom, 
                direccion = @dir,
                id_cliente = @cli, 
                id_tipo_obra = @tip, 
                id_estado_obra = @est, 
                monto_contrato = @mon
            WHERE id_obra = @id
        `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar Nuevo Gasto
app.post('/api/gastos', async (req, res) => {
    const { id_obra, id_partida, fecha_gasto, numero_factura, id_proveedor, concepto, monto_total, id_forma_pago, estado_gasto } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('obra', sql.Int, id_obra)
            .input('partida', sql.Int, id_partida || null)
            .input('fecha', sql.DateTime, fecha_gasto)
            .input('factura', sql.NVarChar, numero_factura)
            .input('proveedor', sql.Int, id_proveedor)
            .input('concepto', sql.NVarChar, concepto)
            .input('monto', sql.Decimal(18,2), monto_total)
            .input('pago', sql.Int, id_forma_pago)
            .input('estado', sql.NVarChar, estado_gasto)
            .query(`
            INSERT INTO Finanzas.gastos (id_obra, id_partida, fecha_gasto, numero_factura, id_proveedor, concepto, monto_total, id_forma_pago, estado_gasto)
            VALUES (@obra, @partida, @fecha, @factura, @proveedor, @concepto, @monto, @pago, @estado)
        `);
        res.json({ success: true });
    } catch (err) {
        console.error('Error insertando gasto:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar Gasto
app.put('/api/gastos/:id', async (req, res) => {
    const { id } = req.params;
    const { id_obra, id_partida, fecha_gasto, numero_factura, id_proveedor, concepto, monto_total, id_forma_pago, estado_gasto } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .input('obra', sql.Int, id_obra)
            .input('partida', sql.Int, id_partida || null)
            .input('fecha', sql.DateTime, fecha_gasto)
            .input('factura', sql.NVarChar, numero_factura)
            .input('proveedor', sql.Int, id_proveedor)
            .input('concepto', sql.NVarChar, concepto)
            .input('monto', sql.Decimal(18,2), monto_total)
            .input('pago', sql.Int, id_forma_pago)
            .input('estado', sql.NVarChar, estado_gasto)
            .query(`
            UPDATE Finanzas.gastos
            SET id_obra = @obra,
                id_partida = @partida,
                fecha_gasto = @fecha,
                numero_factura = @factura,
                id_proveedor = @proveedor,
                concepto = @concepto,
                monto_total = @monto,
                id_forma_pago = @pago,
                estado_gasto = @estado
            WHERE id_gasto = @id
        `);
        res.json({ success: true });
    } catch (err) {
        console.error('Error actualizando gasto:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Obtener Listado de Gastos
app.get('/api/gastos', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                g.*, 
                o.nombre_proyecto as obra_nombre,
                p.razon_social as proveedor_nombre
            FROM Finanzas.gastos g
            LEFT JOIN Operaciones.obras o ON g.id_obra = o.id_obra
            LEFT JOIN Finanzas.proveedores p ON g.id_proveedor = p.id_proveedor
            ORDER BY g.fecha_gasto DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Presupuesto por Obra
app.get('/api/obras/:id/presupuesto', async (req, res) => {
    const { id } = req.params;
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT 
                p.*, 
                u.nombre as unidad_nombre,
                ISNULL((SELECT SUM(monto_total) FROM Finanzas.gastos WHERE id_partida = p.id_partida), 0) as gastado_real
            FROM Operaciones.partidas_presupuestarias p
            LEFT JOIN Config.unidades_medida u ON p.id_unidad_medida = u.id_unidad
            WHERE p.id_obra = ${id}
            ORDER BY p.codigo_partida
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Unidades de Medida
app.get('/api/unidades', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`SELECT * FROM Config.unidades_medida WHERE activo = 1 ORDER BY nombre`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar Nueva Partida Presupuestaria
app.post('/api/partidas', async (req, res) => {
    const { id_obra, codigo_partida, descripcion, id_unidad_medida, cantidad_estimada, precio_unitario } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Operaciones.partidas_presupuestarias 
            (id_obra, codigo_partida, descripcion, id_unidad_medida, cantidad_estimada, precio_unitario, umbral_alerta_presupuesto)
            VALUES (${id_obra}, ${codigo_partida}, ${descripcion}, ${id_unidad_medida}, ${cantidad_estimada}, ${precio_unitario}, 80)
        `;
        res.json({ success: true });
    } catch (err) {
        console.error('Error insertando partida:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- MÓDULO DE PERSONAL ---

// Obtener Lista de Trabajadores
app.get('/api/personal', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT t.id_trabajador, t.dni, t.nombre_completo, t.puesto, t.especialidad, t.tarifa_hora, t.telefono, t.activo, t.id_usuario, u.username, u.activo as activo_usuario
            FROM Operaciones.trabajadores t
            LEFT JOIN Seguridad.usuarios u ON t.id_usuario = u.id_usuario
            ORDER BY t.nombre_completo ASC
        `;

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Usuarios Linkeables (que no son trabajadores aún)
app.get('/api/personal/usuarios-disponibles', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT id_usuario, username, nombre_completo 
            FROM Seguridad.usuarios 
            WHERE id_usuario NOT IN (SELECT id_usuario FROM Operaciones.trabajadores WHERE id_usuario IS NOT NULL)
            AND id_rol != (SELECT id_rol FROM Seguridad.roles WHERE nombre_rol = 'Cliente')
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Registrar Nuevo Trabajador
app.post('/api/personal', async (req, res) => {
    const { dni, nombre_completo, puesto, especialidad, tarifa_hora, telefono, id_usuario } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Operaciones.trabajadores (dni, nombre_completo, puesto, especialidad, tarifa_hora, telefono, activo, id_tipo_contrato, id_usuario)
            VALUES (${dni}, ${nombre_completo}, ${puesto}, ${especialidad}, ${tarifa_hora}, ${telefono}, 1, 1, ${id_usuario || null})
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Actualizar Personal
app.put('/api/personal/:id', async (req, res) => {
    const { id } = req.params;
    const { dni, nombre_completo, puesto, especialidad, tarifa_hora, telefono, id_usuario } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Operaciones.trabajadores
            SET dni = ${dni},
                nombre_completo = ${nombre_completo},
                puesto = ${puesto},
                especialidad = ${especialidad},
                tarifa_hora = ${tarifa_hora},
                telefono = ${telefono},
                id_usuario = ${id_usuario || null}
            WHERE id_trabajador = ${id}
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- MÓDULO DE INVENTARIO ---

// Obtener Materiales
app.get('/api/inventario/materiales', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT id_material, codigo_material, nombre_material, categoria_material, stock_minimo, costo_promedio, precio_venta, imagen_url
            FROM Almacen.materiales
            ORDER BY nombre_material ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Catálogo Unificado (Materiales + Maquinaria)
app.get('/api/catalogo/unificado', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const matRes = await sql.query`SELECT id_material as id, codigo_material as cod, nombre_material as nom, categoria_material as cat, precio_venta as pre, imagen_url as img, 'material' as tipo FROM Almacen.materiales`;
        const maqRes = await sql.query`SELECT id_maquinaria as id, placa_identificacion as cod, descripcion as nom, 'Maquinaria' as cat, tarifa_alquiler as pre, imagen_url as img, 'maquinaria' as tipo FROM Equipos.maquinaria`;
        res.json([...matRes.recordset, ...maqRes.recordset]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar Nuevo Material (con soporte de imagen)
app.post('/api/inventario/materiales', upload.single('imagen'), async (req, res) => {
    try {
        const { codigo_material, nombre_material, categoria_material, stock_minimo, costo_promedio, precio_venta } = req.body;
        let imagen_url = req.body.imagen_url || null;

        if (req.file) {
            imagen_url = `/uploads/${req.file.filename}`;
        }

        console.log('--- INTENTO DE REGISTRO ---');
        console.log('Body:', req.body);
        console.log('File:', req.file ? req.file.filename : 'No hay archivo');

        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Almacen.materiales (
                codigo_material, nombre_material, categoria_material, 
                stock_minimo, costo_promedio, id_unidad_medida, 
                precio_venta, imagen_url
            )
            VALUES (
                ${codigo_material || 'S/C'}, 
                ${nombre_material || 'Sin Nombre'}, 
                ${categoria_material || 'Otros'}, 
                ${parseFloat(stock_minimo) || 0}, 
                ${parseFloat(costo_promedio) || 0}, 
                1, 
                ${parseFloat(precio_venta) || 0}, 
                ${imagen_url}
            )
        `;
        res.json({ success: true });
    } catch (err) {
        console.error('--- ERROR AL CREAR MATERIAL ---');
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar Material (con soporte de imagen)
app.put('/api/inventario/materiales/:id', upload.single('imagen'), async (req, res) => {
    const id_mat = parseInt(req.params.id);
    const { codigo_material, nombre_material, categoria_material, stock_minimo, costo_promedio, precio_venta } = req.body;
    let imagen_url = req.body.imagen_url || null;

    if (req.file) {
        imagen_url = `/uploads/${req.file.filename}`;
    }

    console.log('Intentando actualizar material:', { id_mat, codigo_material, imagen_url });

    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Almacen.materiales
            SET codigo_material = ${codigo_material},
                nombre_material = ${nombre_material},
                categoria_material = ${categoria_material},
                stock_minimo = ${parseFloat(stock_minimo) || 0},
                costo_promedio = ${parseFloat(costo_promedio) || 0},
                precio_venta = ${parseFloat(precio_venta) || 0},
                imagen_url = ${imagen_url}
            WHERE id_material = ${id_mat}
        `;
        res.json({ success: true });
    } catch (err) {
        console.error('--- ERROR CRÍTICO EN DB ---');
        console.error('Mensaje:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Obtener Maquinaria
app.get('/api/inventario/maquinaria', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT id_maquinaria, descripcion, placa_identificacion, tarifa_alquiler, estado_operativo, imagen_url
            FROM Equipos.maquinaria
            ORDER BY descripcion ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Registrar Nueva Maquinaria (con soporte de imagen)
app.post('/api/inventario/maquinaria', upload.single('imagen'), async (req, res) => {
    try {
        console.log('--- REGISTRANDO MAQUINARIA ---');
        console.log('Body:', req.body);
        const { descripcion, placa_identificacion, tarifa_alquiler, estado_operativo } = req.body;
        let imagen_url = req.body.imagen_url || null;

        if (req.file) {
            imagen_url = `/uploads/${req.file.filename}`;
            console.log('Imagen subida:', imagen_url);
        }

        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Equipos.maquinaria (descripcion, placa_identificacion, tarifa_alquiler, estado_operativo, imagen_url)
            VALUES (${descripcion}, ${placa_identificacion}, ${parseFloat(tarifa_alquiler) || 0}, ${estado_operativo || 'Operativo'}, ${imagen_url})
        `;
        res.json({ success: true });
    } catch (err) {
        console.error('Error creando maquinaria:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// Actualizar Maquinaria (con soporte de imagen)
app.put('/api/inventario/maquinaria/:id', upload.single('imagen'), async (req, res) => {
    try {
        const id_maq = parseInt(req.params.id);
        console.log('--- ACTUALIZANDO MAQUINARIA ID:', id_maq, '---');
        console.log('Body:', req.body);
        
        const { descripcion, placa_identificacion, tarifa_alquiler, estado_operativo } = req.body;
        let imagen_url = req.body.imagen_url || null;

        if (req.file) {
            imagen_url = `/uploads/${req.file.filename}`;
            console.log('Nueva imagen:', imagen_url);
        }

        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Equipos.maquinaria
            SET descripcion = ${descripcion},
                placa_identificacion = ${placa_identificacion},
                tarifa_alquiler = ${parseFloat(tarifa_alquiler) || 0},
                estado_operativo = ${estado_operativo},
                imagen_url = ${imagen_url}
            WHERE id_maquinaria = ${id_maq}
        `;
        res.json({ success: true });
    } catch (err) {
        console.error('Error actualizando maquinaria:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// --- MÓDULO DE MENSAJERÍA INTERNA ---

// Obtener mensajes de un usuario
app.get('/api/mensajes/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id_usuario)
            .query(`
            SELECT m.*, u.nombre_completo as emisor_nombre, r.nombre_rol as emisor_rol
            FROM Seguridad.mensajes m
            JOIN Seguridad.usuarios u ON m.id_emisor = u.id_usuario
            JOIN Seguridad.roles r ON u.id_rol = r.id_rol
            WHERE m.id_receptor = @id OR m.id_receptor IS NULL
            ORDER BY m.fecha_envio DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Enviar un mensaje
app.post('/api/mensajes', async (req, res) => {
    const { id_emisor, id_receptor, asunto, contenido } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('emisor', sql.Int, id_emisor)
            .input('receptor', sql.Int, id_receptor || null)
            .input('asunto', sql.NVarChar, asunto)
            .input('contenido', sql.NVarChar, contenido)
            .query(`
            INSERT INTO Seguridad.mensajes (id_emisor, id_receptor, asunto, contenido, fecha_envio, leido)
            VALUES (@emisor, @receptor, @asunto, @contenido, GETDATE(), 0)
        `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Marcar como leído
app.put('/api/mensajes/:id/leido', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE Seguridad.mensajes SET leido = 1 WHERE id_mensaje = @id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Lista de Alertas
app.get('/api/alertas', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT TOP 50 a.*, o.nombre_proyecto as obra_nombre
            FROM Auditoria.alertas a
            LEFT JOIN Operaciones.obras o ON a.id_obra = o.id_obra
            ORDER BY a.fecha_creacion DESC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MÓDULO DE USUARIOS ---

// Obtener Lista de Roles
app.get('/api/roles', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT id_rol, nombre_rol, descripcion
            FROM Seguridad.roles
            ORDER BY nombre_rol ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Lista de Usuarios
app.get('/api/usuarios', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT u.id_usuario, u.username, u.nombre_completo, u.correo, r.nombre_rol, u.activo, u.id_rol
            FROM Seguridad.usuarios u
            JOIN Seguridad.roles r ON u.id_rol = r.id_rol
            ORDER BY u.id_usuario ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar Nuevo Usuario (solo Adminstradores)
app.post('/api/usuarios', async (req, res) => {
    const { username, password, nombre_completo, correo, id_rol, crear_trabajador, dni, puesto, tarifa_hora } = req.body;
    
    try {
        // Validar datos requeridos
        if (!username || !password || !nombre_completo || !correo || !id_rol) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Generar hash de la contraseña con bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await sql.connect(connectionString || dbConfig);
        
        // Verificar si el username ya existe
        const existente = await sql.query`
            SELECT id_usuario FROM Seguridad.usuarios WHERE username = ${username}
        `;
        
        if (existente.recordset.length > 0) {
            return res.status(409).json({ error: 'El nombre de usuario ya existe' });
        }

        // Insertar el nuevo usuario
        const result = await sql.query`
            INSERT INTO Seguridad.usuarios (username, password, nombre_completo, correo, id_rol, activo, fecha_creacion)
            OUTPUT INSERTED.id_usuario
            VALUES (${username}, ${hashedPassword}, ${nombre_completo}, ${correo}, ${id_rol}, 1, GETDATE())
        `;

        const newUserId = result.recordset[0].id_usuario;

        // Si se marcó como trabajador, crear entrada en personal
        if (crear_trabajador) {
            await sql.query`
                INSERT INTO Operaciones.trabajadores (dni, nombre_completo, puesto, tarifa_hora, activo, id_tipo_contrato, id_usuario)
                VALUES (${dni || 'S/D'}, ${nombre_completo}, ${puesto || 'General'}, ${tarifa_hora || 0}, 1, 1, ${newUserId})
            `;
        }

        res.json({ success: true, message: 'Usuario registrado exitosamente', id_usuario: newUserId });
    } catch (err) {
        console.error('Error registrando usuario:', err);
        res.status(500).json({ error: err.message });
    }
});


// Actualizar Usuario
app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { username, password, nombre_completo, correo, id_rol } = req.body;
    
    try {
        await sql.connect(connectionString || dbConfig);
        
        let query = `UPDATE Seguridad.usuarios SET 
                        username = @username, 
                        nombre_completo = @nombre_completo, 
                        correo = @correo, 
                        id_rol = @id_rol`;
        
        const request = new sql.Request();
        request.input('username', sql.NVarChar, username);
        request.input('nombre_completo', sql.NVarChar, nombre_completo);
        request.input('correo', sql.NVarChar, correo);
        request.input('id_rol', sql.Int, id_rol);
        request.input('id', sql.Int, id);

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `, password = @password`;
            request.input('password', sql.NVarChar, hashedPassword);
        }

        query += ` WHERE id_usuario = @id`;
        
        await request.query(query);
        res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (err) {
        console.error('Error actualizando usuario:', err);
        res.status(500).json({ error: err.message });
    }
});

// Desactivar Usuario (cambiar estado a inactivo)
app.put('/api/usuarios/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`UPDATE Seguridad.usuarios SET activo = ${activo} WHERE id_usuario = ${id}`;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- MÓDULO DE PROVEEDORES ---

// Obtener Lista de Proveedores
app.get('/api/proveedores', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT id_proveedor, razon_social, ruc, categoria, contacto_nombre, telefono, correo, direccion, condiciones_pago, evaluacion_desempeno, activo
            FROM Finanzas.proveedores
            ORDER BY razon_social ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        console.error('ERROR GET PROVEEDORES:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Crear Nuevo Proveedor
app.post('/api/proveedores', async (req, res) => {
    const { razon_social, ruc, categoria, contacto_nombre, telefono, correo, direccion, condiciones_pago } = req.body;
    console.log('--- INTENTO CREAR PROVEEDOR ---', req.body);
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Finanzas.proveedores (razon_social, ruc, categoria, contacto_nombre, telefono, correo, direccion, condiciones_pago, evaluacion_desempeno, activo)
            VALUES (${razon_social}, ${ruc}, ${categoria || 'General'}, ${contacto_nombre}, ${telefono}, ${correo}, ${direccion}, ${condiciones_pago}, 5.0, 1)
        `;
        res.json({ success: true });
    } catch (err) {
        console.error('ERROR POST PROVEEDOR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar Proveedor
app.put('/api/proveedores/:id', async (req, res) => {
    const { id } = req.params;
    const { razon_social, ruc, categoria, contacto_nombre, telefono, correo, direccion, condiciones_pago } = req.body;
    console.log('--- INTENTO EDITAR PROVEEDOR ID:', id, '---', req.body);
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Finanzas.proveedores
            SET razon_social = ${razon_social},
                ruc = ${ruc},
                categoria = ${categoria || 'General'},
                contacto_nombre = ${contacto_nombre},
                telefono = ${telefono},
                correo = ${correo},
                direccion = ${direccion},
                condiciones_pago = ${condiciones_pago}
            WHERE id_proveedor = ${id}
        `;
        res.json({ success: true });
    } catch (err) {
        console.error('ERROR PUT PROVEEDOR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar estado activo/inactivo del proveedor
app.put('/api/proveedores/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`UPDATE Finanzas.proveedores SET activo = ${activo} WHERE id_proveedor = ${id}`;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MÓDULO DE REPORTES ---

// --- MÓDULO DE RESERVAS (CLIENTES) ---

// Crear Nueva Reserva (Materiales o Maquinaria)
app.post('/api/reservas', async (req, res) => {
    const { id_usuario, id_mat, cantidad, precio_total, tipo } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        
        if (tipo === 'maquinaria') {
            await sql.query`
                INSERT INTO Operaciones.reservas (id_usuario, id_maquinaria, cantidad, precio_total, fecha_reserva, estado)
                VALUES (${id_usuario}, ${id_mat}, ${cantidad}, ${precio_total}, GETDATE(), 'Pendiente')
            `;
        } else {
            await sql.query`
                INSERT INTO Operaciones.reservas (id_usuario, id_material, cantidad, precio_total, fecha_reserva, estado)
                VALUES (${id_usuario}, ${id_mat}, ${cantidad}, ${precio_total}, GETDATE(), 'Pendiente')
            `;
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error insertando reserva:', err);
        res.status(500).json({ error: err.message });
    }
});

// Obtener TODAS las reservas (para Admin - Unificado)
app.get('/api/reservas', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT 
                r.id_reserva, r.id_usuario, r.cantidad, r.precio_total, r.fecha_reserva, r.estado,
                u.nombre_completo as cliente,
                COALESCE(m.nombre_material, maq.descripcion) as producto_nombre,
                COALESCE(m.codigo_material, maq.placa_identificacion) as producto_codigo,
                CASE WHEN r.id_maquinaria IS NOT NULL THEN 'Maquinaria' ELSE 'Material' END as tipo_producto
            FROM Operaciones.reservas r
            JOIN Seguridad.usuarios u ON r.id_usuario = u.id_usuario
            LEFT JOIN Almacen.materiales m ON r.id_material = m.id_material
            LEFT JOIN Equipos.maquinaria maq ON r.id_maquinaria = maq.id_maquinaria
            ORDER BY r.fecha_reserva DESC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Reservas de un Usuario
app.get('/api/reservas/usuario/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT r.*, m.nombre_material 
            FROM Operaciones.reservas r
            JOIN Almacen.materiales m ON r.id_material = m.id_material
            WHERE r.id_usuario = ${id}
            ORDER BY r.fecha_reserva DESC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Consolidado Financiero (Presupuesto vs Gasto)
app.get('/api/reportes/financiero', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT 
                o.codigo_obra,
                o.nombre_proyecto,
                o.monto_contrato as presupuesto,
                ISNULL(SUM(g.monto_total), 0) as gasto_total,
                (o.monto_contrato - ISNULL(SUM(g.monto_total), 0)) as saldo
            FROM Operaciones.obras o
            LEFT JOIN Finanzas.gastos g ON o.id_obra = g.id_obra
            GROUP BY o.id_obra, o.codigo_obra, o.nombre_proyecto, o.monto_contrato
            ORDER BY o.nombre_proyecto ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MÓDULO DE MONITOREO DE USUARIOS ---

// Obtener actividad de usuarios para el Administrador
app.get('/api/monitoreo/usuarios', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT 
                s.id_sesion,
                u.nombre_completo,
                u.username,
                r.nombre_rol as rol,
                s.fecha_inicio,
                s.fecha_fin,
                s.ultima_actividad,
                s.ip_address,
                s.estado,
                CASE 
                    WHEN s.estado = 'Activa' AND DATEDIFF(MINUTE, s.ultima_actividad, GETDATE()) < 10 THEN 'En línea'
                    WHEN s.estado = 'Activa' THEN 'Inactivo'
                    ELSE 'Desconectado'
                END as estatus_real
            FROM Seguridad.Sesiones s
            JOIN Seguridad.usuarios u ON s.id_usuario = u.id_usuario
            JOIN Seguridad.roles r ON u.id_rol = r.id_rol
            ORDER BY s.ultima_actividad DESC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cerrar sesión (Logout)
app.post('/api/auth/logout', async (req, res) => {
    const { id_usuario } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        // Cerramos todas las sesiones activas de este usuario
        await sql.query`
            UPDATE Seguridad.Sesiones 
            SET fecha_fin = GETDATE(), 
                estado = 'Cerrada' 
            WHERE id_usuario = ${id_usuario} AND estado = 'Activa'
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar última actividad (Ping)
app.post('/api/auth/ping', async (req, res) => {
    const { id_usuario } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Seguridad.Sesiones 
            SET ultima_actividad = GETDATE() 
            WHERE id_usuario = ${id_usuario} AND estado = 'Activa'
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta de emergencia para servir el frontend (Atrapa cualquier ruta no definida)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`BobConstruye V2 corriendo en http://localhost:${port}`);
});
