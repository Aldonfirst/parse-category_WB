// Подключим необходимые модули и библиотеки
const puppeteer = require('puppeteer');
const fs = require('fs');
const getProducts = require('./parseProducts'); // Эта функция извлекает данные о продуктах на странице

// Функция автоматического прокручивания страницы
const autoScroll = async (page, targetProductsCount) => {
    let previousHeight = 0;
    while (true) {
        // Прокрутка страницы
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        await page.waitForTimeout(1000);
        
        // Получение текущей высоты прокрутки
        const currentHeight = await page.evaluate(() =>
            document.documentElement.scrollTop || document.body.scrollTop
        );

        // Если текущая высота прокрутки равна предыдущей, то остановите прокрутку
        if (currentHeight === previousHeight) {
            break;
        }
        previousHeight = currentHeight;

        // Количество загруженных на данный момент товаров на странице
        const loadedProducts = await page.evaluate(getProducts);

        // Если достигнуто желаемое количество товаров - останавливаем прокрутку.
        if (loadedProducts.length >= targetProductsCount) {
            break;
        }
    }
};

// Рекурсивная функция для загрузки товаров из подкатегорий
const recursiveProductsDownload = async (page, nodes, categoryData, level=1, subCategoryCount = Infinity, productCount = Infinity) => {
    for (let subCategoryIndex = 0; subCategoryIndex < Math.min(subCategoryCount, nodes.length); subCategoryIndex++) {
        const subCategory = nodes[subCategoryIndex];

        // Если в текущей подкатегории есть дочерние подкатегории - пройдемся по ним сначала.
        if (subCategory.nodes?.length > 0) {
            await recursiveProductsDownload(page, subCategory.nodes, categoryData, level+1, subCategoryCount, productCount);
        }

        // Проходим по каждой подкатегории
        const subCategoryId = subCategory.id;
        const url = `https://global.wildberries.ru/catalog?category=${subCategoryId}`;

        // Переходим по URL подкатегории
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 0 });

        // Прокручиваем страницу, чтобы загрузить товары подкатегории
        await autoScroll(page, productCount);

        // Собираем информацию о продуктах
        const products = await page.evaluate(getProducts);

        // Сохраняем полученные данные о продуктах подкатегории
        subCategory['productData'] = products.slice(0, productCount);

        // Выводим в консоль информацию о завершении обработки подкатегории
        console.log(`Завершено: уровень ${level}, подкатегория ${subCategoryIndex}`);

        // Если загружено достаточное количество товаров, переходим к следующей подкатегории
        if (products.length >= productCount) {
            continue;
        }
    }
}

// Главная функция, которая запускает все процессы
const main = async (categoryIndex = Infinity, subCategoryCount = Infinity, productCount = Infinity) => {
    // Загружаем данные с JSON файла
    const categories = require('./categories').categories;

    // Проверяем, не вышли ли мы за пределы доступных категорий
    if (categoryIndex >= categories[0].data.length) {
        categoryIndex = categories[0].data.length - 1;
    }

    const topLevelCategories = categories[0].data[categoryIndex];// Выбираем верхний уровень категорий

    // Запуск браузера и открытие новой вкладки
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Вызываем функцию рекурсивного скачивания данных о товарах
    await recursiveProductsDownload(page, topLevelCategories.nodes, topLevelCategories, 1, subCategoryCount, productCount);

    // Если папка "categoryJson" нет, то создаем ее
    if (!fs.existsSync('categoryJson')) {
        fs.mkdirSync('categoryJson');
    }

    // Записываем результат парсинга в JSON файл
    fs.writeFileSync(
        `categoryJson/category_${topLevelCategories.id}.json`,
        JSON.stringify(topLevelCategories, null, 2)
    );

    console.log('Парсинг успешно завершен. Результаты сохранены в папке categoryJson.');
    await browser.close();     // Закрываем браузер
};

// Задаем параметры поиска товаров
const categoryIndex = 4; // Индекс категории
const subCategoryCount = Infinity; // Количество подкатегорий для обработки, Infinity для всех
const productCount = 10; // Количество товаров для загрузки с каждой страницы

main(categoryIndex, subCategoryCount, productCount).catch(console.error); // Запускаем главную функцию
