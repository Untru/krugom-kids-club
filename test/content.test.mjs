import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderSite, validateContent, imagePath} from '../scripts/render.mjs';

const root = new URL('../',import.meta.url);
const originalCourses = JSON.parse(readFileSync(new URL('data/courses.json',root),'utf8'));
const site = JSON.parse(readFileSync(new URL('data/site.json',root),'utf8'));
const template = readFileSync(new URL('src/index.html',root),'utf8');
const courses = () => structuredClone(originalCourses);

test('new course appears in cards, schedule and booking without editing HTML',()=>{
  const data = courses();
  data.push({...data[0],title:'Робототехника',minAge:6,maxAge:16,sessions:[{days:'Вс',time:'12:30',group:'Начинающие'},{days:'Ср',time:'18:00',group:'Продолжающие'}]});
  const html = renderSite(template,data,site);
  assert.match(html,/<h3>Робототехника<\/h3>/);
  assert.match(html,/<option value="Робототехника">/);
  assert.match(html,/Вс · 12:30/);
  assert.match(html,/Ср · 18:00/);
  assert.match(html,/>16 лет<\/option>/);
  assert.doesNotMatch(html,/\{\{[A-Z_]+\}\}/);
});
test('hidden course disappears from cards, schedule, ages and booking',()=>{
  const data = courses(); data[2].visible = false;
  const html = renderSite(template,data,site);
  assert.doesNotMatch(html,/<h3>Немецкий<\/h3>|data-course="Немецкий"|<option value="Немецкий">/);
  assert.doesNotMatch(html,/Вт, Пт · 16:00/);
});
test('editor can save an unfinished hidden draft',()=>{
  const data = courses(); data.push({title:'Новое занятие',visible:false});
  assert.doesNotThrow(()=>renderSite(template,data,site));
});
test('schedule change replaces old time and supports an empty schedule',()=>{
  const data = courses(); data[0].sessions=[{days:'Пн',time:'19:15',group:'Старшая группа'}];
  const html = renderSite(template,data,site);
  assert.match(html,/Пн · 19:15/); assert.doesNotMatch(html,/Вт, Чт · 17:00/);
  assert.match(html,/Старшая группа/);
  data.forEach(c=>c.sessions=[]);
  assert.match(renderSite(template,data,site),/Расписание уточняется/);
});
test('titles and text cannot inject HTML or button attributes',()=>{
  const data = courses();data[0].title='Лепка " onclick="alert(1)';data[0].description='<script>alert(1)</script>';
  const html = renderSite(template,data,site);
  assert.match(html,/Лепка &quot; onclick=&quot;alert\(1\)/);
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>|data-course="Лепка " onclick=/);
});
test('invalid published ages, time and duplicate names stop publication',()=>{
  let data = courses();data[0].minAge=13;assert.throws(()=>validateContent(data,site),/Возраст до/);
  data=courses();data[0].sessions[0].time='25:00';assert.throws(()=>validateContent(data,site),/Время/);
  data=courses();data[1].title=data[0].title;assert.throws(()=>validateContent(data,site),/Повторяется/);
});
test('only repository media images are accepted',()=>{
  assert.equal(imagePath('/krugom-kids-club/media/лепка.jpg'),'media/лепка.jpg');
  for (const path of ['javascript:alert(1)','https://example.com/photo.jpg','media/../secret.jpg','media/a.svg','media/%2e%2e/x.jpg']) assert.throws(()=>imagePath(path));
});
test('empty catalogue and contact updates render correctly',()=>{
  const data=courses(); data.forEach(c=>c.visible=false);
  const settings=structuredClone(site);settings.contacts={address:'Тестовый адрес',phone:'+7 900 000-00-00',email:'club@example.org',link:'https://example.org/',linkLabel:'Написать'};
  const html=renderSite(template,data,settings);
  assert.match(html,/Скоро здесь появятся новые занятия/);
  assert.match(html,/id="contacts"/);assert.match(html,/href="tel:\+79000000000"/);
  assert.match(html,/<option value="Помогите выбрать">/);
  assert.doesNotMatch(html,/<article class="card"/);
});
