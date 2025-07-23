import os
import requests
import logging
import time
import shutil
import random

# --- Configurações ---
API_BASE_URL = "http://localhost:4000"
SYSTEM_USER_ID = "u_system"
DISTRIBUTION_STRATEGY = 'FIXED'  # 'PERCENTAGE', 'FIXED', ou 'WEIGHT'
REMOTE_PUBLIC_THUMBS_PATH = r"C:\path\to\your\flowvault-project\public\thumbs" # Substitua pelo caminho real

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("worker.log"),
        logging.StreamHandler()
    ]
)

# --- Funções de Comunicação com a API ---
def get_api_config(endpoint):
    try:
        response = requests.get(f"{API_BASE_URL}/api{endpoint}")
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Erro ao obter configuração do endpoint '{endpoint}': {e}")
        return None

def get_book_id(book_name):
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
    try:
        response = requests.post(f"{API_BASE_URL}/api/scan/complete", json=payload)
        response.raise_for_status()
        logging.info(f"Finalização do scan registada com sucesso para o livro '{payload['bookId']}'.")
        return True
    except requests.exceptions.RequestException as e:
        error_text = e.response.text if e.response else str(e)
        logging.error(f"Erro ao finalizar o processo de scan para '{payload['bookId']}': {error_text}")
        return False

# --- Lógica de Ficheiros e Distribuição ---
def choose_storage(storages, stats):
    if not storages:
        return None

    stats_map = {s['storage_id']: s['total_tifs_enviados'] for s in stats}
    for storage in storages:
        storage['tifs_enviados_hoje'] = stats_map.get(storage['id'], 0)

    if DISTRIBUTION_STRATEGY == 'FIXED':
        storages_abaixo_minimo = [s for s in storages if s['tifs_enviados_hoje'] < s['minimo_diario_fixo']]
        if storages_abaixo_minimo:
            return min(storages_abaixo_minimo, key=lambda s: s['tifs_enviados_hoje'] / s['minimo_diario_fixo'] if s['minimo_diario_fixo'] > 0 else float('inf'))
    elif DISTRIBUTION_STRATEGY == 'PERCENTAGE':
        total_tifs_hoje = sum(s['tifs_enviados_hoje'] for s in storages)
        storages_abaixo_percentagem = []
        for s in storages:
            percentagem_atual = (s['tifs_enviados_hoje'] / (total_tifs_hoje + 1)) * 100
            if percentagem_atual < s['percentual_minimo_diario']:
                storages_abaixo_percentagem.append(s)
        if storages_abaixo_percentagem:
            return min(storages_abaixo_percentagem, key=lambda s: (s['tifs_enviados_hoje'] / (total_tifs_hoje + 1)) * 100)

    lista_ponderada = []
    for storage in storages:
        lista_ponderada.extend([storage] * storage['peso'])
    
    return random.choice(lista_ponderada) if lista_ponderada else (random.choice(storages) if storages else None)

def create_thumbnails(file_list, source_folder, local_thumb_folder):
    try:
        from PIL import Image
    except ImportError:
        logging.error("A biblioteca Pillow não está instalada. Execute 'pip install Pillow'. As miniaturas não serão criadas.")
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

def handle_folder(scanner, folder_name, storages, stats):
    folder_path = os.path.join(scanner['scanner_root_folder'], folder_name)
    logging.info(f"--- Processando: {folder_name} (Scanner: {scanner['nome']}) ---")

    book_id = get_book_id(folder_name)
    if not book_id:
        logging.error(f"bookId não encontrado para '{folder_name}'. A mover para erros.")
        shutil.move(folder_path, os.path.join(scanner['error_folder'], folder_name))
        return

    target_storage = choose_storage(storages, stats)
    if not target_storage:
        logging.error("Nenhum storage disponível. A tentar mais tarde.")
        return
    logging.info(f"Storage destino: '{target_storage['nome']}' (Estratégia: {DISTRIBUTION_STRATEGY})")

    tif_files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.tif', '.tiff'))]
    if not tif_files:
        logging.warning(f"Nenhum ficheiro .tif/.tiff em '{folder_name}'. A ignorar.")
        return
        
    destination_folder = os.path.join(target_storage['root_path'], "001-storage", folder_name)
    local_thumb_folder = os.path.join(scanner['local_thumbs_path'], folder_name)
    
    # A lógica de log de transferência será adicionada na próxima fase.
    logId = "temp_log_id" # Placeholder
    
    try:
        logging.info(f"A criar {len(tif_files)} miniaturas...")
        thumb_filenames = create_thumbnails(tif_files, folder_path, local_thumb_folder)

        logging.info(f"A copiar {len(tif_files)} ficheiros para: {destination_folder}")
        shutil.copytree(folder_path, destination_folder, dirs_exist_ok=True)

        logging.info(f"A copiar {len(thumb_filenames)} miniaturas para a pasta pública: {REMOTE_PUBLIC_THUMBS_PATH}")
        os.makedirs(REMOTE_PUBLIC_THUMBS_PATH, exist_ok=True)
        for thumb in thumb_filenames:
            shutil.copy2(os.path.join(local_thumb_folder, thumb), os.path.join(REMOTE_PUBLIC_THUMBS_PATH, thumb))

    except Exception as e:
        logging.error(f"Erro ao copiar ficheiros para '{folder_name}': {e}. A mover para a pasta de erros.")
        shutil.move(folder_path, os.path.join(scanner['error_folder'], folder_name))
        return

    file_list_payload = []
    for i, tif_name in enumerate(tif_files):
        thumb_name = os.path.splitext(tif_name)[0] + ".jpg"
        file_list_payload.append({
            "fileName": f"{folder_name} - Page {i + 1}",
            "originalFileName": tif_name,
            "imageUrl": f"/thumbs/{thumb_name}" # URL público
        })
    
    scan_complete_payload = {
        "bookId": book_id,
        "fileList": file_list_payload,
        "logId": logId # Enviar o ID do log para a API
    }

    if complete_scan_process(scan_complete_payload):
        logging.info(f"Sucesso! A mover '{folder_name}' para a pasta de concluídos.")
        shutil.move(folder_path, os.path.join(scanner['success_folder'], folder_name))
        # Limpar pasta de thumbs local
        shutil.rmtree(local_thumb_folder, ignore_errors=True)
    else:
        logging.error(f"A API retornou um erro para '{folder_name}'. A mover para a pasta de erros.")
        shutil.move(folder_path, os.path.join(scanner['error_folder'], folder_name))

def main():
    logging.info("--- Worker de Scanner iniciado ---")
    
    scanners = get_api_config('/scanners')
    storages = get_api_config('/storages')
    stats = get_api_config('/storages/stats')

    if not scanners or not storages:
        logging.error("Não foi possível obter a configuração de scanners ou storages da API. A sair.")
        return

    for scanner in scanners:
        logging.info(f"=== Verificando Scanner: {scanner['nome']} em '{scanner['scanner_root_folder']}' ===")
        
        os.makedirs(scanner['error_folder'], exist_ok=True)
        os.makedirs(scanner['success_folder'], exist_ok=True)
        os.makedirs(scanner['local_thumbs_path'], exist_ok=True)
        
        try:
            folders_to_process = [d for d in os.listdir(scanner['scanner_root_folder']) if os.path.isdir(os.path.join(scanner['scanner_root_folder'], d)) and not d.startswith('_')]
        except FileNotFoundError:
            logging.error(f"A pasta do scanner '{scanner['scanner_root_folder']}' não foi encontrada.")
            continue
            
        if not folders_to_process:
            logging.info(f"Nenhuma pasta nova para processar no scanner {scanner['nome']}.")
            continue

        logging.info(f"Encontradas {len(folders_to_process)} pastas: {', '.join(folders_to_process)}")
        
        for folder_name in folders_to_process:
            handle_folder(scanner, folder_name, storages, stats)
            time.sleep(1)

    logging.info("--- Ciclo do worker concluído ---")

if __name__ == "__main__":
    while True:
        main()
        logging.info("A aguardar 60 segundos para o próximo ciclo...")
        time.sleep(60)

    