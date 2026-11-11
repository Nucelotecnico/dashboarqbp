// Estado global da aplicação
let listaColaboradores = [];
let dadosFiltrados = [];

let cargoChart;
let cidadeChart;
let nivelChart;
let faixaChart;
let salarioChart;

const PALETA_CORES = [
    "#0078d4", "#00b894", "#e17055", "#6c5ce7", "#fdcb6e",
    "#e84393", "#00cec9", "#ff7675", "#a29bfe", "#ffeaa7",
    "#fab1a0", "#74b9ff", "#55efc4", "#81ecec", "#636e72",
    "#2d3436", "#0984e3", "#f39c12", "#27ae60", "#8e44ad",
    "#16a085", "#d35400", "#c0392b", "#2c3e50"
];

function obterCores(quantidade){
    let cores = [];
    for(let i = 0; i < quantidade; i++){
        cores.push(PALETA_CORES[i % PALETA_CORES.length]);
    }
    return cores;
}

// Analisador do formato TSV de colaboradores.txt
function parsearColaboradoresTxt(texto){
    if (!texto) return [];
    const linhas = texto.split(/\r?\n/).filter(linha => linha.trim().length > 0);
    if (linhas.length <= 1) return [];

    const cabecalho = linhas[0].split("\t").map(h => h.trim().toLowerCase());

    const idxMatricula = cabecalho.findIndex(h => h.includes("matricula"));
    const idxNome = cabecalho.findIndex(h => h.includes("nome"));
    const idxCargo = cabecalho.findIndex(h => h.includes("cargo"));
    const idxNivel = cabecalho.findIndex(h => h.includes("nivel"));
    const idxFaixa = cabecalho.findIndex(h => h.includes("faixa"));
    const idxInicio = cabecalho.findIndex(h => h.includes("inicio"));
    const idxFim = cabecalho.findIndex(h => h.includes("fim"));
    const idxSuper = cabecalho.findIndex(h => h.includes("super"));
    const idxGerencia = cabecalho.findIndex(h => h.includes("gerencia"));
    const idxCidade = cabecalho.findIndex(h => h.includes("cidade"));

    const lista = [];
    for (let i = 1; i < linhas.length; i++) {
        const cols = linhas[i].split("\t");
        if (cols.length < 2) continue;

        lista.push({
            matricula: (cols[idxMatricula] || "").trim(),
            nome: (cols[idxNome] || "").trim(),
            cargo: (cols[idxCargo] || "").trim(),
            nivel: (cols[idxNivel] || "").trim(),
            faixa: (cols[idxFaixa] || "").trim(),
            inicio: (cols[idxInicio] || "").trim(),
            fim: (cols[idxFim] || "").trim(),
            superintendencia: (cols[idxSuper] || "").trim(),
            gerencia: (cols[idxGerencia] || "").trim(),
            cidade: (cols[idxCidade] || "").trim()
        });
    }
    return lista;
}

// Inicialização da aplicação e carregamento de colaboradores.txt
async function inicializarAplicacao(){
    configurarEventos();

    const statusOrigem = document.getElementById("statusOrigem");
    const btnSelecionar = document.getElementById("btnSelecionarArquivo");

    try {
        const resp = await fetch("colaboradores.txt");
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }
        const texto = await resp.text();
        listaColaboradores = parsearColaboradoresTxt(texto);

        if (listaColaboradores.length > 0) {
            if (statusOrigem) {
                statusOrigem.textContent = `Fonte: colaboradores.txt (${listaColaboradores.length} registros)`;
            }
            carregarDados(listaColaboradores);
            return;
        }
        throw new Error("Arquivo colaboradores.txt vazio ou formato inválido");
    } catch (err) {
        console.warn("Leitura direta de colaboradores.txt não foi possível:", err);

        // Fallback 1: se dados.js foi carregado no escopo
        if (typeof colaboradores !== "undefined" && Array.isArray(colaboradores) && colaboradores.length > 0) {
            listaColaboradores = [...colaboradores];
            if (statusOrigem) {
                statusOrigem.textContent = `Fonte: dados.js (${listaColaboradores.length} registros)`;
            }
            if (btnSelecionar) btnSelecionar.style.display = "inline-block";
            carregarDados(listaColaboradores);
            return;
        }

        // Fallback 2: exibe botão para seleção manual caso fetch local seja bloqueado pelo navegador
        if (statusOrigem) {
            statusOrigem.textContent = "Selecione o arquivo colaboradores.txt";
        }
        if (btnSelecionar) {
            btnSelecionar.style.display = "inline-block";
        }
    }
}

function carregarDados(dados){
    listaColaboradores = dados;
    dadosFiltrados = [...dados];
    carregarFiltros();
    atualizarDashboard();
}

function obterTipoColaborador(cargo){
    const c = (cargo || "").toLowerCase();
    if (c.includes("eng.") || c.includes("engenheiro")) {
        return "ENGENHEIROS";
    }
    if (c.includes("téc.") || c.includes("tec.") || c.includes("técnico") || c.includes("tecnico")) {
        return "TECNICO";
    }
    if (c.includes("gerente") || c.includes("supervisor") || c.includes("superintendente") || c.includes("gestor") || c.includes("coordenador") || c.includes("lider")) {
        return "LIDERANCAS";
    }
    return "OUTROS";
}

function toggleDropdown(containerId, event){
    if (event) event.stopPropagation();
    const container = document.getElementById(containerId);
    if (!container) return;
    const jaAberto = container.classList.contains("open");
    fecharTodosDropdowns();
    if (!jaAberto) {
        container.classList.add("open");
    }
}
window.toggleDropdown = toggleDropdown;

function fecharTodosDropdowns(){
    document.querySelectorAll(".multiselect-container").forEach(c => c.classList.remove("open"));
}
window.fecharTodosDropdowns = fecharTodosDropdowns;

function alternarTodosGrupo(classeCheck, checkPrincipal, idLabel, textoPadrao, sufixoPlural){
    const checkboxes = document.querySelectorAll(`.${classeCheck}`);
    checkboxes.forEach(chk => {
        chk.checked = checkPrincipal.checked;
    });
    atualizarLabelGrupo(classeCheck, checkPrincipal.id, idLabel, textoPadrao, sufixoPlural);
    if (classeCheck === "check-tipo") {
        atualizarFiltroCargos();
    }
    aplicarFiltros();
}
window.alternarTodosGrupo = alternarTodosGrupo;

function aoMudarOpcao(classeCheck, idCheckPrincipal, idLabel, textoPadrao, sufixoPlural){
    atualizarLabelGrupo(classeCheck, idCheckPrincipal, idLabel, textoPadrao, sufixoPlural);
    if (classeCheck === "check-tipo") {
        atualizarFiltroCargos();
    }
    aplicarFiltros();
}
window.aoMudarOpcao = aoMudarOpcao;

function atualizarLabelGrupo(classeCheck, idCheckPrincipal, idLabel, textoPadrao, sufixoPlural){
    const checkPrincipal = document.getElementById(idCheckPrincipal);
    const checkboxes = Array.from(document.querySelectorAll(`.${classeCheck}`));
    const selecionados = checkboxes.filter(chk => chk.checked);
    const label = document.getElementById(idLabel);

    if (checkboxes.length > 0 && selecionados.length === checkboxes.length) {
        if (checkPrincipal) {
            checkPrincipal.checked = true;
            checkPrincipal.indeterminate = false;
        }
        if (label) label.textContent = textoPadrao;
    } else if (selecionados.length === 0) {
        if (checkPrincipal) {
            checkPrincipal.checked = false;
            checkPrincipal.indeterminate = false;
        }
        if (label) label.textContent = "Nenhum selecionado";
    } else {
        if (checkPrincipal) {
            checkPrincipal.checked = false;
            checkPrincipal.indeterminate = true;
        }
        if (label) {
            if (selecionados.length === 1) {
                const span = selecionados[0].closest(".multiselect-item")?.querySelector("span");
                label.textContent = span ? span.textContent.trim() : selecionados[0].value;
            } else if (selecionados.length === 2) {
                const s1 = selecionados[0].closest(".multiselect-item")?.querySelector("span")?.textContent.trim() || selecionados[0].value;
                const s2 = selecionados[1].closest(".multiselect-item")?.querySelector("span")?.textContent.trim() || selecionados[1].value;
                label.textContent = `${s1}, ${s2}`;
            } else {
                label.textContent = `${selecionados.length} ${sufixoPlural}`;
            }
        }
    }
}
window.atualizarLabelGrupo = atualizarLabelGrupo;

function obterValoresSelecionados(classeCheck){
    const checkboxes = Array.from(document.querySelectorAll(`.${classeCheck}`));
    if (checkboxes.length === 0) return { todos: true, lista: [] };
    const selecionados = checkboxes.filter(chk => chk.checked).map(chk => chk.value.trim());

    // Se todos estiverem marcados, considera todos selecionados (sem restrição)
    if (selecionados.length === checkboxes.length) {
        return { todos: true, lista: [] };
    }
    // Se nenhum estiver marcado, lista vazia
    if (selecionados.length === 0) {
        return { todos: false, lista: [] };
    }
    return { todos: false, lista: selecionados };
}

function configurarEventos(){
    const inputPesquisa = document.getElementById("pesquisa");
    if (inputPesquisa) {
        inputPesquisa.addEventListener("input", aplicarFiltros);
        inputPesquisa.addEventListener("keyup", aplicarFiltros);
    }

    // Fecha os dropdowns ao clicar fora
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".multiselect-container")) {
            fecharTodosDropdowns();
        }
    });

    const inputArquivo = document.getElementById("inputArquivo");
    if (inputArquivo) {
        inputArquivo.addEventListener("change", (e) => {
            const arquivo = e.target.files && e.target.files[0];
            if (!arquivo) return;

            const reader = new FileReader();
            reader.onload = (evento) => {
                const texto = evento.target.result;
                const dados = parsearColaboradoresTxt(texto);
                if (dados.length > 0) {
                    const statusOrigem = document.getElementById("statusOrigem");
                    if (statusOrigem) {
                        statusOrigem.textContent = `Fonte: ${arquivo.name} (${dados.length} registros)`;
                    }
                    carregarDados(dados);
                } else {
                    alert("O arquivo selecionado não contém dados válidos de colaboradores.");
                }
            };
            reader.readAsText(arquivo, "UTF-8");
        });
    }
}

function atualizarFiltroCargos(){
    const listaCargosContainer = document.getElementById("listaOpcoesCargo");
    if (!listaCargosContainer) return;

    const selTipos = obterValoresSelecionados("check-tipo");
    const checkboxesAnteriores = Array.from(document.querySelectorAll(".check-cargo:checked")).map(c => c.value.trim());
    const tinhaCargos = document.querySelectorAll(".check-cargo").length > 0;

    let colaboradoresFiltradosPorTipo = listaColaboradores;
    if (!selTipos.todos) {
        colaboradoresFiltradosPorTipo = listaColaboradores.filter(c =>
            selTipos.lista.includes(obterTipoColaborador(c.cargo))
        );
    }

    const cargosDisponiveis = [...new Set(
        colaboradoresFiltradosPorTipo.map(c => (c.cargo || "").trim()).filter(Boolean)
    )].sort();

    listaCargosContainer.innerHTML = cargosDisponiveis.map(c => {
        // Na inicialização todos os cargos vêm marcados; nas interações preserva seleção anterior se aplicável
        const checked = (!tinhaCargos || checkboxesAnteriores.includes(c)) ? "checked" : "";
        return `
            <label class="multiselect-item">
                <input type="checkbox" value="${c}" class="check-cargo" ${checked} onchange="aoMudarOpcao('check-cargo', 'checkTodosCargos', 'labelCargo', 'Todos os Cargos', 'cargos')">
                <span>${c}</span>
            </label>
        `;
    }).join("");

    atualizarLabelGrupo("check-cargo", "checkTodosCargos", "labelCargo", "Todos os Cargos", "cargos");
}
window.atualizarFiltroCargos = atualizarFiltroCargos;

function carregarFiltros(){
    const gerencias = [...new Set(listaColaboradores.map(c => (c.gerencia || "").trim()).filter(Boolean))].sort();
    const cidades = [...new Set(listaColaboradores.map(c => (c.cidade || "").trim()).filter(Boolean))].sort();

    // 1. Gerências - todos marcados na inicialização
    const listaGerencias = document.getElementById("listaOpcoesGerencia");
    if (listaGerencias) {
        listaGerencias.innerHTML = gerencias.map(g => `
            <label class="multiselect-item">
                <input type="checkbox" value="${g}" class="check-gerencia" checked onchange="aoMudarOpcao('check-gerencia', 'checkTodasGerencias', 'labelGerencia', 'Todas as Gerências', 'gerências')">
                <span>${g}</span>
            </label>
        `).join("");
    }
    const checkTodasGer = document.getElementById("checkTodasGerencias");
    if (checkTodasGer) { checkTodasGer.checked = true; checkTodasGer.indeterminate = false; }
    atualizarLabelGrupo("check-gerencia", "checkTodasGerencias", "labelGerencia", "Todas as Gerências", "gerências");

    // 2. Cidades - todos marcados na inicialização
    const listaCidades = document.getElementById("listaOpcoesCidade");
    if (listaCidades) {
        listaCidades.innerHTML = cidades.map(c => `
            <label class="multiselect-item">
                <input type="checkbox" value="${c}" class="check-cidade" checked onchange="aoMudarOpcao('check-cidade', 'checkTodasCidades', 'labelCidade', 'Todas as Cidades', 'cidades')">
                <span>${c}</span>
            </label>
        `).join("");
    }
    const checkTodasCid = document.getElementById("checkTodasCidades");
    if (checkTodasCid) { checkTodasCid.checked = true; checkTodasCid.indeterminate = false; }
    atualizarLabelGrupo("check-cidade", "checkTodasCidades", "labelCidade", "Todas as Cidades", "cidades");

    // 3. Tipos - todos marcados na inicialização
    const checkTodosTip = document.getElementById("checkTodosTipos");
    if (checkTodosTip) { checkTodosTip.checked = true; checkTodosTip.indeterminate = false; }
    document.querySelectorAll(".check-tipo").forEach(chk => { chk.checked = true; });
    atualizarLabelGrupo("check-tipo", "checkTodosTipos", "labelTipo", "Todos os Tipos", "tipos");

    // 4. Cargos - todos marcados na inicialização
    atualizarFiltroCargos();
}

function normalizarTexto(txt){
    return (txt || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim();
}

function aplicarFiltros(){
    const selGerencias = obterValoresSelecionados("check-gerencia");
    const selCidades = obterValoresSelecionados("check-cidade");
    const selTipos = obterValoresSelecionados("check-tipo");
    const selCargos = obterValoresSelecionados("check-cargo");
    const elPesquisa = document.getElementById("pesquisa");
    const texto = elPesquisa ? normalizarTexto(elPesquisa.value) : "";

    dadosFiltrados = listaColaboradores.filter(item => {
        const itemGerencia = (item.gerencia || "").trim();
        const itemCidade = (item.cidade || "").trim();
        const itemCargo = (item.cargo || "").trim();
        const itemTipo = obterTipoColaborador(itemCargo);

        const filtroGerencia = selGerencias.todos ? true : selGerencias.lista.includes(itemGerencia);
        const filtroCidade = selCidades.todos ? true : selCidades.lista.includes(itemCidade);
        const filtroTipo = selTipos.todos ? true : selTipos.lista.includes(itemTipo);
        const filtroCargo = selCargos.todos ? true : selCargos.lista.includes(itemCargo);
        const filtroPesquisa = !texto ||
            normalizarTexto(item.nome).includes(texto) ||
            normalizarTexto(itemCargo).includes(texto) ||
            normalizarTexto(item.matricula).includes(texto) ||
            normalizarTexto(itemCidade).includes(texto) ||
            normalizarTexto(itemGerencia).includes(texto);

        return filtroGerencia && filtroCidade && filtroTipo && filtroCargo && filtroPesquisa;
    });

    atualizarDashboard();
}
window.aplicarFiltros = aplicarFiltros;

function atualizarDashboard(){
    try { atualizarKPIs(); } catch(e){ console.error("Erro ao atualizar KPIs:", e); }
    try { atualizarTabela(); } catch(e){ console.error("Erro ao atualizar Tabela:", e); }
    try { atualizarRanking(); } catch(e){ console.error("Erro ao atualizar Ranking:", e); }
    try { atualizarGraficos(); } catch(e){ console.error("Erro ao atualizar Gráficos:", e); }
}

function atualizarKPIs(){
    const totalEl = document.getElementById("totalColaboradores");
    if (totalEl) totalEl.textContent = dadosFiltrados.length;

    const engenheiros = dadosFiltrados.filter(x =>
        (x.cargo || "").includes("Eng.")
    );

    const tecnicos = dadosFiltrados.filter(x =>
        (x.cargo || "").includes("Téc.") || (x.cargo || "").includes("Tec.")
    );

    const lideres = dadosFiltrados.filter(x => {
        const c = (x.cargo || "").toLowerCase();
        return c.includes("gerente") ||
               c.includes("supervisor") ||
               c.includes("superintendente") ||
               c.includes("gestor") ||
               c.includes("coordenador");
    });

    const engEl = document.getElementById("totalEngenheiros");
    if (engEl) engEl.textContent = engenheiros.length;

    const tecEl = document.getElementById("totalTecnicos");
    if (tecEl) tecEl.textContent = tecnicos.length;

    const lidEl = document.getElementById("totalLider");
    if (lidEl) lidEl.textContent = lideres.length;
}

function formatarMoeda(val){
    if (val === undefined || val === null || String(val).trim() === "") return "-";
    const num = parseFloat(String(val).replace(/\D/g, ""));
    if (!isNaN(num) && num > 0) {
        return "R$ " + num.toLocaleString("pt-BR");
    }
    return String(val).trim() || "-";
}

const TABELA_FAIXAS = {
    "12": { inicio: 4548, fim: 6822 },
    "13": { inicio: 5719, fim: 8579 },
    "14": { inicio: 7191, fim: 10786 },
    "15": { inicio: 9043, fim: 13564 },
    "16": { inicio: 11371, fim: 17056 },
    "17": { inicio: 14297, fim: 21445 }
};

function obterRotuloFaixa(faixa){
    const f = (faixa || "").trim();
    if (!f || f === "Não informado" || f === "UN") return "Não informado";

    const ref = listaColaboradores.find(c => (c.faixa || "").trim() === f && c.inicio && c.fim);
    if (ref) {
        const ini = parseFloat(String(ref.inicio).replace(/\D/g, ""));
        const fim = parseFloat(String(ref.fim).replace(/\D/g, ""));
        if (!isNaN(ini) && !isNaN(fim) && ini > 0) {
            return `Faixa ${f} (R$ ${ini.toLocaleString("pt-BR")} - R$ ${fim.toLocaleString("pt-BR")})`;
        }
    }
    if (TABELA_FAIXAS[f]) {
        const t = TABELA_FAIXAS[f];
        return `Faixa ${f} (R$ ${t.inicio.toLocaleString("pt-BR")} - R$ ${t.fim.toLocaleString("pt-BR")})`;
    }
    return `Faixa ${f}`;
}

function atualizarTabela(){
    const tbody = document.querySelector("#colaboradores tbody");
    if (!tbody) return;

    tbody.innerHTML = dadosFiltrados.map(item => `
        <tr>
            <td>${item.matricula || ""}</td>
            <td>${item.nome || ""}</td>
            <td>${item.cargo || ""}</td>
            <td>${item.nivel || ""}</td>
            <td>${item.faixa || ""}</td>
            <td>${formatarMoeda(item.inicio)}</td>
            <td>${formatarMoeda(item.fim)}</td>
            <td>${item.cidade || ""}</td>
            <td>${item.gerencia || ""}</td>
        </tr>
    `).join("");
}

function atualizarRanking(){
    const cidades = contar("cidade");
    const ranking = Object.entries(cidades).sort((a,b) => b[1] - a[1]);
    const tbody = document.querySelector("#rankingTabela tbody");
    if (!tbody) return;

    tbody.innerHTML = ranking.map(item => `
        <tr>
            <td>${item[0]}</td>
            <td>${item[1]}</td>
        </tr>
    `).join("");
}

function contar(campo){
    let resultado = {};
    dadosFiltrados.forEach(item => {
        let valor = (item[campo] || "").trim() || "Não informado";
        resultado[valor] = (resultado[valor] || 0) + 1;
    });
    return resultado;
}

function renderizarGraficoFallback(canvasId, dadosObj, corPadrao){
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const entradas = Object.entries(dadosObj).sort((a,b) => b[1] - a[1]);
    const max = Math.max(...entradas.map(e => e[1]), 1);

    container.innerHTML = `
        <div class="chart-fallback-list">
            ${entradas.map((e, idx) => {
                const percent = Math.round((e[1] / max) * 100);
                const cor = Array.isArray(corPadrao) ? corPadrao[idx % corPadrao.length] : corPadrao;
                return `
                <div class="chart-fallback-item">
                    <div class="chart-fallback-header">
                        <span><strong>${e[0]}</strong></span>
                        <span>${e[1]}</span>
                    </div>
                    <div class="chart-fallback-bar-bg">
                        <div class="chart-fallback-bar-fill" style="width:${percent}%; background:${cor};"></div>
                    </div>
                </div>`;
            }).join("")}
        </div>
    `;
}

// Plugin customizado para exibir o valor no topo/ponta externa de cada barra
const pluginValoresNoTopo = {
    id: "valoresNoTopo",
    afterDatasetsDraw(chart) {
        try {
            const { ctx } = chart;
            const isHorizontal = chart.options.indexAxis === "y";
            const pluginOpts = chart.options.plugins?.valoresNoTopo || {};
            const exibirPercentual = !!pluginOpts.exibirPercentual;

            ctx.save();
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || meta.hidden || !Array.isArray(meta.data)) return;

                const total = (dataset.data || []).reduce((acc, v) => acc + (Number(v) || 0), 0);

                meta.data.forEach((element, index) => {
                    if (!element || typeof element.x !== "number" || typeof element.y !== "number" || isNaN(element.x) || isNaN(element.y)) return;

                    const valor = dataset.data[index];
                    if (valor === undefined || valor === null || valor === "") return;

                    const perc = total > 0 ? ((Number(valor) / total) * 100).toFixed(1).replace(".", ",") + "%" : "0%";

                    if (isHorizontal) {
                        // Barra horizontal: valor à direita da ponta externa da barra
                        ctx.textAlign = "left";
                        ctx.textBaseline = "middle";
                        const x = element.x + 6;
                        const y = element.y;

                        if (exibirPercentual) {
                            ctx.fillStyle = "#2c3e50";
                            ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                            ctx.fillText(`${valor} (${perc})`, x, y);
                        } else {
                            ctx.fillStyle = "#2c3e50";
                            ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                            ctx.fillText(valor, x, y);
                        }
                    } else {
                        // Barra vertical: valor no topo externo da barra
                        ctx.textAlign = "center";
                        ctx.textBaseline = "bottom";
                        const x = element.x;
                        const y = element.y - 4;

                        if (exibirPercentual) {
                            // Linha 1: Valor absoluto (em negrito)
                            ctx.fillStyle = "#2c3e50";
                            ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                            ctx.fillText(valor, x, y - 14);

                            // Linha 2: Percentual (em cinza médio)
                            ctx.fillStyle = "#636e72";
                            ctx.font = "600 10px 'Segoe UI', Arial, sans-serif";
                            ctx.fillText(`(${perc})`, x, y);
                        } else {
                            ctx.fillStyle = "#2c3e50";
                            ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
                            ctx.fillText(valor, x, y);
                        }
                    }
                });
            });
            ctx.restore();
        } catch (err) {
            console.warn("Erro no plugin valoresNoTopo:", err);
        }
    }
};

function renderizarGrafico(instanciaAtual, canvasId, config){
    try {
        if (instanciaAtual) {
            try { instanciaAtual.destroy(); } catch(e){}
        }
        const canvasAntigo = document.getElementById(canvasId);
        if (!canvasAntigo) return null;
        try {
            const existente = Chart.getChart(canvasAntigo);
            if (existente) existente.destroy();
        } catch(e){}

        // Substitui o canvas por um elemento limpo no DOM para evitar qualquer conflito
        const pai = canvasAntigo.parentElement;
        if (!pai) return null;
        const novoCanvas = document.createElement("canvas");
        novoCanvas.id = canvasId;
        pai.replaceChild(novoCanvas, canvasAntigo);

        if (!config.options) config.options = {};
        config.options.animation = false;

        return new Chart(novoCanvas, config);
    } catch(err) {
        console.error("Erro ao renderizar gráfico " + canvasId + ":", err);
        return null;
    }
}

function atualizarGraficos(){
    const cargos = contar("cargo");
    const cidades = contar("cidade");
    const niveis = contar("nivel");
    const faixas = contar("faixa");

    if (typeof Chart === "undefined") {
        renderizarGraficoFallback("cargoChart", cargos, "#0078d4");
        renderizarGraficoFallback("cidadeChart", cidades, "#e17055");
        renderizarGraficoFallback("nivelChart", niveis, "#6c5ce7");
        renderizarGraficoFallback("faixaChart", faixas, "#00b894");
        return;
    }

    // 1. Gráfico de Cargos (Eixos Invertidos: Barras Horizontais com altura dinâmica)
    const canvasCargo = document.getElementById("cargoChart");
    if (canvasCargo) {
        const labelsCargo = Object.keys(cargos);
        const valoresCargo = Object.values(cargos);
        const totalItensCargo = labelsCargo.length;
        const alturaCargo = Math.max(380, totalItensCargo * 34 + 60);

        if (canvasCargo.parentElement) {
            canvasCargo.parentElement.style.height = `${alturaCargo}px`;
        }

        cargoChart = renderizarGrafico(cargoChart, "cargoChart", {
            type: "bar",
            data: {
                labels: labelsCargo,
                datasets: [{
                    label: "Quantidade",
                    data: valoresCargo,
                    backgroundColor: "#0078d4",
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { right: 35, top: 10, bottom: 10 }
                },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grace: "12%",
                        ticks: { precision: 0 }
                    },
                    y: {
                        ticks: {
                            autoSkip: false,
                            font: { size: 12 }
                        }
                    }
                }
            },
            plugins: [pluginValoresNoTopo]
        });
    }

    // 2. Gráfico de Cidades (Eixos Invertidos: Barras Horizontais com altura dinâmica)
    const canvasCidade = document.getElementById("cidadeChart");
    if (canvasCidade) {
        const labelsCidade = Object.keys(cidades);
        const valoresCidade = Object.values(cidades);
        const totalItensCidade = labelsCidade.length;
        const alturaCidade = Math.max(380, totalItensCidade * 32 + 60);

        if (canvasCidade.parentElement) {
            canvasCidade.parentElement.style.height = `${alturaCidade}px`;
        }

        cidadeChart = renderizarGrafico(cidadeChart, "cidadeChart", {
            type: "bar",
            data: {
                labels: labelsCidade,
                datasets: [{
                    label: "Quantidade",
                    data: valoresCidade,
                    backgroundColor: "#e17055",
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { right: 35, top: 10, bottom: 10 }
                },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grace: "12%",
                        ticks: { precision: 0 }
                    },
                    y: {
                        ticks: {
                            autoSkip: false,
                            font: { size: 12 }
                        }
                    }
                }
            },
            plugins: [pluginValoresNoTopo]
        });
    }

    // 3. Gráfico de Níveis (Barras com Valor Absoluto e Percentual)
    const canvasNivel = document.getElementById("nivelChart");
    if (canvasNivel) {
        const labelsNivel = Object.keys(niveis);
        const valoresNivel = Object.values(niveis);

        nivelChart = renderizarGrafico(nivelChart, "nivelChart", {
            type: "bar",
            data: {
                labels: labelsNivel,
                datasets: [{
                    label: "Quantidade",
                    data: valoresNivel,
                    backgroundColor: "#6c5ce7",
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 32 }
                },
                plugins: {
                    legend: { display: false },
                    valoresNoTopo: {
                        exibirPercentual: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = Number(context.raw) || 0;
                                const total = context.dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
                                const perc = total > 0 ? ((val / total) * 100).toFixed(1).replace(".", ",") + "%" : "0%";
                                return ` Colaboradores: ${val} (${perc})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: "18%",
                        ticks: { precision: 0 }
                    }
                }
            },
            plugins: [pluginValoresNoTopo]
        });
    }

    // 4. Gráfico de Faixas (Barras com Início e Fim entre parênteses no eixo X)
    const canvasFaixa = document.getElementById("faixaChart");
    if (canvasFaixa) {
        // Ordena as faixas de forma lógica e crescente
        const chavesFaixas = Object.keys(faixas).sort((a, b) => {
            const numA = parseInt(a) || 999;
            const numB = parseInt(b) || 999;
            return numA - numB;
        });

        const labelsFaixa = chavesFaixas.map(f => obterRotuloFaixa(f));
        const valoresFaixa = chavesFaixas.map(f => faixas[f]);

        faixaChart = renderizarGrafico(faixaChart, "faixaChart", {
            type: "bar",
            data: {
                labels: labelsFaixa,
                datasets: [{
                    label: "Quantidade",
                    data: valoresFaixa,
                    backgroundColor: "#00b894",
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 25 }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
                                const perc = total > 0 ? ((val / total) * 100).toFixed(1).replace(".", ",") + "%" : "0%";
                                return ` Colaboradores: ${val} (${perc})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: { size: 11, weight: "600" },
                            autoSkip: false,
                            maxRotation: 25,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grace: "12%",
                        ticks: { precision: 0 }
                    }
                }
            },
            plugins: [pluginValoresNoTopo]
        });
    }
}

// Inicia o carregamento assim que o DOM estiver pronto
window.addEventListener("DOMContentLoaded", inicializarAplicacao);
