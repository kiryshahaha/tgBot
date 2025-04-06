require("dotenv").config();
const { Bot, Keyboard } = require('grammy');
const { createClient } = require('@supabase/supabase-js');

const bot = new Bot(process.env.BOT_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Подписка на изменения в таблице orders
const subscriptionOrders = supabase
    .channel('custom-insert-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
            const { id, status, user_id } = payload.new;
            bot.api.sendMessage(
                user_id,
                `Спасибо, что выбрали *SneakPick*. \nВашему заказу: \n*${id}*\nприсвоен новый статус: *${status}*. \nВ ближайшее время администратор свяжется с вами для уточнения адреса доставки и итоговой стоимости заказа.`,
                { parse_mode: 'Markdown' }
            ).catch(error => {
                console.error("Ошибка при отправке сообщения:", error.message);
            });
        }
    )
    .subscribe();

// Подписка на новые сообщения от пользователей
const subscriptionUserMessages = supabase
    .channel('user-messages-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_messages' },
        (payload) => {
            console.log('Новое сообщение от пользователя:', payload.new);
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
function getDynamicKeyboard(userId) {
    const keyboard = new Keyboard();
    
    // Базовые кнопки, доступные всегда
    keyboard
        .text("📞 Обратиться к поддержке").row()
        .text("🛒 Где мой заказ?").row()
        .text("🛒 Проблема с заказом").row()
        .text("📜 Правила магазина и покупок").row()
        .text("❓ Часто задаваемые вопросы").row();

    // Добавляем дополнительные кнопки только если нет активного состояния
    if (!userStates[userId]?.state) {
        keyboard
            .text("❓ Не нашел своего размера").row()
            .text("👟 Не нашел нужную модель").row()
            .text("📉 Хочу дешевле").row()
            .text("🤝 Стать партнером").row()
            .text("🐛 Нашел баг в приложении").row()
            .text("💡 Предложить идею или улучшение").row();
    }

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
        reply_markup: getDynamicKeyboard(ctx.from.id)
    });
});

// Обработчик текстовых сообщений
bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const messageId = ctx.message.message_id;

    // Если у пользователя есть активное состояние
    if (userStates[userId]?.state) {
        const { state } = userStates[userId];

        // Запрещаем выбор других опций во время активного состояния
        const forbiddenOptions = [
            "❓ Не нашел своего размера",
            "👟 Не нашел нужную модель",
            "📉 Хочу дешевле",
            "🤝 Стать партнером",
            "🐛 Нашел баг в приложении",
            "💡 Предложить идею или улучшение"
        ];

        if (forbiddenOptions.includes(text)) {
            await ctx.reply("Пожалуйста, завершите текущее обращение перед выбором новой опции.", {
                reply_markup: getDynamicKeyboard(userId)
            });
            return;
        }

        // Обработка текущего состояния
        const { error } = await saveUserMessage(userId, `${state}: ${text}`, messageId);

        if (error) {
            await ctx.reply("Произошла ошибка при сохранении вашего обращения.");
        } else {
            await ctx.reply("Ваше обращение зарегистрировано. Спасибо!", {
                reply_markup: getDynamicKeyboard(userId)
            });
        }

        delete userStates[userId];
        return;
    }

    // Обработка основных команд
    switch (text) {
        case "🐛 Нашел баг в приложении":
            await ctx.reply("Пожалуйста, опишите баг.", {
                reply_markup: getDynamicKeyboard(userId)
            });
            userStates[userId] = { state: "найден баг" };
            break;

        case "📞 Обратиться к поддержке":
            await ctx.reply("Пожалуйста, напишите ваше обращение.", {
                reply_markup: getDynamicKeyboard(userId)
            });
            userStates[userId] = { state: "обращение в поддержку" };
            break;

        case "🛒 Проблема с заказом":
            await ctx.reply("Опишите, с какой проблемой вы столкнулись.", {
                reply_markup: getDynamicKeyboard(userId)
            });
            userStates[userId] = { state: "проблема с заказом" };
            break;

        case "📉 Хочу дешевле":
            await ctx.reply('Пожалуйста, напишите сообщение в виде: "ID товара (указывается в карточке товара под описанием); размер, который вам необходим."', {
                reply_markup: getDynamicKeyboard(userId)
            });
            userStates[userId] = { state: "хочу дешевле" };
            break;

        case "🤝 Стать партнером":
            await ctx.reply("Опишите ваше предложение в следующем сообщении.", {
                reply_markup: getDynamicKeyboard(userId)
            });
            userStates[userId] = { state: "стать партнером" };
            break;

        case "❓ Не нашел своего размера":
            await ctx.reply("Вам необходимо скинуть id товара (находится под описанием) и размер, который вас интересует. Размер стоит выбирать по таблице с последнего фото товара.", {
                reply_markup: getDynamicKeyboard(userId)
            });
            userStates[userId] = { state: "не нашел размера" };
            break;

        case "👟 Не нашел нужную модель":
            await ctx.reply("Опишите, какую модель вы ищете - название и расцветка/ссылка на Poizon или любой другой маркетплейс", {
                reply_markup: getDynamicKeyboard(userId)
            });
            userStates[userId] = { state: "не нашел модели" };
            break;

        case "💡 Предложить идею или улучшение":
            await ctx.reply("Опишите ваше предложение для улучшения.", {
                reply_markup: getDynamicKeyboard(userId)
            });
            userStates[userId] = { state: "предложение улучшения" };
            break;

        case "📜 Правила магазина и покупок":
            await ctx.reply(shopRules, { 
                parse_mode: 'Markdown',
                reply_markup: getDynamicKeyboard(userId)
            });
            break;

        case "❓ Часто задаваемые вопросы":
            await ctx.reply(faq, { 
                parse_mode: 'Markdown',
                reply_markup: getDynamicKeyboard(userId)
            });
            break;

        case "🛒 Где мой заказ?":
            try {
                const { data, error } = await getActiveOrders(userId);
                
                if (error) throw error;
                
                if (data.length === 0) {
                    await ctx.reply("😢 У вас нет активных заказов!\nЗагляните в наш магазин - возможно, вас что-то заинтересует 😊", {
                        reply_markup: getDynamicKeyboard(userId)
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
                        reply_markup: getDynamicKeyboard(userId)
                    }
                );
            } catch (error) {
                console.error('Order check error:', error);
                await ctx.reply("⚠️ Произошла ошибка при получении информации о заказах. Попробуйте позже.", {
                    reply_markup: getDynamicKeyboard(userId)
                });
            }
            break;

        default:
            const { error } = await saveUserMessage(userId, text, messageId);
            if (error) {
                await ctx.reply("⚠️ Произошла ошибка при обработке вашего сообщения.", {
                    reply_markup: getDynamicKeyboard(userId)
                });
            }
            break;
    }
});

bot.start();