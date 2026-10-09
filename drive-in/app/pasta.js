// Pasta de trabalho da empresa (servidor ou OneDrive sincronizado), via File System Access API (Chrome / Edge).
// Estrutura criada pelo app dentro da pasta escolhida pelo administrador:
//   catalogo/catalogo-drive-in.json        catálogo oficial (versão atual)
//   catalogo/versoes/catalogo_v001.json    histórico de versões do catálogo
//   projetos/<PROJETO>.drivein.json        projeto (revisão atual, com histórico)
//   projetos/revisoes/<PROJETO>_REV.NN.drivein.json   cópia de cada revisão salva
// O identificador da pasta fica guardado no navegador (IndexedDB); a permissão de escrita é pedida de novo a cada sessão.
(function () {
  'use strict';
  const DB = 'drivein_pasta', ST = 'handles', CH = 'pasta';
  const idb = (modo, fn) => new Promise((ok, err) => {
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(ST);
    rq.onerror = () => err(rq.error);
    rq.onsuccess = () => { const tx = rq.result.transaction(ST, modo), st = tx.objectStore(ST), r = fn(st); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => err(tx.error); };
  });
  const Pasta = {
    suportado: typeof window.showDirectoryPicker === 'function',
    handle: null,
    pronta: false, // handle presente e com permissão de escrita nesta sessão
    nome() { return this.handle ? this.handle.name : ''; },
    async restaurar() {
      if (!this.suportado) return false;
      try { this.handle = (await idb('readonly', (st) => st.get(CH))) || null; } catch (e) { this.handle = null; }
      if (!this.handle) return false;
      try { this.pronta = (await this.handle.queryPermission({ mode: 'readwrite' })) === 'granted'; } catch (e) { this.pronta = false; }
      return this.pronta;
    },
    async escolher() {
      this.handle = await window.showDirectoryPicker({ id: 'drivein', mode: 'readwrite' });
      try { await idb('readwrite', (st) => st.put(this.handle, CH)); } catch (e) { /* sem IndexedDB: vale só nesta sessão */ }
      this.pronta = true;
      return this.handle;
    },
    async permitir() { // precisa de clique do usuário
      if (!this.handle) return false;
      this.pronta = (await this.handle.requestPermission({ mode: 'readwrite' })) === 'granted';
      return this.pronta;
    },
    async _dir(partes, criar) {
      let d = this.handle;
      for (const p of partes) d = await d.getDirectoryHandle(p, { create: criar });
      return d;
    },
    async escrever(caminho, texto) {
      const partes = caminho.split('/'), arq = partes.pop();
      const d = await this._dir(partes, true);
      const fh = await d.getFileHandle(arq, { create: true }), w = await fh.createWritable();
      await w.write(texto); await w.close();
    },
    async ler(caminho) {
      try {
        const partes = caminho.split('/'), arq = partes.pop();
        const d = await this._dir(partes, false);
        return await (await (await d.getFileHandle(arq)).getFile()).text();
      } catch (e) { return null; }
    },
    async listar(subdir, sufixo) {
      const out = [];
      try {
        const d = await this._dir(subdir.split('/'), false);
        for await (const [nome, h] of d.entries()) if (h.kind === 'file' && (!sufixo || nome.endsWith(sufixo))) { const f = await h.getFile(); out.push({ nome, data: f.lastModified }); }
      } catch (e) { /* pasta ainda não existe */ }
      return out.sort((a, b) => b.data - a.data);
    },
  };
  window.Pasta = Pasta;
})();
