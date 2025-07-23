
import os
import requests
import logging
import time
import shutil

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
# Exemplo para Windows: \\\\192.168.1.100\\public\\thumbs
# Exemplo para Linux: /mnt/servidor_central/public/thumbs
REMOTE_PUBLIC_THUMBS_PATH = r"C:\path\to\your\flowvault-project\public\thumbs"


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
        response = requests.post(f"{API_BASE_URL}/api/scan/complete", json=payload)
        response.raise_for_status()
        logging.info(f"Processo de scan para o livro '{payload['bookId']}' finalizado com sucesso via API.")
        return True
    except requests.exceptions.RequestException as e:
        logging.error(f"Erro ao finalizar o processo de scan para '{payload['bookId']}': {e.response.text if e.response else e}")
        return False

# --- Funções de Lógica de Ficheiros ---

def choose_storage(storages, stats):
    """Lógica de decisão para escolher o melhor storage (pode ser melhorada)."""
    # Por agora, uma lógica simples: devolve o primeiro da lista.
    # TODO: Implementar a lógica de distribuição com base nos mínimos e pesos.
    if storages:
        return storages[0]
    return None

def create_thumbnails(file_list, source_folder, local_thumb_folder):
    """
    Gera miniaturas para os ficheiros.
    NOTA: Esta é uma função de exemplo. A conversão de .tif para .jpg/.png
    requer uma biblioteca como a Pillow (PIL) ou Wand (ImageMagick).
    `pip install Pillow`
    """
    from PIL import Image
    os.makedirs(local_thumb_folder, exist_ok=True)
    
    thumb_files = []
    for tif_file in file_list:
        try:
            source_path = os.path.join(source_folder, tif_file)
            # Converte o nome do ficheiro para .jpg para a miniatura
            thumb_filename = os.path.splitext(tif_file)[0] + ".jpg"
            thumb_path = os.path.join(local_thumb_folder, thumb_filename)
            
            with Image.open(source_path) as img:
                img.thumbnail((400, 550)) # Redimensiona a imagem
                img.convert("RGB").save(thumb_path, "JPEG", quality=85)

            thumb_files.append(thumb_filename)
        except Exception as e:
            logging.error(f"Erro ao criar miniatura para {tif_file}: {e}")
            # Continua mesmo que uma miniatura falhe
    
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

    # 2. Listar ficheiros e preparar caminhos
    tif_files = [f for f in os.listdir(folder_path) if f.lower().endswith('.tif')]
    if not tif_files:
        logging.warning(f"Nenhum ficheiro .tif encontrado em '{folder_name}'. A ignorar a pasta.")
        return

    destination_folder = os.path.join(target_storage['root_path'], folder_name)
    local_thumb_folder = os.path.join(LOCAL_THUMBS_PATH, folder_name)
    remote_thumb_folder = os.path.join(REMOTE_PUBLIC_THUMBS_PATH, folder_name)

    # 3. Criar miniaturas
    logging.info(f"A criar {len(tif_files)} miniaturas...")
    thumb_filenames = create_thumbnails(tif_files, folder_path, local_thumb_folder)

    # 4. Copiar ficheiros
    try:
        logging.info(f"A copiar {len(tif_files)} ficheiros originais para: {destination_folder}")
        shutil.copytree(folder_path, destination_folder, dirs_exist_ok=True)

        logging.info(f"A copiar {len(thumb_filenames)} miniaturas para o servidor público: {remote_thumb_folder}")
        os.makedirs(remote_thumb_folder, exist_ok=True)
        for thumb in thumb_filenames:
            shutil.copy2(os.path.join(local_thumb_folder, thumb), remote_thumb_folder)
            
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
            "imageUrl": f"/thumbs/{folder_name}/{thumb_name}"
        })
    
    scan_complete_payload = {
        "bookId": book_id,
        "scannerId": "Scanner_Main_01", # Pode ser obtido de um ficheiro de config local do worker
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
    # NOTA: Adapte o `scanner_root_folder` para obter a partir de uma config se este worker for correr para múltiplos scanners
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
        time.sleep(1) # Pequena pausa entre pastas

    logging.info("--- Ciclo do worker concluído ---")

if __name__ == "__main__":
    # Para um serviço real, você colocaria o `main()` dentro de um loop com um `time.sleep()`.
    # Exemplo:
    # while True:
    #     main()
    #     print("Aguardando 60 segundos para o próximo ciclo...")
    #     time.sleep(60)
    main()

