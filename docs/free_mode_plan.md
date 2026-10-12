# Свободный режим тренировки (free mode) — план для агентов

## 1. Какая была задача

Добавить в Guided-уроки keybr.com опциональный «свободный» режим (галка в настройках):

- тренировка идёт как обычно, но пользователь в любой момент может кликнуть любую
  открытую букву и тренировать её (свободный фокус);
- можно досрочно добавить ещё не открытую букву (и убрать её обратно);
- можно полностью исключить букву из набора (и вернуть обратно, в т.ч. закрытую);
- авто-открытие новой буквы — только по порогу **последней открытой** буквы
  (хвоста), а не всех и не фокусной.

Решения, зафиксированные с заказчиком по ходу:

- стартовые 6 букв (`minSize`) неприкосновенны;
- повторный клик по фокусной = сброс в автофокус (слабейшая);
- исключение хвоста сдвигает хвост назад, статистика исключённых копится молча;
- персист выборов — в `Settings`, scope-ключ `раскладка + язык` (без `keyboardOrder`,
  хвост при смене порядка просто пересчитывается);
- scope — только `GuidedLesson`;
- жесты финальные: **левый клик** — тренировать/добавить/снять добавленную,
  **правый клик** — исключить/вернуть в авто (Shift отклонён: конфликтует
  с выделением текста, `user-select` трогать запрещено);
- маркер добавленной — бейдж «+» в углу (пунктир отклонён);
  маркер исключённой — крест-накрест `X` (одинарная диагональ остаётся
  за обычными закрытыми);
- русский язык — основной для новых строк (форк без синка переводов с апстримом,
  переводы правятся прямо в `packages/keybr-intl/translations/ru.json`).

## 2. Что сделано и как устроено

### Ядро (`packages/keybr-lesson/lib/`)

- `settings.ts` — `lessonProps.guided.freeMode = booleanProp(..., false)`.
  Выкл. галка = старый код path-в-path, обычный режим не затронут.
- `free-mode.ts` (новый) — всё состояние свободы:
  - `FreeOverride = "added" | "excluded"`, `FreeState = { overrides, focus }`;
  - персист: `stringProp(lesson.guided.freeOverrides.<scope>)` (JSON) +
    `numberProp(lesson.guided.freeFocus.<scope>)`, scope санитизируется;
  - чистые хелперы `readFreeState / withFreeOverride / withFreeFocus /
clearFreeScope / strippedSettingsSignature / isFreeSettingsKey`;
  - сессионное хранилище (module-level `Map` + `version` + `subscribe`) и
    `freeModeStore`, `hydrateFreeScope`, `applyFreeOverride/Focus`,
    `clearFreeSession`, `getEffectiveFreeState` (сессия побеждает настройки),
    `resetFreeModeSession()` для тестов.
  - Зачем сессия: `Lesson` хранит снапшот настроек, а клики идут через
    `updateSettings` (нужен для персиста/синка). Без сессии урок видел бы
    выборы только после пересоздания — а пересоздание урока/прогресса
    на каждый клик недопустимо (см. п.3).
- `guided.ts` — `update()` при вкл. галке идёт в `updateFree()`:
  позиции `< guidedMinSize (=6)` включаются всегда; `excluded` пропускаются
  (проверка раньше всех авто-веток, поэтому исключение бьёт и `force`
  от `alphabetSize`, и «уверенные» буквы); `added` включаются досрочно;
  авто-открытие — только если хвост (`includedKeys.at(-1)`) выше порога
  (`confidence`/`bestConfidence` по `recoverKeys`); фокус — ручной если
  валиден, иначе слабейшая (старый код). `generate()` не менялся —
  `Filter(included, focused)` уже умеет произвольный фокус.

### Невидимый фундамент: стабильность identity (п.3 обязательно к прочтению)

Каждый клик делает `updateSettings` (новый объект `Settings`). Три места
пересоздавали по нему клавиатуру → урок → прогресс, что роняло статистику
в ноль до перезагрузки страницы. Исправлено точечно, семантика сохранена:

- `packages/keybr-keyboard/lib/context.tsx` — `KeyboardProvider` мемоизирует
  клавиатуру по 4 опциям (`language/layout/geometry/zones`, канонические
  enum-инстансы), пересобирая `KeyboardOptions` тем же чейном, что `from()`.
- `packages/keybr-lesson-loader/lib/LessonLoader.tsx` — эффект keyed
  по `strippedSettingsSignature` (free-ключи вырезаны), свежие настройки
  берутся из ref.
- `packages/page-practice/lib/practice/PracticeScreen.tsx` — хук
  `useStableSettings` (identity держится, пока stripped-сигнатура та же)
  - `useMemo([stableSettings, lesson])`.
- Модель (`PhoneticModelLoader`) стабильна сама: `language` — канонический
  enum-инстанс, `key={language.id}`. Не трогать.
- Антипаттерн, который здесь уже дважды кусался: `useMemo(..., [ref])`
  со стабильным ref-объектом **никогда не пересчитывается** (даже когда надо).
  Ключом обязано быть значение (сигнатура/перечисления), ref — только
  транспортом свежих данных внутрь.

### UI практики (`packages/page-practice/lib/practice/`)

- `Controller.tsx` — `handleKeyClick` (левый): locked/excluded → `added`;
  `added` без фокуса → фокус; `added`+фокус → снять оверрайд + автофокус;
  обычная → фокус; фокусная → автофокус. `handleKeyContextMenu` (правый):
  первые 6 — noop; `excluded` → снять в авто; иначе → `excluded`
  (включая закрытые). Оба: сессия + `updateSettings` (персист) + `setKey+1`
  (мгновенная регенерация текста из того же прогресса).
- `Presenter.tsx` — проброс `onKeyClick/onKeyContextMenu` в Normal/Compact
  (Bare без индикаторов — кликов там нет по построению).
- `Indicators.tsx` — `useFreeState` (хук в `use-free-state.ts`:
  `useSyncExternalStore` + hydrate), `resolveKey` (selectable/added/
  manualExcluded + тултипы), глушение системного меню идёт из `KeySet`.
- `state/event-source-letter.ts` — ручные `added` не шлют `new-letter`,
  только честные авто-открытия.
- Настройки: `settings/lesson/FreeModeProp.tsx` (галка + explainer +
  «Reset manual choices» с чисткой сессии и scope), регистрация
  в `GuidedLessonSettings.tsx`.

### UI набора (`packages/keybr-lesson-ui/lib/`)

- `KeySet.tsx` — `resolveKey`, `onKeyClick` с нативным событием,
  `onKeyContextMenu` relay + `preventDefault` только когда хендлер задан
  (в обычном режиме меню браузера живо).
- `Key.tsx` — `isAdded` → бейдж «+» (absolute-уголок), `isManualExcluded` →
  вторая диагональ (X). Обычные закрытые — одна диагональ, как было.
- `indicators.tsx` — проброс `resolveKey/onKeyContextMenu` в `KeySetRow`.

### i18n

Новые id (EN — `defaultMessage`, RU — в `translations/ru.json`, затем
`npm run translate`): `settings.freeMode.description`,
`t_Free_training_mode:`, `t_Let_me_choose_the_let`, `t_Reset_manual_choices`,
`t_Free_basic_key`, `t_Free_included_key`, `t_Free_locked_key`,
`t_Free_excluded_key`, `t_Free_focused_key`, `t_Free_added_key`,
`t_Free_focused_added_key`. Удалённый `t_Free_legend` вычищен отовсюду.
Остальные локали — английские фолбэки (штатно для форка).

## 3. Таблица переходов (шпаргалка)

| Жест                        | Состояние → результат                    |
| --------------------------- | ---------------------------------------- |
| ЛКМ по закрытой/исключённой | `added` (без смены фокуса)               |
| ЛКМ по `added` без фокуса   | фокус                                    |
| ЛКМ по `added`+фокус        | снять оверрайд → авто (+автофокус)       |
| ЛКМ по обычной / фокусной   | фокус / автофокус                        |
| ПКМ (кроме первых 6)        | `excluded`; по `excluded` → снять в авто |

## 4. Как проверять

Тулчейн: `source .tools/env.sh` (Node 26, системный Node 20 ломает jsdom-тесты —
это квирк окружения, не регрессия).

- `npm run compile` (весь монорепо), `npx eslint` по тронутым файлам,
  `prettier --check`, `stylelint` для `.less`.
- Сьюты: `@keybr/lesson` (free-mode + free-ветки guided, вкл. чтение из
  настроек и из сессии), `@keybr/page-practice` (event-source-letter:
  мокам урока нужен реальный `settings`; suppression ручных букв;
  `keyboard-stability.test.tsx` — инстанс стабилен на free-записях
  и меняется на смене геометрии), `@keybr/lesson-ui`, `@keybr/lesson-loader`,
  `@keybr/keyboard`.
- Ручной сценарий: цвета/цифры на месте после клика; ПКМ по закрытой → X;
  ЛКМ → «+» → ещё ЛКМ → фокус → ещё ЛКМ → бейдж снят; перезагрузка —
  выборы живы, снятое не воскресает.

## 5. Известные нюансы и запреты

- Не возвращать Shift-механику: Shift+клик расширяет выделение, а
  `user-select: none` на наборе запрещён заказчиком.
- Не класть `useMemo(..., [refObject])` со стабильным ref — см. п.2.
- `update()` обязана оставаться чистой: авто-снятие `added` при догоне
  прогрессом не делать (потребовало бы side effects); маркер висит до
  ручного снятия — так задумано.
- `t_Free_legend` удалён осознанно (требование заказчика), не возвращать.
- Обычный режим (галка выкл.) не затронут: старые тесты идут без правок;
  три мемоизации из п.2 в обычном режиме семантически эквивалентны
  (free-ключей в настройках нет), дают лишь меньше лишних пересборок.
