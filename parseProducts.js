
// Функция для обработки и получения информации о продуктах на странице.
module.exports = async function () {
    return Array.from(document.querySelectorAll('[data-tag="card"]')).map(productCard => {
        let product = {}; 
        const linkElement = productCard.querySelector('[data-tag="cardLink"]');
        if(linkElement) {
            const href = linkElement.getAttribute('href');
            product.id = href.substring(href.indexOf('=')+1);
        }
//селекторы 
        const imgElement = productCard.querySelector('.card-img picture img');
        const priceElement = productCard.querySelector('[data-tag="salePrice"]');
        const oldPriceElement = productCard.querySelector('.price__old del');
        const discountElement = productCard.querySelector('.price__discount');
        const brandElement = productCard.querySelector('.b-card__brand');
        const nameElement = productCard.querySelector('.b-card__name');
        const ratingElement = productCard.querySelector('.b-card__rating span:last-child');
        const deliveryElement = productCard.querySelector('[data-tag="delivery"] span');
//проверки селекторов
        if(linkElement) product.link = linkElement.getAttribute('href');
        if(imgElement) product.imgSrc = imgElement.getAttribute('src');
        if(priceElement && priceElement.textContent) product.price = priceElement.textContent.trim();
        if(oldPriceElement && oldPriceElement.textContent) product.oldPrice = oldPriceElement.textContent.trim();
        if(discountElement && discountElement.textContent) product.discount = discountElement.textContent.trim();
        if(brandElement && brandElement.textContent) product.brand = brandElement.textContent.trim();
        if(nameElement && nameElement.textContent) product.name = nameElement.textContent.trim();
        if(ratingElement && ratingElement.textContent) product.rating = ratingElement.textContent.trim();
        if(deliveryElement && deliveryElement.textContent) product.delivery = deliveryElement.textContent.trim();

        return product;
    });
};