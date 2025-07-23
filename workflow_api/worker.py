
import os
import requests
import logging
import time
import shutil
import random

# --- Configurações ---
# A URL base da sua nova API de Workflow externa
API_BASE_URL = "http://localhost:4000" 
# ID do utilizador que o sistema usará para os logs de auditoria
SYSTEM_USER_ID = "u_system"
# Pasta para mover os scans que falharam no processamento
ERROR_FOLDER = r"E:\PASTA_SCANNER\_ERROS"
# Pasta para mover os scans após o sucesso
SUCCESS_FOLDER = r"E:\PASTA_SCANNER\_CONCLUIDOS"
# Pasta local no scanner para guardar uma cópia das miniaturas
LOCAL_THUMBS_PATH = r"E:\PASTA_SCANNER\_THUMBS"
# Pasta de rede para onde as miniaturas públicas devem ser copiadas no servidor central
REMOTE_PUBLIC_THUMBS_PATH = r"C:\path\to\your\flowvault-project\public\thumbs"
# ID deste scanner (para auditoria)
SCANNER_ID = "Scanner_Main_01"
# Estratégia de distribuição: 'PERCENTAGE', 'FIXED', ou 'WEIGHT'
DISTRIBUTION_STRATEGY = 'FIXED'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("worker.log"),
        logging.StreamHandler()
    ]
)

# --- Funções de Comunicação com a API ---

def get_storages():
    """Obtém a lista de storages ativos da API."""
    try:
        response = requests.get(f"{API_BASE_URL}/api/storages")
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Erro ao obter storages: {e}")
        return None

def get_storage_stats():
    """Obtém as estatísticas diárias de envio."""
    try:
        response = requests.get(f"{API_BASE_URL}/api/storages/stats")
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Erro ao obter estatísticas dos storages: {e}")
        return []

def get_book_id(book_name):
    """Obtém o bookId a partir do nome do livro (nome da pasta)."""
    try:
        response = requests.post(f"{API_BASE_URL}/api/books/byname", json={"bookName": book_name})
        if response.status_code == 200:
            return response.json().get('bookId')
        logging.error(f'Erro ao buscar bookId para "{book_name}": {response.status_code} {response.text}')
        return None
    except requests.exceptions.RequestException as e:
        logging.error(f'Erro de conexão ao buscar bookId para "{book_name}": {e}')
        return None

def complete_scan_process(payload):
    """Notifica a API que o processo de digitalização foi concluído."""
    try:
        # Este endpoint será criado na Fase 4
        # response = requests.post(f"{API_BASE_URL}/api/scan/complete", json=payload)
        # response.raise_for_status()
        logging.info(f"Simulação: Chamada a /api/scan/complete para o livro '{payload['bookId']}' bem-sucedida.")
        return True # Simular sucesso por agora
    except requests.exceptions.RequestException as e:
        # logging.error(f"Erro ao finalizar o processo de scan para '{payload['bookId']}': {e.response.text if e.response else e}")
        logging.error(f"Simulação: Erro ao chamar /api/scan/complete para '{payload['bookId']}'.")
        return False

# --- Funções de Lógica de Ficheiros ---

def choose_storage(storages, stats):
    """
    Decide para qual storage enviar os ficheiros com base na estratégia definida.
    """
    if not storages:
        return None

    # Adicionar estatísticas atuais a cada objeto de storage para facilitar
    stats_map = {s['storage_id']: s['total_tifs_enviados'] for s in stats}
    for storage in storages:
        storage['tifs_enviados_hoje'] = stats_map.get(storage['id'], 0)

    # --- Estratégia 1: Mínimo Fixo ---
    if DISTRIBUTION_STRATEGY == 'FIXED':
        storages_abaixo_minimo = [s for s in storages if s['tifs_enviados_hoje'] < s['minimo_diario_fixo']]
        if storages_abaixo_minimo:
            # Escolhe o que está mais longe de atingir o seu mínimo
            return min(storages_abaixo_minimo, key=lambda s: s['tifs_enviados_hoje'] / s['minimo_diario_fixo'] if s['minimo_diario_fixo'] > 0 else float('inf'))

    # --- Estratégia 2: Percentagem ---
    elif DISTRIBUTION_STRATEGY == 'PERCENTAGE':
        total_tifs_hoje = sum(s['tifs_enviados_hoje'] for s in storages)
        storages_abaixo_percentagem = []
        for s in storages:
            percentagem_atual = (s['tifs_enviados_hoje'] / (total_tifs_hoje + 1)) * 100 # +1 para evitar divisão por zero
            if percentagem_atual < s['percentual_minimo_diario']:
                storages_abaixo_percentagem.append(s)
        
        if storages_abaixo_percentagem:
             # Escolhe o que tem a menor percentagem atual
            return min(storages_abaixo_percentagem, key=lambda s: (s['tifs_enviados_hoje'] / (total_tifs_hoje + 1)) * 100)

    # --- Estratégia 3: Peso (Weighted Round-Robin) ou Fallback ---
    # Esta estratégia é usada se as outras não resultarem numa escolha, ou se for a estratégia principal.
    lista_ponderada = []
    for storage in storages:
        lista_ponderada.extend([storage] * storage['peso'])
    
    if not lista_ponderada:
        return None # Caso nenhum storage tenha peso > 0
        
    return random.choice(lista_ponderada)


def create_thumbnails(file_list, source_folder, local_thumb_folder):
    """
    Gera miniaturas para os ficheiros.
    Requer a biblioteca Pillow: pip install Pillow
    """
    try:
        from PIL import Image
    except ImportError:
        logging.error("A biblioteca Pillow não está instalada. Execute 'pip install Pillow' para criar miniaturas.")
        return []

    os.makedirs(local_thumb_folder, exist_ok=True)
    
    thumb_files = []
    for tif_file in file_list:
        try:
            source_path = os.path.join(source_folder, tif_file)
            thumb_filename = os.path.splitext(tif_file)[0] + ".jpg"
            thumb_path = os.path.join(local_thumb_folder, thumb_filename)
            
            with Image.open(source_path) as img:
                img.thumbnail((400, 550))
                img.convert("RGB").save(thumb_path, "JPEG", quality=85)

            thumb_files.append(thumb_filename)
        except Exception as e:
            logging.error(f"Erro ao criar miniatura para {tif_file}: {e}")
    
    return thumb_files

def handle_folder(folder_name, root_folder, storages, stats):
    """Processa uma única pasta de scanner."""
    folder_path = os.path.join(root_folder, folder_name)
    logging.info(f"--- Processando pasta: {folder_name} ---")

    book_id = get_book_id(folder_name)
    if not book_id:
        logging.error(f"Não foi possível obter um bookId para a pasta '{folder_name}'. A pasta será movida para erros.")
        shutil.move(folder_path, os.path.join(ERROR_FOLDER, folder_name))
        return

    # 1. Escolher o storage de destino
    target_storage = choose_storage(storages, stats)
    if not target_storage:
        logging.error("Nenhum storage ativo disponível. A processar mais tarde.")
        return
    logging.info(f"Storage de destino escolhido: '{target_storage['nome']}' (Estratégia: {DISTRIBUTION_STRATEGY})")


    # 2. Listar ficheiros e preparar caminhos
    tif_files = [f for f in os.listdir(folder_path) if f.lower().endswith('.tif')]
    if not tif_files:
        logging.warning(f"Nenhum ficheiro .tif encontrado em '{folder_name}'. A ignorar a pasta.")
        return

    destination_folder = os.path.join(target_storage['root_path'], folder_name)
    local_thumb_folder = os.path.join(LOCAL_THUMBS_PATH, folder_name)

    # 3. Criar miniaturas
    logging.info(f"A criar {len(tif_files)} miniaturas...")
    thumb_filenames = create_thumbnails(tif_files, folder_path, local_thumb_folder)

    # 4. Copiar ficheiros
    try:
        logging.info(f"A copiar {len(tif_files)} ficheiros originais para: {destination_folder}")
        shutil.copytree(folder_path, destination_folder, dirs_exist_ok=True)

        logging.info(f"A copiar {len(thumb_filenames)} miniaturas para o servidor público: {REMOTE_PUBLIC_THUMBS_PATH}")
        os.makedirs(REMOTE_PUBLIC_THUMBS_PATH, exist_ok=True)
        for thumb in thumb_filenames:
            shutil.copy2(os.path.join(local_thumb_folder, thumb), os.path.join(REMOTE_PUBLIC_THUMBS_PATH, thumb))
            
    except Exception as e:
        logging.error(f"Erro crítico ao copiar ficheiros para '{folder_name}': {e}. A mover para a pasta de erros.")
        shutil.move(folder_path, os.path.join(ERROR_FOLDER, folder_name))
        return
        
    # 5. Preparar payload e notificar API
    file_list_payload = []
    for i, tif_name in enumerate(tif_files):
        thumb_name = os.path.splitext(tif_name)[0] + ".jpg"
        file_list_payload.append({
            "fileName": f"{folder_name} - Page {i + 1}",
            "originalFileName": tif_name,
            "imageUrl": f"/thumbs/{thumb_name}" # URL relativa à pasta pública
        })
    
    scan_complete_payload = {
        "bookId": book_id,
        "scannerId": SCANNER_ID,
        "fileList": file_list_payload
    }

    if complete_scan_process(scan_complete_payload):
        logging.info(f"Sucesso! A mover '{folder_name}' para a pasta de concluídos.")
        shutil.move(folder_path, os.path.join(SUCCESS_FOLDER, folder_name))
    else:
        logging.error(f"A API retornou um erro para '{folder_name}'. A mover para a pasta de erros para análise.")
        shutil.move(folder_path, os.path.join(ERROR_FOLDER, folder_name))


def main():
    """Função principal do worker."""
    logging.info("--- Worker de Scanner iniciado ---")
    
    # Criar pastas de suporte se não existirem
    os.makedirs(ERROR_FOLDER, exist_ok=True)
    os.makedirs(SUCCESS_FOLDER, exist_ok=True)
    os.makedirs(LOCAL_THUMBS_PATH, exist_ok=True)
    
    # 1. Obter configuração da API
    storages = get_storages()
    stats = get_storage_stats()

    if not storages:
        logging.error("Não foi possível obter a lista de storages. A sair.")
        return

    # 2. Encontrar pastas para processar
    scanner_root_folder = r"E:\PASTA_SCANNER"
    
    try:
        folders_to_process = [d for d in os.listdir(scanner_root_folder) if os.path.isdir(os.path.join(scanner_root_folder, d)) and not d.startswith('_')]
    except FileNotFoundError:
        logging.error(f"A pasta do scanner '{scanner_root_folder}' não foi encontrada.")
        return
        
    if not folders_to_process:
        logging.info("Nenhuma pasta nova para processar.")
        return

    logging.info(f"Encontradas {len(folders_to_process)} pastas para processar: {', '.join(folders_to_process)}")
    
    # 3. Processar cada pasta
    for folder_name in folders_to_process:
        handle_folder(folder_name, scanner_root_folder, storages, stats)
        # Atualizar stats para a próxima iteração, simulando o envio
        # Numa implementação real, poderíamos chamar a API de stats novamente
        # ou atualizar localmente
        if stats and storages:
             chosen = choose_storage(storages, stats)
             if chosen:
                for stat in stats:
                    if stat['storage_id'] == chosen['id']:
                        stat['total_tifs_enviados'] += len([f for f in os.listdir(os.path.join(scanner_root_folder, folder_name)) if f.lower().endswith('.tif')])
                        break
        
        time.sleep(1) # Pequena pausa entre pastas

    logging.info("--- Ciclo do worker concluído ---")

if __name__ == "__main__":
    main()

    