(function () {
  'use strict';

  var cartState = {
    items: []
  };

  function formatPrice(value) {
    return '$' + Math.round(value);
  }

  function getCartTotals() {
    return cartState.items.reduce(function (acc, item) {
      acc.count += item.quantity;
      acc.total += item.price * item.quantity;
      return acc;
    }, { count: 0, total: 0 });
  }

  function renderCartDropdown() {
    var dropdown = document.querySelector('.cart-dropdown .dropdown-menu');
    if (!dropdown) return;

    var list = dropdown.querySelector('.list-group');
    if (!list) return;

    var totals = getCartTotals();

    if (cartState.items.length === 0) {
      list.innerHTML = '';
      var empty = document.createElement('li');
      empty.className = 'list-group-item bg-transparent';
      empty.textContent = 'Cart is empty';
      list.appendChild(empty);
      return;
    }

    var itemsMarkup = cartState.items.map(function (item) {
      return '' +
        '<li class="list-group-item bg-transparent d-flex justify-content-between lh-sm">' +
          '<div>' +
            '<h5><a href="single-product.html">' + item.title + '</a></h5>' +
            '<small>Qty: ' + item.quantity + '</small>' +
          '</div>' +
          '<span class="text-primary">' + formatPrice(item.price * item.quantity) + '</span>' +
        '</li>';
    }).join('');

    var totalMarkup = '' +
      '<li class="list-group-item bg-transparent d-flex justify-content-between">' +
        '<span class="text-uppercase"><b>Total (USD)</b></span>' +
        '<strong>' + formatPrice(totals.total) + '</strong>' +
      '</li>';

    list.innerHTML = itemsMarkup + totalMarkup;
  }

  function renderCartCounters() {
    var totals = getCartTotals();
    var counterText = '(' + String(totals.count).padStart(2, '0') + ')';

    var iconCounter = document.querySelector('.cart-dropdown .dropdown-toggle .fs-6');
    if (iconCounter) {
      iconCounter.textContent = counterText;
    }

    var badgeCounter = document.querySelector('.cart-dropdown .badge');
    if (badgeCounter) {
      badgeCounter.textContent = String(totals.count);
    }
  }

  function renderCartUI() {
    renderCartDropdown();
    renderCartCounters();
  }

  function isElementInViewport(element) {
    var rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function clearFloatingCartMenuStyles(menu) {
    menu.style.position = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.right = '';
    menu.style.transform = '';
    menu.style.margin = '';
    menu.style.width = '';
    menu.style.maxWidth = '';
    menu.style.zIndex = '';
  }

  function openCartDropdown() {
    var cartDropdown = document.querySelector('.cart-dropdown');
    var toggle = cartDropdown && cartDropdown.querySelector('.dropdown-toggle');
    var menu = cartDropdown && cartDropdown.querySelector('.dropdown-menu');
    if (!toggle || !menu) return;

    cartDropdown.classList.add('show');
    menu.classList.add('show');
    toggle.setAttribute('aria-expanded', 'true');

    if (isElementInViewport(toggle)) {
      clearFloatingCartMenuStyles(menu);
      return;
    }

    var originalWidth = menu.getBoundingClientRect().width;

    menu.style.position = 'fixed';
    menu.style.top = '16px';
    menu.style.left = 'auto';
    menu.style.right = '16px';
    menu.style.transform = 'none';
    menu.style.margin = '0';
    menu.style.width = Math.round(originalWidth) + 'px';
    menu.style.maxWidth = 'calc(100vw - 24px)';
    menu.style.zIndex = '1080';
  }

  function addToCart(product) {
    var existing = cartState.items.find(function (item) {
      return item.id === product.id;
    });

    if (existing) {
      existing.quantity += 1;
      return;
    }

    cartState.items.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }

  function getProductFromDataset(dataset) {
    var parsedPrice = Number(dataset.price);

    return {
      id: dataset.id || 'unknown-product',
      title: dataset.title || 'Untitled product',
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      image: dataset.image || ''
    };
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('.js-add-to-cart');
    if (!button) return;

    event.preventDefault();

    var product = getProductFromDataset(button.dataset);
    addToCart(product);
    renderCartUI();
    openCartDropdown();
  });
})();
