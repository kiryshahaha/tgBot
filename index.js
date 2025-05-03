require("dotenv").config();
const { Bot, Keyboard } = require('grammy');
const { createClient } = require('@supabase/supabase-js');

const bot = new Bot(process.env.BOT_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Список ID админов (добавьте свои Telegram ID)
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];

// Функция для уведомления админов
async function notifyAdmins(message) {
    if (ADMIN_IDS.length === 0) {
        console.warn("Не указаны ID админов для уведомлений");
        return;
    }

    const promises = ADMIN_IDS.map(adminId => 
        bot.api.sendMessage(adminId, message, { parse_mode: 'Markdown' })
            .catch(error => {
                console.error(`Ошибка при отправке уведомления админу ${adminId}:`, error.message);
            })
    );

    await Promise.all(promises);
}

// Подписка на изменения в таблице orders
const subscriptionOrders = supabase
    .channel('custom-insert-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
            const { id, status, user_id } = payload.new;
            
            // Уведомление пользователя
            await bot.api.sendMessage(
                user_id,
                `Спасибо, что выбрали *SneakPick*. \nВашему заказу: \n*${id}*\nприсвоен новый статус: *${status}*. \nВ ближайшее время администратор свяжется с вами для уточнения адреса доставки и итоговой стоимости заказа.`,
                { parse_mode: 'Markdown' }
            ).catch(error => {
                console.error("Ошибка при отправке сообщения:", error.message);
            });
            
            // Уведомление админов
            await notifyAdmins(
                `🆕 *Новый заказ!*\n\n` +
                `🆔 ID заказа: *${id}*\n` +
                `👤 ID пользователя: *${user_id}*\n` +
                `📊 Статус: *${status}*`
            );
        }
    )
    .subscribe();

// Подписка на новые сообщения от пользователей
const subscriptionUserMessages = supabase
    .channel('user-messages-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_messages' },
        async (payload) => {
            const { user_id, message_text, message_id } = payload.new;
            console.log('Новое сообщение от пользователя:', payload.new);
            
            // Уведомление админов
            await notifyAdmins(
                `📩 *Новое сообщение от пользователя*\n\n` +
                `👤 ID пользователя: *${user_id}*\n` +
                `📝 Сообщение: *${message_text}*\n` +
                `🆔 ID сообщения: *${message_id}*`
            );
        }
    )
    .subscribe();

// Подписка на новые сообщения от админов 
const subscriptionAdminMessages = supabase
    .channel('admin-messages-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_messages' },
        async (payload) => {
            const { user_id, message_text } = payload.new;
            bot.api.sendMessage(
                user_id,
                message_text,
                { parse_mode: 'Markdown' }
            ).catch(error => {
                console.error("Ошибка при отправке ответа пользователю:", error.message);
            });
        }
    )
    .subscribe();

const shopRules = `
🛒 *Правила магазина SneakPick*

📌 *1. Оформление заказа*
- Заказ оформляется *только через Mini App*.
- После оформления с вами свяжется администратор в Telegram для подтверждения заказа и оплаты.

💰 *2. Оплата*
- Оплата производится *только переводом* (другие способы появятся в будущем).
- Оплата вносится *сразу после подтверждения заказа*.
- Возврат средств возможен *только в случае ненадлежащего качества товара*.

🚚 *3. Доставка*
- Доставляем заказы по всей России через *СДЭК*.
- Отслеживать заказ можно в *боте и Mini App*.

🔄 *4. Возврат и обмен*
- *Возврат из-за неподходящего размера невозможен.*
- В случае возврата (если товар ненадлежащего качества) *доставку до Москвы оплачивает клиент.*

✅ *5. Гарантии*
- Все товары идут с *сертификатом Poizon*.
- *Мы не несём ответственности*, если товар не соответствует фотографиям.

🎁 *6. Акции и бонусы*
- В будущем появятся *промокоды, квесты и реферальные программы* — следите за обновлениями!

📞 *7. Поддержка*
- Связаться с нами можно в *боте 24/7*.
- Мы стараемся отвечать и обрабатывать запросы *максимально быстро*.
`;

const faq = `
❓ *Часто задаваемые вопросы (FAQ) – SneakPick* 

📌 *Как оформить заказ?*  
- Оформить заказ можно *только через Mini App*. После этого администратор напишет вам в Telegram для подтверждения и оплаты.  

💳 *Какие способы оплаты доступны?*  
- Пока что оплата возможна *только переводом* (в будущем добавятся новые способы).  
- Оплата производится *сразу после подтверждения заказа*.  

🚚 *Как осуществляется доставка?*  
- Мы отправляем заказы по всей России через *СДЭК*.  
- Вы можете отслеживать свою посылку в *боте и Mini App*.  

🔄 *Можно ли вернуть товар, если не подошел размер?*  
- *К сожалению, возврат по этой причине невозможен.*  
- Возврат возможен *только при ненадлежащем качестве товара*.  
- Если возврат одобрен, доставку товара до Москвы оплачивает клиент.  

✅ *Как я могу быть уверен в подлинности товара?*  
- Все товары идут с *сертификатом Poizon*.  
- *Мы не несём ответственности*, если товар не соответствует фото.  

🎁 *Будут ли скидки и бонусы?*  
- Да! В будущем появятся *промокоды, квесты и реферальные программы*. Следите за обновлениями в канале!  

📞 *Как связаться с поддержкой?*  
- Поддержка доступна в *боте 24/7*. Мы стараемся отвечать как можно быстрее!  
`;

const welcomeMessage = `
👋 *Привет! Спасибо, что запустил нашего бота!* 

🛍 Чтобы начать покупки, *нажми на синюю кнопку "Shop"* слева от ввода сообщения и перейди в наше мини-приложение. Также для входа в аккаунт необходимо перейти на экран профиля (правая иконка в нижней панели).

✅ Для получения дополнительной информации и новостей подписывайся [на наш канал](https://t.me/SNEAKPICKKK)!

📜 Перед заказом советуем ознакомиться с правилами магазина – отправь команду *📜 Правила магазина и покупок*.  
❓ Ответы на частые вопросы доступны по команде *❓ Часто задаваемые вопросы*. 

💰 *Обрати внимание:* цена товара не включает стоимость доставки, она рассчитывается индивидуально в зависимости от твоего города.

⌨️ Внизу экрана доступна *удобная клавиатура* с основными командами – используй её для быстрого выбора нужных опций.

Если возникнут вопросы, всегда можно написать в поддержку – *мы на связи! 🚀*
`;

// Объект для хранения состояний пользователей
const userStates = {};

// Функция для получения динамической клавиатуры
function getKeyboard(userId) {
    const keyboard = new Keyboard();
    
    // Если есть активное состояние - ТОЛЬКО кнопка "Отменить"
    if (userStates.hasOwnProperty(userId) && userStates[userId]?.state) {
        keyboard.text("🚫 Отменить");
        return keyboard.resized();
      }
    
    // Иначе - полная клавиатура
    keyboard
      .text("📞 Обратиться к поддержке").row()
      .text("🛒 Где мой заказ?").row()
      .text("🛒 Проблема с заказом").row()
      .text("📜 Правила магазина и покупок").row()
      .text("❓ Часто задаваемые вопросы").row()
      .text("❓ Не нашел своего размера").row()
      .text("👟 Не нашел нужную модель").row()
      .text("📉 Хочу дешевле").row()
      .text("🤝 Стать партнером").row()
      .text("🐛 Нашел баг в приложении").row()
      .text("💡 Предложить идею или улучшение");
      
    return keyboard.resized();
  }

// Функция для сохранения сообщений пользователя
async function saveUserMessage(userId, messageText, messageId) {
    const { data, error } = await supabase
        .from('user_messages')
        .insert([{ 
            user_id: userId, 
            message_text: messageText,
            message_id: messageId
        }]);

    return { data, error };
}

// Функция для получения активных заказов
async function getActiveOrders(userId) {
    const { data, error } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .eq('user_id', userId)
        .neq('status', 'выполнено')
        .order('created_at', { ascending: false });

    return { data, error };
}

// Обработчик команды /start
bot.command('start', async (ctx) => {
    await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: getKeyboard(ctx.from.id)
    });
});

// Обработчик текстовых сообщений
bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const messageId = ctx.message.message_id;
  
    // Обработка отмены
    if (text === "🚫 Отменить" && userStates[userId]?.state) {
      delete userStates[userId];
      await ctx.reply("❌ Действие отменено. Что вас интересует?", {
        reply_markup: getKeyboard(userId)
      });
      return;
    }
  
    // Если есть активное состояние
    if (userStates[userId]?.state) {
      const { state } = userStates[userId];
      
      // Сохраняем сообщение
      const { error } = await saveUserMessage(userId, `${state}: ${text}`, messageId);
      
      if (error) {
        await ctx.reply("❌ Ошибка сохранения. Попробуйте еще раз.", {
          reply_markup: getKeyboard(userId)
        });
      } else {
        // Сначала удаляем состояние
        delete userStates[userId];
        
        // Затем отправляем ответ с обычной клавиатурой
        await ctx.reply("✅ Сообщение принято! Чем еще помочь?", {
          reply_markup: getKeyboard(userId)
        });
      }
      return;
    }


    // Обработка основных команд
    switch (text) {
        case "🐛 Нашел баг в приложении":
            userStates[userId] = { state: "найден баг" };
            await ctx.reply("🪲 Опишите баг (например: *«При нажатии на кнопку X происходит Y»*):", {
                parse_mode: 'Markdown',
                reply_markup: getKeyboard(userId) // Клавиатура с кнопкой "Отменить"
            });
            break;

        case "📞 Обратиться к поддержке":
            userStates[userId] = { state: "обращение в поддержку" };
            await ctx.reply("📩 Напишите ваше сообщение для поддержки:", {
                reply_markup: getKeyboard(userId)
            });
            break;

        case "🛒 Проблема с заказом":
            userStates[userId] = { state: "проблема с заказом" };
            await ctx.reply("❓ Опишите проблему (например: *«Заказ не пришел»* или *«Товар поврежден»*):", {
                parse_mode: 'Markdown',
                reply_markup: getKeyboard(userId)
            });
            break;

        case "📉 Хочу дешевле":
            userStates[userId] = { state: "хочу дешевле" };
            await ctx.reply("💸 Напишите в формате:\n*ID товара; нужный размер* (например: *12345; 42*):", {
                parse_mode: 'Markdown',
                reply_markup: getKeyboard(userId)
            });
            break;

        case "🤝 Стать партнером":
            userStates[userId] = { state: "стать партнером" };
            await ctx.reply("🤝 Опишите ваше предложение (например: *«Хочу продвигать ваш магазин»*):", {
                parse_mode: 'Markdown',
                reply_markup: getKeyboard(userId)
            });
            break;

        case "❓ Не нашел своего размера":
            userStates[userId] = { state: "не нашел размера" };
            await ctx.reply("👟 Отправьте *ID товара и нужный размер* (например: *12345; 44*):", {
                parse_mode: 'Markdown',
                reply_markup: getKeyboard(userId)
            });
            break;

        case "👟 Не нашел нужную модель":
            userStates[userId] = { state: "не нашел модели" };
            await ctx.reply("🔍 Опишите модель (например: *«Nike Dunk Low Panda»*):", {
                parse_mode: 'Markdown',
                reply_markup: getKeyboard(userId)
            });
            break;

        case "💡 Предложить идею или улучшение":
            userStates[userId] = { state: "предложение улучшения" };
            await ctx.reply("💡 Напишите вашу идею (например: *«Добавьте фильтр по цвету»*):", {
                parse_mode: 'Markdown',
                reply_markup: getKeyboard(userId)
            });
            break;

        case "📜 Правила магазина и покупок":
            await ctx.reply(shopRules, { 
                parse_mode: 'Markdown',
                reply_markup: getKeyboard(userId)
            });
            break;

        case "❓ Часто задаваемые вопросы":
            await ctx.reply(faq, { 
                parse_mode: 'Markdown',
                reply_markup: getKeyboard(userId)
            });
            break;

        case "🛒 Где мой заказ?":
            try {
                const { data, error } = await getActiveOrders(userId);
                
                if (error) throw error;
                
                if (data.length === 0) {
                    await ctx.reply("😢 У вас нет активных заказов!\nЗагляните в наш магазин - возможно, вас что-то заинтересует 😊", {
                        reply_markup: getKeyboard(userId)
                    });
                    return;
                }
        
                const ordersList = data.map((order, index) => 
                    `📦 *Заказ #${index + 1}*\n` +
                    `🆔 ID: ${order.id}\n` +
                    `📊 Статус: ${order.status}\n` +
                    `📅 Дата: ${new Date(order.created_at).toLocaleDateString('ru-RU')}`
                ).join('\n\n');
        
                await ctx.reply(
                    `📬 *Ваши активные заказы:*\n\n${ordersList}\n\n` +
                    `ℹ️ Обновления статусов будут приходить автоматически.\n` +
                    '🙏 Пожалуйста, не забывайте оставлять отзывы после получения заказов',
                    { 
                        parse_mode: 'Markdown',
                        reply_markup: getKeyboard(userId)
                    }
                );
            } catch (error) {
                console.error('Order check error:', error);
                await ctx.reply("⚠️ Произошла ошибка при получении информации о заказах. Попробуйте позже.", {
                    reply_markup: getKeyboard(userId)
                });
            }
            break;

        default:
            const { error } = await saveUserMessage(userId, text, messageId);
            if (error) {
                await ctx.reply("⚠️ Произошла ошибка при обработке вашего сообщения.", {
                    reply_markup: getKeyboard(userId)
                });
            }
            break;
    }
});

bot.start();