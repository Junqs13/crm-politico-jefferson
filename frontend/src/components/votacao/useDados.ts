import { useCallback, useEffect, useState } from 'react';

/*
  Busca dados assíncronos ligados a uma chave (cidade, cargo...).
  "carregando" vale enquanto a resposta guardada não for da chave atual,
  então trocar de cidade mostra o esqueleto sem piscar dados antigos.
*/
export function useDados<T>(chave: string, buscar: () => Promise<T>) {
  const [estado, setEstado] = useState<{ chave: string; dados?: T; erro?: boolean }>({ chave: '' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    buscar()
      .then((dados) => ativo && setEstado({ chave, dados }))
      .catch(() => ativo && setEstado({ chave, erro: true }));
    return () => {
      ativo = false;
    };
    // buscar muda a cada render; a chave e a tentativa decidem quando buscar de novo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((t) => t + 1), []);
  const atual = estado.chave === chave;
  return {
    dados: atual ? estado.dados : undefined,
    erro: atual && !!estado.erro,
    carregando: !atual,
    tentarDeNovo,
  };
}
