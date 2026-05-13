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
        btnLogout.onclick = () => { location.reload(); };
    }
}

function aplicarPermisos() {
    if (!usuarioActual) return;
    const permisos = usuarioActual.permisos;
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
        if (esAdmin) {
            visible = !['catalogo', 'mis_reservas'].includes(page);
        } else {
            visible = permisos.split(',').includes(page);
        }

        if (visible) item.classList.remove('hidden');
        else item.classList.add('hidden');
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
        default:
            area.innerHTML = `<h3>Sección ${pagina} en construcción</h3>`;
    }
}

// ---------------------------------------------------------
// VISTAS
// ---------------------------------------------------------

async function renderDashboard() {
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
    document.getElementById('btnNuevaObra').onclick = mostrarFormObra;
    
    fetch('/api/obras').then(r => r.json()).then(obras => {
        const tbody = document.getElementById('listaObras');
        tbody.innerHTML = obras.map(o => `
            <tr>
                <td>${o.codigo_obra}</td>
                <td><strong>${o.nombre_proyecto}</strong></td>
                <td>${o.ubicacion_exacta || '-'}</td>
                <td>${fmt.format(o.presupuesto_total || 0)}</td>
                <td>${fmt.format(o.total_gastado || 0)}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick='mostrarFormObra(${JSON.stringify(o)})'><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    });
}

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
    document.getElementById('btnNuevoGasto').onclick = mostrarFormGasto;

    fetch('/api/gastos').then(r => r.json()).then(gastos => {
        const tbody = document.getElementById('listaGastos');
        if(!tbody) return;
        if (gastos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay gastos registrados</td></tr>';
            return;
        }
        tbody.innerHTML = gastos.map(g => {
            const fecha = g.fecha_gasto ? new Date(g.fecha_gasto).toLocaleDateString() : '-';
            return `
                <tr>
                    <td>${fecha}</td>
                    <td><strong>${g.obra_nombre || 'S/O'}</strong></td>
                    <td>${g.concepto}</td>
                    <td>${g.proveedor_nombre || 'N/A'}</td>
                    <td><strong>${fmt.format(g.monto_total || 0)}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick='mostrarFormGasto(${JSON.stringify(g)})'><i class="fas fa-edit"></i></button>
                    </td>
                </tr>`;
        }).join('');
    });
}

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
            <div class="form-group-modal"><label>Código</label><input type="text" id="fn_cod" required value="${isEdit ? obra.codigo_obra : ''}"></div>
            <div class="form-group-modal"><label>Presupuesto</label><input type="number" id="fn_mon" required value="${isEdit ? (obra.presupuesto_total || obra.monto_contrato) : ''}"></div>
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Guardar'} Obra</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Obra' : 'Nueva Obra', html);
    document.getElementById('formObra').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            nombre_proyecto: document.getElementById('fn_nom').value,
            codigo_obra: document.getElementById('fn_cod').value,
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
            fecha_gasto: isEdit ? (gasto.fecha_gasto.split('T')[0]) : new Date().toISOString().split('T')[0],
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
    
    document.getElementById('btnNuevoUsuario').onclick = mostrarFormUsuario;
    
    // Cargar lista de usuarios
    fetch('/api/usuarios').then(r => r.json()).then(data => {
        const tbody = document.getElementById('listaUsuarios');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666;">No hay usuarios registrados</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(u => `
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
                <td>
                    <button class="btn btn-sm" onclick="activarDesactivarUsuario(${u.id_usuario}, ${!u.activo})" 
                        style="background:${u.activo ? '#e74c3c' : '#27ae60'}; color:white; padding:6px 12px; border:none; cursor:pointer; border-radius:3px;">
                        ${u.activo ? '<i class="fas fa-ban"></i> Desactivar' : '<i class="fas fa-check"></i> Activar'}
                    </button>
                </td>
            </tr>
        `).join('');
    }).catch(err => {
        console.error('Error cargando usuarios:', err);
        document.getElementById('listaUsuarios').innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar usuarios</td></tr>';
    });
}

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

function mostrarFormUsuario() {
    const html = `
        <form id="formUsuario">
            <div class="form-group-modal">
                <label><i class="fas fa-user"></i> Nombre de Usuario (login)</label>
                <input type="text" id="fu_user" required placeholder="ej: juan_ing" 
                    pattern="[a-zA-Z0-9_]+" title="Solo letras, números y guiones bajos">
            </div>
            <div class="form-group-modal">
                <label><i class="fas fa-lock"></i> Contraseña</label>
                <input type="password" id="fu_pass" required placeholder="Mínimo 8 caracteres" minlength="8">
            </div>
            <div class="form-group-modal">
                <label><i class="fas fa-id-card"></i> Nombre Completo</label>
                <input type="text" id="fu_nombre" required placeholder="ej: Juan García Pérez">
            </div>
            <div class="form-group-modal">
                <label><i class="fas fa-envelope"></i> Correo Electrónico</label>
                <input type="email" id="fu_email" required placeholder="ej: juan@ejemplo.com">
            </div>
            <div class="form-group-modal">
                <label><i class="fas fa-briefcase"></i> Rol (Nivel de Acceso)</label>
                <select id="fu_rol" required>
                    <option value="">Cargando roles...</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-save"></i> Crear Usuario</button>
        </form>
    `;
    
    abrirModal('Registrar Nuevo Usuario', html);
    
    // Cargar roles disponibles
    fetch('/api/roles').then(r => r.json()).then(roles => {
        const sel = document.getElementById('fu_rol');
        sel.innerHTML = '<option value="">Seleccione rol...</option>';
        roles.forEach(rol => {
            const opt = document.createElement('option');
            opt.value = rol.id_rol;
            opt.textContent = rol.nombre_rol;
            sel.appendChild(opt);
        });
    }).catch(err => {
        console.error('Error cargando roles:', err);
        document.getElementById('fu_rol').innerHTML = '<option value="">Error al cargar roles</option>';
    });
    
    // Manejar submit del formulario
    document.getElementById('formUsuario').onsubmit = async (e) => {
        e.preventDefault();
        
        const usuario = document.getElementById('fu_user').value.trim();
        const password = document.getElementById('fu_pass').value;
        const nombre = document.getElementById('fu_nombre').value.trim();
        const email = document.getElementById('fu_email').value.trim();
        const idRol = document.getElementById('fu_rol').value;
        
        // Validaciones
        if (!usuario || !password || !nombre || !email || !idRol) {
            showToast('Completa todos los campos requeridos', 'error');
            return;
        }
        
        if (password.length < 8) {
            showToast('La contraseña debe tener al menos 8 caracteres', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usuario,
                    password: password,
                    nombre_completo: nombre,
                    correo: email,
                    id_rol: parseInt(idRol)
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                document.getElementById('modalContainer').classList.add('hidden');
                showToast('✓ Usuario creado exitosamente. Contraseña encriptada y segura.');
                renderUsuarios(); // Recargar lista
            } else {
                const error = await response.json();
                showToast(error.error || 'Error al registrar usuario', 'error');
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
function renderInventario() {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div class="tabs-container" style="border-bottom:1px solid #ddd;">
                    <button class="tab-btn active" id="tabMat" style="padding:10px 20px; cursor:pointer;">Materiales</button>
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

    if (btnNuevo) {
        btnNuevo.onclick = () => mostrarFormMaterial(null);
    }

    const cargarMateriales = () => {
        const tbody = document.getElementById('bodyInv');
        if (!tbody) return;

        tabMat.classList.add('active'); tabMaq.classList.remove('active');
        document.getElementById('headInv').innerHTML = '<tr><th>Código</th><th>Material</th><th>Categoría</th><th>Stock Mín.</th><th>Costo Prom.</th><th>Acciones</th></tr>';
        
        fetch('/api/inventario/materiales')
            .then(r => r.json())
            .then(data => {
                if(!tbody) return; 
                if(data.length === 0) { 
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay materiales registrados</td></tr>'; 
                    return; 
                }
                
                // Guardamos los materiales en una variable global temporal para acceder a ellos sin romper el HTML
                window._materialesCache = data;

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
                            <button class="btn-icon" onclick="prepararEdicionMaterial(${index})">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            });
    };

    window.prepararEdicionMaterial = (index) => {
        const material = window._materialesCache[index];
        mostrarFormMaterial(material);
    };

    const cargarMaquinaria = () => {
        tabMaq.classList.add('active'); tabMat.classList.remove('active');
        document.getElementById('headInv').innerHTML = '<tr><th>Placa</th><th>Descripción</th><th>Estado</th><th>Tarifa Alquiler</th><th>Acciones</th></tr>';
        fetch('/api/inventario/maquinaria').then(r => r.json()).then(data => {
            const tbody = document.getElementById('bodyInv');
            if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay maquinaria registrada</td></tr>'; return; }
            tbody.innerHTML = data.map(m => `
                <tr>
                    <td>${m.placa_identificacion}</td>
                    <td><strong>${m.descripcion}</strong></td>
                    <td><span class="badge">${m.estado_operativo}</span></td>
                    <td>${fmt.format(m.tarifa_alquiler)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick='mostrarFormMaquinaria(${JSON.stringify(m)})'><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `).join('');
        });
    };

    tabMat.onclick = () => {
        cargarMateriales();
        document.getElementById('btnNuevoInv').innerHTML = '<i class="fas fa-plus"></i> Nuevo Material';
        document.getElementById('btnNuevoInv').onclick = mostrarFormMaterial;
    };
    tabMaq.onclick = () => {
        cargarMaquinaria();
        document.getElementById('btnNuevoInv').innerHTML = '<i class="fas fa-plus"></i> Nueva Maquinaria';
        document.getElementById('btnNuevoInv').onclick = mostrarFormMaquinaria;
    };

    cargarMateriales(); // Por defecto
    document.getElementById('btnNuevoInv').onclick = mostrarFormMaterial;
}

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

function mostrarFormMaquinaria(maquinaria = null) {
    const isEdit = maquinaria !== null;
    const html = `
        <form id="formMaquinaria">
            <div class="form-group-modal"><label>Placa / Identificación</label><input type="text" id="fmaq_pla" required placeholder="Ej: ABC-123" value="${isEdit ? maquinaria.placa_identificacion : ''}"></div>
            <div class="form-group-modal"><label>Descripción</label><input type="text" id="fmaq_des" required value="${isEdit ? maquinaria.descripcion : ''}"></div>
            <div class="form-group-modal"><label>Tarifa de Alquiler (S/.)</label><input type="number" id="fmaq_tar" required step="0.01" value="${isEdit ? maquinaria.tarifa_alquiler : ''}"></div>
            <div class="form-group-modal"><label>Estado Operativo</label>
                <select id="fmaq_est">
                    <option ${isEdit && maquinaria.estado_operativo === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
                    <option ${isEdit && maquinaria.estado_operativo === 'EN MANTENIMIENTO' ? 'selected' : ''}>EN MANTENIMIENTO</option>
                    <option ${isEdit && maquinaria.estado_operativo === 'REPARACION' ? 'selected' : ''}>REPARACION</option>
                    <option ${isEdit && maquinaria.estado_operativo === 'BAJA' ? 'selected' : ''}>BAJA</option>
                </select>
            </div>
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Registrar'} Maquinaria</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Maquinaria' : 'Nueva Maquinaria / Equipo', html);
    document.getElementById('formMaquinaria').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            placa_identificacion: document.getElementById('fmaq_pla').value,
            descripcion: document.getElementById('fmaq_des').value,
            tarifa_alquiler: document.getElementById('fmaq_tar').value,
            estado_operativo: document.getElementById('fmaq_est').value
        };

        const url = isEdit ? `/api/inventario/maquinaria/${maquinaria.id_maquinaria}` : '/api/inventario/maquinaria';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, { method: method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)});
        if(res.ok) {
            document.getElementById('modalContainer').classList.add('hidden');
            showToast(isEdit ? 'Equipo actualizado' : 'Equipo registrado');
            renderInventario();
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
                <thead><tr><th>DNI</th><th>Nombre Completo</th><th>Puesto</th><th>Especialidad</th><th>Tarifa/Hr</th><th>Teléfono</th><th>Acciones</th></tr></thead>
                <tbody id="listaPersonal"><tr><td colspan="7" style="text-align:center">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;
    document.getElementById('btnNuevoTrabajador').onclick = mostrarFormPersonal;

    fetch('/api/personal').then(r => r.json()).then(empleados => {
        const tbody = document.getElementById('listaPersonal');
        if(!tbody) return; // Protección
        if(empleados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay personal registrado</td></tr>';
            return;
        }
        tbody.innerHTML = empleados.map(e => `
            <tr>
                <td>${e.dni}</td>
                <td><strong>${e.nombre_completo}</strong></td>
                <td>${e.puesto}</td>
                <td>${e.especialidad || '-'}</td>
                <td>${fmt.format(e.tarifa_hora)}</td>
                <td>${e.telefono || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick='mostrarFormPersonal(${JSON.stringify(e)})'><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    });
}

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
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Registrar'} Trabajador</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Trabajador' : 'Nuevo Trabajador', html);
    document.getElementById('formPersonal').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            dni: document.getElementById('fp_dni').value,
            nombre_completo: document.getElementById('fp_nom').value,
            puesto: document.getElementById('fp_pue').value,
            especialidad: document.getElementById('fp_esp').value,
            tarifa_hora: document.getElementById('fp_tar').value,
            telefono: document.getElementById('fp_tel').value
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
