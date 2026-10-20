const searchInput = document.querySelector("#product-search");
const filterButtons = document.querySelectorAll(".filter-chip");
const productCards = document.querySelectorAll(".product-card");
const emptyResults = document.querySelector("#no-products");

let activeCategory = "All";

function updateProducts() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  productCards.forEach((card) => {
    const matchesCategory =
      activeCategory === "All" || card.dataset.category === activeCategory;
    const matchesSearch = card.dataset.name.includes(searchTerm);
    const isVisible = matchesCategory && matchesSearch;
    card.hidden = !isVisible;
    visibleCount += Number(isVisible);
  });

  emptyResults.hidden = visibleCount !== 0;
}

searchInput.addEventListener("input", updateProducts);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    filterButtons.forEach((filter) => {
      const isActive = filter === button;
      filter.classList.toggle("is-active", isActive);
      filter.setAttribute("aria-pressed", String(isActive));
    });
    updateProducts();
  });
});

document.querySelectorAll(".favorite-button").forEach((button) => {
  button.addEventListener("click", () => {
    const isFavorite = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!isFavorite));
    button.classList.toggle("is-favorite", !isFavorite);
    button.textContent = isFavorite ? "♡" : "♥";
  });
});
