import requests
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from datetime import datetime
import schedule
import time

# توکن ربات تلگرام خود را اینجا وارد کنید
TELEGRAM_BOT_TOKEN = 'Your_TG_Token'

# آدرس ورکر کلودفلر خود را اینجا وارد کنید
CLOUDFLARE_WORKER_URL = 'Your_Worker_Address'

# لیست مجاز شناسه‌های تلگرام
ALLOWED_USER_IDS = [12345678, 87654321]  # شناسه‌های تلگرام مجاز را اینجا وارد کنید

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.from_user.id in ALLOWED_USER_IDS:
        await update.message.reply_text('دستورات آماده پردازش هستند.')
    else:
        await update.message.reply_text('شما مجاز به استفاده از این ربات نیستید.')

async def add_uuid(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.from_user.id in ALLOWED_USER_IDS:
        if len(context.args) < 2:
            await update.message.reply_text('لطفاً UUID و تعداد روزهای معتبر بودن را وارد کنید.')
            return
        uuid = context.args[0]
        days = context.args[1]
        response = requests.get(f'{CLOUDFLARE_WORKER_URL}?action=add&uuid={uuid}&days={days}')
        await update.message.reply_text(response.text)
    else:
        await update.message.reply_text('شما مجاز به استفاده از این ربات نیستید.')

async def delete_uuid(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.from_user.id in ALLOWED_USER_IDS:
        uuid = ' '.join(context.args)
        response = requests.get(f'{CLOUDFLARE_WORKER_URL}?action=delete&uuid={uuid}')
        await update.message.reply_text(response.text)
    else:
        await update.message.reply_text('شما مجاز به استفاده از این ربات نیستید.')

async def list_uuids(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.from_user.id in ALLOWED_USER_IDS:
        response = requests.get(f'{CLOUDFLARE_WORKER_URL}?action=list')
        uuids = response.text.split(', ')
        formatted_uuids = '\n'.join([f'`{uuid.split(" ")[0]}` \n ⌛ {uuid.split(" ")[2]}' for uuid in uuids])
        await update.message.reply_text(f'{formatted_uuids}', parse_mode='Markdown')
    else:
        await update.message.reply_text('شما مجاز به استفاده از این ربات نیستید.')

async def list_sorted_uuids(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.from_user.id in ALLOWED_USER_IDS:
        response = requests.get(f'{CLOUDFLARE_WORKER_URL}?action=list')
        uuids = response.text.split(', ')
        now = datetime.now().timestamp() * 1000  # تبدیل به میلی‌ثانیه
        uuid_days = []

        for uuid in uuids:
            parts = uuid.split(' ')
            expiration_timestamp = int(parts[1])
            days_left = (expiration_timestamp - now) / (1000 * 60 * 60 * 24)
            uuid_days.append((uuid, days_left))

        sorted_uuids = sorted(uuid_days, key=lambda x: x[1])
        formatted_uuids = '\n'.join([f'`{uuid.split(" ")[0]}` \n ⌛ {int(days_left)}' for uuid, days_left in sorted_uuids])
        await update.message.reply_text(f'{formatted_uuids}', parse_mode='Markdown')
    else:
        await update.message.reply_text('شما مجاز به استفاده از این ربات نیستید.')

async def cleanup_uuids(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.from_user.id in ALLOWED_USER_IDS:
        response = requests.get(f'{CLOUDFLARE_WORKER_URL}?action=cleanup')
        await update.message.reply_text(response.text)
    else:
        await update.message.reply_text('شما مجاز به استفاده از این ربات نیستید.')

async def edit_uuid(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.from_user.id in ALLOWED_USER_IDS:
        if len(context.args) < 2:
            await update.message.reply_text('لطفاً UUID و تعداد روزهای جدید معتبر بودن را وارد کنید.')
            return
        uuid = context.args[0]
        days = context.args[1]
        response = requests.get(f'{CLOUDFLARE_WORKER_URL}?action=edit&uuid={uuid}&days={days}')
        await update.message.reply_text(response.text)
    else:
        await update.message.reply_text('شما مجاز به استفاده از این ربات نیستید.')

def send_cleanup_command():
    response = requests.get(f'{CLOUDFLARE_WORKER_URL}?action=cleanup')
    print(response.text)

def schedule_cleanup():
    schedule.every().day.at("00:00").do(send_cleanup_command)
    schedule.every().day.at("12:00").do(send_cleanup_command)
    while True:
        schedule.run_pending()
        time.sleep(1)

def main():
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    application.add_handler(CommandHandler('start', start))
    application.add_handler(CommandHandler('add', add_uuid))
    application.add_handler(CommandHandler('del', delete_uuid))
    application.add_handler(CommandHandler('list', list_uuids))
    application.add_handler(CommandHandler('cleanup', cleanup_uuids))
    application.add_handler(CommandHandler('lista', list_sorted_uuids))  # دستور جدید
    application.add_handler(CommandHandler('ed', edit_uuid))  # دستور جدید

    # اجرای زمانبندی در یک ترد جداگانه
    import threading
    schedule_thread = threading.Thread(target=schedule_cleanup)
    schedule_thread.start()

    application.run_polling()

if __name__ == '__main__':
    main()
