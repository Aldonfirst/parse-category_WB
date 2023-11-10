const puppeteer = require('puppeteer');
const fs = require('fs');
const getProducts = require('./parseProducts');

// Функция для автоматического прокручивания страницы до конца.
const autoScroll = async (page) => {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;// Общая высота прокрученного контента.
                let distance = 100;// Количество пикселей, на которое мы будем прокручивать страницу за одну итерацию.
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;// Общая высота страницы. 
                    window.scrollBy(0, distance);
                    totalHeight += distance; // Прокручиваем страницу на заданное количество пикселей.
          // Если прокрутили страницу до конца, останавливаем таймер.
                    if(totalHeight >= scrollHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    };
  
    
// Основная функция выполнения скрипта!!!.
const main = async () => {
    // Получение массива с категориями товаров.
    const categories = require('./categories').categories[0].data[0].nodes;
    // Создание экземпляра браузера.
    const browser = await puppeteer.launch({ headless: false });

    // Проход по каждой категории.
    for (let category of categories) {
        // Создание новой страницы в браузере.
        const page = await browser.newPage();
        const categoryId = category.id;
        const url = `https://global.wildberries.ru/catalog?category=${categoryId}`; //вставляю id подкатегории в строку

        // Переход на страницу с категорией товаров.
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });// поставил таймер на 6 сек

        // Прокрутка страницы до конца.
        await autoScroll(page);

        // Нажатие на кнопку 'Показать еще', пока она доступна.
        let loadMoreButton = await page.$('.pagination-next'); 
        while (loadMoreButton) {
            await loadMoreButton.click();
            await page.waitForTimeout(2000);
            await autoScroll(page);
            await page.waitForTimeout(10000);
            loadMoreButton = await page.$('.pagination-next');
        }

        // Используем импортированную функцию для получения продуктов на странице.
        const products = await page.evaluate(getProducts);

        // Закрытие страницы.
        await page.close();

        // Проверка на существование директории и ее создание при отсутствии.
        if (!fs.existsSync('categoryJson')) {
            fs.mkdirSync('categoryJson');
        }

        // Запись данных о продуктах в JSON-файл.
        fs.writeFileSync(`categoryJson/products_${categoryId}.json`, JSON.stringify(products, null, 2));
    }

    // Вывод сообщения о завершении парсинга.
    console.log('Парсинг успешно завершен. Результаты сохранены в папке categoryJson');

    // Закрытие экземпляра браузера.
    await browser.close();
};

main().catch(console.error);