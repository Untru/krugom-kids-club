let mode = 'booking';
const form = document.querySelector('form');
const status = document.querySelector('.status');
const field = name => form.elements.namedItem(name);
function setMode(value) {
  mode = value;
  document.querySelectorAll('[data-mode]').forEach(button=>button.classList.toggle('active',button.dataset.mode===value));
  document.querySelector('#bookingFields').hidden = value !== 'booking';
  document.querySelector('#questionField').hidden = value !== 'question';
  field('question').required = value === 'question';
  field('course').disabled = value !== 'booking';
  field('age').disabled = value !== 'booking';
  field('question').disabled = value !== 'question';
  status.style.display = 'none';
}
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
document.querySelectorAll('[data-course]').forEach(button=>button.addEventListener('click',()=>{
  setMode('booking');
  field('course').value = button.dataset.course;
  document.querySelector('#signup').scrollIntoView({behavior:'smooth'});
}));
const filters = document.querySelectorAll('.filter');
filters.forEach(button=>button.addEventListener('click',()=>{
  filters.forEach(item=>{
    item.classList.toggle('active',item===button);
    item.setAttribute('aria-pressed',String(item===button));
  });
  document.querySelectorAll('.card').forEach(card=>{
    card.hidden = button.dataset.age !== 'all' &&
      !(Number(card.dataset.minAge) <= Number(button.dataset.ageMax) && Number(card.dataset.maxAge) >= Number(button.dataset.ageMin));
  });
}));
form.addEventListener('submit',event=>{
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.mode = mode;
  data.createdAt = new Date().toISOString();
  try {
    localStorage.setItem('krugom-last-request',JSON.stringify(data));
    status.textContent = mode === 'booking'
      ? 'Анкета сохранена в этом браузере. Это демо: запись в клуб ещё не оформлена.'
      : 'Вопрос сохранён в этом браузере. Это демо: администратору он пока не отправлен.';
  } catch {
    status.textContent = 'Браузер не разрешил сохранить анкету. Попробуйте разрешить локальное хранение данных.';
  }
  status.style.display = 'block';
});
setMode('booking');
