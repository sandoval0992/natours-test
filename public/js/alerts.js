/* eslint-disable */

export const hideAlert = () => {
  const markup = document.querySelector(".alert");
  if (markup) markup.parentElement.removeChild(markup);
};

export const showAlert = (type, message, time = 5) => {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${message}</div>`;
  document.querySelector("body").insertAdjacentHTML("afterbegin", markup);
  window.setTimeout(hideAlert, time * 1000);
};
