import pandas as pd
import psycopg2

# Conexão à base de dados local utilizando a senha 'admin123'
conn = psycopg2.connect(
    dbname="mapa_eleitoral",
    user="postgres",
    password="admin123",
    host="localhost",
    port=5434
)
cursor = conn.cursor()
print("Conectado ao banco de dados local com sucesso!")

# 1. Importar Municípios e Emendas do Excel de Emendas
try:
    df_emendas = pd.read_excel('Emendas. JEFFERSON CAMPOS. - Copia.xlsx', sheet_name='Planilha1')
    for _, row in df_emendas.iterrows():
        muni = row.get('Município') or row.get('Municipio')
        emp = row.get('Empenhado')
        if pd.notna(muni) and pd.notna(emp):
            muni_str = str(muni).strip()
            val = float(emp)
            
            # Inserir município se não existir
            cursor.execute("INSERT INTO \"Municipality\" (name, state, \"createdAt\", \"updatedAt\") VALUES (%s, 'SP', NOW(), NOW()) ON CONFLICT (name) DO NOTHING;", (muni_str,))
            
            # Obter ID do município
            cursor.execute("SELECT id FROM \"Municipality\" WHERE name = %s;", (muni_str,))
            muni_id = cursor.fetchone()[0]
            
            # Inserir emenda
            cursor.execute("INSERT INTO \"Amendment\" (id, \"municipalityId\", amount, description, \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), %s, %s, 'Emenda Parlamentar', NOW(), NOW());", (muni_id, val))
    print("✅ Emendas importadas para o banco local!")
except Exception as e:
    print(f"Erro nas emendas: {e}")

# 2. Importar Votação 2022
try:
    df_voto = pd.read_excel('VOTAÇÃO 2022 - JC - CC.xlsx', sheet_name='GERAL 2022')
    for _, row in df_voto.iterrows():
        muni = row.get('CIDADE')
        votos = row.get('JEFFERSON CAMPOS 2022')
        if pd.notna(muni) and pd.notna(votos):
            muni_str = str(muni).strip()
            v_val = int(votos)
            
            cursor.execute("INSERT INTO \"Municipality\" (name, state, \"createdAt\", \"updatedAt\") VALUES (%s, 'SP', NOW(), NOW()) ON CONFLICT (name) DO NOTHING;", (muni_str,))
            cursor.execute("SELECT id FROM \"Municipality\" WHERE name = %s;", (muni_str,))
            muni_id = cursor.fetchone()[0]
            
            cursor.execute("INSERT INTO \"ElectoralResult\" (id, \"municipalityId\", \"electionYear\", \"candidateName\", votes, \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), %s, 2022, 'Jefferson Campos', %s, NOW(), NOW());", (muni_id, v_val))
    print("✅ Votação 2022 importada para o banco local!")
except Exception as e:
    print(f"Erro na votação: {e}")

conn.commit()
cursor.close()
conn.close()
print("🎉 Importação local concluída com sucesso!")