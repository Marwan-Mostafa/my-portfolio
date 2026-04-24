const form = document.querySelector('.contact-form');
const button = document.querySelector('.btn-submit');
const status = document.getElementById('form-status');

form.addEventListener('submit', function(e) {
  e.preventDefault();

  // loading state
  button.classList.add('loading');
  button.innerText = "Sending...";
  button.disabled = true;

  // simulate sending
  setTimeout(() => {
    button.classList.remove('loading');
    button.classList.add('success');
    button.innerText = "Sent";

    form.reset();

    setTimeout(() => {
      button.classList.remove('success');
      button.innerText = "Send Message";
      button.disabled = false;
      status.classList.remove('show');
    }, 3000);

  }, 1500);
});