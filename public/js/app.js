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
    if (!usuarioActual || !usuarioActual.permisos) return;

    const permisos = usuarioActual.permisos;
    
    document.querySelectorAll('.menu-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if (!page) return; // Saltamos botones como logout (que no tienen data-page)

        if (permisos === '*' || permisos.split(',').includes(page)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
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

    const cargarMateriales = () => {
        tabMat.classList.add('active'); tabMaq.classList.remove('active');
        document.getElementById('headInv').innerHTML = '<tr><th>Código</th><th>Material</th><th>Categoría</th><th>Stock Mín.</th><th>Costo Prom.</th><th>Acciones</th></tr>';
        fetch('/api/inventario/materiales').then(r => r.json()).then(data => {
            const tbody = document.getElementById('bodyInv');
            if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay materiales registrados</td></tr>'; return; }
            tbody.innerHTML = data.map(m => `
                <tr>
                    <td>${m.codigo_material}</td>
                    <td><strong>${m.nombre_material}</strong></td>
                    <td>${m.categoria_material}</td>
                    <td>${m.stock_minimo}</td>
                    <td>${fmt.format(m.costo_promedio)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick='mostrarFormMaterial(${JSON.stringify(m)})'><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `).join('');
        });
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
    const isEdit = material !== null;
    const html = `
        <form id="formMaterial">
            <div class="form-group-modal"><label>Código</label><input type="text" id="fm_cod" required placeholder="Ej: MAT-001" value="${isEdit ? material.codigo_material : ''}"></div>
            <div class="form-group-modal"><label>Nombre del Material</label><input type="text" id="fm_nom" required value="${isEdit ? material.nombre_material : ''}"></div>
            <div class="form-group-modal"><label>Categoría</label>
                <select id="fm_cat">
                    <option ${isEdit && material.categoria_material === 'Agregados' ? 'selected' : ''}>Agregados</option>
                    <option ${isEdit && material.categoria_material === 'Aceros' ? 'selected' : ''}>Aceros</option>
                    <option ${isEdit && material.categoria_material === 'Cementos' ? 'selected' : ''}>Cementos</option>
                    <option ${isEdit && material.categoria_material === 'Acabados' ? 'selected' : ''}>Acabados</option>
                    <option ${isEdit && material.categoria_material === 'Eléctricos' ? 'selected' : ''}>Eléctricos</option>
                    <option ${isEdit && material.categoria_material === 'Sanitarios' ? 'selected' : ''}>Sanitarios</option>
                    <option ${isEdit && material.categoria_material === 'Otros' ? 'selected' : ''}>Otros</option>
                </select>
            </div>
            <div class="form-group-modal"><label>Stock Mínimo</label><input type="number" id="fm_min" required step="0.01" value="${isEdit ? material.stock_minimo : ''}"></div>
            <div class="form-group-modal"><label>Costo Unitario (S/.)</label><input type="number" id="fm_cos" required step="0.01" value="${isEdit ? material.costo_promedio : ''}"></div>
            <button class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Registrar'} Material</button>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Material' : 'Nuevo Material en Almacén', html);
    document.getElementById('formMaterial').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            codigo_material: document.getElementById('fm_cod').value,
            nombre_material: document.getElementById('fm_nom').value,
            categoria_material: document.getElementById('fm_cat').value,
            stock_minimo: document.getElementById('fm_min').value,
            costo_promedio: document.getElementById('fm_cos').value
        };

        const url = isEdit ? `/api/inventario/materiales/${material.id_material}` : '/api/inventario/materiales';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, { method: method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)});
        if(res.ok) {
            document.getElementById('modalContainer').classList.add('hidden');
            showToast(isEdit ? 'Material actualizado' : 'Material registrado');
            renderInventario();
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
                        <th>Razón Social</th>
                        <th>RUC / RFC</th>
                        <th>Categoría</th>
                        <th>Contacto</th>
                        <th>Teléfono</th>
                        <th>Correo</th>
                        <th>Cond. Pago</th>
                        <th>Evaluación</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="listaProveedores"><tr><td colspan="10" style="text-align:center">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;

    document.getElementById('btnNuevoProveedor').onclick = mostrarFormProveedor;

    let todosProveedores = [];

    const cargar = () => {
        fetch('/api/proveedores').then(r => r.json()).then(data => {
            todosProveedores = data;
            renderTablaProveedores(data);
        });
    };

    document.getElementById('buscarProveedor').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const filtrados = todosProveedores.filter(p =>
            p.razon_social.toLowerCase().includes(q) ||
            (p.categoria || '').toLowerCase().includes(q) ||
            (p.ruc || '').toLowerCase().includes(q)
        );
        renderTablaProveedores(filtrados);
    };

    cargar();
}

function renderTablaProveedores(data) {
    const tbody = document.getElementById('listaProveedores');
    if (!tbody) return;
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px;">No se encontraron proveedores</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(p => {
        const estrellas = '★'.repeat(Math.round(p.evaluacion_desempeno || 0)) + '☆'.repeat(5 - Math.round(p.evaluacion_desempeno || 0));
        const estadoBadge = p.activo
            ? '<span style="background:#d4edda; color:#155724; padding:3px 10px; border-radius:12px; font-size:12px;">● Activo</span>'
            : '<span style="background:#f8d7da; color:#721c24; padding:3px 10px; border-radius:12px; font-size:12px;">● Inactivo</span>';
        return `
            <tr>
                <td><strong>${p.razon_social}</strong></td>
                <td>${p.ruc || '-'}</td>
                <td><span style="background:#e8f0fe; color:#1a2b4b; padding:3px 10px; border-radius:12px; font-size:12px;">${p.categoria || 'General'}</span></td>
                <td>${p.contacto_nombre || '-'}</td>
                <td>${p.telefono || '-'}</td>
                <td>${p.correo || '-'}</td>
                <td>${p.condiciones_pago || '-'}</td>
                <td style="color:#f39c12; font-size:14px;" title="${p.evaluacion_desempeno}/5">${estrellas}</td>
                <td>
                    ${estadoBadge}
                    <button onclick="toggleProveedor(${p.id_proveedor}, ${!p.activo})" style="margin-left:6px; background:none; border:1px solid #ccc; border-radius:4px; padding:2px 8px; cursor:pointer; font-size:11px;">
                        ${p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick='mostrarFormProveedor(${JSON.stringify(p)})'><i class="fas fa-edit"></i></button>
                </td>
            </tr>`;
    }).join('');
}

async function toggleProveedor(id, nuevoEstado) {
    await fetch(`/api/proveedores/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado })
    });
    showToast(nuevoEstado ? 'Proveedor activado' : 'Proveedor desactivado');
    renderProveedores();
}

function mostrarFormProveedor(prov = null) {
    const isEdit = prov !== null;
    const html = `
        <form id="formProveedor" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <div class="form-group-modal" style="grid-column:1/-1;">
                <label>Razón Social *</label>
                <input type="text" id="fp_rs" required placeholder="Nombre de la empresa" value="${isEdit ? prov.razon_social : ''}">
            </div>
            <div class="form-group-modal">
                <label>RUC / RFC</label>
                <input type="text" id="fp_ruc" placeholder="Ej: 20123456789" value="${isEdit ? (prov.ruc || '') : ''}">
            </div>
            <div class="form-group-modal">
                <label>Categoría</label>
                <select id="fp_cat">
                    <option ${isEdit && prov.categoria === 'Materiales' ? 'selected' : ''}>Materiales</option>
                    <option ${isEdit && prov.categoria === 'Maquinaria' ? 'selected' : ''}>Maquinaria</option>
                    <option ${isEdit && prov.categoria === 'Mano de Obra' ? 'selected' : ''}>Mano de Obra</option>
                    <option ${isEdit && prov.categoria === 'Servicios' ? 'selected' : ''}>Servicios</option>
                    <option ${isEdit && prov.categoria === 'Transporte' ? 'selected' : ''}>Transporte</option>
                    <option ${!isEdit || prov.categoria === 'General' ? 'selected' : ''}>General</option>
                </select>
            </div>
            <div class="form-group-modal">
                <label>Nombre de Contacto</label>
                <input type="text" id="fp_con" placeholder="Nombre del representante" value="${isEdit ? (prov.contacto_nombre || '') : ''}">
            </div>
            <div class="form-group-modal">
                <label>Teléfono</label>
                <input type="text" id="fp_tel" placeholder="Ej: 987654321" value="${isEdit ? (prov.telefono || '') : ''}">
            </div>
            <div class="form-group-modal">
                <label>Correo</label>
                <input type="email" id="fp_cor" placeholder="correo@empresa.com" value="${isEdit ? (prov.correo || '') : ''}">
            </div>
            <div class="form-group-modal" style="grid-column:1/-1;">
                <label>Dirección</label>
                <input type="text" id="fp_dir" placeholder="Dirección completa" value="${isEdit ? (prov.direccion || '') : ''}">
            </div>
            <div class="form-group-modal" style="grid-column:1/-1;">
                <label>Condiciones de Pago</label>
                <select id="fp_pago">
                    <option ${isEdit && prov.condiciones_pago === 'Contado' ? 'selected' : ''}>Contado</option>
                    <option ${isEdit && prov.condiciones_pago === '15 días' ? 'selected' : ''}>15 días</option>
                    <option ${isEdit && prov.condiciones_pago === '30 días' ? 'selected' : ''}>30 días</option>
                    <option ${isEdit && prov.condiciones_pago === '45 días' ? 'selected' : ''}>45 días</option>
                    <option ${isEdit && prov.condiciones_pago === '60 días' ? 'selected' : ''}>60 días</option>
                    <option ${isEdit && prov.condiciones_pago === 'Crédito' ? 'selected' : ''}>Crédito</option>
                </select>
            </div>
            <div style="grid-column:1/-1;">
                <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Actualizar' : 'Registrar'} Proveedor</button>
            </div>
        </form>
    `;
    abrirModal(isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor', html);
    document.getElementById('formProveedor').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            razon_social: document.getElementById('fp_rs').value,
            ruc: document.getElementById('fp_ruc').value,
            categoria: document.getElementById('fp_cat').value,
            contacto_nombre: document.getElementById('fp_con').value,
            telefono: document.getElementById('fp_tel').value,
            correo: document.getElementById('fp_cor').value,
            direccion: document.getElementById('fp_dir').value,
            condiciones_pago: document.getElementById('fp_pago').value
        };

        const url = isEdit ? `/api/proveedores/${prov.id_proveedor}` : '/api/proveedores';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            document.getElementById('modalContainer').classList.add('hidden');
            showToast(isEdit ? 'Proveedor actualizado' : 'Proveedor registrado');
            renderProveedores();
        } else {
            showToast('Error al procesar el proveedor', 'error');
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
