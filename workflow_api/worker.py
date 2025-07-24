
import os
import requests
import logging
import time
import shutil
import random

# --- Configurações de Logging ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("worker.log"),
        logging.StreamHandler()
    ]
)

# --- Constantes ---
API_BASE_URL = "http://localhost:4000"
DISTRIBUTION_STRATEGY = 'FIXED'

# --- Funções de Comunicação com a API ---

def get_full_config():
    """Obtém a configuração completa de scanners e storages da API."""
    try:
        scanners_resp = requests.get(f"{API_BASE_URL}/api/scanners")
        scanners_resp.raise_for_status()
        
        storages_resp = requests.get(f"{API_BASE_URL}/api/storages")
        storages_resp.raise_for_status()

        stats_resp = requests.get(f"{API_BASE_URL}/api/storages/stats")
        stats_resp.raise_for_status()

        return {
            "scanners": scanners_resp.json(),
            "storages": storages_resp.json(),
            "stats": stats_resp.json()
        }
    except requests.exceptions.RequestException as e:
        logging.error(f"Erro ao obter configuração da API: {e}")
        return None

def get_book_id(book_name):
    """Obtém o ID de um livro pelo nome."""
    try:
        response = requests.post(f"{API_BASE_URL}/api/books/byname", json={"bookName": book_name})
        if response.status_code == 200:
            return response.json().get('bookId')
        logging.error(f'Erro ao buscar bookId para "{book_name}": {response.status_code} {response.text}')
        return None
    except requests.exceptions.RequestException as e:
        logging.error(f'Erro de conexão ao buscar bookId para "{book_name}": {e}')
        return None

def upload_thumbnail(thumb_path, original_name, book_name):
    """Faz o upload de uma miniatura para a API, incluindo o nome do livro."""
    try:
        with open(thumb_path, 'rb') as f:
            files = {'thumbnail': (original_name, f, 'image/jpeg')}
            data = {'originalName': original_name, 'bookName': book_name}
            response = requests.post(f"{API_BASE_URL}/api/upload/thumbnail", files=files, data=data)
            response.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        logging.error(f"Erro ao fazer upload da miniatura {original_name}: {e}")
        return False

def complete_scan_process(payload):
    """Notifica a API que o processo de digitalização foi concluído."""
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
    """Lógica de decisão para escolher o melhor storage."""
    if not storages: return None
    stats_map = {s['storage_id']: s['total_tifs_enviados'] for s in stats}
    for storage in storages:
        storage['tifs_enviados_hoje'] = stats_map.get(storage['id'], 0)
    
    if DISTRIBUTION_STRATEGY == 'FIXED':
        storages_abaixo_minimo = [s for s in storages if s['tifs_enviados_hoje'] < s['minimo_diario_fixo']]
        if storages_abaixo_minimo:
            return min(storages_abaixo_minimo, key=lambda s: (s['tifs_enviados_hoje'] / s['minimo_diario_fixo']) if s['minimo_diario_fixo'] > 0 else float('inf'))
    elif DISTRIBUTION_STRATEGY == 'PERCENTAGE':
        total_tifs_hoje = sum(s['tifs_enviados_hoje'] for s in storages)
        storages_abaixo_percentagem = []
        for s in storages:
            percentagem_atual = (s['tifs_enviados_hoje'] / (total_tifs_hoje + 1)) * 100
            if percentagem_atual < s['percentual_minimo_diario']:
                storages_abaixo_percentagem.append(s)
        if storages_abaixo_percentagem:
            return min(storages_abaixo_percentagem, key=lambda s: (s['tifs_enviados_hoje'] / (total_tifs_hoje + 1)) * 100)
    
    lista_ponderada = [s for s in storages for _ in range(s.get('peso', 1))]
    return random.choice(lista_ponderada) if lista_ponderada else None

def create_and_upload_thumbnails(tif_files, source_folder, local_thumb_folder, book_name):
    """Cria miniaturas, guarda localmente e faz o upload para o servidor central."""
    try:
        from PIL import Image
    except ImportError:
        logging.error("A biblioteca Pillow não está instalada. Execute 'pip install Pillow'. As miniaturas não serão criadas.")
        return []

    os.makedirs(local_thumb_folder, exist_ok=True)
    uploaded_thumbs_info = []
    for tif_file in tif_files:
        try:
            source_path = os.path.join(source_folder, tif_file)
            thumb_filename = f"{os.path.splitext(tif_file)[0]}.jpg"
            local_thumb_path = os.path.join(local_thumb_folder, thumb_filename)
            
            with Image.open(source_path) as img:
                img.seek(0)
                img.thumbnail((400, 550))
                img.convert("RGB").save(local_thumb_path, "JPEG", quality=85)
            
            # Envia o nome do livro junto com a miniatura
            if upload_thumbnail(local_thumb_path, thumb_filename, book_name):
                uploaded_thumbs_info.append({
                    "originalTif": tif_file,
                    "imageUrl": f"/{book_name}/{thumb_filename}"
                })
            else:
                logging.error(f"Falha no upload da miniatura para {tif_file}, o processo para este livro será abortado.")
                return None

        except Exception as e:
            logging.error(f"Erro ao criar/enviar miniatura para {tif_file}: {e}")
            return None
            
    return uploaded_thumbs_info

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

    tif_files = sorted([f for f in os.listdir(folder_path) if f.lower().endswith(('.tif', '.tiff'))])
    if not tif_files:
        logging.warning(f"Nenhum ficheiro .tif/.tiff em '{folder_name}'. A mover para a pasta de sucesso (vazio).")
        shutil.move(folder_path, os.path.join(scanner['success_folder'], folder_name))
        return

    # --- Criação e Upload de Miniaturas ---
    logging.info(f"A criar e a fazer upload de {len(tif_files)} miniaturas...")
    thumb_info_list = create_and_upload_thumbnails(tif_files, folder_path, scanner['local_thumbs_path'], folder_name)
    if thumb_info_list is None:
        logging.error(f"Erro no processamento de miniaturas para '{folder_name}'. A mover para a pasta de erros.")
        shutil.move(folder_path, os.path.join(scanner['error_folder'], folder_name))
        return

    # --- Cópia para Storage ---
    try:
        destination_folder = os.path.join(target_storage['root_path'], "001-storage", folder_name)
        storage_thumb_folder = os.path.join(target_storage['thumbs_path'], folder_name)

        logging.info(f"A copiar {len(tif_files)} ficheiros .tif para: {destination_folder}")
        shutil.copytree(folder_path, destination_folder, dirs_exist_ok=True)
        
        logging.info(f"A copiar {len(thumb_info_list)} miniaturas locais para o storage: {storage_thumb_folder}")
        if os.path.exists(scanner['local_thumbs_path']):
            shutil.copytree(scanner['local_thumbs_path'], storage_thumb_folder, dirs_exist_ok=True)
    
    except Exception as e:
        logging.error(f"Erro ao copiar ficheiros para o storage para '{folder_name}': {e}. A mover para a pasta de erros.")
        shutil.move(folder_path, os.path.join(scanner['error_folder'], folder_name))
        return

    # --- Finalizar Processo ---
    scan_complete_payload = { "bookId": book_id, "fileList": thumb_info_list }
    if complete_scan_process(scan_complete_payload):
        logging.info(f"Sucesso! A mover '{folder_name}' para a pasta de concluídos.")
        shutil.move(folder_path, os.path.join(scanner['success_folder'], folder_name))
        if os.path.exists(scanner['local_thumbs_path']):
            shutil.rmtree(scanner['local_thumbs_path']) # Limpa pasta local de thumbs
    else:
        logging.error(f"A API retornou um erro ao finalizar '{folder_name}'. A mover para a pasta de erros.")
        shutil.move(folder_path, os.path.join(scanner['error_folder'], folder_name))

def main():
    logging.info("--- Worker de Scanner iniciado ---")
    
    config_data = get_full_config()
    if not config_data:
        logging.error("Não foi possível obter a configuração da API. A sair.")
        return
        
    scanners = config_data.get('scanners', [])
    storages = config_data.get('storages', [])
    stats = config_data.get('stats', [])
    
    if not scanners or not storages:
        logging.error("Configuração de scanners ou storages está em falta. A sair.")
        return

    for scanner in scanners:
        logging.info(f"=== Verificando Scanner: {scanner['nome']} em '{scanner['scanner_root_folder']}' ===")
        os.makedirs(scanner['error_folder'], exist_ok=True)
        os.makedirs(scanner['success_folder'], exist_ok=True)
        
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
            # Limpa a pasta de miniaturas local antes de cada livro
            if os.path.exists(scanner['local_thumbs_path']):
                shutil.rmtree(scanner['local_thumbs_path'])
            os.makedirs(scanner['local_thumbs_path'])
            
            handle_folder(scanner, folder_name, storages, stats)
            time.sleep(1)

    logging.info("--- Ciclo do worker concluído ---")

if __name__ == "__main__":
    while True:
        try:
            main()
        except Exception as e:
            logging.critical(f"Erro fatal no ciclo principal do worker: {e}", exc_info=True)
        logging.info("A aguardar 60 segundos para o próximo ciclo...")
        time.sleep(60)

    