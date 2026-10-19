import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, Pencil, FileSpreadsheet, Save } from 'lucide-react';
import { api } from '../services/api';

interface Leadership {
  id: string;
  name: string;
  role: string;
  party: string | null;
  phone: string | null;
  alignment: string;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const ALINHAMENTO_TEXTO: Record<string, string> = {
  ALTO: 'Alto (fiel)',
  MEDIO: 'Médio',
  'EM CONQUISTA': 'Em conquista',
};

const corAlinhamento = (a: string) => (a === 'ALTO' ? '#4ade80' : a === 'MEDIO' ? '#facc15' : '#f87171');

const FORM_VAZIO = { nome: '', cargo: 'Vereador', partido: '', telefone: '', alinhamento: 'ALTO', notas: '' };

const mensagemErro = (err: any, padrao: string) => err?.response?.data?.error || padrao;

export function PainelCRM({ municipioId, municipioNome, onClose }: { municipioId: string; municipioNome: string; onClose: () => void }) {
  const [liderancas, setLiderancas] = useState<Leadership[]>([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

  const campo = (k: keyof typeof FORM_VAZIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const carregarLiderancas = useCallback(() => {
    api.get<Leadership[]>(`/leaderships/${municipioId}`)
      .then(res => setLiderancas(res.data))
      .catch(err => setErro(mensagemErro(err, 'Não foi possível carregar as lideranças.')));
  }, [municipioId]);

  useEffect(() => {
    carregarLiderancas();
  }, [carregarLiderancas]);

  const limparForm = () => {
    setForm(FORM_VAZIO);
    setEditandoId(null);
  };

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const corpo = {
      name: form.nome,
      role: form.cargo,
      party: form.partido,
      phone: form.telefone,
      alignment: form.alinhamento,
      notes: form.notas,
    };
    const requisicao = editandoId
      ? api.put(`/leaderships/${editandoId}`, corpo)
      : api.post('/leaderships', { ...corpo, municipalityId: municipioId });

    requisicao
      .then(() => {
        mostrarAviso(editandoId ? 'Alterações salvas.' : 'Apoio registrado.');
        limparForm();
        carregarLiderancas();
      })
      .catch(err => setErro(mensagemErro(err, 'Não foi possível salvar. Tente de novo.')))
      .finally(() => setSalvando(false));
  };

  const editar = (l: Leadership) => {
    setEditandoId(l.id);
    setErro(null);
    setForm({
      nome: l.name,
      cargo: l.role,
      partido: l.party || '',
      telefone: l.phone || '',
      alinhamento: l.alignment,
      notas: l.notes || '',
    });
    corpoRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => nomeRef.current?.focus(), 250);
  };

  const excluirLideranca = (l: Leadership) => {
    if (!window.confirm(`Excluir ${l.name}? Essa ação não pode ser desfeita.`)) return;
    api.delete(`/leaderships/${l.id}`)
      .then(() => {
        if (editandoId === l.id) limparForm();
        mostrarAviso('Liderança excluída.');
        carregarLiderancas();
      })
      .catch(err => setErro(mensagemErro(err, 'Não foi possível excluir. Tente de novo.')));
  };

  const exportarExcel = async () => {
    if (liderancas.length === 0) return;
    setExportando(true);
    setErro(null);
    try {
      // Carregada só quando alguém exporta, para não pesar na abertura do app
      const { default: writeXlsxFile } = await import('write-excel-file/browser');
      const cab = (value: string) => ({ value, fontWeight: 'bold' as const });
      const linhas = [
        [cab('Nome'), cab('Cargo'), cab('Partido'), cab('Telefone'), cab('Alinhamento'), cab('Observações'), cab('Cadastrado em')],
        ...liderancas.map((l) => [
          l.name,
          l.role,
          l.party || '',
          l.phone || '',
          ALINHAMENTO_TEXTO[l.alignment] || l.alignment,
          l.notes || '',
          l.createdAt ? new Date(l.createdAt).toLocaleDateString('pt-BR') : '',
        ]),
      ];
      const nomeArquivo = `Liderancas_${municipioNome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')}.xlsx`;
      await writeXlsxFile(linhas, {
        columns: [{ width: 30 }, { width: 24 }, { width: 10 }, { width: 18 }, { width: 14 }, { width: 40 }, { width: 14 }],
      }).toFile(nomeArquivo);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível gerar a planilha. Tente de novo.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="modal-fundo" onClick={onClose}>
      <div className="modal modal--largo" role="dialog" aria-modal="true" aria-labelledby="titulo-crm" onClick={e => e.stopPropagation()}>
        <div className="modal__cab">
          <div style={{ minWidth: 0 }}>
            <p className="rotulo-peq">CRM político de base</p>
            <h2 id="titulo-crm">Lideranças e apoios: {municipioNome}</h2>
          </div>
          <button className="btn-icone" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="modal__corpo" ref={corpoRef}>
          <form onSubmit={handleSubmit} className={`form-lider ${editandoId ? 'is-editando' : ''}`}>
            {editandoId && <p className="form-lider__titulo span-2">Editando {form.nome || 'liderança'}</p>}
            <input ref={nomeRef} className="campo" type="text" placeholder="Nome da liderança / vereador *" aria-label="Nome" value={form.nome} onChange={campo('nome')} required />
            <select className="campo" value={form.cargo} onChange={campo('cargo')} aria-label="Cargo">
              <option value="Vereador">Vereador</option>
              <option value="Ex-Prefeito">Ex-Prefeito</option>
              <option value="Liderança Comunitária">Liderança Comunitária</option>
              <option value="Presidente de Partido">Presidente de Partido</option>
              <option value="Pastor / Liderança Religiosa">Pastor / Liderança Religiosa</option>
              {!['Vereador', 'Ex-Prefeito', 'Liderança Comunitária', 'Presidente de Partido', 'Pastor / Liderança Religiosa'].includes(form.cargo) && (
                <option value={form.cargo}>{form.cargo}</option>
              )}
            </select>
            <input className="campo" type="text" placeholder="Partido (ex: PL)" aria-label="Partido" value={form.partido} onChange={campo('partido')} />
            <input className="campo" type="tel" inputMode="tel" autoComplete="tel" placeholder="WhatsApp / telefone" aria-label="Telefone" value={form.telefone} onChange={campo('telefone')} />
            <select className="campo" value={form.alinhamento} onChange={campo('alinhamento')} aria-label="Alinhamento">
              <option value="ALTO">Alinhamento: alto (fiel)</option>
              <option value="MEDIO">Alinhamento: médio</option>
              <option value="EM CONQUISTA">Alinhamento: em conquista</option>
            </select>
            <input className="campo" type="text" placeholder="Observações / demandas" aria-label="Observações" value={form.notas} onChange={campo('notas')} />

            {editandoId ? (
              <div className="span-2 form-lider__acoes">
                <button type="button" className="btn" onClick={limparForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primario" disabled={salvando}>
                  <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            ) : (
              <button type="submit" className="btn btn--primario span-2" disabled={salvando}>
                <Plus size={16} /> {salvando ? 'Salvando...' : 'Registrar apoio político'}
              </button>
            )}
          </form>

          {erro && <div className="aviso-erro" role="alert"><p>{erro}</p></div>}
          {aviso && <p className="aviso-ok" role="status">{aviso}</p>}

          <div className="lider-lista__cab">
            <p className="rotulo-peq">
              {liderancas.length === 0 ? 'Nenhuma liderança registrada' : `${liderancas.length} ${liderancas.length === 1 ? 'liderança registrada' : 'lideranças registradas'}`}
            </p>
            <button className="btn btn--excel" onClick={exportarExcel} disabled={liderancas.length === 0 || exportando}>
              <FileSpreadsheet size={16} /> {exportando ? 'Gerando...' : 'Exportar Excel'}
            </button>
          </div>

          {liderancas.length === 0 ? (
            <p className="texto-vazio" style={{ textAlign: 'center', padding: '12px 0' }}>Use o formulário acima para registrar a primeira liderança de {municipioNome}.</p>
          ) : (
            liderancas.map(l => (
              <div key={l.id} className={`lider ${editandoId === l.id ? 'is-editando' : ''}`} style={{ borderLeftColor: corAlinhamento(l.alignment) }}>
                <div className="lider__info">
                  <div className="lider__topo">
                    <strong>{l.name}</strong>
                    <span className="lider__tag">{l.role}{l.party ? ` (${l.party})` : ''}</span>
                  </div>
                  <p className="lider__meta">
                    📞 {l.phone ? <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`}>{l.phone}</a> : 'Sem telefone'}
                    {l.notes ? ` · 📝 ${l.notes}` : ''}
                  </p>
                </div>
                <div className="lider__botoes">
                  <button className="btn-icone btn-icone--editar" onClick={() => editar(l)} title="Editar" aria-label={`Editar ${l.name}`}>
                    <Pencil size={17} />
                  </button>
                  <button className="btn-icone" onClick={() => excluirLideranca(l)} title="Excluir" aria-label={`Excluir ${l.name}`}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
