import { api } from '../../services/api';
import { votacao, nomeProprio, textoSituacao } from '../../services/votacao';
import type { Lideranca } from '../../tipos';
import { useDados } from './useDados';
import { Esqueleto, FalhaCarga } from './Blocos';
import { fmt, fmtPct } from './formato';

const ALINHAMENTO: Record<string, { texto: string; cor: string }> = {
  ALTO: { texto: 'Alto', cor: '#4ade80' },
  MEDIO: { texto: 'Médio', cor: '#facc15' },
  'EM CONQUISTA': { texto: 'Em conquista', cor: '#f87171' },
};

/* Tela 6: quem teve voto forte na cidade e não se elegeu, ao lado das lideranças já no CRM */
export function AliadosCidade({ ibge, municipioId, nome }: { ibge: string; municipioId: string; nome: string }) {
  const aliados = useDados(`aliados-${ibge}`, () => votacao.aliadosCidade(ibge, 5));
  const crm = useDados(`crm-${municipioId}`, () => api.get<Lideranca[]>(`/leaderships/${municipioId}`).then((r) => r.data));

  return (
    <div className="vt">
      <p className="vt-nota">
        Candidatos a deputado que tiveram voto forte em {nome} em 2026 e não se elegeram. São nomes com base local que podem somar em 2030.
      </p>
      {aliados.carregando ? (
        <Esqueleto linhas={4} altura={44} />
      ) : aliados.erro || !aliados.dados ? (
        <FalhaCarga aoTentar={aliados.tentarDeNovo} />
      ) : (
        aliados.dados.porCargo.map((g) => (
          <section key={g.cargo} className="vt-bloco">
            <h4>{g.cargo === 'federal' ? 'Federais não eleitos' : 'Estaduais não eleitos'}</h4>
            {g.candidatos.length === 0 ? (
              <p className="vt-nota">Nenhum não eleito com voto aqui.</p>
            ) : (
              <ul className="vt-aliados">
                {g.candidatos.map((c) => (
                  <li key={c.id}>
                    <div>
                      <strong>{nomeProprio(c.nomeUrna)}</strong>
                      <span>
                        {c.partido} · {textoSituacao(c.situacao)} · {c.posicao}º na cidade
                      </span>
                    </div>
                    <span className="num vt-aliados__votos">
                      {fmt(c.votos)}
                      <small>{fmtPct(c.pct)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}

      <section className="vt-bloco">
        <h4>Lideranças já no CRM</h4>
        {crm.carregando ? (
          <Esqueleto linhas={2} altura={40} />
        ) : crm.erro || !crm.dados ? (
          <FalhaCarga aoTentar={crm.tentarDeNovo} texto="Não foi possível carregar as lideranças." />
        ) : crm.dados.length === 0 ? (
          <p className="vt-nota">Nenhuma liderança cadastrada em {nome}. Use o botão Lideranças para registrar.</p>
        ) : (
          <ul className="vt-aliados">
            {crm.dados.map((l) => (
              <li key={l.id}>
                <div>
                  <strong>{l.name}</strong>
                  <span>
                    {l.role}
                    {l.party ? ` · ${l.party}` : ''}
                    {l.notes ? ` · ${l.notes}` : ''}
                  </span>
                </div>
                <span className="vt-chip" style={{ color: ALINHAMENTO[l.alignment]?.cor }}>
                  {ALINHAMENTO[l.alignment]?.texto ?? l.alignment}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
