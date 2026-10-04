/**
 * Carrusel de taxis en celular (sección "Taxis"): las filas del tablero se deslizan de costado, la del centro queda
 * adelante, y el dado elige un taxi al azar con efecto ruleta. Es en bucle, como un reloj: antes y después de las
 * tarjetas hay copias (inertes, solo de relleno; al menos 12 de cada lado para que ni deslizando rápido se llegue al
 * final) y, al quedar quieto, siempre vuelve sin que se note a la tarjeta original.
 * En escritorio las copias se ocultan por CSS y el tablero queda como siempre.
 */
export function carrusel() {
  const encontrado = document.querySelector<HTMLElement>('#taxis .board tbody');
  if (!encontrado) return;
  const tbody: HTMLElement = encontrado;
  const originales = [...tbody.querySelectorAll<HTMLTableRowElement>(':scope > tr')];
  const n = originales.length;
  if (n < 2) return;

  const clonar = (tr: HTMLTableRowElement) => {
    const c = tr.cloneNode(true) as HTMLTableRowElement;
    c.classList.add('clon');
    c.setAttribute('aria-hidden', 'true');
    c.inert = true;
    c.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    return c;
  };
  const vueltas = Math.max(2, Math.ceil(12 / n));
  for (let v = 0; v < vueltas; v++) {
    tbody.prepend(...originales.map(clonar));
    tbody.append(...originales.map(clonar));
  }
  // Índice de la primera tarjeta original (las del medio).
  const m = vueltas * n;
  const filas = [...tbody.querySelectorAll<HTMLTableRowElement>(':scope > tr')];
  const puntos = [...document.querySelectorAll<HTMLElement>('#taxis-puntos > span')];
  const movil = matchMedia('(max-width: 760px)');
  const reducir = matchMedia('(prefers-reduced-motion: reduce)');

  const posicion = (j: number) => filas[j].offsetLeft - (tbody.clientWidth - filas[j].offsetWidth) / 2;
  const mover = (desde: number, hasta: number) => {
    tbody.style.scrollSnapType = 'none';
    tbody.scrollLeft += posicion(hasta) - posicion(desde);
    tbody.style.scrollSnapType = '';
  };

  let actual = m;
  let girando = false;
  function marcar() {
    const centro = tbody.scrollLeft + tbody.clientWidth / 2;
    let mejor = actual;
    let dist = Infinity;
    filas.forEach((f, j) => {
      const d = Math.abs(f.offsetLeft + f.offsetWidth / 2 - centro);
      if (d < dist) { dist = d; mejor = j; }
    });
    if (mejor !== actual) { actual = mejor; if (girando) tic(); }
    filas.forEach((f, j) => f.classList.toggle('activa', j === actual));
    puntos.forEach((p, i) => p.classList.toggle('activo', i === actual % n));
  }

  let quieto: number | undefined;
  tbody.addEventListener('scroll', () => {
    if (!movil.matches) return;
    requestAnimationFrame(marcar);
    clearTimeout(quieto);
    quieto = window.setTimeout(() => {
      if (girando || (actual >= m && actual < m + n)) return;
      const j = m + (actual % n);
      const ganadora = filas[actual].classList.contains('ganadora');
      filas[actual].classList.remove('ganadora');
      mover(actual, j);
      marcar();
      if (ganadora) filas[j].classList.add('ganadora');
    }, 140);
  }, { passive: true });

  const iniciar = () => {
    if (!movil.matches) return;
    tbody.style.scrollSnapType = 'none';
    tbody.scrollLeft = posicion(m);
    tbody.style.scrollSnapType = '';
    actual = m;
    marcar();
  };
  iniciar();
  movil.addEventListener('change', iniciar);

  // Sonido corto por cada taxi que pasa y campanita al final (Web Audio, sin archivos). Solo suena al tocar el dado.
  let audio: AudioContext | undefined;
  const beep = (freq: number, dur: number, vol: number, tipo: OscillatorType = 'square') => {
    if (!audio) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    const t = audio.currentTime;
    o.type = tipo;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur);
  };
  const vibrar = (patron: number | number[]) => { try { navigator.vibrate?.(patron); } catch { /* iPhone no vibra desde la web */ } };
  const tic = () => { beep(1400, 0.03, 0.08); vibrar(8); };
  const campana = () => { beep(880, 0.35, 0.12, 'triangle'); setTimeout(() => beep(1320, 0.5, 0.1, 'triangle'), 110); };

  // Dado: gira de corrido más de una vuelta y frena suave en un taxi al azar (nunca el que ya estás viendo).
  const dado = document.getElementById('taxis-dado') as HTMLButtonElement | null;
  const res = document.getElementById('taxis-dado-res');
  const frenar = (x: number) => 1 - (1 - x) ** 4;
  dado?.addEventListener('click', async () => {
    if (girando) return;
    try {
      audio ??= new AudioContext();
      await audio.resume();
    } catch { /* sin sonido */ }
    filas.forEach((f) => f.classList.remove('ganadora'));
    if (res) res.textContent = '';
    const desde = actual % n;
    let destino = Math.floor(Math.random() * (n - 1));
    if (destino >= desde) destino++;
    // Arranca una vuelta antes de las originales y termina una vuelta después: gira más de una vuelta completa.
    const inicio = m - n + desde;
    const fin = m + n + destino;
    mover(actual, inicio);
    tbody.style.scrollSnapType = 'none';
    tbody.classList.add('rapido');
    actual = inicio;
    marcar();
    girando = true;
    dado.disabled = true;
    dado.classList.add('girando');
    const a = posicion(inicio);
    const b = posicion(fin);
    const dur = reducir.matches ? 1 : 2300;
    await new Promise<void>((listo) => {
      const t0 = performance.now();
      const paso = (t: number) => {
        const x = Math.min(1, (t - t0) / dur);
        tbody.scrollLeft = a + (b - a) * frenar(x);
        marcar();
        if (x < 1) requestAnimationFrame(paso);
        else listo();
      };
      requestAnimationFrame(paso);
    });
    girando = false;
    dado.disabled = false;
    dado.classList.remove('girando');
    tbody.classList.remove('rapido');
    const j = m + destino;
    mover(actual, j);
    marcar();
    filas[j].classList.add('ganadora');
    campana();
    vibrar([30, 60, 30]);
    const nombre = filas[j].querySelector('.nombre')?.firstChild?.textContent?.trim() ?? 'este taxi';
    if (res) res.textContent = `Te tocó ${nombre}`;
  });
}
