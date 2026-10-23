export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));
const text = value => escapeHtml(value).replace(/\r?\n/g, '<br>');
const palettes = {
  purple: ['#ece5f6', '#65509f'], green: ['#e5edce', '#778b40'],
  orange: ['#f9e2c9', '#ac6c3c'], pink: ['#f5dee4', '#b66d8b']
};
const ageWord = age => age === 1 ? 'год' : age >= 2 && age <= 4 ? 'года' : 'лет';
const ageLabel = (min, max) => min === max ? `${min} ${ageWord(min)}` : `${min}–${max} лет`;
const empty = message => `<p class="notice">${message}</p>`;

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Заполните «${name}».`);
}
function integer(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`«${name}»: укажите целое число от ${min} до ${max}.`);
  }
}
export function imagePath(value) {
  if (!value) return '';
  // CMS writes site-relative media URLs. Reject protocols, traversal and SVG uploads.
  const path = String(value).replace(/^\/krugom-kids-club\//, '').replace(/^\//, '');
  if (!/^media\/(?!.*(?:\.\.|[\\?#:%]))[\p{L}\p{N}_ .\/-]+\.(?:png|jpe?g|webp|gif)$/iu.test(path)) {
    throw new Error('Фотография: выберите PNG, JPG, WebP или GIF из папки media.');
  }
  return path;
}

export function validateContent(courses, site) {
  if (!Array.isArray(courses)) throw new Error('Список занятий должен быть массивом.');
  const titles = new Set();
  for (const course of courses) {
    requiredString(course.title, 'Название занятия');
    if (titles.has(course.title.trim())) throw new Error(`Повторяется название занятия: ${course.title}`);
    titles.add(course.title.trim());
    if (course.visible !== undefined && typeof course.visible !== 'boolean') throw new Error('Показывать на сайте: неверное значение.');
    // Incomplete hidden courses are drafts and do not block publication of other content.
    if (!course.visible) continue;
    requiredString(course.description, `Описание: ${course.title}`);
    integer(course.minAge, 1, 18, `Возраст от: ${course.title}`);
    integer(course.maxAge, course.minAge, 18, `Возраст до: ${course.title}`);
    integer(course.duration, 5, 240, `Длительность: ${course.title}`);
    if (course.color && !palettes[course.color]) throw new Error(`Неизвестный цвет: ${course.title}`);
    imagePath(course.image);
    if (course.sessions != null && !Array.isArray(course.sessions)) throw new Error(`Расписание: ${course.title}`);
    for (const session of course.sessions ?? []) {
      requiredString(session.days, `Дни недели: ${course.title}`);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(session.time)) throw new Error(`Время занятия «${course.title}»: используйте ЧЧ:ММ.`);
    }
  }
  for (const key of ['title', 'description', 'intro', 'aboutTitle', 'aboutText']) requiredString(site[key], key);
  for (const point of site.points ?? []) {
    requiredString(point.title, 'Заголовок принципа клуба'); requiredString(point.text, 'Описание принципа клуба');
  }
  for (const faq of site.faq ?? []) {
    requiredString(faq.question, 'Вопрос'); requiredString(faq.answer, 'Ответ');
  }
  if (site.contacts?.link && !/^https:\/\/[^\s]+$/i.test(site.contacts.link)) throw new Error('Ссылка для связи должна начинаться с https://.');
  if (site.contacts?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contacts.email)) throw new Error('Проверьте электронную почту клуба.');
}

export function renderSite(template, courses, site) {
  validateContent(courses, site);
  const visible = courses.filter(course => course.visible === true);
  const ages = visible.length ? [Math.min(...visible.map(c=>c.minAge)), Math.max(...visible.map(c=>c.maxAge))] : [4,12];
  const filters = [];
  for (let start = 1; start <= 18; start += 3) {
    const end = start + 2;
    if (visible.some(c=>c.minAge <= end && c.maxAge >= start)) {
      filters.push(`<button class="filter" data-age-min="${start}" data-age-max="${end}" aria-pressed="false">${start}–${end} лет</button>`);
    }
  }
  const cards = visible.map(course => {
    const [background, foreground] = palettes[course.color || 'purple'];
    const image = imagePath(course.image);
    const illustration = image
      ? `<img class="course-image" src="${escapeHtml(image)}" alt="${escapeHtml(course.imageAlt || course.title)}" loading="lazy">`
      : `<div class="icon" style="color:${foreground}" aria-hidden="true">${escapeHtml(course.icon || '✳')}</div>`;
    return `<article class="card" data-min-age="${course.minAge}" data-max-age="${course.maxAge}" style="background:${background}"><div class="cardtop"><span>${escapeHtml(course.category)}</span><span>${ageLabel(course.minAge,course.maxAge)}</span></div>${illustration}<h3>${escapeHtml(course.title)}</h3><p>${text(course.description)}</p>${course.price ? `<p class="course-price">${escapeHtml(course.price)}</p>` : ''}<button type="button" data-course="${escapeHtml(course.title)}">${escapeHtml(course.button || 'Хочу попробовать')} <span>↗</span></button></article>`;
  }).join('');
  const schedule = visible.flatMap(course => (course.sessions ?? []).map(session =>
    `<div class="row"><strong>${escapeHtml(course.icon || '✳')} &nbsp;${escapeHtml(course.title)}</strong><span>${escapeHtml(session.days)} · ${escapeHtml(session.time)}</span><small>${ageLabel(course.minAge,course.maxAge)} · ${course.duration} минут${session.group ? `<br>${escapeHtml(session.group)}` : ''}${course.price ? `<br>${escapeHtml(course.price)}` : ''}</small><button type="button" data-course="${escapeHtml(course.title)}">Выбрать занятие ↗</button></div>`
  )).join('');
  const contacts = site.contacts || {};
  const contactItems = [];
  if (contacts.address) contactItems.push(`<p>${text(contacts.address)}</p>`);
  if (contacts.phone) contactItems.push(`<p><a href="tel:${escapeHtml(contacts.phone.replace(/[^+\d]/g,''))}">${escapeHtml(contacts.phone)}</a></p>`);
  if (contacts.email) contactItems.push(`<p><a href="mailto:${escapeHtml(contacts.email)}">${escapeHtml(contacts.email)}</a></p>`);
  if (contacts.link) contactItems.push(`<p><a class="btn light" href="${escapeHtml(contacts.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contacts.linkLabel || 'Связаться с клубом')} ↗</a></p>`);
  const values = {
    TITLE: escapeHtml(site.title), DESCRIPTION: escapeHtml(site.description), INTRO: text(site.intro),
    AGE_LABEL: `Детский клуб · ${ageLabel(...ages)}`, COURSES_INTRO: text(site.coursesIntro),
    COURSES_NOTE: text(site.coursesNote), ABOUT_TITLE: text(site.aboutTitle), ABOUT_TEXT: text(site.aboutText),
    FILTERS: visible.length ? `<div class="filters" aria-label="Возраст ребёнка"><button class="filter active" data-age="all" aria-pressed="true">Все возрасты</button>${filters.join('')}</div>` : '',
    CARDS: cards || empty('Скоро здесь появятся новые занятия.'),
    SCHEDULE_NOTE: text(site.scheduleNote), SCHEDULE: schedule || empty('Расписание уточняется. Вы можете выбрать направление в анкете ниже.'),
    POINTS: (site.points || []).map((p,i)=>`<div class="point"><b>${String(i+1).padStart(2,'0')}</b><div><h3>${escapeHtml(p.title)}</h3><p>${text(p.text)}</p></div></div>`).join(''),
    CONTACTS: contactItems.length ? `<section id="contacts"><div class="eyebrow">Будем рады знакомству</div><h2>Контакты клуба</h2>${contactItems.join('')}</section>` : '',
    FAQ: (site.faq || []).map(f=>`<details><summary>${escapeHtml(f.question)}</summary><p>${text(f.answer)}</p></details>`).join(''),
    COURSE_OPTIONS: visible.map(c=>`<option value="${escapeHtml(c.title)}">${escapeHtml(c.title)}</option>`).join('') + '<option value="Помогите выбрать">Помогите выбрать</option>',
    AGE_OPTIONS: Array.from({length: ages[1]-ages[0]+1},(_,i)=>`<option value="${ages[0]+i}">${ages[0]+i} ${ageWord(ages[0]+i)}</option>`).join(''),
    EXTRA_CSS: '.card{min-width:0;overflow-wrap:anywhere}.cardtop{gap:12px}.cardtop>span:last-child{white-space:nowrap}.course-image{display:block;width:100%;height:145px;object-fit:cover;border-radius:12px;margin:18px 0 0}.card .course-price{font-weight:700;margin:0 0 16px;color:var(--ink)}.row>*{min-width:0;overflow-wrap:anywhere}#contacts a:not(.btn){text-decoration:underline}.cards>.notice{grid-column:1/-1}'
  };
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_,key)=>{
    if (!(key in values)) throw new Error(`Неизвестный шаблон: ${key}`);
    return values[key];
  });
}
