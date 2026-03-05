(function () {
  const CART_KEY = 'experiment_cart_v1';

  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    const safeCart = Array.isArray(cart) ? cart : [];
    localStorage.setItem(CART_KEY, JSON.stringify(safeCart));
  }

  function normalizePrice(price) {
    const value = Number(price);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function addToCart(item) {
    if (!item || !item.id) return false;

    const validPrice = normalizePrice(item.price);
    if (validPrice === null) return false;

    const cart = getCart();
    const index = cart.findIndex((entry) => String(entry.id) === String(item.id));

    if (index >= 0) {
      const prevQty = Number(cart[index].qty) || 0;
      cart[index].qty = prevQty + (Number(item.qty) > 0 ? Number(item.qty) : 1);
    } else {
      cart.push({
        id: item.id,
        name: item.name || 'Товар',
        price: validPrice,
        qty: Number(item.qty) > 0 ? Number(item.qty) : 1,
      });
    }

    saveCart(cart);
    renderCart();
    return true;
  }

  function removeFromCart(id) {
    const cart = getCart().filter((item) => String(item.id) !== String(id));
    saveCart(cart);
    renderCart();
  }

  function getTotal(cart) {
    return (cart || []).reduce((sum, item) => {
      const price = normalizePrice(item.price);
      if (price === null) return sum;
      const qty = Number(item.qty) > 0 ? Number(item.qty) : 1;
      return sum + price * qty;
    }, 0);
  }

  function getItemsCount(cart) {
    return (cart || []).reduce((sum, item) => sum + (Number(item.qty) > 0 ? Number(item.qty) : 1), 0);
  }

  function renderCart() {
    const cart = getCart();
    const list = document.querySelector('#cart-items');
    const count = getItemsCount(cart);
    const headerCount = document.querySelector('#cart-count');
    const badge = document.querySelector('#cart-badge');
    const totalNode = document.querySelector('#cart-total');

    if (headerCount) {
      headerCount.textContent = `(${String(count).padStart(2, '0')})`;
    }

    if (badge) {
      badge.textContent = String(count);
    }

    if (totalNode) {
      totalNode.textContent = `$${getTotal(cart).toFixed(2)}`;
    }

    if (!list) return;

    list.innerHTML = '';

    if (!cart.length) {
      const empty = document.createElement('li');
      empty.className = 'list-group-item bg-transparent text-center text-muted';
      empty.textContent = 'Корзина пуста';
      list.appendChild(empty);
      return;
    }

    cart.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'list-group-item bg-transparent d-flex justify-content-between align-items-start gap-2';
      li.innerHTML = `
        <div>
          <h6 class="mb-0">${item.name}</h6>
          <small class="text-muted">Qty: ${item.qty}</small>
        </div>
        <div class="text-end">
          <div class="text-primary mb-1">$${(item.price * item.qty).toFixed(2)}</div>
          <button class="btn btn-sm btn-outline-secondary" data-remove-from-cart="${item.id}" type="button">×</button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/(^-|-$)/g, '');
  }

  function parseCardItem(trigger) {
    const card = trigger.closest('.card');
    if (!card) return null;

    const title = card.querySelector('h5 a, h5');
    const price = card.querySelector('.price');
    if (!title || !price) return null;

    const name = title.textContent.trim();
    const numeric = price.textContent.replace(/[^\d.]/g, '');

    return {
      id: slugify(name),
      name,
      price: Number(numeric),
      qty: 1,
    };
  }

  document.addEventListener('click', function (event) {
    const addBtn = event.target.closest('[data-add-to-cart]');
    if (addBtn) {
      event.preventDefault();
      const item = parseCardItem(addBtn);
      if (item) addToCart(item);
      return;
    }

    const removeBtn = event.target.closest('[data-remove-from-cart]');
    if (removeBtn) {
      event.preventDefault();
      removeFromCart(removeBtn.getAttribute('data-remove-from-cart'));
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    const cart = getCart();
    saveCart(cart);
    renderCart();
  });

  window.CartModule = {
    getCart,
    saveCart,
    addToCart,
    removeFromCart,
    getTotal,
    renderCart,
  };
})();
