// ==========================================
// BOB CONSTRUYE V2 - CORE APPLICATION
// ==========================================

// Herramienta global de formato de moneda
const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

let usuarioActual = null;

function initApp() {
    // Manejo de Login
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                if (response.ok) {
                    usuarioActual = await response.json();
                    aplicarPermisos();
                    document.getElementById('loginPage').classList.add('hidden');
                    document.getElementById('appContainer').classList.remove('hidden');
                    
                    // Iniciar rastreo de actividad (Ping cada 5 minutos)
                    iniciarRastreoActividad();
                    
                    navegarA('dashboard');
                } else {
                    alert('Usuario o contraseña incorrectos');
                }
            } catch (error) {
                alert('Error de conexión con el servidor');
            }
        });
    }

    // Manejo de Registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre_completo = document.getElementById('reg_nombre').value;
            const username = document.getElementById('reg_user').value;
            const correo = document.getElementById('reg_email').value;
            const password = document.getElementById('reg_pass').value;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre_completo, username, correo, password })
                });

                const result = await response.json();
                if (response.ok) {
                    alert('✓ Cuenta creada exitosamente. Ya puede iniciar sesión.');
                    // Cambiar a login
                    registerForm.classList.add('hidden');
                    document.getElementById('loginForm').classList.remove('hidden');
                    document.getElementById('username').value = username;
                } else {
                    alert(result.error || 'Error al registrarse');
                }
            } catch (error) {
                alert('Error de conexión con el servidor');
            }
        });
    }

    // Toggles entre Login y Registro
    const linkGoReg = document.getElementById('linkGoRegister');
    const linkGoLog = document.getElementById('linkGoLogin');
    
    if (linkGoReg) {
        linkGoReg.onclick = (e) => {
            e.preventDefault();
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
            document.querySelector('.login-card p').textContent = 'Cree su cuenta de cliente';
        };
    }
    
    if (linkGoLog) {
        linkGoLog.onclick = (e) => {
            e.preventDefault();
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
            document.querySelector('.login-card p').textContent = 'Ingrese sus credenciales';
        };
    }

    // Manejo de Menú Lateral
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.getAttribute('data-page');
            if (page) {
                e.preventDefault();
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                navegarA(page);
            }
        });
    });

    // Cerrar Modal
    const btnClose = document.getElementById('btnCloseModal');
    if(btnClose) {
        btnClose.onclick = () => {
            document.getElementById('modalContainer').classList.add('hidden');
        };
    }

    // Botón Salir
    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.onclick = async () => { 
            if (usuarioActual) {
                // Avisar al servidor que nos vamos
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_usuario: usuarioActual.id_usuario })
                });
            }
            location.reload(); 
        };
    }
}

// Envía una señal al servidor para decir "sigo aquí"
function iniciarRastreoActividad() {
    if (!usuarioActual) return;
    
    // Primer ping inmediato
    fetch('/api/auth/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: usuarioActual.id_usuario })
    });

    // Repetir cada 5 minutos
    setInterval(() => {
        if (usuarioActual) {
            fetch('/api/auth/ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_usuario: usuarioActual.id_usuario })
            });
        }
    }, 5 * 60 * 1000); 
}

function aplicarPermisos() {
    if (!usuarioActual) return;
    const permisos = usuarioActual.permisos || "";
    const esAdmin = permisos === '*';

    document.querySelectorAll('.menu-item').forEach(item => {
        const page = item.getAttribute('data-page');
        
        // Si el botón no tiene data-page (como el logout), siempre es visible
        if (!page) {
            item.classList.remove('hidden');
            return;
        }

        // Lógica de visibilidad para páginas específicas
        let visible = false;
        const nombreRol = usuarioActual.nombre_rol;

        if (esAdmin) {
            // El admin no necesita catálogo, reservas ni las tareas operativas individuales
            visible = !['catalogo', 'mis_reservas', 'tareas'].includes(page);
        } else {
            // Regla especial: solo roles específicos ven tareas y mensajes
            if (page === 'tareas') {
                visible = ['Supervisor', 'Almacenero', 'Ingeniero', 'Contador'].includes(nombreRol);
            } else if (page === 'mensajes') {
                visible = ['Contador', 'Supervisor'].includes(nombreRol);
            } else {
                visible = permisos.split(',').includes(page);
            }
        }

        if (visible) item.classList.remove('hidden');
        else item.classList.add('hidden');
    });

    // Ocultar categorías vacías
    const categorias = [
        { id: 'cat_principal', pages: ['dashboard', 'alertas'] },
        { id: 'cat_operaciones', pages: ['obras', 'presupuesto', 'personal', 'inventario'] },
        { id: 'cat_finanzas', pages: ['gastos', 'proveedores', 'reportes', 'pedidos'] },
        { id: 'cat_sistema', pages: ['usuarios', 'monitoreo', 'mensajes'] },
        { id: 'cat_cliente', pages: ['catalogo', 'mis_reservas'] }
    ];

    categorias.forEach(cat => {
        const header = document.getElementById(cat.id);
        if (!header) return;

        let algunaVisible = false;
        if (esAdmin) {
            // El admin ve todo excepto las de cliente
            algunaVisible = cat.id !== 'cat_cliente';
        } else {
            // Regla especial para categoría sistema (mensajes)
            if (cat.id === 'cat_sistema' && ['Contador', 'Supervisor'].includes(nombreRol)) {
                algunaVisible = true;
            } else {
                algunaVisible = cat.pages.some(p => permisos.split(',').includes(p));
            }
        }

        if (algunaVisible) header.classList.remove('hidden');
        else header.classList.add('hidden');
    });
}


function abrirModal(titulo, html) {
    document.getElementById('modalTitle').textContent = titulo;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalContainer').classList.remove('hidden');
}

async function navegarA(pagina) {
    const area = document.getElementById('contentArea');
    const title = document.getElementById('pageTitle');
    const subtitle = document.getElementById('pageSubtitle');

    // Verificar permisos antes de navegar
    if (usuarioActual && usuarioActual.permisos !== '*') {
        const permisos = usuarioActual.permisos.split(',');
        if (!permisos.includes(pagina)) {
            console.warn(`Acceso denegado a la página: ${pagina}`);
            pagina = 'dashboard'; // Redirigir al dashboard por defecto
        }
    }

    area.innerHTML = '<div style="padding:50px; text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    switch(pagina) {
        case 'dashboard':
            title.textContent = 'Dashboard General';
            subtitle.textContent = 'Resumen de actividades y métricas principales';
            renderDashboard();
            break;
        case 'obras':
            title.textContent = 'Gestión de Obras';
            subtitle.textContent = 'Administre y monitoree todas las obras';
            renderObras();
            break;
        case 'gastos':
            title.textContent = 'Registro de Gastos';
            subtitle.textContent = 'Control y seguimiento de todos los gastos';
            renderGastos();
            break;
        case 'presupuesto':
            title.textContent = 'Control de Presupuesto';
            subtitle.textContent = 'Seguimiento por partidas presupuestarias';
            renderPresupuesto();
            break;
        case 'personal':
            title.textContent = 'Gestión de Personal';
            subtitle.textContent = 'Administre su equipo de trabajo y cargos';
            renderPersonal();
            break;
        case 'proveedores':
            title.textContent = 'Gestión de Proveedores';
            subtitle.textContent = 'Directorio y control de proveedores activos';
            renderProveedores();
            break;
        case 'inventario':
            title.textContent = 'Control de Inventario';
            subtitle.textContent = 'Gestión de materiales y maquinaria pesada';
            renderInventario();
            break;
        case 'reportes':
            title.textContent = 'Reportes Financieros';
            subtitle.textContent = 'Estado consolidado de presupuestos y gastos';
            renderReportes();
            break;
        case 'alertas':
            title.textContent = 'Centro de Alertas';
            subtitle.textContent = 'Notificaciones y avisos del sistema';
            renderAlertas();
            break;
        case 'usuarios':
            title.textContent = 'Gestión de Accesos';
            subtitle.textContent = 'Configuración de usuarios y roles';
            renderUsuarios();
            break;
        case 'tareas':
            title.textContent = 'Mis Tareas Pendientes';
            subtitle.textContent = 'Actividades críticas asignadas a su rol';
            renderMisTareas();
            break;
        case 'catalogo':
            title.textContent = 'Catálogo de Materiales';
            subtitle.textContent = 'Explore y reserve los materiales disponibles';
            renderCatalogo();
            break;
        case 'mis_reservas':
            title.textContent = 'Mis Reservas';
            subtitle.textContent = 'Historial de sus solicitudes y pedidos';
            renderMisReservas();
            break;
        case 'pedidos':
            title.textContent = 'Gestión de Pedidos';
            subtitle.textContent = 'Administre las solicitudes de los clientes';
            renderPedidosAdmin();
            break;
        case 'monitoreo':
            title.textContent = 'Monitoreo de Actividad';
            subtitle.textContent = 'Rastreo en tiempo real de usuarios y sesiones';
            renderMonitoreo();
            break;
        case 'mensajes':
            title.textContent = 'Buzón de Mensajes';
            subtitle.textContent = 'Comunicación interna y soporte a clientes';
            renderBuzonMensajes();
            break;
        default:
            area.innerHTML = `<h3>Sección ${pagina} en construcción</h3>`;
    }
}

// ---------------------------------------------------------
// VISTAS
// ---------------------------------------------------------

async function renderDashboard() {
    if (usuarioActual.nombre_rol === 'Cliente') {
        return renderDashboardCliente();
    }

    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="stats-grid">
            <div class="card stat-card"><div class="stat-info"><div class="label">Total Gastado</div><div class="value" id="stat_gto">...</div></div><div class="stat-icon"><i class="fas fa-dollar-sign"></i></div></div>
            <div class="card stat-card"><div class="stat-info"><div class="label">Presupuesto Total</div><div class="value" id="stat_pre">...</div></div><div class="stat-icon"><i class="fas fa-wallet"></i></div></div>
            <div class="card stat-card"><div class="stat-info"><div class="label">Obras Activas</div><div class="value" id="stat_obr">...</div></div><div class="stat-icon"><i class="fas fa-building"></i></div></div>
            <div class="card stat-card"><div class="stat-info"><div class="label">Alertas Pendientes</div><div class="value" id="stat_ale">...</div></div><div class="stat-icon"><i class="fas fa-bell"></i></div></div>
        </div>
        <div class="charts-grid">
            <div class="card"><h3>Gastos Mensuales</h3><div class="chart-container"><canvas id="chartGastos"></canvas></div></div>
            <div class="card"><h3>Distribución de Presupuesto</h3><div class="chart-container"><canvas id="chartPresupuesto"></canvas></div></div>
        </div>
    `;

    try {
        const res = await fetch('/api/dashboard/stats');
        const stats = await res.json();
        
        document.getElementById('stat_gto').textContent = fmt.format(stats.gasto_total);
        document.getElementById('stat_pre').textContent = fmt.format(stats.presupuesto_total);
        document.getElementById('stat_obr').textContent = stats.total_obras;
        document.getElementById('stat_ale').textContent = stats.total_alertas;
    } catch (err) {
        console.error('Error cargando stats:', err);
    }
    
    setTimeout(() => { initCharts(); }, 150);
}

async function renderDashboardCliente() {
    const area = document.getElementById('contentArea');
    
    area.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, var(--primary-color) 0%, #2c3e50 100%); color:white; padding:40px; margin-bottom:30px; border-radius:15px; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1 style="font-size:2.2rem; margin-bottom:10px;">¡Hola, ${usuarioActual.nombre_completo}!</h1>
                    <p style="opacity:0.9; font-size:1.1rem;">Bienvenido a tu panel de BobConstruye. Desde aquí puedes gestionar tus pedidos de materiales.</p>
                </div>
                <div style="font-size:4rem; opacity:0.2;"><i class="fas fa-user-circle"></i></div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="card stat-card" style="cursor:pointer;" onclick="document.querySelector('[data-page=catalogo]').click()">
                <div class="stat-info">
                    <div class="label">Explorar Materiales</div>
                    <div class="value">Catálogo</div>
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:5px;">Ver precios y stock actual</p>
                </div>
                <div class="stat-icon" style="background:#e8f5e9; color:#27ae60;"><i class="fas fa-shopping-cart"></i></div>
            </div>
            
            <div class="card stat-card" style="cursor:pointer;" onclick="document.querySelector('[data-page=mis_reservas]').click()">
                <div class="stat-info">
                    <div class="label">Estado de Pedidos</div>
                    <div class="value" id="client_orders_count">...</div>
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:5px;">Reservas realizadas</p>
                </div>
                <div class="stat-icon" style="background:#e3f2fd; color:#2196f3;"><i class="fas fa-box"></i></div>
            </div>

            <div class="card stat-card" style="cursor:pointer;" onclick="mostrarModalSoporte()">
                <div class="stat-info">
                    <div class="label">Soporte</div>
                    <div class="value">Ayuda</div>
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:5px;">Contacto directo con ventas</p>
                </div>
                <div class="stat-icon" style="background:#fff3e0; color:#e67e22;"><i class="fas fa-headset"></i></div>
            </div>
        </div>

        <div class="card" style="margin-top:30px;">
            <h3>Últimas Novedades</h3>
            <p style="color:var(--text-secondary); margin-bottom:20px;">Mantente al día con los nuevos ingresos al almacén.</p>
            <div id="novedadesContent" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px;">
                <!-- Se llenará con materiales destacados -->
            </div>
        </div>
    `;

    // Cargar conteo de reservas del cliente
    try {
        const res = await fetch('/api/reservas');
        const reservas = await res.json();
        // Filtrar por el nombre del cliente (como aproximación)
        const misReservas = reservas.filter(r => r.cliente === usuarioActual.nombre_completo);
        document.getElementById('client_orders_count').textContent = misReservas.length;
    } catch (err) {
        document.getElementById('client_orders_count').textContent = '0';
    }

    // Cargar algunos materiales como "novedades"
    try {
        const res = await fetch('/api/inventario/materiales');
        const materiales = await res.json();
        const novedades = materiales.slice(0, 4);
        document.getElementById('novedadesContent').innerHTML = novedades.map(m => `
            <div style="background:#f8f9fa; border-radius:8px; padding:10px; text-align:center;">
                <img src="${m.imagen_url || 'https://via.placeholder.com/150'}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-bottom:10px;">
                <div style="font-weight:bold; font-size:0.9rem;">${m.nombre_material}</div>
                <div style="color:var(--accent-color); font-weight:700;">${fmt.format(m.precio_venta)}</div>
            </div>
        `).join('');
    } catch (err) {}
}

function mostrarModalSoporte() {
    const html = `
        <div style="text-align:center; padding:10px;">
            <div style="width:70px; height:70px; background:#fef5e7; color:#e67e22; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2rem; margin: 0 auto 20px;">
                <i class="fas fa-headset"></i>
            </div>
            <h3 style="margin-bottom:10px;">¿Necesitas ayuda con tu pedido?</h3>
            <p style="color:var(--text-secondary); margin-bottom:25px;">Nuestro equipo de ventas está disponible para ayudarte con cualquier duda técnica o comercial.</p>
            
            <div style="display:grid; gap:15px; text-align:left;">
                <a href="https://wa.me/51999999999?text=Hola,%20necesito%20ayuda%20con%20mi%20pedido%20en%20BobConstruye" target="_blank" style="display:flex; align-items:center; gap:15px; padding:15px; background:#e8f5e9; color:#27ae60; text-decoration:none; border-radius:10px; font-weight:600; border:1px solid #c8e6c9;">
                    <i class="fab fa-whatsapp fa-2x"></i>
                    <div>
                        <div style="font-size:0.8rem; opacity:0.8;">Contactar por WhatsApp</div>
                        <div>+51 999 999 999</div>
                    </div>
                </a>

                <a href="mailto:ventas@bobconstruye.com" style="display:flex; align-items:center; gap:15px; padding:15px; background:#e3f2fd; color:#2196f3; text-decoration:none; border-radius:10px; font-weight:600; border:1px solid #bbdefb;">
                    <i class="fas fa-envelope fa-2x"></i>
                    <div>
                        <div style="font-size:0.8rem; opacity:0.8;">Enviar un Correo</div>
                        <div>ventas@bobconstruye.com</div>
                    </div>
                </a>

                <button onclick="abrirChatSoporte()" style="width:100%; display:flex; align-items:center; gap:15px; padding:15px; background:#f3e5f5; color:#7b1fa2; border:1px solid #e1bee7; border-radius:10px; cursor:pointer; font-weight:600; font-family:inherit; text-align:left;">
                    <i class="fas fa-ticket-alt fa-2x"></i>
                    <div>
                        <div style="font-size:0.8rem; opacity:0.8;">Sistema de Tickets</div>
                        <div>Escribir mensaje interno</div>
                    </div>
                </button>
            </div>

            <p style="font-size:0.75rem; color:#aaa; margin-top:25px;">Horario de atención: Lun a Vie de 8:00 AM a 6:00 PM</p>
        </div>
    `;
    abrirModal('Centro de Atención al Cliente', html);
}



function renderObras() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <input type="text" placeholder="Buscar..." class="form-control" style="width:300px; padding:8px;">
                <button class="btn btn-primary" id="btnNuevaObra"><i class="fas fa-plus"></i> Nueva Obra</button>
            </div>
            <table>
                <thead><tr><th>Código</th><th>Proyecto</th><th>Ubicación</th><th>Presupuesto</th><th>Gastado</th><th>Acciones</th></tr></thead>
                <tbody id="listaObras"></tbody>
            </table>
        </div>
    `;
    document.getElementById('btnNuevaObra').onclick = () => mostrarFormObra(null);
    window._obrasCache = [];
    
    fetch('/api/obras').then(r => r.json()).then(obras => {
        window._obrasCache = obras;
        const tbody = document.getElementById('listaObras');
        tbody.innerHTML = obras.map((o, index) => `
            <tr>
                <td>${o.codigo_obra}</td>
                <td><strong>${o.nombre_proyecto}</strong></td>
                <td>${o.direccion || '-'}</td>
                <td>${fmt.format(parseFloat(o.monto_contrato || o.presupuesto_total || 0))}</td>
                <td>${fmt.format(parseFloat(o.total_gastado) || 0)}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick='mostrarFormObraByIndex(${index})'><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    });
}

window.mostrarFormObraByIndex = (index) => {
    mostrarFormObra(window._obrasCache[index]);
};

function renderGastos() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <h3>Listado de Gastos</h3>
                <button class="btn btn-primary" id="btnNuevoGasto"><i class="fas fa-plus"></i> Registrar Gasto</button>
            </div>
            <table>
                <thead><tr><th>Fecha</th><th>Obra</th><th>Concepto</th><th>Proveedor</th><th>Monto</th><th>Acciones</th></tr></thead>
                <tbody id="listaGastos"><tr><td colspan="6" style="text-align:center">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;
    document.getElementById('btnNuevoGasto').onclick = () => mostrarFormGasto(null);
    window._gastosCache = [];

    fetch('/api/gastos').then(r => r.json()).then(gastos => {
        window._gastosCache = gastos;
        const tbody = document.getElementById('listaGastos');
        if(!tbody) return;
        if (gastos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay gastos registrados</td></tr>';
            return;
        }
        tbody.innerHTML = gastos.map((g, index) => {
            const fecha = g.fecha_gasto ? new Date(g.fecha_gasto).toLocaleDateString() : '-';
            return `
                <tr>
                    <td>${fecha}</td>
                    <td><strong>${g.obra_nombre || 'S/O'}</strong></td>
                    <td>${g.concepto}</td>
                    <td>${g.proveedor_nombre || 'N/A'}</td>
                    <td><strong>${fmt.format(g.monto_total || 0)}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick='mostrarFormGastoByIndex(${index})'><i class="fas fa-edit"></i></button>
                    </td>
                </tr>`;
        }).join('');
    });
}

window.mostrarFormGastoByIndex = (index) => {
    mostrarFormGasto(window._gastosCache[index]);
};

function renderPresupuesto() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-bottom:20px;">
            <select id="selectObraPres" style="padding:10px; width:300px; border:1px solid #ccc; border-radius:4px;">
                <option value="">Seleccione una obra...</option>
            </select>
            <button id="btnNuevaPartida" class="btn btn-primary hidden"><i class="fas fa-plus"></i> Nueva Partida</button>
        </div>
        <div id="presupuestoContent" class="hidden">
            <div class="stats-grid">
                <div class="card stat-card"><div class="stat-info"><div class="label">Presupuesto Total</div><div class="value" id="cardPresTotal"></div></div></div>
                <div class="card stat-card"><div class="stat-info"><div class="label">Gastado Real</div><div class="value" id="cardPresGastado"></div></div></div>
            </div>
            <div class="card" style="margin-top:20px;"><div class="chart-container"><canvas id="chartPresReal"></canvas></div></div>
        </div>
    `;
    
    fetch('/api/obras').then(r => r.json()).then(obras => {
        const sel = document.getElementById('selectObraPres');
        if (!sel) return; // Protección contra errores si el usuario cambió de página
        obras.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id_obra; opt.textContent = o.nombre_proyecto;
            sel.appendChild(opt);
        });
        sel.onchange = (e) => {
            const btn = document.getElementById('btnNuevaPartida');
            if(e.target.value) {
                btn.classList.remove('hidden');
                btn.onclick = () => mostrarFormPartida(e.target.value);
                cargarPresupuesto(e.target.value);
            } else {
                btn.classList.add('hidden');
                document.getElementById('presupuestoContent').classList.add('hidden');
            }
        };
    });
}

async function cargarPresupuesto(id) {
    document.getElementById('presupuestoContent').classList.remove('hidden');
    const res = await fetch(`/api/obras/${id}/presupuesto`);
    const partidas = await res.json();
    
    if (partidas.length === 0) {
        document.getElementById('cardPresTotal').textContent = '$0';
        document.getElementById('cardPresGastado').textContent = '$0';
        const ctx = document.getElementById('chartPresReal');
        if(window.chartP) window.chartP.destroy();
        ctx.parentElement.innerHTML = '<div style="text-align:center; padding:50px; color:#666;"><i class="fas fa-folder-open fa-3x" style="margin-bottom:15px;"></i><p>Esta obra aún no tiene un presupuesto registrado en el sistema.</p></div><canvas id="chartPresReal" style="display:none;"></canvas>';
        return;
    }
    
    // Si hay datos, restaurar el canvas si fue ocultado
    const container = document.getElementById('chartPresReal').parentElement;
    if (container.querySelector('div')) {
        container.innerHTML = '<canvas id="chartPresReal"></canvas>';
    }

    let totalP = 0; let totalG = 0;
    partidas.forEach(p => {
        totalP += (p.cantidad_estimada * p.precio_unitario);
        totalG += (p.gastado_real || 0);
    });
    document.getElementById('cardPresTotal').textContent = '$' + totalP.toLocaleString();
    document.getElementById('cardPresGastado').textContent = '$' + totalG.toLocaleString();

    setTimeout(() => {
        const ctx = document.getElementById('chartPresReal');
        if(window.chartP) window.chartP.destroy();
        window.chartP = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: partidas.map(p => p.descripcion),
                datasets: [
                    { label: 'Presupuesto', data: partidas.map(p => p.cantidad_estimada * p.precio_unitario), backgroundColor: '#1a2b4b' },
                    { label: 'Gastado', data: partidas.map(p => p.gastado_real), backgroundColor: '#e67e22' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }, 100);
}

// ---------------------------------------------------------
// FORMULARIOS (POST)
// ---------------------------------------------------------

function mostrarFormPartida(idObra) {
    const html = `
        <form id="formPartida">
            <div class="form-group-modal"><label>Código de Partida</label><input type="text" id="fpar_cod" required placeholder="Ej. 01.01"></div>
            <div class="form-group-modal"><label>Descripción</label><input type="text" id="fpar_des" required placeholder="Ej. Obras Preliminares"></div>
            <div class="form-group-modal"><label>Unidad de Medida</label><select id="fpar_uni" required><option value="">Cargando...</option></select></div>
            <div class="form-group-modal"><label>Cantidad Estimada</label><input type="number" id="fpar_can" required step="0.01"></div>
            <div class="form-group-modal"><label>Precio Unitario</label><input type="number" id="fpar_pre" required step="0.01"></div>
            <button class="btn btn-primary btn-block">Guardar Partida</button>
        </form>
    `;
    abrirModal('Registrar Nueva Partida', html);

    fetch('/api/unidades').then(r => r.json()).then(unidades => {
        const sel = document.getElementById('fpar_uni');
        sel.innerHTML = '<option value="">Seleccione unidad...</option>';
        unidades.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id_unidad; opt.textContent = u.nombre;
            sel.appendChild(opt);
        });
    });

    document.getElementById('formPartida').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id_obra: idObra,
            codigo_partida: document.getElementById('fpar_cod').value,
            descripcion: document.getElementById('fpar_des').value,
            id_unidad_medida: document.getElementById('fpar_uni').value,
            cantidad_estimada: document.getElementById('fpar_can').value,
            precio_unitario: document.getElementById('fpar_pre').value
        };
        const res = await fetch('/api/partidas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)});
        if (res.ok) {
            document.getElementById('modalContainer').classList.add('hidden');
            showToast('Partida agregada exitosamente');
            cargarPresupuesto(idObra);
        } else {
            showToast('Error al registrar partida', 'error');
        }
    };
}

window.prepararEdicionProveedor = (index) => {
    const prov = window._proveedoresCache[index];
    mostrarFormProveedor(prov);
};

function mostrarFormProveedor(prov = null) {
    const isEdit = prov !== null;
    const html = `
        <form id="formProveedor">
            <div class="form-group-modal"><label>RUC / ID</label><input type="text" id="fpr_ruc" required value="${isEdit ? prov.ruc : ''}"></div>
            <div class="form-group-modal"><label>Razón Social</label><input type="text" id="fpr_nom" required value="${isEdit ? prov.razon_social : ''}"></div>
            <div class="form-group-modal"><label>Dirección</label><input type="text" id="fpr_dir" value="${isEdit ? prov.direccion : ''}"></div>
            <div class="form-group-modal"><label>Contacto</label><input type="text" id="fpr_con" value="${isEdit ? prov.contacto : ''}"></div>
            <div class="form-group-modal"><label>Teléfono</label><input type="text" id="fpr_tel" value="${isEdit ? prov.telefono : ''}"></div>
            <div class="form-group-modal"><label>Categoría</label>
                <select id="fpr_cat">
                    <option ${isEdit && prov.categoria_proveedor === 'Materiales' ? 'selected' : ''}>Materiales</option>
                    <option ${isEdit && prov.categoria_proveedor === 'Servicios' ? 'selected' : ''}>Servicios</option>
                    <option ${isEdit && prov.categoria_proveedor === 'Maquinaria' ? 'selected' : ''}>Maquinaria</option>
                    <option ${isEdit && prov.categoria_proveedor === 'Otros' ? 'selected' : ''}>Otros</option>
                </select>
            </div>
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Registrar'} Proveedor</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor', html);

    document.getElementById('formProveedor').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            ruc: document.getElementById('fpr_ruc').value,
            razon_social: document.getElementById('fpr_nom').value,
            direccion: document.getElementById('fpr_dir').value,
            contacto: document.getElementById('fpr_con').value,
            telefono: document.getElementById('fpr_tel').value,
            categoria_proveedor: document.getElementById('fpr_cat').value
        };

        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `/api/proveedores/${prov.id_proveedor}` : '/api/proveedores';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if(res.ok) {
                document.getElementById('modalContainer').classList.add('hidden');
                showToast(isEdit ? 'Proveedor actualizado' : 'Proveedor registrado');
                renderProveedores();
            } else {
                showToast('Error al guardar proveedor', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
        }
    };
}

function mostrarFormObra(obra = null) {
    const isEdit = obra !== null;
    const html = `
        <form id="formObra">
            <div class="form-group-modal"><label>Proyecto</label><input type="text" id="fn_nom" required value="${isEdit ? obra.nombre_proyecto : ''}"></div>
            <div class="form-group-modal"><label>Código de Obra</label><input type="text" id="fn_cod" required placeholder="Ej: OB-001" value="${isEdit ? (obra.codigo_obra || '') : ''}"></div>
            <div class="form-group-modal"><label>Ubicación / Dirección</label><input type="text" id="fn_ubc" placeholder="Dirección de la obra" value="${isEdit ? (obra.direccion || '') : ''}"></div>
            <div class="form-group-modal"><label>Presupuesto / Monto Contrato</label><input type="number" id="fn_mon" required step="0.01" placeholder="0.00" value="${isEdit ? (obra.monto_contrato || obra.presupuesto_total || 0) : ''}"></div>
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Guardar'} Obra</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Obra' : 'Nueva Obra', html);
    document.getElementById('formObra').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            nombre_proyecto: document.getElementById('fn_nom').value,
            codigo_obra: document.getElementById('fn_cod').value,
            direccion: document.getElementById('fn_ubc').value,
            monto_contrato: document.getElementById('fn_mon').value,
            id_cliente: obra?.id_cliente || 1, 
            id_tipo_obra: obra?.id_tipo_obra || 1, 
            id_estado_obra: obra?.id_estado_obra || 1
        };
        
        const url = isEdit ? `/api/obras/${obra.id_obra}` : '/api/obras';
        const method = isEdit ? 'PUT' : 'POST';

        await fetch(url, { 
            method: method, 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify(data)
        });

        document.getElementById('modalContainer').classList.add('hidden');
        showToast(isEdit ? 'Obra actualizada exitosamente' : 'Obra registrada exitosamente');
        renderObras();
    };
}

function mostrarFormGasto(gasto = null) {
    const isEdit = gasto !== null;
    const html = `
        <form id="formGasto">
            <div class="form-group-modal"><label>Obra</label><select id="fg_obr" required><option value="">Seleccione obra...</option></select></div>
            <div class="form-group-modal"><label>Partida Presupuestaria</label><select id="fg_par"><option value="">Ninguna (Gasto General)</option></select></div>
            <div class="form-group-modal"><label>Proveedor</label><select id="fg_pro" required><option value="">Seleccione proveedor...</option></select></div>
            <div class="form-group-modal"><label>Concepto</label><input type="text" id="fg_con" required value="${isEdit ? gasto.concepto : ''}"></div>
            <div class="form-group-modal"><label>Monto</label><input type="number" id="fg_mon" required step="0.01" value="${isEdit ? gasto.monto_total : ''}"></div>
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Guardar'} Gasto</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Gasto' : 'Registrar Gasto', html);
    
    // Cargar Obras
    fetch('/api/obras').then(r => r.json()).then(obras => {
        const sel = document.getElementById('fg_obr');
        obras.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id_obra; opt.textContent = o.nombre_proyecto;
            if (isEdit && o.id_obra === gasto.id_obra) opt.selected = true;
            sel.appendChild(opt);
        });
        if (isEdit) cargarPartidas(gasto.id_obra, gasto.id_partida);
    });
    
    // Función auxiliar para cargar partidas
    const cargarPartidas = (idObra, idPartidaSeleccionada = null) => {
        const selPar = document.getElementById('fg_par');
        selPar.innerHTML = '<option value="">Ninguna (Gasto General)</option>';
        if(idObra) {
            fetch(`/api/obras/${idObra}/presupuesto`).then(r => r.json()).then(partidas => {
                partidas.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id_partida; opt.textContent = `${p.codigo_partida} - ${p.descripcion}`;
                    if (idPartidaSeleccionada && p.id_partida === idPartidaSeleccionada) opt.selected = true;
                    selPar.appendChild(opt);
                });
            });
        }
    };

    // Cargar Partidas al seleccionar Obra
    document.getElementById('fg_obr').onchange = (e) => {
        cargarPartidas(e.target.value);
    };

    // Cargar Proveedores
    fetch('/api/proveedores').then(r => r.json()).then(proveedores => {
        const sel = document.getElementById('fg_pro');
        proveedores.filter(p => p.activo).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id_proveedor; opt.textContent = p.razon_social;
            if (isEdit && p.id_proveedor === gasto.id_proveedor) opt.selected = true;
            sel.appendChild(opt);
        });
    });

    document.getElementById('formGasto').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id_obra: document.getElementById('fg_obr').value,
            id_partida: document.getElementById('fg_par').value || null,
            id_proveedor: document.getElementById('fg_pro').value,
            concepto: document.getElementById('fg_con').value,
            monto_total: document.getElementById('fg_mon').value,
            fecha_gasto: isEdit ? (gasto.fecha_gasto ? gasto.fecha_gasto.split('T')[0] : new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
            numero_factura: isEdit ? gasto.numero_factura : ('TMP-' + Date.now()), 
            id_forma_pago: isEdit ? gasto.id_forma_pago : 1, 
            estado_gasto: isEdit ? gasto.estado_gasto : 'REGISTRADO'
        };

        const url = isEdit ? `/api/gastos/${gasto.id_gasto}` : '/api/gastos';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, { method: method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)});
        if(res.ok) {
            document.getElementById('modalContainer').classList.add('hidden');
            showToast(isEdit ? 'Gasto actualizado exitosamente' : 'Gasto registrado exitosamente');
            renderGastos();
            renderDashboard(); 
        } else {
            showToast('Error al procesar gasto', 'error');
        }
    };
}
function renderReportes() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <h3>Estado Financiero por Obra</h3>
                <button class="btn btn-primary" id="btnExportPDF"><i class="fas fa-file-pdf"></i> Descargar PDF</button>
            </div>
            <div id="reporteTablaWrapper">
                <table id="tablaReporte">
                    <thead>
                        <tr><th>Código</th><th>Proyecto</th><th>Presupuesto</th><th>Gasto Total</th><th>Saldo</th></tr>
                    </thead>
                    <tbody id="bodyReporte"><tr><td colspan="5" style="text-align:center">Cargando datos financieros...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('btnExportPDF').onclick = exportarPDF;

    fetch('/api/reportes/financiero').then(r => r.json()).then(data => {
        const tbody = document.getElementById('bodyReporte');
        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay datos suficientes para generar el reporte</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(r => `
            <tr>
                <td>${r.codigo_obra}</td>
                <td><strong>${r.nombre_proyecto}</strong></td>
                <td>${fmt.format(r.presupuesto)}</td>
                <td style="color:red;">${fmt.format(r.gasto_total)}</td>
                <td style="color:${r.saldo < 0 ? 'red' : 'green'}; font-weight:bold;">${fmt.format(r.saldo)} ${r.saldo < 0 ? '⚠️' : '✅'}</td>
            </tr>
        `).join('');
    });
}

function exportarPDF() {
    const element = document.getElementById('reporteTablaWrapper');
    const opt = {
        margin: 10,
        filename: `reporte_financiero_${new Date().toLocaleDateString()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
    showToast('Generando documento PDF...');
}

function renderAlertas() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <h3>Historial de Alertas</h3>
            <div id="listaAlertas" style="margin-top:20px;">Cargando...</div>
        </div>
    `;
    fetch('/api/alertas').then(r => r.json()).then(alertas => {
        const div = document.getElementById('listaAlertas');
        if(alertas.length === 0) {
            div.innerHTML = '<p style="text-align:center; padding:20px;">No hay alertas en el historial</p>';
            return;
        }
        div.innerHTML = alertas.map(a => `
            <div class="alert-item" style="padding:15px; border-left:4px solid ${a.id_nivel === 3 ? '#e74c3c' : '#f1c40f'}; margin-bottom:10px; background:#f9f9f9;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${a.titulo}</strong>
                    <small>${new Date(a.fecha_creacion).toLocaleString()}</small>
                </div>
                <p style="margin:5px 0;">${a.mensaje}</p>
                <small style="color:#666;">Obra: ${a.obra_nombre || 'General'}</small>
            </div>
        `).join('');
    });
}

function renderUsuarios() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center;">
                <h3 style="margin:0;">Gestión de Accesos al Sistema</h3>
                <button class="btn btn-primary" id="btnNuevoUsuario"><i class="fas fa-plus"></i> Nuevo Usuario</button>
            </div>
            <table>
                <thead><tr><th>Usuario</th><th>Nombre Completo</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody id="listaUsuarios"><tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr></tbody>
            </table>
        </div>
    `;
    
    document.getElementById('btnNuevoUsuario').onclick = () => mostrarFormUsuario(null);
    window._usuariosCache = [];
    
    // Cargar lista de usuarios
    fetch('/api/usuarios').then(r => r.json()).then(data => {
        window._usuariosCache = data;
        const tbody = document.getElementById('listaUsuarios');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666;">No hay usuarios registrados</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map((u, index) => `
            <tr>
                <td><strong><i class="fas fa-user"></i> ${u.username}</strong></td>
                <td>${u.nombre_completo}</td>
                <td><i class="fas fa-envelope"></i> ${u.correo}</td>
                <td><span class="badge" style="background:#1a2b4b; color:white; padding:4px 8px; border-radius:3px;">${u.nombre_rol}</span></td>
                <td>
                    ${u.activo 
                        ? '<span style="color:green; font-weight:bold;">● Activo</span>' 
                        : '<span style="color:red; font-weight:bold;">● Inactivo</span>'}
                </td>
                <td style="display:flex; gap:5px;">
                    <button class="btn btn-sm btn-outline" onclick='mostrarFormUsuarioByIndex(${index})' title="Editar Usuario">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm" onclick="activarDesactivarUsuario(${u.id_usuario}, ${!u.activo})" 
                        style="background:${u.activo ? '#e74c3c' : '#27ae60'}; color:white; padding:6px 12px; border:none; cursor:pointer; border-radius:3px;"
                        title="${u.activo ? 'Desactivar' : 'Activar'}">
                        ${u.activo ? '<i class="fas fa-ban"></i>' : '<i class="fas fa-check"></i>'}
                    </button>
                </td>
            </tr>
        `).join('');
    }).catch(err => {
        console.error('Error cargando usuarios:', err);
        document.getElementById('listaUsuarios').innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar usuarios</td></tr>';
    });
}

window.mostrarFormUsuarioByIndex = (index) => {
    mostrarFormUsuario(window._usuariosCache[index]);
};

async function activarDesactivarUsuario(idUsuario, nuevoEstado) {
    try {
        const response = await fetch(`/api/usuarios/${idUsuario}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: nuevoEstado })
        });
        
        if (response.ok) {
            showToast(nuevoEstado ? 'Usuario activado' : 'Usuario desactivado');
            renderUsuarios(); // Recargar lista
        } else {
            showToast('Error al actualizar estado del usuario', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showToast('Error de conexión', 'error');
    }
}

function mostrarFormUsuario(u = null) {
    const isEdit = u !== null;
    const html = `
        <form id="formUsuario">
            <div class="form-group-modal">
                <label><i class="fas fa-user"></i> Nombre de Usuario (login)</label>
                <input type="text" id="fu_user" required placeholder="ej: juan_ing" 
                    pattern="[a-zA-Z0-9_]+" title="Solo letras, números y guiones bajos"
                    value="${isEdit ? u.username : ''}">
            </div>
            <div class="form-group-modal">
                <label><i class="fas fa-lock"></i> Contraseña ${isEdit ? '(dejar en blanco para no cambiar)' : ''}</label>
                <input type="password" id="fu_pass" ${isEdit ? '' : 'required'} placeholder="${isEdit ? '********' : 'Mínimo 8 caracteres'}" minlength="8">
            </div>
            <div class="form-group-modal">
                <label><i class="fas fa-id-card"></i> Nombre Completo</label>
                <input type="text" id="fu_nombre" required placeholder="ej: Juan García Pérez" value="${isEdit ? u.nombre_completo : ''}">
            </div>
            <div class="form-group-modal">
                <label><i class="fas fa-envelope"></i> Correo Electrónico</label>
                <input type="email" id="fu_email" required placeholder="ej: juan@ejemplo.com" value="${isEdit ? u.correo : ''}">
            </div>
            <div class="form-group-modal">
                <label><i class="fas fa-briefcase"></i> Rol (Nivel de Acceso)</label>
                <select id="fu_rol" required>
                    <option value="">Cargando roles...</option>
                </select>
            </div>
            
            ${!isEdit ? `
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #eee;">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-weight:bold;">
                    <input type="checkbox" id="fu_is_worker"> ¿Es trabajador? (Crear perfil en Personal)
                </label>
                <div id="worker_fields" class="hidden" style="margin-top:10px;">
                    <div class="form-group-modal"><label>DNI</label><input type="text" id="fu_dni" placeholder="DNI del trabajador"></div>
                    <div class="form-group-modal"><label>Puesto</label><input type="text" id="fu_puesto" placeholder="Ej: Maestro de Obra"></div>
                    <div class="form-group-modal"><label>Tarifa Hora</label><input type="number" id="fu_tarifa" value="0"></div>
                </div>
            </div>
            ` : ''}

            <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> ${isEdit ? 'Actualizar' : 'Crear'} Usuario</button>
        </form>
    `;
    
    abrirModal(isEdit ? 'Editar Usuario' : 'Registrar Nuevo Usuario', html);
    
    // Cargar roles disponibles
    fetch('/api/roles').then(r => r.json()).then(roles => {
        const sel = document.getElementById('fu_rol');
        sel.innerHTML = '<option value="">Seleccione rol...</option>';
        roles.forEach(rol => {
            const opt = document.createElement('option');
            opt.value = rol.id_rol;
            opt.textContent = rol.nombre_rol;
            if (isEdit && rol.id_rol === u.id_rol) opt.selected = true;
            sel.appendChild(opt);
        });
    }).catch(err => {
        console.error('Error cargando roles:', err);
        document.getElementById('fu_rol').innerHTML = '<option value="">Error al cargar roles</option>';
    });

    
    // Manejar toggle de campos de trabajador (solo si no es edición)
    if (!isEdit) {
        document.getElementById('fu_is_worker').onchange = (e) => {
            document.getElementById('worker_fields').classList.toggle('hidden', !e.target.checked);
        };
    }

    // Manejar submit del formulario
    document.getElementById('formUsuario').onsubmit = async (e) => {
        e.preventDefault();
        
        const usuario = document.getElementById('fu_user').value.trim();
        const password = document.getElementById('fu_pass').value;
        const nombre = document.getElementById('fu_nombre').value.trim();
        const email = document.getElementById('fu_email').value.trim();
        const idRol = document.getElementById('fu_rol').value;
        
        const esTrabajador = !isEdit && document.getElementById('fu_is_worker').checked;
        const dni = !isEdit ? document.getElementById('fu_dni').value.trim() : null;
        const puesto = !isEdit ? document.getElementById('fu_puesto').value.trim() : null;
        const tarifa = !isEdit ? document.getElementById('fu_tarifa').value : 0;

        // Validaciones
        if (!usuario || !nombre || !email || !idRol) {
            showToast('Completa todos los campos requeridos', 'error');
            return;
        }
        
        if (!isEdit && !password) {
            showToast('La contraseña es requerida para nuevos usuarios', 'error');
            return;
        }

        try {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/api/usuarios/${u.id_usuario}` : '/api/usuarios';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usuario,
                    password: password, // Si es edición y está vacío, el backend lo ignora
                    nombre_completo: nombre,
                    correo: email,
                    id_rol: parseInt(idRol),
                    crear_trabajador: esTrabajador,
                    dni: dni,
                    puesto: puesto,
                    tarifa_hora: parseFloat(tarifa) || 0
                })
            });
            
            if (response.ok) {
                document.getElementById('modalContainer').classList.add('hidden');
                showToast(isEdit ? '✓ Usuario actualizado exitosamente' : '✓ Usuario creado exitosamente');
                renderUsuarios(); // Recargar lista
            } else {
                const error = await response.json();
                showToast(error.error || 'Error al procesar usuario', 'error');
            }
        } catch (err) {
            console.error('Error:', err);
            showToast('Error de conexión con el servidor', 'error');
        }
    };


}

function showToast(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 100);
    setTimeout(() => { 
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
function renderInventario(tipo = 'materiales') {
    window._materialesCache = [];
    window._maquinariaCache = [];
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div class="tabs-container" style="border-bottom:1px solid #ddd;">
                    <button class="tab-btn" id="tabMat" style="padding:10px 20px; cursor:pointer;">Materiales</button>
                    <button class="tab-btn" id="tabMaq" style="padding:10px 20px; cursor:pointer;">Maquinaria</button>
                </div>
                <button class="btn btn-primary" id="btnNuevoInv"><i class="fas fa-plus"></i> Nuevo Material</button>
            </div>
            <div id="invContent">
                <table id="tablaInv">
                    <thead id="headInv"></thead>
                    <tbody id="bodyInv"><tr><td style="text-align:center">Cargando...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;

    const tabMat = document.getElementById('tabMat');
    const tabMaq = document.getElementById('tabMaq');
    const btnNuevo = document.getElementById('btnNuevoInv');

    const cargarMateriales = () => {
        const tbody = document.getElementById('bodyInv');
        if (!tbody) return;

        tabMat.classList.add('active'); tabMaq.classList.remove('active');
        document.getElementById('headInv').innerHTML = '<tr><th>Código</th><th>Material</th><th>Categoría</th><th>Stock Mín.</th><th>Costo Prom.</th><th>Acciones</th></tr>';
        
        fetch('/api/inventario/materiales')
            .then(r => r.json())
            .then(data => {
                window._materialesCache = data;
                if(!tbody) return; 
                if(data.length === 0) { 
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay materiales registrados</td></tr>'; 
                    return; 
                }
                
                tbody.innerHTML = data.map((m, index) => `
                    <tr>
                        <td>${m.codigo_material}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <img src="${m.imagen_url || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">
                                <strong>${m.nombre_material}</strong>
                            </div>
                        </td>
                        <td>${m.categoria_material}</td>
                        <td>${m.stock_minimo}</td>
                        <td>${fmt.format(m.costo_promedio)}</td>
                        <td>
                            <button class="btn-icon" onclick="mostrarFormMaterialByIndex(${index})">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            });
    };

    const cargarMaquinaria = () => {
        tabMaq.classList.add('active'); tabMat.classList.remove('active');
        document.getElementById('headInv').innerHTML = '<tr><th>Descripción</th><th>Placa</th><th>Tarifa Alquiler</th><th>Estado</th><th>Acciones</th></tr>';
        fetch('/api/inventario/maquinaria').then(r => r.json()).then(data => {
            window._maquinariaCache = data;
            const tbody = document.getElementById('bodyInv');
            if(!tbody) return;
            if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay maquinaria registrada</td></tr>'; return; }
            tbody.innerHTML = data.map((m, index) => `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${m.imagen_url ? `<img src="${m.imagen_url}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">` : `<div style="width:40px; height:40px; background:#eee; display:flex; align-items:center; justify-content:center; border-radius:4px;"><i class="fas fa-tractor" style="color:#ccc;"></i></div>`}
                        <strong>${m.descripcion}</strong>
                    </div>
                </td>
                <td><span class="badge" style="background:#eee; color:#333;">${m.placa_identificacion}</span></td>
                <td>${fmt.format(m.tarifa_alquiler)}</td>
                <td>
                    <span class="badge ${m.estado_operativo === 'Operativo' ? 'badge-success' : 'badge-danger'}">
                        ${m.estado_operativo}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick='mostrarFormMaquinariaByIndex(${index})'>
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        });
    };
    
    tabMat.onclick = () => {
        cargarMateriales();
        btnNuevo.innerHTML = '<i class="fas fa-plus"></i> Nuevo Material';
        btnNuevo.onclick = () => mostrarFormMaterial(null);
    };
    tabMaq.onclick = () => {
        cargarMaquinaria();
        btnNuevo.innerHTML = '<i class="fas fa-plus"></i> Nueva Maquinaria';
        btnNuevo.onclick = () => mostrarFormMaquinaria(null);
    };

    if (tipo === 'maquinaria') {
        tabMaq.click();
    } else {
        tabMat.click();
    }
}

window.mostrarFormMaterialByIndex = (index) => {
    mostrarFormMaterial(window._materialesCache[index]);
};

window.mostrarFormMaquinariaByIndex = (index) => {
    mostrarFormMaquinaria(window._maquinariaCache[index]);
};


function mostrarFormMaterial(material = null) {
    const isEdit = !!material;
    const html = `
        <form id="formMaterial">
            <div class="form-row">
                <div class="form-group-modal"><label>Código</label><input type="text" name="codigo_material" required value="${isEdit ? material.codigo_material : ''}"></div>
                <div class="form-group-modal"><label>Categoría</label>
                    <select name="categoria_material">
                        <option ${isEdit && material.categoria_material === 'Agregados' ? 'selected' : ''}>Agregados</option>
                        <option ${isEdit && material.categoria_material === 'Aceros' ? 'selected' : ''}>Aceros</option>
                        <option ${isEdit && material.categoria_material === 'Cementos' ? 'selected' : ''}>Cementos</option>
                        <option ${isEdit && material.categoria_material === 'Acabados' ? 'selected' : ''}>Acabados</option>
                        <option ${isEdit && material.categoria_material === 'Eléctricos' ? 'selected' : ''}>Eléctricos</option>
                        <option ${isEdit && material.categoria_material === 'Sanitarios' ? 'selected' : ''}>Sanitarios</option>
                        <option ${isEdit && material.categoria_material === 'Otros' ? 'selected' : ''}>Otros</option>
                    </select>
                </div>
            </div>
            <div class="form-group-modal"><label>Nombre del Material</label><input type="text" name="nombre_material" required value="${isEdit ? material.nombre_material : ''}"></div>
            
            <div class="form-row">
                <div class="form-group-modal"><label>Costo Unitario (S/.)</label><input type="number" name="costo_promedio" required step="0.01" value="${isEdit ? (material.costo_promedio || 0) : ''}"></div>
                <div class="form-group-modal"><label>Precio Venta (S/.)</label><input type="number" name="precio_venta" required step="0.01" value="${isEdit ? (material.precio_venta || 0) : ''}"></div>
            </div>
            
            <div class="form-group-modal"><label>Stock Mínimo</label><input type="number" name="stock_minimo" required step="1" value="${isEdit ? (material.stock_minimo || 0) : ''}"></div>
            
            <div class="form-group-modal">
                <label>Foto del Material</label>
                <input type="file" name="imagen" accept="image/*">
                ${isEdit && material.imagen_url ? `<small style="display:block; margin-top:5px;">Imagen actual: ${material.imagen_url}</small>` : ''}
                <input type="hidden" name="imagen_url" value="${isEdit ? (material.imagen_url || '') : ''}">
            </div>
            
            <button class="btn btn-primary btn-block" type="submit">${isEdit ? 'Actualizar' : 'Registrar'} Material</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Material' : 'Nuevo Material en Almacén', html);

    document.getElementById('formMaterial').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // FORZAMOS LA RUTA SEGÚN SI RECIBIMOS UN OBJETO MATERIAL O NO
        let url = '/api/inventario/materiales';
        let method = 'POST';

        if (isEdit && material.id_material) {
            url = `/api/inventario/materiales/${material.id_material}`;
            method = 'PUT';
        }

        console.log(`[CLIENTE] Accion: ${method}, URL: ${url}`);

        try {
            const res = await fetch(url, { method, body: formData });
            if(res.ok) {
                document.getElementById('modalContainer').classList.add('hidden');
                showToast(isEdit ? 'Material actualizado' : 'Material registrado');
                renderInventario();
            } else {
                const err = await res.json();
                showToast(err.error || 'Error al guardar', 'error');
            }
        } catch (err) {
            showToast('Error de conexión', 'error');
        }
    };
}

function mostrarFormMaquinaria(maq = null) {
    const isEdit = maq !== null;
    const html = `
        <form id="formMaquinaria" enctype="multipart/form-data">
            <div class="form-group-modal"><label>Descripción / Modelo</label><input type="text" id="fm_des" required value="${isEdit ? maq.descripcion : ''}"></div>
            <div class="form-group-modal"><label>Placa / Identificación</label><input type="text" id="fm_pla" required value="${isEdit ? maq.placa_identificacion : ''}"></div>
            <div class="form-group-modal"><label>Tarifa Alquiler (Día)</label><input type="number" id="fm_tar" required value="${isEdit ? maq.tarifa_alquiler : ''}"></div>
            <div class="form-group-modal">
                <label>Estado Operativo</label>
                <select id="fm_est">
                    <option value="Operativo" ${isEdit && maq.estado_operativo === 'Operativo' ? 'selected' : ''}>Operativo</option>
                    <option value="En Mantenimiento" ${isEdit && maq.estado_operativo === 'En Mantenimiento' ? 'selected' : ''}>En Mantenimiento</option>
                    <option value="Fuera de Servicio" ${isEdit && maq.estado_operativo === 'Fuera de Servicio' ? 'selected' : ''}>Fuera de Servicio</option>
                </select>
            </div>
            <div class="form-group-modal">
                <label><i class="fas fa-image"></i> Fotografía de la Maquinaria</label>
                <input type="file" id="fm_img" accept="image/*">
                ${isEdit && maq.imagen_url ? `<p style="font-size:0.8rem; margin-top:5px; color:var(--success);">✓ Ya tiene una imagen cargada</p>` : ''}
            </div>
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Registrar'} Maquinaria</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Maquinaria' : 'Nueva Maquinaria / Equipo', html);
    
    document.getElementById('formMaquinaria').onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('descripcion', document.getElementById('fm_des').value);
        formData.append('placa_identificacion', document.getElementById('fm_pla').value);
        formData.append('tarifa_alquiler', document.getElementById('fm_tar').value);
        formData.append('estado_operativo', document.getElementById('fm_est').value);
        
        const fileInput = document.getElementById('fm_img');
        if (fileInput.files[0]) {
            formData.append('imagen', fileInput.files[0]);
        } else if (isEdit && maq.imagen_url) {
            formData.append('imagen_url', maq.imagen_url);
        }

        const url = isEdit ? `/api/inventario/maquinaria/${maq.id_maquinaria}` : '/api/inventario/maquinaria';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            console.log('Enviando maquinaria:', Object.fromEntries(formData));
            const response = await fetch(url, {
                method: method,
                body: formData
            });

            const result = await response.json().catch(() => ({ error: 'Respuesta no válida del servidor' }));

            if (response.ok) {
                document.getElementById('modalContainer').classList.add('hidden');
                showToast(isEdit ? '✓ Maquinaria actualizada' : '✓ Maquinaria registrada');
                renderInventario(); // Recargar todo el inventario
            } else {
                console.error('Error del servidor:', result);
                showToast(result.error || 'Error al procesar maquinaria', 'error');
            }
        } catch (err) {
            console.error('Error de conexión:', err);
            showToast('Error de conexión con el servidor', 'error');
        }
    };
}


function renderPersonal() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <input type="text" placeholder="Buscar trabajador..." class="form-control" style="width:300px; padding:8px;">
                <button class="btn btn-primary" id="btnNuevoTrabajador"><i class="fas fa-plus"></i> Nuevo Trabajador</button>
            </div>
            <table>
                <thead><tr><th>DNI</th><th>Nombre Completo</th><th>Puesto</th><th>Especialidad</th><th>Tarifa/Hr</th><th>Teléfono</th><th>Usuario</th><th>Acciones</th></tr></thead>
                <tbody id="listaPersonal"><tr><td colspan="8" style="text-align:center">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;
    document.getElementById('btnNuevoTrabajador').onclick = () => mostrarFormPersonal(null);
    window._personalCache = [];

    fetch('/api/personal').then(r => r.json()).then(empleados => {
        window._personalCache = empleados;
        const tbody = document.getElementById('listaPersonal');
        if(!tbody) return; 
        if(empleados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay personal registrado</td></tr>';
            return;
        }
        tbody.innerHTML = empleados.map((e, index) => `
            <tr>
                <td>${e.dni}</td>
                <td><strong>${e.nombre_completo}</strong></td>
                <td>${e.puesto}</td>
                <td>${e.especialidad || '-'}</td>
                <td>${fmt.format(e.tarifa_hora)}</td>
                <td>${e.telefono || '-'}</td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span class="badge" style="background:#3498db; color:white; font-size: 0.7rem;">${e.username || 'Sin vincular'}</span>
                        ${e.id_usuario ? `
                            <span style="font-size: 0.65rem; color: ${e.activo_usuario ? 'green' : 'red'}; font-weight: bold;">
                                ● ${e.activo_usuario ? 'Activo' : 'Inactivo'}
                            </span>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick='mostrarFormPersonalByIndex(${index})'><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    });
}

window.mostrarFormPersonalByIndex = (index) => {
    mostrarFormPersonal(window._personalCache[index]);
};

function mostrarFormPersonal(personal = null) {
    const isEdit = personal !== null;
    const html = `
        <form id="formPersonal">
            <div class="form-group-modal"><label>DNI / Identificación</label><input type="text" id="fp_dni" required value="${isEdit ? personal.dni : ''}"></div>
            <div class="form-group-modal"><label>Nombre Completo</label><input type="text" id="fp_nom" required value="${isEdit ? personal.nombre_completo : ''}"></div>
            <div class="form-group-modal"><label>Puesto / Cargo</label><input type="text" id="fp_pue" required value="${isEdit ? personal.puesto : ''}"></div>
            <div class="form-group-modal"><label>Especialidad</label><input type="text" id="fp_esp" value="${isEdit ? (personal.especialidad || '') : ''}"></div>
            <div class="form-group-modal"><label>Tarifa por Hora</label><input type="number" id="fp_tar" required value="${isEdit ? personal.tarifa_hora : ''}"></div>
            <div class="form-group-modal"><label>Teléfono</label><input type="text" id="fp_tel" value="${isEdit ? (personal.telefono || '') : ''}"></div>
            <div class="form-group-modal">
                <label><i class="fas fa-user"></i> Vincular Usuario de Sistema</label>
                <select id="fp_usu">
                    <option value="">-- No vincular --</option>
                </select>
                <small>Permite que este trabajador acceda al sistema con sus propias credenciales.</small>
            </div>
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Registrar'} Trabajador</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Trabajador' : 'Nuevo Trabajador', html);

    // Cargar usuarios disponibles para vincular
    fetch('/api/personal/usuarios-disponibles').then(r => r.json()).then(usuarios => {
        const sel = document.getElementById('fp_usu');
        if (isEdit && personal.id_usuario) {
            const opt = document.createElement('option');
            opt.value = personal.id_usuario;
            opt.textContent = personal.username + ' (Vinculado actualmente)';
            opt.selected = true;
            sel.appendChild(opt);
        }
        usuarios.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id_usuario;
            opt.textContent = `${u.username} (${u.nombre_completo})`;
            sel.appendChild(opt);
        });
    });

    document.getElementById('formPersonal').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            dni: document.getElementById('fp_dni').value,
            nombre_completo: document.getElementById('fp_nom').value,
            puesto: document.getElementById('fp_pue').value,
            especialidad: document.getElementById('fp_esp').value,
            tarifa_hora: document.getElementById('fp_tar').value,
            telefono: document.getElementById('fp_tel').value,
            id_usuario: document.getElementById('fp_usu').value || null
        };

        const url = isEdit ? `/api/personal/${personal.id_trabajador}` : '/api/personal';
        const method = isEdit ? 'PUT' : 'POST';

        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        document.getElementById('modalContainer').classList.add('hidden');
        showToast(isEdit ? 'Trabajador actualizado' : 'Trabajador registrado');
        renderPersonal();
    };
}

// ---------------------------------------------------------
// PROVEEDORES
// ---------------------------------------------------------

function renderProveedores() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <input type="text" id="buscarProveedor" placeholder="Buscar proveedor..." style="padding:8px 12px; border:1px solid #ddd; border-radius:6px; width:280px;">
                </div>
                <button class="btn btn-primary" id="btnNuevoProveedor"><i class="fas fa-plus"></i> Nuevo Proveedor</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>RUC</th>
                        <th>Razón Social</th>
                        <th>Categoría</th>
                        <th>Teléfono</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="listaProveedores"><tr><td colspan="5" style="text-align:center">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;

    document.getElementById('btnNuevoProveedor').onclick = () => mostrarFormProveedor(null);

    fetch('/api/proveedores').then(r => r.json()).then(provs => {
        const tbody = document.getElementById('listaProveedores');
        if(!tbody) return; 
        if(provs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay proveedores registrados</td></tr>';
            return;
        }
        
        window._proveedoresCache = provs;

        tbody.innerHTML = provs.map((p, index) => `
            <tr>
                <td>${p.ruc}</td>
                <td><strong>${p.razon_social}</strong></td>
                <td>${p.categoria_proveedor || 'General'}</td>
                <td>${p.telefono}</td>
                <td>
                    <button class="btn-icon" onclick="prepararEdicionProveedor(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    });
}

async function toggleProveedor(id, nuevoEstado) {
    try {
        await fetch(`/api/proveedores/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: nuevoEstado })
        });
        showToast(nuevoEstado ? 'Proveedor activado' : 'Proveedor desactivado');
        renderProveedores();
    } catch (err) {
        showToast('Error al cambiar estado', 'error');
    }
}

function mostrarFormProveedor(prov = null) {
    const isEdit = prov !== null;
    const html = `
        <form id="formProveedor">
            <div class="form-group-modal"><label>RUC / ID</label><input type="text" id="fpr_ruc" required value="${isEdit ? prov.ruc : ''}"></div>
            <div class="form-group-modal"><label>Razón Social</label><input type="text" id="fpr_nom" required value="${isEdit ? prov.razon_social : ''}"></div>
            <div class="form-group-modal"><label>Dirección</label><input type="text" id="fpr_dir" value="${isEdit ? (prov.direccion || '') : ''}"></div>
            <div class="form-group-modal"><label>Teléfono</label><input type="text" id="fpr_tel" value="${isEdit ? (prov.telefono || '') : ''}"></div>
            <div class="form-group-modal"><label>Correo Electrónico</label><input type="email" id="fpr_cor" value="${isEdit ? (prov.correo || '') : ''}"></div>
            <div class="form-group-modal"><label>Condiciones Pago</label>
                <select id="fpr_pag">
                    <option ${isEdit && prov.condiciones_pago === 'Contado' ? 'selected' : ''}>Contado</option>
                    <option ${isEdit && prov.condiciones_pago === 'Crédito' ? 'selected' : ''}>Crédito</option>
                    <option ${isEdit && prov.condiciones_pago === '30 días' ? 'selected' : ''}>30 días</option>
                </select>
            </div>
            <div class="form-group-modal"><label>Contacto</label><input type="text" id="fpr_con" value="${isEdit ? (prov.contacto_nombre || '') : ''}"></div>
            <div class="form-group-modal"><label>Categoría</label>
                <select id="fpr_cat">
                    <option ${isEdit && prov.categoria === 'Materiales' ? 'selected' : ''}>Materiales</option>
                    <option ${isEdit && prov.categoria === 'Servicios' ? 'selected' : ''}>Servicios</option>
                    <option ${isEdit && prov.categoria === 'Maquinaria' ? 'selected' : ''}>Maquinaria</option>
                    <option ${isEdit && prov.categoria === 'Otros' ? 'selected' : ''}>Otros</option>
                </select>
            </div>
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Registrar'} Proveedor</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor', html);

    document.getElementById('formProveedor').onsubmit = async (e) => {
        e.preventDefault();
        console.log("--- INICIANDO ENVÍO DE PROVEEDOR ---");
        
        const data = {
            ruc: document.getElementById('fpr_ruc').value,
            razon_social: document.getElementById('fpr_nom').value,
            direccion: document.getElementById('fpr_dir').value,
            contacto_nombre: document.getElementById('fpr_con').value,
            telefono: document.getElementById('fpr_tel').value,
            correo: document.getElementById('fpr_cor').value,
            condiciones_pago: document.getElementById('fpr_pag').value,
            categoria: document.getElementById('fpr_cat').value
        };

        console.log("Datos a enviar:", data);

        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `/api/proveedores/${prov.id_proveedor}` : '/api/proveedores';

        console.log(`Acción: ${method}, URL: ${url}`);

        if (isEdit && (!prov || !prov.id_proveedor)) {
            alert("⚠️ Error: El sistema no detecta el ID de este proveedor. No se puede editar.");
            console.error("ID faltante en el objeto prov:", prov);
            return;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            console.log("Respuesta del servidor:", res.status);
            
            if(res.ok) {
                document.getElementById('modalContainer').classList.add('hidden');
                showToast(isEdit ? '✓ Proveedor actualizado' : '✓ Proveedor registrado');
                renderProveedores();
            } else {
                const errData = await res.json();
                console.error("Error del servidor:", errData);
                showToast(errData.error || 'Error al guardar', 'error');
            }
        } catch (err) {
            console.error("Error de conexión:", err);
            showToast('Error de conexión con el servidor', 'error');
        }
    };
}
// ---------------------------------------------------------
// CHARTS
// ---------------------------------------------------------
async function initCharts() {
    try {
        const res = await fetch('/api/dashboard/charts');
        const data = await res.json();

        const c1 = document.getElementById('chartGastos');
        if(c1) {
            new Chart(c1, { 
                type: 'bar', 
                data: { 
                    labels: data.gastos.map(g => g.mes), 
                    datasets: [{ 
                        label: 'Gastos $', 
                        data: data.gastos.map(g => g.total), 
                        backgroundColor: '#1a2b4b' 
                    }] 
                }, 
                options: { responsive: true, maintainAspectRatio: false } 
            });
        }
        
        const c2 = document.getElementById('chartPresupuesto');
        if(c2) {
            new Chart(c2, { 
                type: 'doughnut', 
                data: { 
                    labels: data.presupuesto.map(p => p.obra), 
                    datasets: [{ 
                        data: data.presupuesto.map(p => p.total), 
                        backgroundColor: ['#e67e22', '#1a2b4b', '#95a5a6', '#34495e', '#2ecc71'] 
                    }] 
                }, 
                options: { responsive: true, maintainAspectRatio: false } 
            });
        }
    } catch (e) {
        console.error('Error cargando gráficas del dashboard:', e);
    }
}

// ---------------------------------------------------------
// VISTAS DE CLIENTE
// ---------------------------------------------------------

async function renderCatalogo() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="catalog-grid" id="catalogGrid">
            <div style="grid-column: 1/-1; text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
        </div>
    `;

    try {
        const res = await fetch('/api/catalogo/unificado');
        if (!res.ok) return;
        const productos = await res.json();
        
        const grid = document.getElementById('catalogGrid');
        if (productos.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:50px;">No hay productos ni maquinaria disponibles.</div>';
            return;
        }

        grid.innerHTML = productos.map(p => `
            <div class="card product-card">
                <div class="product-image">
                    <img src="${p.img || (p.tipo === 'maquinaria' ? 'https://img.freepik.com/vector-premium/vector-ilustracion-icono-maquinaria-pesada_1120067-111451.jpg' : 'https://via.placeholder.com/300x200?text=Material')}" alt="${p.nom}">
                </div>
                <div class="product-info">
                    <span class="category">${p.cat}</span>
                    <h3>${p.nom}</h3>
                    <p class="description">Ref: ${p.cod}</p>
                    <div class="product-footer">
                        <span class="price">${fmt.format(p.pre || 0)}</span>
                        <button class="btn btn-primary" onclick="mostrarFormReserva(${p.id}, '${p.nom}', ${p.pre}, '${p.tipo}')">
                            <i class="fas fa-calendar-plus"></i> Reservar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error al cargar catálogo:', err);
    }
}

function mostrarFormReserva(id, nombre, precio, tipo) {
    const html = `
        <form id="formReserva">
            <div style="margin-bottom:15px; padding:10px; background:#f0f7ff; border-radius:5px;">
                <strong>Producto/Equipo:</strong> ${nombre}<br>
                <strong>Tipo:</strong> ${tipo.toUpperCase()}<br>
                <strong>Precio:</strong> ${fmt.format(precio)}
            </div>
            <div class="form-group-modal">
                <label>Cantidad/Unidades</label>
                <input type="number" id="res_cant" value="1" min="1" required>
            </div>
            <div class="form-group-modal">
                <label>Total Estimado</label>
                <input type="text" id="res_total" value="${fmt.format(precio)}" readonly style="background:#eee;">
            </div>
            <button type="submit" class="btn btn-primary btn-block">Confirmar Reservación</button>
        </form>
    `;
    abrirModal(`Reservar ${tipo}`, html);

    document.getElementById('res_cant').oninput = (e) => {
        const cant = parseFloat(e.target.value) || 0;
        document.getElementById('res_total').value = fmt.format(cant * precio);
    };

    document.getElementById('formReserva').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id_usuario: usuarioActual.id_usuario,
            id_mat: id,
            tipo: tipo,
            cantidad: document.getElementById('res_cant').value,
            precio_total: parseFloat(document.getElementById('res_total').value.replace(/[^0-9.]/g, ''))
        };

        const res = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            document.getElementById('modalContainer').classList.add('hidden');
            showToast('✓ Reservación enviada correctamente');
        } else {
            showToast('Error al enviar reservación', 'error');
        }
    };
}

async function renderMisReservas() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <table>
                <thead><tr><th>Fecha</th><th>Material</th><th>Cantidad</th><th>Total</th><th>Estado</th></tr></thead>
                <tbody id="listaMisReservas"><tr><td colspan="5" style="text-align:center;">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;

    try {
        const res = await fetch(`/api/reservas/usuario/${usuarioActual.id_usuario}`);
        const reservas = await res.json();
        const tbody = document.getElementById('listaMisReservas');

        if (reservas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aún no ha realizado ninguna reservación.</td></tr>';
            return;
        }

        tbody.innerHTML = reservas.map(r => `
            <tr>
                <td>${new Date(r.fecha_reserva).toLocaleDateString()}</td>
                <td><strong>${r.nombre_material}</strong></td>
                <td>${r.cantidad}</td>
                <td>${fmt.format(r.precio_total)}</td>
                <td><span class="badge" style="background:#f1c40f; color:#000;">${r.estado}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error al cargar reservas:', err);
    }
}

async function renderPedidosAdmin() {
    const area = document.getElementById('contentArea');
    const title = document.getElementById('pageTitle');
    title.textContent = 'Gestión de Pedidos de Clientes';

    area.innerHTML = `
        <div class="card">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Total</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody id="listaPedidosAdmin">
                    <tr><td colspan="7" style="text-align:center">Cargando pedidos...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    fetch('/api/reservas').then(r => r.json()).then(pedidos => {
        const tbody = document.getElementById('listaPedidosAdmin');
        if(!tbody) return;
        if(pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No hay pedidos registrados</td></tr>';
            return;
        }
        tbody.innerHTML = pedidos.map(p => `
            <tr>
                <td>${new Date(p.fecha_reserva).toLocaleDateString()}</td>
                <td><strong>${p.cliente}</strong></td>
                <td><span class="badge ${p.tipo_producto === 'Maquinaria' ? 'badge-warning' : 'badge-info'}">${p.tipo_producto}</span></td>
                <td>${p.producto_nombre}</td>
                <td>${p.cantidad}</td>
                <td><strong>${fmt.format(p.precio_total)}</strong></td>
                <td><span class="status-badge ${p.estado.toLowerCase()}">${p.estado}</span></td>
            </tr>
        `).join('');
    });
}

async function renderMonitoreo() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center;">
                <h3 style="margin:0;">Registro de Sesiones y Actividad</h3>
                <button class="btn btn-outline" onclick="renderMonitoreo()"><i class="fas fa-sync"></i> Actualizar</button>
            </div>
            <div class="table-container" style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Rol</th>
                            <th>Inicio Sesión</th>
                            <th>Última Actividad</th>
                            <th>Desconexión</th>
                            <th>IP</th>
                            <th>Estado Actual</th>
                        </tr>
                    </thead>
                    <tbody id="listaMonitoreo"><tr><td colspan="7" style="text-align:center;">Cargando monitoreo...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const res = await fetch('/api/monitoreo/usuarios');
        const data = await res.json();
        const tbody = document.getElementById('listaMonitoreo');
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros de actividad.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(s => {
            let badgeColor = '#95a5a6'; // Gris desconectado
            if (s.estatus_real === 'En línea') badgeColor = '#27ae60'; // Verde
            if (s.estatus_real === 'Inactivo') badgeColor = '#f1c40f'; // Amarillo

            return `
                <tr>
                    <td><strong>${s.nombre_completo}</strong><br><small style="color:#666">${s.username}</small></td>
                    <td><span class="badge" style="background:#eee; color:#333; font-size:0.8em; padding:2px 6px;">${s.rol}</span></td>
                    <td><small>${new Date(s.fecha_inicio).toLocaleString()}</small></td>
                    <td><small>${new Date(s.ultima_actividad).toLocaleString()}</small></td>
                    <td><small>${s.fecha_fin ? new Date(s.fecha_fin).toLocaleString() : '-'}</small></td>
                    <td><code style="font-size:0.8em">${s.ip_address || 'Desconocida'}</code></td>
                    <td>
                        <span class="badge" style="background:${badgeColor}; color:white; padding:4px 8px; border-radius:12px; font-size:0.85em;">
                            ${s.estatus_real}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error en monitoreo:', err);
        document.getElementById('listaMonitoreo').innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error al cargar datos</td></tr>';
    }
}

// --- MÓDULO DE MIS TAREAS (TABLAS DE TRABAJO) ---

function renderMisTareas() {
    const area = document.getElementById('contentArea');
    const rol = usuarioActual.nombre_rol;

    area.innerHTML = `
        <div id="tareasContent">
            <div class="card" style="text-align:center; padding:50px;">
                <i class="fas fa-spinner fa-spin fa-3x" style="color:var(--primary-color);"></i>
                <p style="margin-top:20px;">Cargando tus tareas de ${rol}...</p>
            </div>
        </div>
    `;

    // Cargar vista según rol
    setTimeout(() => {
        if (rol === 'Supervisor') renderTareasSupervisor();
        else if (rol === 'Almacenero') renderTareasAlmacenero();
        else if (rol === 'Contador') renderTareasContador();
        else if (rol === 'Ingeniero') renderTareasIngeniero();
        else {
            document.getElementById('tareasContent').innerHTML = `
                <div class="card" style="text-align:center; padding:50px;">
                    <i class="fas fa-check-circle fa-4x" style="color:var(--success); margin-bottom:20px;"></i>
                    <h3>¡Todo al día!</h3>
                    <p>No tienes tareas críticas pendientes asignadas para tu rol en este momento.</p>
                </div>
            `;
        }
    }, 500);
}

// 1. TAREAS SUPERVISOR: Asistencia Diaria
async function renderTareasSupervisor() {
    const container = document.getElementById('tareasContent');
    try {
        const res = await fetch('/api/personal');
        const personal = await res.json();
        
        container.innerHTML = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3><i class="fas fa-calendar-check"></i> Control de Asistencia Diaria</h3>
                    <span class="badge" style="background:#f1c40f; color:black;">Hoy: ${new Date().toLocaleDateString()}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Trabajador</th>
                            <th>Cargo</th>
                            <th>Estado de Asistencia</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${personal.map(p => `
                            <tr>
                                <td><strong>${p.nombre_completo}</strong></td>
                                <td>${p.puesto}</td>
                                <td>
                                    <select class="form-control-sm" style="width:120px;">
                                        <option value="Presente">Presente</option>
                                        <option value="Falta">Falta</option>
                                        <option value="Tardanza">Tardanza</option>
                                        <option value="Permiso">Permiso</option>
                                    </select>
                                </td>
                                <td><input type="text" placeholder="Nota..." style="width:100%; padding:4px;"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top:20px; text-align:right;">
                    <button class="btn btn-primary" onclick="showToast('Asistencia guardada correctamente (Simulación)')">
                        <i class="fas fa-save"></i> Guardar Asistencia de Hoy
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div class="alert alert-danger">Error al cargar personal</div>';
    }
}

// 2. TAREAS ALMACENERO: Pedidos por Entregar
async function renderTareasAlmacenero() {
    const container = document.getElementById('tareasContent');
    try {
        const res = await fetch('/api/reservas');
        const reservas = await res.json();
        const pendientes = reservas.filter(r => r.estado === 'Pendiente');

        container.innerHTML = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3><i class="fas fa-shipping-fast"></i> Despacho de Pedidos Pendientes</h3>
                    <span class="badge badge-danger">${pendientes.length} Pedidos</span>
                </div>
                ${pendientes.length === 0 ? '<p>No hay despachos pendientes.</p>' : `
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Producto</th>
                                <th>Cant.</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pendientes.map(r => `
                                <tr>
                                    <td>${new Date(r.fecha_reserva).toLocaleDateString()}</td>
                                    <td>${r.cliente}</td>
                                    <td>${r.producto_nombre}</td>
                                    <td>${r.cantidad}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="showToast('Pedido despachado y stock actualizado')">
                                            Entregar
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div class="alert alert-danger">Error al cargar pedidos</div>';
    }
}

// 3. TAREAS CONTADOR: Gastos por Aprobar
async function renderTareasContador() {
    const container = document.getElementById('tareasContent');
    container.innerHTML = `
        <div class="card">
            <h3><i class="fas fa-file-invoice-dollar"></i> Validación de Gastos en Campo</h3>
            <p>Sección para aprobar o rechazar facturas subidas por ingenieros.</p>
            <div style="padding:40px; text-align:center; background:#f9f9f9; border-radius:8px; border:2px dashed #ddd;">
                <i class="fas fa-check-double fa-3x" style="color:#ccc;"></i>
                <p style="margin-top:15px; color:#666;">No hay gastos nuevos pendientes de validación fiscal.</p>
            </div>
        </div>
    `;
}

// 4. TAREAS INGENIERO: Alertas de Presupuesto
async function renderTareasIngeniero() {
    const container = document.getElementById('tareasContent');
    try {
        const res = await fetch('/api/reportes/financiero');
        const reporte = await res.json();
        const criticos = reporte.filter(r => (r.gasto_total / r.presupuesto) > 0.8);

        container.innerHTML = `
            <div class="card">
                <h3><i class="fas fa-exclamation-triangle"></i> Control de Presupuesto Crítico (>80%)</h3>
                ${criticos.length === 0 ? '<p>Todas tus obras están dentro de los márgenes saludables.</p>' : `
                    <table>
                        <thead>
                            <tr>
                                <th>Obra</th>
                                <th>Presupuesto</th>
                                <th>Gasto Real</th>
                                <th>%</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${criticos.map(c => `
                                <tr>
                                    <td>${c.nombre_proyecto}</td>
                                    <td>${fmt.format(c.presupuesto)}</td>
                                    <td>${fmt.format(c.gasto_total)}</td>
                                    <td style="color:red; font-weight:bold;">${((c.gasto_total/c.presupuesto)*100).toFixed(1)}%</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline" onclick="showToast('Solicitud de ampliación enviada')">
                                            Solicitar Ampliación
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<div class="alert alert-danger">Error al cargar reportes</div>';
    }
}
// ---------------------------------------------------------
// MÓDULO DE MENSAJERÍA INTERNA
// ---------------------------------------------------------

async function abrirChatSoporte() {
    const html = `
        <form id="formTicket">
            <div class="form-group-modal">
                <label>Asunto / Motivo de consulta</label>
                <input type="text" id="tk_asunto" required placeholder="Ej: Consulta sobre stock de cemento">
            </div>
            <div class="form-group-modal">
                <label>Mensaje detallado</label>
                <textarea id="tk_contenido" required rows="5" placeholder="Escribe aquí tu consulta..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Enviar Mensaje Interno</button>
        </form>
    `;
    abrirModal('Nuevo Ticket de Soporte', html);

    document.getElementById('formTicket').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id_emisor: usuarioActual.id_usuario,
            id_receptor: null, // Para Admin
            asunto: document.getElementById('tk_asunto').value,
            contenido: document.getElementById('tk_contenido').value
        };

        try {
            const res = await fetch('/api/mensajes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                document.getElementById('modalContainer').classList.add('hidden');
                showToast('✓ Mensaje enviado al equipo de soporte');
            }
        } catch (err) {
            showToast('Error al enviar mensaje', 'error');
        }
    };
}

async function renderBuzonMensajes() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3><i class="fas fa-inbox"></i> Mensajes Recibidos</h3>
                <button class="btn btn-outline btn-sm" onclick="renderBuzonMensajes()"><i class="fas fa-sync"></i> Actualizar</button>
            </div>
            <div id="listaMensajes">Cargando buzón...</div>
        </div>
    `;

    try {
        const res = await fetch(`/api/mensajes/${usuarioActual.id_usuario}`);
        const mensajes = await res.json();
        const lista = document.getElementById('listaMensajes');

        if (mensajes.length === 0) {
            lista.innerHTML = '<p style="text-align:center; padding:40px; color:#999;">No tienes mensajes nuevos.</p>';
            return;
        }

        lista.innerHTML = `
            <div style="display:grid; gap:15px;">
                ${mensajes.map(m => `
                    <div class="card" style="border: 1px solid ${m.leido ? '#eee' : 'var(--primary-color)'}; border-left: 4px solid ${m.leido ? '#ddd' : 'var(--primary-color)'}; cursor:pointer;" onclick="verDetalleMensaje(${JSON.stringify(m).replace(/'/g, "&apos;")})">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong>${m.emisor_nombre} (${m.emisor_rol})</strong>
                            <span style="font-size:0.8rem; color:#888;">${new Date(m.fecha_envio).toLocaleString()}</span>
                        </div>
                        <div style="font-weight:700;">${m.asunto}</div>
                        <p style="margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#666;">${m.contenido}</p>
                        ${!m.leido ? '<span class="badge badge-danger" style="margin-top:10px;">Nuevo</span>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        document.getElementById('listaMensajes').innerHTML = 'Error al cargar mensajes.';
    }
}

async function verDetalleMensaje(m) {
    const html = `
        <div style="padding:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div>
                    <strong>De:</strong> ${m.emisor_nombre}<br>
                    <strong>Fecha:</strong> ${new Date(m.fecha_envio).toLocaleString()}
                </div>
                <span class="badge" style="background:#eee; color:#333;">${m.emisor_rol}</span>
            </div>
            <div style="font-weight:bold; font-size:1.1rem; margin-bottom:15px;">Asunto: ${m.asunto}</div>
            <div style="background:#f9f9f9; padding:20px; border-radius:8px; line-height:1.6; white-space: pre-wrap;">${m.contenido}</div>
            
            <div style="margin-top:25px;">
                <button class="btn btn-primary" onclick="responderMensaje(${m.id_emisor}, '${m.asunto}')"><i class="fas fa-reply"></i> Responder</button>
            </div>
        </div>
    `;
    abrirModal('Lectura de Mensaje', html);

    // Marcar como leído
    if (!m.leido) {
        await fetch(`/api/mensajes/${m.id_mensaje}/leido`, { method: 'PUT' });
        // No recargamos el buzón inmediatamente para no cerrar el modal, 
        // pero podrías hacerlo al cerrar el modal.
    }
}

function responderMensaje(idReceptor, asuntoOriginal) {
    const html = `
        <form id="formRespuesta">
            <div class="form-group-modal">
                <label>Asunto</label>
                <input type="text" id="res_asunto" value="RE: ${asuntoOriginal}" required>
            </div>
            <div class="form-group-modal">
                <label>Respuesta</label>
                <textarea id="res_contenido" required rows="5" placeholder="Escribe tu respuesta aquí..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Enviar Respuesta</button>
        </form>
    `;
    abrirModal('Responder Mensaje', html);

    document.getElementById('formRespuesta').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id_emisor: usuarioActual.id_usuario,
            id_receptor: idReceptor,
            asunto: document.getElementById('res_asunto').value,
            contenido: document.getElementById('res_contenido').value
        };

        try {
            const res = await fetch('/api/mensajes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                document.getElementById('modalContainer').classList.add('hidden');
                showToast('✓ Respuesta enviada');
                renderBuzonMensajes();
            }
        } catch (err) {
            showToast('Error al enviar respuesta', 'error');
        }
    };
}
