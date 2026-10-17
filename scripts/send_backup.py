import os
import json
import glob
import datetime
import urllib.request
import urllib.parse

BACKUP_BOT_TOKEN = os.environ.get('BACKUP_TG_BOT_TOKEN', '')
USERS_DIR = 'users'
BACKUP_LOG_FILE = 'scripts/backup_log.json'

def send_telegram_document(bot_token: str, chat_id: str, file_path: str, caption: str):
    if not bot_token or not chat_id or not os.path.exists(file_path):
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    
    with open(file_path, 'rb') as f:
        file_bytes = f.read()

    filename = os.path.basename(file_path)
    body = bytearray()
    
    # chat_id
    body.extend(f'--{boundary}\r\n'.encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="chat_id"\r\n\r\n{chat_id}\r\n'.encode('utf-8'))
    
    # caption
    body.extend(f'--{boundary}\r\n'.encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="caption"\r\n\r\n{caption}\r\n'.encode('utf-8'))

    # document
    body.extend(f'--{boundary}\r\n'.encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="document"; filename="{filename}"\r\n'.encode('utf-8'))
    body.extend(b'Content-Type: application/json\r\n\r\n')
    body.extend(file_bytes)
    body.extend(b'\r\n')
    body.extend(f'--{boundary}--\r\n'.encode('utf-8'))

    req = urllib.request.Request(
        url,
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Backup sent successfully to {chat_id}")
            return True
    except Exception as e:
        print(f"Error sending backup to {chat_id}: {e}")
        return False

def main():
    if not os.path.exists(USERS_DIR) or not BACKUP_BOT_TOKEN:
        print("Users directory or BACKUP_BOT_TOKEN is missing.")
        return

    backup_log = {}
    if os.path.exists(BACKUP_LOG_FILE):
        try:
            with open(BACKUP_LOG_FILE, 'r', encoding='utf-8') as f:
                backup_log = json.load(f)
        except Exception:
            backup_log = {}

    log_updated = False
    now = datetime.datetime.now(datetime.timezone.utc)
    now_ts = int(now.timestamp())

    user_files = glob.glob(os.path.join(USERS_DIR, "*.json"))

    for u_file in user_files:
        try:
            with open(u_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Skipping corrupt file {u_file}: {e}")
            continue

        settings = data.get('settings', {})
        chat_id = str(settings.get('notifTgChatId', '')).strip()
        interval = settings.get('tgBackupInterval', 'daily')

        if not chat_id or interval in ['disabled', 'on_change']:
            continue

        intervals_sec = {
            'daily': 24 * 3600,
            '3days': 3 * 24 * 3600,
            'weekly': 7 * 24 * 3600
        }

        needed_interval = intervals_sec.get(interval, 24 * 3600)
        last_backup_ts = backup_log.get(chat_id, 0)

        if now_ts - last_backup_ts >= needed_interval:
            date_str = now.strftime('%d.%m.%Y')
            caption = f"📦 Автобэкап Master Schedule\n📅 Дата: {date_str}"
            temp_filename = f"master_schedule_backup_{now.strftime('%Y-%m-%d')}.json"
            temp_path = os.path.join(USERS_DIR, temp_filename)
            
            with open(temp_path, 'w', encoding='utf-8') as tf:
                json.dump(data, tf, ensure_ascii=False, indent=2)

            success = send_telegram_document(BACKUP_BOT_TOKEN, chat_id, temp_path, caption)
            
            if os.path.exists(temp_path):
                os.remove(temp_path)

            if success:
                backup_log[chat_id] = now_ts
                log_updated = True

    if log_updated:
        os.makedirs(os.path.dirname(BACKUP_LOG_FILE), exist_ok=True)
        with open(BACKUP_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(backup_log, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
