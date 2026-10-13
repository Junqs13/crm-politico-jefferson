import os

def raio_x_projeto(diretorio="."):
    print(f"🔍 [RAIO-X] A analisar o diretório: {os.path.abspath(diretorio)}\n")
    
    pastas_ignoradas = ['node_modules', '.git', 'dist', '.next', 'build']
    total_tamanho = 0
    contador_arquivos = 0
    
    print(f"{'CAMINHO DO FICHEIRO':<50} | {'TAMANHO (KB)':<15} | {'ESTADO / RECOMENDAÇÃO'}")
    print("-" * 90)
    
    for root, dirs, files in os.walk(diretorio):
        # Remove pastas de sistema/dependências para não poluir
        dirs[:] = [d for d in dirs if d not in pastas_ignoradas]
        
        for file in files:
            caminho_completo = os.path.join(root, file)
            tamanho_kb = os.path.getsize(caminho_completo) / 1024
            total_tamanho += tamanho_kb
            contador_arquivos += 1
            
            # Regras de recomendação de limpeza ou uso
            status = "Mantém (Ativo)"
            if file.endswith('.sql') and 'backup' in file:
                status = "⚠️ Opcional (Backup antigo - pode deletar se já importou)"
            elif file.endswith('.py') and 'import_' not in file and file != 'raio_x.py':
                status = "🔧 Utilitário auxiliar"
            elif file.endswith('.xlsx') or file.endswith('.csv'):
                status = "📊 Dados Brutos Oficiais (Essencial)"
            elif file in ['package.json', 'schema.prisma', 'import_local.py']:
                status = "⚙️ Configuração / Script Principal"
            
            print(f"{caminho_completo:<50} | {tamanho_kb:>10.2f} KB   | {status}")

    print("-" * 90)
    print(f"📦 Total de ficheiros analisados: {contador_arquivos}")
    print(f"💾 Espaço total ocupado: {total_tamanho:.2f} KB\n")

if __name__ == "__main__":
    raio_x_projeto(".")