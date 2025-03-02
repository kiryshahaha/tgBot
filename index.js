require("dotenv").config();
const { Bot, Keyboard } = require('grammy');
const { createClient } = require('@supabase/supabase-js');

const bot = new Bot(process.env.BOT_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Подписка на изменения в таблице orders (без изменений)
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
                console.error("Ошибка при отправке сообщения:", error);
            });
        }
    )
    .subscribe();

// Подписка на изменения в таблице user_problems
const subscriptionProblems = supabase
    .channel('user-problems-reply-channel')
    .on(
        'postgres_changes',
        { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'user_problems',
            filter: 'reply=neq.null' // Фильтр для получения только записей, где reply не null
        },
        (payload) => {
            const { user_id, reply, message_id } = payload.new;
            const oldReply = payload.old.reply || null;

            // Проверяем, что reply изменился с null на не-null
            if (oldReply === null && reply !== null && message_id) {
                bot.api.sendMessage(
                    user_id,
                    reply,
                    { 
                        parse_mode: 'Markdown',
                        reply_to_message_id: message_id // Отвечаем на конкретное сообщение
                    }
                ).catch(error => {
                    console.error("Ошибка при отправке ответа пользователю:", error);
                });
            }
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
    
 const customKeyboard = new Keyboard()
    .text("📞 Обратиться к поддержке").row()
    .text("❓ Не нашел своего размера").row()
    .text("👟 Не нашел нужную модель").row()
    .text("📉 Хочу дешевле").row()
    .text("🛒 Где мой заказ?").row()
    .text("🛒 Проблема с заказом").row()
    .text("🤝 Стать партнером").row()
    .text("🐛 Нашел баг в приложении").row()
    .text("💡 Предложить идею или улучшение").row()
    .text("📜 Правила магазина и покупок").row()
    .text("❓ Часто задаваемые вопросы").row()
    .resized();

bot.command('start', async (ctx) => {
    await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: customKeyboard
    });
});

bot.hears('Пидарас', async (ctx) => {
    await ctx.reply('Cам такой, дебил');
});

const userStates = {};

async function saveUserProblem(userId, description, messageText, messageId) {
    const { data, error } = await supabase
        .from('user_problems')
        .insert([{ 
            user_id: userId, 
            description: description, 
            message_text: messageText,
            message_id: messageId // Добавляем message_id
        }]);

    return { data, error };
}

bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const messageId = ctx.message.message_id; // Получаем message_id текущего сообщения

    if (userStates[userId]?.state) {
        const { state } = userStates[userId];
        
        if (state !== 'awaiting_order_number') {
            const { error } = await saveUserProblem(userId, state, text, messageId);

            if (error) {
                await ctx.reply("Произошла ошибка при сохранении вашего обращения.");
            } else {
                await ctx.reply("Ваше обращение зарегистрировано. Спасибо!");
            }

            delete userStates[userId];
            return;
        }
    }

    if (userStates[userId]?.state === 'awaiting_order_number') {
        const { data, error } = await supabase
            .from('orders')
            .select('status, id')
            .eq('user_id', userId);

        if (error) {
            await ctx.reply("Произошла ошибка при поиске ваших заказов.");
        } else if (data.length === 0) {
            await ctx.reply("Вы еще не сделали заказ. \nВы можете это сделать в нашем мини-приложении (доступно по нажатию на синюю иконку 'shop', слева от ввода сообщения. Спасибо, что выбрали SneakPick❤️");
        } else {
            const completedOrders = data.filter(order => order.status === 'выполнено');
            const activeOrders = data.filter(order => order.status !== 'выполнено');

            if (activeOrders.length > 0) {
                const activeStatuses = activeOrders.map(order => `Статус вашего заказа (ID: ${order.id}): ${order.status}`).join('; ');
                await ctx.reply(`${activeStatuses}. Также не забудьте оставить отзыв об уже выполненных заказах. \nСпасибо, что выбрали SneakPick❤️`);
            } else if (completedOrders.length > 0) {
                await ctx.reply("У вас нет активных заказов. Пожалуйста, не забудьте написать отзыв о полученных товарах. \nСпасибо, что выбрали SneakPick❤️️");
            } else {
                await ctx.reply("Ваши заказы находятся в обработке. \nСпасибо, что выбрали SneakPick❤️");
            }
        }

        delete userStates[userId];
        return;
    }

    switch (text) {
        case "🐛 Нашел баг в приложении":
            await ctx.reply("Пожалуйста, опишите баг.");
            userStates[userId] = { state: "найден баг" };
            break;

        case "📞 Обратиться к поддержке":
            await ctx.reply("Пожалуйста, напишите ваше обращение.");
            userStates[userId] = { state: "обращение в поддержку" };
            break;

        case "🛒 Проблема с заказом":
            await ctx.reply("Опишите, с какой проблемой вы столкнулись.");
            userStates[userId] = { state: "проблема с заказом" };
            break;

        case "📉 Хочу дешевле":
            await ctx.reply('Пожалуйста, напишите сообщение в виде: "ID товара (указывается в карточке товара под описанием); размер, который вам необходим."');
            userStates[userId] = { state: "хочу дешевле" };
            break;

        case "🤝 Стать партнером":
            await ctx.reply("Опишите ваше предложение в следующем сообщении.");
            userStates[userId] = { state: "стать партнером" };
            break;

        case "❓ Не нашел своего размера":
            await ctx.reply("Вам необходимо скинуть id товара (находится под описанием) и размер, который вас интересует. Также размер стоит выбирать по таблице с последнего фото товара.");
            userStates[userId] = { state: "не нашел размера" };
            break;

        case "👟 Не нашел нужную модель":
            await ctx.reply("Опишите, какую модель вы ищете - название и расцветка/ссылка на Poizon или любой другой маркетплейс");
            userStates[userId] = { state: "не нашел модели" };
            break;

        case "💡 Предложить идею или улучшение":
            await ctx.reply("Опишите ваше предложение для улучшения.");
            userStates[userId] = { state: "предложение улучшения" };
            break;

        case "📜 Правила магазина и покупок":
            await ctx.reply(shopRules, { parse_mode: 'Markdown' });
            break;

        case "❓ Часто задаваемые вопросы":
            await ctx.reply(faq, { parse_mode: 'Markdown' });
            break;

        case "🛒 Где мой заказ?":
            await ctx.reply("Пожалуйста, укажите номер заказа.");
            userStates[userId] = { state: 'awaiting_order_number' };
            break;

        default:
            const { error } = await saveUserProblem(userId, "неизвестная проблема", text, messageId);
            if (error) {
                await ctx.reply("Произошла ошибка при обработке вашего сообщения.");
            }
            break;
    }
});

bot.start();