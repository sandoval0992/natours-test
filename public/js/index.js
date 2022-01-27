/* eslint-disable */
import "@babel/polyfill";
import { displayMap } from "./mapbox";
import { login, logout } from "./login";
import { updateSettings } from "./updateSettings";
import { bookTour } from "./stripe";

// DOM elements
const mapBox = document.getElementById("map");
const loginForm = document.querySelector(".form--login");
const logoutBtn = document.querySelector(".nav__el--logout");
const userDataForm = document.querySelector(".form-user-data");
const userPasswordForm = document.querySelector(".form-user-password");
const bookBtn = document.getElementById("book-tour");

//Task delegation
if (mapBox) {
  console.log("Loading map locations");
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", logout);
}

if (userDataForm) {
  userDataForm.addEventListener("submit", event => {
    event.preventDefault();

    const form = new FormData();

    form.append("name", document.getElementById("name").value);
    form.append("email", document.getElementById("email").value);

    const photo = document.getElementById("photo").files[0];
    form.append("photo", photo);

    updateSettings(form, "data");
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener("submit", async event => {
    event.preventDefault();

    document.querySelector(".btn--save-password").textContent = "Updating...";

    const currentPasswordTxt = document.getElementById("password-current");
    const newPasswordTxt = document.getElementById("password");
    const passwordConfirmTxt = document.getElementById("password-confirm");

    const currentPassword = currentPasswordTxt.value;
    const newPassword = newPasswordTxt.value;
    const passwordConfirm = passwordConfirmTxt.value;

    await updateSettings(
      { currentPassword, newPassword, passwordConfirm },
      "password"
    );

    document.querySelector(".btn--save-password").textContent = "Save password";
    currentPasswordTxt.value = "";
    newPasswordTxt.value = "";
    passwordConfirmTxt.value = "";
  });
}

if (bookBtn) {
  bookBtn.addEventListener("click", event => {
    event.target.textContent = "Processing...";
    const { tourId } = event.target.dataset;
    bookTour(tourId);
  });
}
