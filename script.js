const socket = io('https://baralho-fracoes-backend.onrender.com');

console.log('Socket.IO conectado?', socket.connected);

let salaId = null;
let meuId = null;
let meuNome = '';
let jogadores = [];
let maos = {};
let montagens = {};
let turno = 0;
let maxJogadores = 4;
let baralhoRestante = 0;
let descarte = [];
let descarteVisivel = null;
let nomes = {};
let vezDeComprar = false;
let fase = 'aguardando';
let cartaSelecionadaId = null;
let tempoJogada = 30;
let tempoRestante = 30;
let timerInterval = null;

// ===== CONTROLE DE ESTADO PARA SONS =====
let turnoAnterior = 0;
let cartasAnterior = 0;

// ===== GERENCIADOR DE SONS =====
const SoundManager = {
    init() {
        this.sounds = {
            click: new Audio('assets/sounds/click.mp3'),
            card: new Audio('assets/sounds/card-swish.mp3'),
            fanfare: new Audio('assets/sounds/fanfare.mp3')
        };
        Object.values(this.sounds).forEach(audio => audio.load());
    },
    playClick() { this._play('click'); },
    playCard() { this._play('card'); },
    playVictory() { this._play('fanfare'); },
    _play(key) {
        const audio = this.sounds[key];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    }
};
SoundManager.init();

// ===== DOM =====
const menuEl = document.getElementById('menu');
const jogoEl = document.getElementById('jogo');
const statusEl = document.getElementById('status');
const salaIdEl = document.getElementById('sala-id');
const jogadoresInfoEl = document.getElementById('jogadores-info');
const turnoInfoEl = document.getElementById('turno-info');
const vezComprarInfoEl = document.getElementById('vez-comprar-info');
const timerInfoEl = document.getElementById('timer-info');
const mensagemEl = document.getElementById('mensagem');
const baralhoInfoEl = document.getElementById('baralho-info');
const descarteInfoEl = document.getElementById('descarte-info');
const descarteVisualEl = document.getElementById('descarte-visual');
const descarteAcaoEl = document.getElementById('descarte-acao');
const montagemSlotsEl = document.getElementById('montagem-slots');
const maoSlotsEl = document.getElementById('mao-slots');
const listaJogadoresEl = document.getElementById('lista-jogadores');
const progressoMontagemEl = document.getElementById('progresso-montagem');
const btnComprar = document.getElementById('btn-comprar');
const btnDescartar = document.getElementById('btn-descartar');
const btnPassar = document.getElementById('btn-passar');
const modalNomeEl = document.getElementById('modal-nome');
const inputNome = document.getElementById('input-nome');
const btnConfirmarNome = document.getElementById('btn-confirmar-nome');
const erroNomeEl = document.getElementById('erro-nome');
const selectJogadores = document.getElementById('select-jogadores');
const inputTempo = document.getElementById('input-tempo');
const modalVitoria = document.getElementById('modal-vitoria');
const vitoriaNome = document.getElementById('vitoria-nome');
const btnReiniciar = document.getElementById('btn-reiniciar');

// ===== MODAL DE REGRAS =====
const modalRegras = document.getElementById('modal-regras');
const btnRegras = document.getElementById('btn-regras');
const btnFecharRegras = document.getElementById('btn-fechar-regras');

function abrirRegras() {
    modalRegras.classList.remove('hidden');
}
function fecharRegras() {
    modalRegras.classList.add('hidden');
}

btnRegras.addEventListener('click', abrirRegras);
btnFecharRegras.addEventListener('click', fecharRegras);

modalRegras.addEventListener('click', (e) => {
    if (e.target === modalRegras) fecharRegras();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalRegras.classList.contains('hidden')) fecharRegras();
});

// ===== CHAT (definido ANTES de ser usado) =====
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnEnviarChat = document.getElementById('btn-enviar-chat');
const btnToggleChat = document.getElementById('btn-toggle-chat');

// Função para adicionar mensagem no chat (definida antes de ser chamada)
function adicionarMensagemChat(nome, texto, tipo = 'normal', hora = null) {
    const div = document.createElement('div');
    div.className = `msg ${tipo === 'sistema' ? 'sistema' : ''}`;
    if (tipo === 'sistema') {
        div.textContent = texto;
    } else {
        const time = hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = `<span class="nome">${nome}</span>${texto}<span class="hora">${time}</span>`;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (chatMessages.children.length > 100) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

// Minimizar/expandir chat
btnToggleChat.addEventListener('click', () => {
    chatContainer.classList.toggle('minimizado');
    btnToggleChat.textContent = chatContainer.classList.contains('minimizado') ? '+' : '−';
});

// Enviar mensagem
function enviarMensagemChat() {
    const texto = chatInput.value.trim();
    if (!texto) return;
    if (!salaId) {
        adicionarMensagemChat('Sistema', 'Você precisa estar em uma sala para enviar mensagens.', 'sistema');
        chatInput.value = '';
        return;
    }
    socket.emit('chat-mensagem', { salaId, texto });
    chatInput.value = '';
    chatInput.focus();
}

btnEnviarChat.addEventListener('click', enviarMensagemChat);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enviarMensagemChat();
});

// ===== BOTÃO CRIAR SALA =====
document.getElementById('btn-criar').addEventListener('click', () => {
    console.log('Botão Criar Sala clicado!');
    mostrarModalNome('criar');
});

document.getElementById('btn-entrar').addEventListener('click', () => {
    console.log('Botão Entrar clicado!');
    const codigo = document.getElementById('input-sala').value.trim();
    if (!codigo) { statusEl.textContent = 'Digite um código de sala!'; return; }
    mostrarModalNome('entrar');
});

// ===== MODAL NOME =====
let acaoAposNome = null;

function mostrarModalNome(acao) {
    acaoAposNome = acao;
    modalNomeEl.classList.remove('hidden');
    inputNome.value = '';
    inputNome.focus();
    erroNomeEl.textContent = '';
}
function fecharModalNome() { modalNomeEl.classList.add('hidden'); }

btnConfirmarNome.addEventListener('click', () => {
    const nome = inputNome.value.trim();
    if (!nome) { erroNomeEl.textContent = 'Digite seu nome!'; return; }
    if (nome.length > 20) { erroNomeEl.textContent = 'Nome muito longo (máx 20)'; return; }
    meuNome = nome;
    fecharModalNome();
    if (acaoAposNome === 'criar') {
        const max = parseInt(selectJogadores.value);
        const tempo = parseInt(inputTempo.value) || 30;
        console.log('Emitindo criar-sala com:', { maxJogadores: max, nome: meuNome, tempoJogada: tempo });
        socket.emit('criar-sala', { maxJogadores: max, nome: meuNome, tempoJogada: tempo });
    } else if (acaoAposNome === 'entrar') {
        const codigo = document.getElementById('input-sala').value.trim();
        if (!codigo) { statusEl.textContent = 'Digite um código de sala!'; return; }
        socket.emit('entrar-sala', { salaId: codigo, nome: meuNome });
    }
});

// ===== BOTÕES DO JOGO =====
btnComprar.addEventListener('click', () => {
    if (fase !== 'jogando') return;
    if (jogadores[turno]?.id !== meuId) { mensagemEl.textContent = 'Aguarde sua vez!'; return; }
    if (vezDeComprar) { mensagemEl.textContent = 'Você já comprou neste turno!'; return; }
    socket.emit('comprar', { salaId });
});

function pegarDescarte() {
    if (fase !== 'jogando') return;
    if (jogadores[turno]?.id !== meuId) { mensagemEl.textContent = 'Aguarde sua vez!'; return; }
    if (vezDeComprar) { mensagemEl.textContent = 'Você já comprou neste turno!'; return; }
    if (!descarteVisivel) { mensagemEl.textContent = 'Não há carta disponível para pegar!'; return; }
    socket.emit('pegar-descarte', { salaId });
}

btnDescartar.addEventListener('click', () => {
    if (fase !== 'jogando') return;
    if (jogadores[turno]?.id !== meuId) { mensagemEl.textContent = 'Aguarde sua vez!'; return; }
    if (!vezDeComprar) { mensagemEl.textContent = 'Você precisa comprar ou pegar uma carta primeiro!'; return; }
    if (cartaSelecionadaId === null) { mensagemEl.textContent = 'Clique em uma carta da sua mão para selecionar.'; return; }
    socket.emit('descartar', { salaId, cartaId: cartaSelecionadaId });
    cartaSelecionadaId = null;
});

btnPassar.addEventListener('click', () => {
    if (fase !== 'jogando') return;
    if (jogadores[turno]?.id !== meuId) { mensagemEl.textContent = 'Aguarde sua vez!'; return; }
    socket.emit('passar-vez', { salaId });
});

btnReiniciar.addEventListener('click', () => {
    window.location.reload();
});

// ===== EVENTOS SOCKET =====
socket.on('connect', () => {
    meuId = socket.id;
    console.log('Conectado ao servidor com ID:', meuId);
});

socket.on('sala-criada', (id) => {
    console.log('Sala criada com ID:', id);
    salaId = id;
    statusEl.textContent = `Sala criada! Código: ${id}`;
    document.getElementById('input-sala').value = id;
    entrarJogo(id);
});

socket.on('entrou-sala', (id) => {
    console.log('Entrou na sala:', id);
    salaId = id;
    statusEl.textContent = `Entrou na sala ${id}`;
    entrarJogo(id);
});

// JOGADORES (unificado e com chat)
socket.on('jogadores', (lista) => {
    jogadores = lista;
    atualizarInfo();
    renderizarListaJogadores();
    const nomesLista = lista.map(j => j.nome || 'Jogador').join(', ');
    adicionarMensagemChat('Sistema', `Jogadores na sala: ${nomesLista}`, 'sistema');
});

socket.on('chat-mensagem', ({ nome, texto, hora }) => {
    adicionarMensagemChat(nome, texto, 'normal', hora);
});

socket.on('inicio-jogo', (dados) => {
    maos = dados.maos;
    montagens = dados.montagens;
    turno = dados.turno;
    jogadores = dados.jogadores;
    maxJogadores = dados.maxJogadores;
    baralhoRestante = dados.baralhoRestante;
    descarte = dados.descarte || [];
    descarteVisivel = dados.descarteVisivel || null;
    nomes = dados.nomes || {};
    vezDeComprar = dados.vezDeComprar || false;
    tempoJogada = dados.tempoJogada || 30;
    tempoRestante = dados.tempoRestante || tempoJogada;
    fase = 'jogando';
    mensagemEl.textContent = 'Jogo iniciado!';
    turnoAnterior = turno;
    cartasAnterior = (maos[meuId] || []).length;
    atualizarInfo();
    renderizarMontes();
    renderizarMontagem();
    renderizarMao();
    renderizarListaJogadores();
    atualizarBotoes();
    iniciarTimerLocal();
});

socket.on('estado-jogo', (dados) => {
    maos = dados.maos;
    montagens = dados.montagens;
    turno = dados.turno;
    jogadores = dados.jogadores;
    baralhoRestante = dados.baralhoRestante;
    descarte = dados.descarte || [];
    descarteVisivel = dados.descarteVisivel || null;
    nomes = dados.nomes || {};
    vezDeComprar = dados.vezDeComprar || false;
    fase = dados.fase || 'jogando';
    tempoRestante = dados.tempoRestante || tempoJogada;

    if (dados.turno !== turnoAnterior && dados.turno !== undefined) {
        SoundManager.playClick();
        turnoAnterior = dados.turno;
    }
    const minhaMaoAtual = maos[meuId] || [];
    if (minhaMaoAtual.length > cartasAnterior) {
        SoundManager.playCard();
        cartasAnterior = minhaMaoAtual.length;
    }

    atualizarInfo();
    renderizarMontes();
    renderizarMontagem();
    renderizarMao();
    renderizarListaJogadores();
    atualizarBotoes();
    if (dados.fase === 'finalizado') {
        mensagemEl.textContent = 'Jogo finalizado!';
        pararTimerLocal();
    } else {
        iniciarTimerLocal();
    }
});

socket.on('fim-de-jogo', ({ vencedor, maos: maosFinais, montagens: montagensFinais, nomes: nomesFinais }) => {
    maos = maosFinais;
    montagens = montagensFinais;
    nomes = nomesFinais || {};
    fase = 'finalizado';
    const nomeVencedor = vencedor === meuId ? 'Você' : (nomes[vencedor] || 'Jogador ' + (jogadores.findIndex(j => j.id === vencedor) + 1));
    mensagemEl.textContent = `🏆 ${nomeVencedor} venceu!`;
    if (vencedor === meuId) {
        SoundManager.playVictory();
    }
    renderizarMontagem();
    renderizarMao();
    renderizarListaJogadores();
    atualizarBotoes();
    vitoriaNome.textContent = nomeVencedor;
    modalVitoria.classList.remove('hidden');
    pararTimerLocal();
});

socket.on('timer-update', (dados) => {
    tempoRestante = dados.tempoRestante;
    timerInfoEl.textContent = `⏱️ ${tempoRestante}s`;
});

socket.on('tempo-esgotado', ({ jogadorId }) => {
    if (jogadorId === meuId) mensagemEl.textContent = '⏰ Tempo esgotado! A vez foi passada automaticamente.';
});

socket.on('erro', (msg) => {
    statusEl.textContent = '❌ ' + msg;
    setTimeout(() => statusEl.textContent = '', 3000);
});

// ===== FUNÇÕES DE RENDERIZAÇÃO (mantidas) =====
function entrarJogo(id) {
    menuEl.style.display = 'none';
    jogoEl.style.display = 'flex';
    salaIdEl.textContent = `Sala: ${id}`;
    statusEl.textContent = '';
}

function atualizarInfo() {
    jogadoresInfoEl.textContent = `Jogadores: ${jogadores.length}/${maxJogadores}`;
    if (jogadores.length > 0 && turno !== undefined) {
        const jogadorAtual = jogadores[turno];
        const nomeAtual = jogadorAtual ? (nomes[jogadorAtual.id] || 'Jogador ' + (turno+1)) : '—';
        const ehMinhaVez = jogadorAtual && jogadorAtual.id === meuId;
        turnoInfoEl.textContent = `Vez: ${nomeAtual} ${ehMinhaVez ? '⭐' : ''}`;
        vezComprarInfoEl.textContent = ehMinhaVez ? (vezDeComprar ? ' (Descartar)' : ' (Comprar)') : '';
    }
}

function renderizarMontes() {
    baralhoInfoEl.textContent = `${baralhoRestante} cartas`;
    descarteInfoEl.textContent = `${descarte.length} cartas`;
    descarteVisualEl.innerHTML = '';
    if (descarteVisivel) {
        const card = document.createElement('div');
        card.className = `carta tipo-${descarteVisivel.tipo}`;
        if (descarteVisivel.tipo === 'figura') {
            card.innerHTML = descarteVisivel.texto;
        } else {
            card.innerHTML = `<div class="valor">${descarteVisivel.texto}</div><div class="tipo">${descarteVisivel.tipo}</div>`;
        }
        const ehMinhaVez = jogadores[turno]?.id === meuId && fase === 'jogando' && !vezDeComprar;
        if (ehMinhaVez) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', pegarDescarte);
            card.title = 'Clique para pegar esta carta';
        } else {
            card.style.cursor = 'default';
        }
        descarteVisualEl.appendChild(card);
        if (ehMinhaVez) {
            const btn = document.createElement('button');
            btn.className = 'btn-warning';
            btn.textContent = 'Pegar carta';
            btn.style.padding = '6px 16px';
            btn.style.fontSize = '0.9rem';
            btn.addEventListener('click', pegarDescarte);
            descarteAcaoEl.innerHTML = '';
            descarteAcaoEl.appendChild(btn);
        } else {
            descarteAcaoEl.innerHTML = '';
        }
    } else {
        const msg = document.createElement('div');
        msg.style.color = '#64748b';
        msg.style.fontSize = '0.9rem';
        msg.textContent = 'Nenhuma carta disponível';
        descarteVisualEl.appendChild(msg);
        descarteAcaoEl.innerHTML = '';
    }
}

function renderizarMontagem() {
    montagemSlotsEl.innerHTML = '';
    const montagem = montagens[meuId] || [];
    progressoMontagemEl.textContent = `(${montagem.length}/4)`;
    if (montagem.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'slot-vazio';
        vazio.textContent = 'Arraste ou duplo clique';
        montagemSlotsEl.appendChild(vazio);
    } else {
        montagem.forEach(carta => {
            const card = criarCartaElement(carta, true);
            card.classList.add(`tipo-${carta.tipo}`);
            card.addEventListener('dblclick', () => {
                if (fase === 'jogando' && jogadores[turno]?.id === meuId) {
                    socket.emit('mover-para-mao', { salaId, cartaId: carta.id });
                } else {
                    mensagemEl.textContent = 'Não é sua vez!';
                }
            });
            montagemSlotsEl.appendChild(card);
        });
    }
}

function renderizarMao() {
    maoSlotsEl.innerHTML = '';
    const mao = maos[meuId] || [];
    if (mao.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'slot-vazio';
        vazio.textContent = 'Sem cartas';
        maoSlotsEl.appendChild(vazio);
    } else {
        mao.forEach(carta => {
            const card = criarCartaElement(carta, true);
            card.classList.add(`tipo-${carta.tipo}`);
            card.addEventListener('click', () => {
                if (fase === 'jogando' && jogadores[turno]?.id === meuId && vezDeComprar) {
                    if (cartaSelecionadaId === carta.id) {
                        cartaSelecionadaId = null;
                        card.classList.remove('selecionada');
                    } else {
                        document.querySelectorAll('#mao-slots .carta.selecionada').forEach(el => el.classList.remove('selecionada'));
                        cartaSelecionadaId = carta.id;
                        card.classList.add('selecionada');
                    }
                } else {
                    mensagemEl.textContent = 'Você precisa comprar primeiro!';
                }
            });
            card.addEventListener('dblclick', () => {
                if (fase === 'jogando' && jogadores[turno]?.id === meuId) {
                    socket.emit('mover-para-montagem', { salaId, cartaId: carta.id });
                } else {
                    mensagemEl.textContent = 'Não é sua vez!';
                }
            });
            maoSlotsEl.appendChild(card);
        });
    }
}

function criarCartaElement(carta, minha) {
    const div = document.createElement('div');
    div.className = 'carta';
    if (!minha) {
        div.classList.add('virada');
    } else {
        div.classList.add('minha-carta');
        if (carta.tipo === 'figura') {
            div.innerHTML = carta.texto;
        } else {
            div.innerHTML = `<div class="valor">${carta.texto}</div><div class="tipo">${carta.tipo}</div>`;
        }
    }
    return div;
}

function renderizarListaJogadores() {
    listaJogadoresEl.innerHTML = '';
    jogadores.forEach(j => {
        const div = document.createElement('div');
        div.className = 'jogador-item';
        if (j.id === jogadores[turno]?.id && fase === 'jogando') div.classList.add('ativo');
        const ehEu = j.id === meuId;
        const nome = ehEu ? 'Você' : (nomes[j.id] || 'Jogador');
        const qtde = (maos[j.id] || []).length;
        div.innerHTML = `<span class="carta-icone">${ehEu ? '🃏' : '🂠'}</span> ${nome} (${qtde})`;
        listaJogadoresEl.appendChild(div);
    });
}

function atualizarBotoes() {
    const ehMinhaVez = jogadores[turno]?.id === meuId && fase === 'jogando';
    btnComprar.style.display = (ehMinhaVez && !vezDeComprar) ? 'inline-block' : 'none';
    btnDescartar.style.display = (ehMinhaVez && vezDeComprar) ? 'inline-block' : 'none';
    btnPassar.style.display = ehMinhaVez ? 'inline-block' : 'none';
    if (!ehMinhaVez) {
        btnComprar.style.display = 'none';
        btnDescartar.style.display = 'none';
        btnPassar.style.display = 'none';
    }
}

// ===== TIMER =====
function iniciarTimerLocal() {
    pararTimerLocal();
    timerInterval = setInterval(() => {
        if (tempoRestante > 0) {
            tempoRestante--;
            timerInfoEl.textContent = `⏱️ ${tempoRestante}s`;
        }
    }, 1000);
}
function pararTimerLocal() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}