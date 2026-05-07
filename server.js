require('dotenv').config();
const express = require('express');
const path = require('path');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

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

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API ENDPOINTS (V2)
// ==========================================

// Endpoint de Estadísticas para el Dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const stats = await sql.query`
            SELECT 
                ISNULL(SUM(monto_contrato), 0) as presupuesto_total,
                ISNULL((SELECT SUM(monto_total) FROM Finanzas.gastos), 0) as gasto_total,
                (SELECT COUNT(*) FROM Operaciones.obras) as total_obras,
                (SELECT COUNT(*) FROM Auditoria.alertas WHERE leida = 0) as total_alertas
            FROM Operaciones.obras
        `;
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

const bcrypt = require('bcrypt'); // Añadir al inicio de los endpoints

// Login real
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT u.*, r.nombre_rol, r.permisos 
            FROM Seguridad.usuarios u
            JOIN Seguridad.roles r ON u.id_rol = r.id_rol
            WHERE u.username = ${username}
        `;
        
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
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
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT 
                o.*, 
                o.monto_contrato as presupuesto_total,
                c.razon_social as cliente_nombre,
                e.nombre as estado_nombre,
                ISNULL((SELECT SUM(monto_total) FROM Finanzas.gastos WHERE id_obra = o.id_obra), 0) as total_gastado
            FROM Operaciones.obras o
            LEFT JOIN Operaciones.clientes c ON o.id_cliente = c.id_cliente
            LEFT JOIN Config.estados_obra e ON o.id_estado_obra = e.id_estado
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear Nueva Obra
app.post('/api/obras', async (req, res) => {
    const { codigo_obra, nombre_proyecto, id_cliente, id_tipo_obra, id_estado_obra, monto_contrato } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Operaciones.obras (codigo_obra, nombre_proyecto, id_cliente, id_tipo_obra, id_estado_obra, monto_contrato)
            VALUES (${codigo_obra}, ${nombre_proyecto}, ${id_cliente}, ${id_tipo_obra}, ${id_estado_obra}, ${monto_contrato})
        `;
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
    const { codigo_obra, nombre_proyecto, id_cliente, id_tipo_obra, id_estado_obra, monto_contrato } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Operaciones.obras 
            SET codigo_obra = ${codigo_obra}, 
                nombre_proyecto = ${nombre_proyecto}, 
                id_cliente = ${id_cliente}, 
                id_tipo_obra = ${id_tipo_obra}, 
                id_estado_obra = ${id_estado_obra}, 
                monto_contrato = ${monto_contrato}
            WHERE id_obra = ${id}
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar Nuevo Gasto
app.post('/api/gastos', async (req, res) => {
    const { id_obra, id_partida, fecha_gasto, numero_factura, id_proveedor, concepto, monto_total, id_forma_pago, estado_gasto } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Finanzas.gastos (id_obra, id_partida, fecha_gasto, numero_factura, id_proveedor, concepto, monto_total, id_forma_pago, estado_gasto)
            VALUES (${id_obra}, ${id_partida ? id_partida : null}, ${fecha_gasto}, ${numero_factura}, ${id_proveedor}, ${concepto}, ${monto_total}, ${id_forma_pago}, ${estado_gasto})
        `;
        res.json({ success: true });
    } catch (err) {
        console.error('Error insertando gasto:', err);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar Gasto
app.put('/api/gastos/:id', async (req, res) => {
    const { id } = req.params;
    const { id_obra, id_partida, fecha_gasto, numero_factura, id_proveedor, concepto, monto_total, id_forma_pago, estado_gasto } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Finanzas.gastos
            SET id_obra = ${id_obra},
                id_partida = ${id_partida ? id_partida : null},
                fecha_gasto = ${fecha_gasto},
                numero_factura = ${numero_factura},
                id_proveedor = ${id_proveedor},
                concepto = ${concepto},
                monto_total = ${monto_total},
                id_forma_pago = ${id_forma_pago},
                estado_gasto = ${estado_gasto}
            WHERE id_gasto = ${id}
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Listado de Gastos
app.get('/api/gastos', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT 
                g.*, 
                o.nombre_proyecto as obra_nombre,
                p.razon_social as proveedor_nombre
            FROM Finanzas.gastos g
            LEFT JOIN Operaciones.obras o ON g.id_obra = o.id_obra
            LEFT JOIN Finanzas.proveedores p ON g.id_proveedor = p.id_proveedor
            ORDER BY g.fecha_gasto DESC
        `;
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
            SELECT id_trabajador, dni, nombre_completo, puesto, especialidad, tarifa_hora, telefono, activo
            FROM Operaciones.trabajadores
            ORDER BY nombre_completo ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar Nuevo Trabajador
app.post('/api/personal', async (req, res) => {
    const { dni, nombre_completo, puesto, especialidad, tarifa_hora, telefono } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Operaciones.trabajadores (dni, nombre_completo, puesto, especialidad, tarifa_hora, telefono, activo, id_tipo_contrato)
            VALUES (${dni}, ${nombre_completo}, ${puesto}, ${especialidad}, ${tarifa_hora}, ${telefono}, 1, 1)
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar Personal
app.put('/api/personal/:id', async (req, res) => {
    const { id } = req.params;
    const { dni, nombre_completo, puesto, especialidad, tarifa_hora, telefono } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Operaciones.trabajadores
            SET dni = ${dni},
                nombre_completo = ${nombre_completo},
                puesto = ${puesto},
                especialidad = ${especialidad},
                tarifa_hora = ${tarifa_hora},
                telefono = ${telefono}
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
            SELECT id_material, codigo_material, nombre_material, categoria_material, stock_minimo, costo_promedio
            FROM Almacen.materiales
            ORDER BY nombre_material ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar Nuevo Material
app.post('/api/inventario/materiales', async (req, res) => {
    const { codigo_material, nombre_material, categoria_material, stock_minimo, costo_promedio } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Almacen.materiales (codigo_material, nombre_material, categoria_material, stock_minimo, costo_promedio, id_unidad_medida, stock_actual)
            VALUES (${codigo_material}, ${nombre_material}, ${categoria_material}, ${stock_minimo}, ${costo_promedio}, 1, 0)
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar Material
app.put('/api/inventario/materiales/:id', async (req, res) => {
    const { id } = req.params;
    const { codigo_material, nombre_material, categoria_material, stock_minimo, costo_promedio } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Almacen.materiales
            SET codigo_material = ${codigo_material},
                nombre_material = ${nombre_material},
                categoria_material = ${categoria_material},
                stock_minimo = ${stock_minimo},
                costo_promedio = ${costo_promedio}
            WHERE id_material = ${id}
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener Maquinaria
app.get('/api/inventario/maquinaria', async (req, res) => {
    try {
        await sql.connect(connectionString || dbConfig);
        const result = await sql.query`
            SELECT id_maquinaria, descripcion, placa_identificacion, tarifa_alquiler, estado_operativo
            FROM Equipos.maquinaria
            ORDER BY descripcion ASC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar Nueva Maquinaria
app.post('/api/inventario/maquinaria', async (req, res) => {
    const { descripcion, placa_identificacion, tarifa_alquiler, estado_operativo } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Equipos.maquinaria (descripcion, placa_identificacion, tarifa_alquiler, estado_operativo)
            VALUES (${descripcion}, ${placa_identificacion}, ${tarifa_alquiler}, ${estado_operativo})
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar Maquinaria
app.put('/api/inventario/maquinaria/:id', async (req, res) => {
    const { id } = req.params;
    const { descripcion, placa_identificacion, tarifa_alquiler, estado_operativo } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Equipos.maquinaria
            SET descripcion = ${descripcion},
                placa_identificacion = ${placa_identificacion},
                tarifa_alquiler = ${tarifa_alquiler},
                estado_operativo = ${estado_operativo}
            WHERE id_maquinaria = ${id}
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MÓDULO DE ALERTAS ---

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
    const { username, password, nombre_completo, correo, id_rol } = req.body;
    
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
        await sql.query`
            INSERT INTO Seguridad.usuarios (username, password, nombre_completo, correo, id_rol, activo, fecha_creacion)
            VALUES (${username}, ${hashedPassword}, ${nombre_completo}, ${correo}, ${id_rol}, 1, GETDATE())
        `;

        res.json({ success: true, message: 'Usuario registrado exitosamente' });
    } catch (err) {
        console.error('Error registrando usuario:', err);
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
        res.status(500).json({ error: err.message });
    }
});

// Crear Nuevo Proveedor
app.post('/api/proveedores', async (req, res) => {
    const { razon_social, ruc, categoria, contacto_nombre, telefono, correo, direccion, condiciones_pago } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            INSERT INTO Finanzas.proveedores (razon_social, ruc, categoria, contacto_nombre, telefono, correo, direccion, condiciones_pago, evaluacion_desempeno, activo)
            VALUES (${razon_social}, ${ruc}, ${categoria}, ${contacto_nombre}, ${telefono}, ${correo}, ${direccion}, ${condiciones_pago}, 5.0, 1)
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar Proveedor
app.put('/api/proveedores/:id', async (req, res) => {
    const { id } = req.params;
    const { razon_social, ruc, categoria, contacto_nombre, telefono, correo, direccion, condiciones_pago } = req.body;
    try {
        await sql.connect(connectionString || dbConfig);
        await sql.query`
            UPDATE Finanzas.proveedores
            SET razon_social = ${razon_social},
                ruc = ${ruc},
                categoria = ${categoria},
                contacto_nombre = ${contacto_nombre},
                telefono = ${telefono},
                correo = ${correo},
                direccion = ${direccion},
                condiciones_pago = ${condiciones_pago}
            WHERE id_proveedor = ${id}
        `;
        res.json({ success: true });
    } catch (err) {
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

/*
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
*/

app.listen(port, () => {
    console.log(`BobConstruye V2 corriendo en http://localhost:${port}`);
});
