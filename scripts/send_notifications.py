import os
import json
import glob
import datetime
import zoneinfo
import urllib.request
import urllib.parse

GLOBAL_BOT_TOKEN = os.environ.get('NOTIF_TG_BOT_TOKEN', '')
DEFAULT_TIMEZONE = os.environ.get('TIMEZONE', 'Europe/Moscow')

USERS_DIR = 'users'
LOG_FILE = 'scripts/sent_log.json'

def send_telegram(bot_token: str, chat_id: str, text: str):
    if not bot_token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Telegram sent to {chat_id}")
    except Exception as e:
        print(f"Error sending telegram to {chat_id}: {e}")

def parse_time(t_str):
    if not t_str or ':' not in t_str:
        return -1
    h, m = map(int, t_str.split(':'))
    return h * 60 + m

def task_occurs_on_date(task, target_date):
    if task.get('type') != 'task':
        return False
    d_key = target_date.strftime('%Y-%m-%d')
    if d_key in task.get('excludedDates', []):
        return False
    
    task_date_str = task.get('date', '')
    if not task_date_str:
        return False
    try:
        task_date = datetime.date.fromisoformat(task_date_str)
    except Exception:
        return False

    if not task.get('isRecurring', False):
        return task_date == target_date

    if target_date < task_date:
        return False

    config = task.get('recurringConfig', {})
    freq = config.get('frequency', 'weekly')

    if freq == 'weekly':
        return (target_date - task_date).days % 7 == 0
    elif freq == 'monthly':
        return target_date.day == task_date.day
    elif freq == 'interval_weeks':
        n = int(config.get('intervalN', 2))
        return (target_date - task_date).days % (7 * n) == 0
    elif freq == 'weekdays':
        # 0 = Вс, 1 = Пн ... 6 = Сб
        js_weekday = (target_date.weekday() + 1) % 7
        return js_weekday in config.get('weekdays', [])
    return False

def format_items(entries, task_tags, event_tags, target_date, date_title=""):
    d_key = target_date.strftime('%Y-%m-%d')
    m_d = target_date.strftime('%m-%d')

    events = [e for e in entries if e.get('type') == 'event' and (
        e.get('date', '').endswith(m_d) if e.get('isYearly') else e.get('date') == d_key
    )]
    tasks = [t for t in entries if task_occurs_on_date(t, target_date)]

    if not events and not tasks:
        return None

    lines = []
    if date_title:
        lines.append(f"<b>📅 {date_title} ({target_date.strftime('%d.%m.%Y')}):</b>")

    for e in events:
        cat = event_tags.get(e.get('category', ''), {}).get('label', 'Событие')
        line = f"• 🎉 <b>{e.get('title', '')}</b> [{cat}]"
        if e.get('notes'):
            line += f"\n  <i>Примечание: {e.get('notes')}</i>"
        lines.append(line)

    for t in tasks:
        is_done = t.get('completed', False) if not t.get('isRecurring') else d_key in t.get('completedDates', [])
        icon = "✅" if is_done else "▫️"
        cat = task_tags.get(t.get('category', ''), {}).get('label', 'Дело')
        line = f"• {icon} <b>{t.get('title', '')}</b>"
        if t.get('time'):
            line += f" в {t.get('time')}"
        line += f" [{cat}]"
        if t.get('notes'):
            line += f"\n  <i>Примечание: {t.get('notes')}</i>"
        lines.append(line)

    return "\n".join(lines)

def main():
    if not os.path.exists(USERS_DIR):
        print("Users directory not found.")
        return

    sent_log = {}
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                sent_log = json.load(f)
        except Exception:
            sent_log = {}

    log_updated = False
    user_files = glob.glob(os.path.join(USERS_DIR, "*.json"))

    for u_file in user_files:
        try:
            with open(u_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Skipping corrupt file {u_file}: {e}")
            continue

        settings = data.get('settings', {})
        entries = data.get('entries', [])
        task_tags = data.get('customTaskTags', {})
        event_tags = data.get('customEventTags', {})

        chat_id = str(settings.get('notifTgChatId', '')).strip()
        bot_token = settings.get('notifTgBotToken', '').strip() or GLOBAL_BOT_TOKEN

        if not chat_id or not bot_token:
            continue

        tz_str = settings.get('timezone', '').strip() or DEFAULT_TIMEZONE
        try:
            user_tz = zoneinfo.ZoneInfo(tz_str)
        except Exception:
            user_tz = zoneinfo.ZoneInfo('Europe/Moscow')

        now = datetime.datetime.now(user_tz)
        cur_mins = now.hour * 60 + now.minute
        js_dow = (now.weekday() + 1) % 7
        today_key = now.strftime('%Y-%m-%d')

        user_log = sent_log.get(chat_id, {})

        # 1. Дела на сегодня
        if settings.get('notifToday') and js_dow in settings.get('notifTodayDays', []):
            t_target = parse_time(settings.get('notifTodayTime', '09:00'))
            if cur_mins >= t_target and user_log.get('today') != today_key:
                content = format_items(entries, task_tags, event_tags, now.date())
                send_telegram(bot_token, chat_id, f"Посмотрите дела на сегодня:\n\n{content or 'На сегодня ничего не запланировано! ✨'}")
                user_log['today'] = today_key
                log_updated = True

        # 2. Дела на завтра
        if settings.get('notifTomorrow') and js_dow in settings.get('notifTomorrowDays', []):
            t_target = parse_time(settings.get('notifTomorrowTime', '20:00'))
            if cur_mins >= t_target and user_log.get('tomorrow') != today_key:
                tomorrow = now.date() + datetime.timedelta(days=1)
                content = format_items(entries, task_tags, event_tags, tomorrow)
                send_telegram(bot_token, chat_id, f"Посмотрите дела на завтра:\n\n{content or 'На завтра ничего не запланировано! ✨'}")
                user_log['tomorrow'] = today_key
                log_updated = True

        # 3. Дела на выходные
        if settings.get('notifWeekend') and js_dow in settings.get('notifWeekendDays', []):
            t_target = parse_time(settings.get('notifWeekendTime', '18:00'))
            if cur_mins >= t_target and user_log.get('weekend') != today_key:
                days_until_sat = (5 - now.weekday()) % 7
                if days_until_sat == 0 and now.weekday() != 5:
                    days_until_sat = 7
                sat_date = now.date() + datetime.timedelta(days=days_until_sat)
                sun_date = sat_date + datetime.timedelta(days=1)

                sat_c = format_items(entries, task_tags, event_tags, sat_date, "Суббота")
                sun_c = format_items(entries, task_tags, event_tags, sun_date, "Воскресенье")
                parts = [p for p in (sat_c, sun_c) if p]

                send_telegram(bot_token, chat_id, f"Посмотрите дела на выходные:\n\n{chr(10).join(parts) if parts else 'На выходные пока ничего не запланировано! 🏖️'}")
                user_log['weekend'] = today_key
                log_updated = True

        sent_log[chat_id] = user_log

    if log_updated:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
        with open(LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(sent_log, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
