// Импортируем модуль puppeteer, который позволит имитировать взаимодействие пользователя с браузером
const puppeteer = require('puppeteer');
// Импортируем модуль fs, для возможности работы с файловой системой
const fs = require('fs');
// Импортируем скрипт parseProducts, который будет собирать продукты с страницы
const getProducts = require('./parseProducts');

// Функция для автоматической прокрутки страницы
const autoScroll = async (page) => {
  // Вызываем скрипт в контексте страницы
  await page.evaluate(async () => {
    // Ожидаем завершения промиса
    await new Promise((resolve) => {
      // Начальная высота страницы
      let totalHeight = 0;
      // Дистанция за одну прокрутку
      let distance = 100;
      // Запускаем интервал, который будет прокручивать страницу
      const timer = setInterval(() => {
        // Получаем общую высоту страницы
        const scrollHeight = document.body.scrollHeight;
        // Прокручиваем страницу на distance
        window.scrollBy(0, distance);
        // Увеличиваем пройденную высоту
        totalHeight += distance;

        // Если страница до конца прокручена, останавливаем интервал и резолвим промис
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
};

const main = async (
  categoryIndex = Infinity,
  subCategoryCount = Infinity,
  productCount = Infinity
) => {
  // Загружаем данные о категориях
  const categories = require('./categories').categories;
  
  // Если указанное значение превышает общее количество категорий, устанавливаем максимальное значение
  if (categoryIndex >= categories[0].data.length) {
    categoryIndex = categories[0].data.length - 1;
  }
  
  // Получаем объект категории по индексу
  const topLevelCategories = categories[0].data[categoryIndex];

  // Запускаем браузер и открываем новую страницу
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Перебираем подкатегории
  for (
    let subCategoryIndex = 0;
    subCategoryIndex < Math.min(subCategoryCount, topLevelCategories.nodes.length);
    subCategoryIndex++
  ) {
    const subCategory = topLevelCategories.nodes[subCategoryIndex];
    const subCategoryId = subCategory.id;
    const url = `https://global.wildberries.ru/catalog?category=${subCategoryId}`;

    // Загружаем страницу и ожидаем завершения загрузки сетевых запросов
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Прокручиваем страницу
    await autoScroll(page);

    // Ищем кнопку загрузки следующей страницы
    let loadMoreButton = await page.$('.btn--show-more');
    let loadedProducts = 0;

 // Пока не загрузим указанное количество продуктов, прокручиваем страницу и загружаем следующую
while (loadMoreButton && loadedProducts < productCount) {
  // Кликаем по кнопке загрузки
  await loadMoreButton.click();
  
  // Ждем 1 секунду (увеличивать в зависимости от скорости интернета и количества карточек на странице)
  await page.waitForTimeout(1000);
  
  // Прокручиваем страницу
  await autoScroll(page);
  
  // Ждем еще 8 секунд   (увеличивать в зависимости от скорости интернета и количества карточек на странице)
  await page.waitForTimeout(8000);
  
  // Получаем информацию о продуктах
  const products = await page.evaluate(getProducts);
  
  // Увеличиваем счетчик загруженных продуктов
  loadedProducts += products.length;
  
  // Проверяем, достигли ли указанного количества продуктов
  if (loadedProducts >= productCount) {
    // Если достигли, переходим на следующую подкатегорию
    break;
  }
  
  // Ищем кнопку загрузки следующей страницы
  loadMoreButton =
    loadedProducts < productCount ? await page.$('.btn--show-more') : null;
}

    // Получаем информацию о продуктах
    const products = await page.evaluate(getProducts);
    // Сохраняем информацию о продуктах
    subCategory['productData'] = products.slice(0, productCount);
  }

  // Если папки не существует - создаем
  if (!fs.existsSync('categoryJson')) {
    fs.mkdirSync('categoryJson');
  }

  // Сохраняем все данные в json файл
  fs.writeFileSync(
    `categoryJson/category_${topLevelCategories.id}.json`,
    JSON.stringify(topLevelCategories, null, 2)
  );

  // Выводим сообщение об успехе
  console.log(
    'Парсинг успешно завершен. Результаты сохранены в папке categoryJson.'
  );

  // Закрываем браузер
  await browser.close();
};

// Вводим номер категории, количество подкатегорий и количество продуктов для сбора данных
// Если неизвестно сколько карточек, подкатегорий или категорий товара вписываем вместо числа  Infinity   
// Infinity - скачает максимум  что есть 
const categoryIndex = 3;
const subCategoryCount = Infinity ; //Infinity для примера или количество ввести подкатегорий числом 1,2,3,5.....
const productCount = 50;

// Запускаем главную функцию и перехватываем возможные ошибки
main(categoryIndex, subCategoryCount, productCount).catch(console.error);