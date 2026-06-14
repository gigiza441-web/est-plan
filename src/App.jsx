import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileCheck2,
  FolderOpen,
  Home,
  Info,
  LayoutGrid,
  ListChecks,
  MoreHorizontal,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { categories, trustItems, workQuestions, workSteps } from "./data";

const STORAGE_KEY = "est-plan-blue-state-v1";
const MASCOT_TIPS = [
  "Выберите ситуацию, а я соберу понятный маршрут без лишней теории.",
  "Не знаете точный раздел? Введите проблему своими словами в поиск.",
  "Начните с «Первой работы» — этот маршрут уже полностью интерактивный.",
];

const initialState = {
  screen: "home",
  categoryId: null,
  situationId: null,
  quizIndex: 0,
  answers: {},
  planCreated: false,
  completedSteps: [],
  currentStepId: 1,
  saved: false,
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored ? { ...initialState, ...stored, screen: "home" } : initialState;
  } catch {
    return initialState;
  }
}

function BrandMark({ compact = false }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`} aria-label="Есть план">
      <div className="brand-mark__route">
        <span />
        <span />
        <Check size={compact ? 13 : 16} strokeWidth={2.6} />
      </div>
      {compact ? null : <strong>Есть план</strong>}
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="progress" aria-label={`Прогресс ${value}%`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function IconButton({ label, children, onClick }) {
  return (
    <button className="icon-button" type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function AppHeader({ title, onBack, action }) {
  return (
    <header className="app-header">
      {onBack ? (
        <IconButton label="Назад" onClick={onBack}>
          <ArrowLeft />
        </IconButton>
      ) : (
        <BrandMark compact />
      )}
      <span className="app-header__title">{title}</span>
      {action ?? <span className="app-header__spacer" />}
    </header>
  );
}

function BottomNav({ active, navigate }) {
  const items = [
    { id: "home", label: "Главная", Icon: Home },
    { id: "situations", label: "Ситуации", Icon: LayoutGrid },
    { id: "plans", label: "Мои планы", Icon: ListChecks },
    { id: "profile", label: "Профиль", Icon: UserRound },
  ];
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {items.map(({ id, label, Icon }) => (
        <button
          className={active === id ? "is-active" : ""}
          key={id}
          type="button"
          onClick={() => navigate(id)}
        >
          <Icon size={21} strokeWidth={active === id ? 2.4 : 1.9} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function CategoryRow({ category, onClick }) {
  const { Icon } = category;
  return (
    <button className="category-row" type="button" onClick={onClick}>
      <span className={`category-row__icon category-row__icon--${category.color}`}>
        <Icon size={24} />
      </span>
      <span className="category-row__copy">
        <strong>{category.title}</strong>
        <small>{category.description}</small>
      </span>
      <ChevronRight size={21} className="category-row__chevron" />
    </button>
  );
}

function Screen({ children, className = "" }) {
  return <main className={`screen ${className}`}>{children}</main>;
}

function MascotImage({ pose = "wave", className = "" }) {
  return (
    <img
      className={`mascot-image ${className}`}
      src={`${import.meta.env.BASE_URL}mascot/mascot-${pose}.jpg`}
      alt=""
      aria-hidden="true"
    />
  );
}

function MascotAssistant({
  pose = "wave",
  label = "Планчик подсказывает",
  message,
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <section className={`mascot-assistant ${compact ? "mascot-assistant--compact" : ""}`}>
      <MascotImage pose={pose} />
      <div className="mascot-assistant__copy">
        <small>{label}</small>
        <p>{message}</p>
        {actionLabel ? (
          <button type="button" onClick={onAction}>
            {actionLabel}
            <ArrowRight size={15} />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function warningLabel(count) {
  if (count === 1) return "1 красный флаг";
  if (count >= 2 && count <= 4) return `${count} красных флага`;
  return `${count} красных флагов`;
}

function App() {
  const [state, setState] = useState(loadState);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [mascotTip, setMascotTip] = useState(0);

  useEffect(() => {
    const persistable = { ...state, screen: "home" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }, [state]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const completedCount = state.completedSteps.length;
  const planProgress = Math.round((completedCount / workSteps.length) * 100);
  const warningCount = Object.values(state.answers).filter((answer) =>
    ["informal", "verbal", "missing"].includes(answer),
  ).length;

  const navigate = (screen) => {
    setQuery("");
    setState((current) => ({ ...current, screen }));
  };

  const openCategory = (categoryId) => {
    setState((current) => ({ ...current, categoryId, screen: "category" }));
  };

  const openSituation = (categoryId, situationId) => {
    const isFirstJob = situationId === "first-job";
    if (!isFirstJob) {
      setToast("Этот маршрут появится в следующей версии");
      return;
    }
    setState((current) => ({
      ...current,
      categoryId,
      situationId,
      screen: current.planCreated ? "route" : "situation-intro",
    }));
  };

  const startQuiz = () => {
    setState((current) => ({ ...current, quizIndex: 0, answers: {}, screen: "quiz" }));
  };

  const chooseAnswer = (answerId) => {
    const question = workQuestions[state.quizIndex];
    const answers = { ...state.answers, [question.id]: answerId };
    if (state.quizIndex === workQuestions.length - 1) {
      setState((current) => ({ ...current, answers, planCreated: true, screen: "plan-ready" }));
    } else {
      setState((current) => ({ ...current, answers, quizIndex: current.quizIndex + 1 }));
    }
  };

  const openStep = (stepId) => {
    setState((current) => ({ ...current, currentStepId: stepId, screen: "step" }));
  };

  const completeStep = () => {
    const stepId = state.currentStepId;
    const completed = Array.from(new Set([...state.completedSteps, stepId])).sort((a, b) => a - b);
    if (completed.length === workSteps.length) {
      setState((current) => ({ ...current, completedSteps: completed, screen: "completed" }));
      return;
    }
    const nextStep = workSteps.find((step) => !completed.includes(step.id));
    setState((current) => ({
      ...current,
      completedSteps: completed,
      currentStepId: nextStep?.id ?? stepId,
      screen: "route",
    }));
    setToast("Шаг отмечен выполненным");
  };

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(initialState);
    setToast("Демонстрация начата заново");
  };

  const activeCategory = categories.find((category) => category.id === state.categoryId);
  const activeStep = workSteps.find((step) => step.id === state.currentStepId) ?? workSteps[0];
  const nextStep = workSteps.find((step) => !state.completedSteps.includes(step.id));

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return categories;
    return categories.filter(
      (category) =>
        category.title.toLowerCase().includes(normalized) ||
        category.description.toLowerCase().includes(normalized) ||
        category.situations.some((situation) => situation.title.toLowerCase().includes(normalized)),
    );
  }, [query]);

  let content;

  if (state.screen === "home") {
    content = (
      <>
        <Screen className="home-screen">
          <div className="home-topline">
            <BrandMark />
            <IconButton label="Уведомления">
              <Bell size={21} />
            </IconButton>
          </div>
          <p className="eyeline">Добрый день</p>
          <h1>С чем нужно разобраться?</h1>
          <label className="search-field">
            <Search size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти ситуацию"
              aria-label="Найти ситуацию"
            />
          </label>

          <MascotAssistant
            message={MASCOT_TIPS[mascotTip]}
            actionLabel="Ещё подсказка"
            onAction={() => setMascotTip((current) => (current + 1) % MASCOT_TIPS.length)}
          />

          {state.planCreated ? (
            <button className="active-plan" type="button" onClick={() => navigate("route")}>
              <span className="active-plan__label">Мой план</span>
              <span className="active-plan__main">
                <span className="active-plan__icon">
                  <BriefcaseIcon />
                </span>
                <span>
                  <strong>Первая работа</strong>
                  <small>
                    {completedCount === workSteps.length
                      ? "План выполнен"
                      : `Следующий шаг: ${workSteps.find((step) => !state.completedSteps.includes(step.id))?.title.toLowerCase()}`}
                  </small>
                </span>
                <ChevronRight />
              </span>
              <span className="active-plan__progress">
                <ProgressBar value={planProgress} />
                <b>{completedCount} из 6</b>
              </span>
            </button>
          ) : (
            <button className="start-panel" type="button" onClick={() => openSituation("work", "first-job")}>
              <span className="start-panel__icon">
                <BriefcaseIcon />
              </span>
              <span>
                <small>Популярный маршрут</small>
                <strong>Первая работа</strong>
                <em>Проверить договор и подготовить документы</em>
              </span>
              <ArrowRight />
            </button>
          )}

          <div className="section-heading">
            <h2>Жизненные ситуации</h2>
            <button type="button" onClick={() => navigate("situations")}>Все</button>
          </div>
          <div className="category-list">
            {filteredCategories.slice(0, 5).map((category) => (
              <CategoryRow key={category.id} category={category} onClick={() => openCategory(category.id)} />
            ))}
          </div>
          {filteredCategories.length === 0 ? (
            <div className="empty-search">
              <Search />
              <strong>Ничего не нашли</strong>
              <span>Попробуйте сформулировать ситуацию иначе.</span>
            </div>
          ) : null}
          <button className="text-link home-help" type="button" onClick={() => setToast("Опишите проблему куратору на защите")}>
            Не знаю, какой раздел выбрать
            <ArrowRight size={17} />
          </button>
        </Screen>
        <BottomNav active="home" navigate={navigate} />
      </>
    );
  } else if (state.screen === "situations") {
    content = (
      <>
        <Screen>
          <AppHeader title="Ситуации" action={<IconButton label="Уведомления"><Bell /></IconButton>} />
          <h1>Выберите ситуацию</h1>
          <p className="lead">Найдём понятный маршрут и покажем, с чего начать.</p>
          <label className="search-field">
            <Search size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск"
              aria-label="Поиск ситуаций"
            />
          </label>
          <div className="category-list category-list--roomy">
            {filteredCategories.map((category) => (
              <CategoryRow key={category.id} category={category} onClick={() => openCategory(category.id)} />
            ))}
          </div>
        </Screen>
        <BottomNav active="situations" navigate={navigate} />
      </>
    );
  } else if (state.screen === "category" && activeCategory) {
    const { Icon } = activeCategory;
    content = (
      <Screen>
        <AppHeader title={activeCategory.title} onBack={() => navigate("situations")} />
        <div className={`category-hero category-hero--${activeCategory.color}`}>
          <Icon />
          <div>
            <h1>{activeCategory.title}</h1>
            <p>{activeCategory.description}</p>
          </div>
        </div>
        <h2 className="list-title">Что случилось?</h2>
        <div className="situation-list">
          {activeCategory.situations.map((situation) => (
            <button
              key={situation.id}
              type="button"
              className="situation-row"
              onClick={() => openSituation(activeCategory.id, situation.id)}
            >
              <span>
                <strong>{situation.title}</strong>
                <small>{situation.description}</small>
                <em><Clock3 size={14} />{situation.time}</em>
              </span>
              <ChevronRight />
            </button>
          ))}
        </div>
        <div className="trust-note">
          <ShieldCheck />
          <p><strong>Проверяем информацию</strong><span>Маршруты основаны на официальных источниках.</span></p>
        </div>
      </Screen>
    );
  } else if (state.screen === "situation-intro") {
    content = (
      <Screen className="intro-screen">
        <AppHeader title="" onBack={() => openCategory("work")} />
        <div className="intro-icon"><BriefcaseIcon /></div>
        <h1>Первая работа</h1>
        <p className="lead">Разберёмся, что проверить до выхода на работу.</p>
        <div className="benefit-list">
          <div><ShieldCheck /><span><strong>Проверим условия</strong><small>Должность, зарплату и график</small></span></div>
          <div><FolderOpen /><span><strong>Соберём документы</strong><small>Только то, что действительно нужно</small></span></div>
          <div><Clock3 /><span><strong>Отметим сроки</strong><small>Первая выплата и испытательный срок</small></span></div>
        </div>
        <div className="screen-spacer" />
        <button className="primary-button" type="button" onClick={startQuiz}>Начать</button>
        <p className="source-line"><ShieldCheck size={16} /> Информация из официальных источников</p>
      </Screen>
    );
  } else if (state.screen === "quiz") {
    const question = workQuestions[state.quizIndex];
    const value = ((state.quizIndex + 1) / workQuestions.length) * 100;
    content = (
      <Screen className="quiz-screen">
        <AppHeader title="" onBack={() => state.quizIndex === 0
          ? setState((current) => ({ ...current, screen: "situation-intro" }))
          : setState((current) => ({ ...current, quizIndex: current.quizIndex - 1 }))} />
        <p className="quiz-count">Вопрос {state.quizIndex + 1} из {workQuestions.length}</p>
        <ProgressBar value={value} />
        <div className="quiz-copy">
          <h1>{question.title}</h1>
          <p>{question.helper}</p>
        </div>
        <div className="option-list">
          {question.options.map((option) => (
            <button
              className={option.warning ? "option-row option-row--warning" : "option-row"}
              type="button"
              key={option.id}
              onClick={() => chooseAnswer(option.id)}
            >
              <span className="radio-dot" />
              <span>{option.label}</span>
              {option.warning ? <CircleAlert size={18} /> : null}
            </button>
          ))}
        </div>
        <button className="text-link centered-link" type="button" onClick={() => setToast("Выберите наиболее близкий вариант")}>
          Не уверен, что выбрать
        </button>
      </Screen>
    );
  } else if (state.screen === "plan-ready") {
    content = (
      <Screen className="ready-screen">
        <AppHeader title="" onBack={() => setState((current) => ({ ...current, screen: "quiz", quizIndex: 2 }))} />
        <div className="success-ring"><Check /></div>
        <h1>Ваш план готов</h1>
        <p className="lead">6 шагов • около 25 минут</p>
        <div className="plan-preview">
          {workSteps.slice(0, 3).map((step) => (
            <div key={step.id}>
              <span>{step.id}</span>
              <strong>{step.title}</strong>
              <ChevronRight />
            </div>
          ))}
          <p>Ещё 3 шага</p>
        </div>
        <div className="warning-banner">
          <CircleAlert />
          <span>
            <strong>{warningCount > 0 ? `Обратите внимание: ${warningLabel(warningCount)}` : "Красных флагов пока не найдено"}</strong>
            <small>Покажем их внутри маршрута</small>
          </span>
        </div>
        <div className="screen-spacer" />
        <button className="primary-button" type="button" onClick={() => navigate("route")}>Открыть план</button>
        <button className="secondary-button" type="button" onClick={() => { setState((current) => ({ ...current, saved: true, screen: "home" })); setToast("План сохранён"); }}>
          Сохранить на потом
        </button>
      </Screen>
    );
  } else if (state.screen === "route") {
    content = (
      <>
        <Screen className="route-screen">
          <AppHeader
            title=""
            onBack={() => navigate("home")}
            action={<IconButton label="Сохранить план" onClick={() => { setState((current) => ({ ...current, saved: !current.saved })); setToast(state.saved ? "Удалено из сохранённых" : "План сохранён"); }}><Bookmark fill={state.saved ? "currentColor" : "none"} /></IconButton>}
          />
          <h1>Первая работа</h1>
          <div className="route-meta">
            <strong>{completedCount} из 6 шагов</strong>
            <span>{completedCount === 6 ? "Всё готово" : "Осталось около 20 минут"}</span>
          </div>
          <ProgressBar value={planProgress} />
          <MascotAssistant
            compact
            pose={completedCount === workSteps.length ? "success" : "guide"}
            label={completedCount === workSteps.length ? "Маршрут пройден" : "Планчик подсказывает"}
            message={
              completedCount === workSteps.length
                ? "Все шаги готовы. Можно посмотреть итог и сохранить маршрут."
                : `Продолжим с шага «${nextStep?.title}».`
            }
            actionLabel={completedCount === workSteps.length ? "Посмотреть итог" : "Открыть следующий шаг"}
            onAction={() => completedCount === workSteps.length
              ? navigate("completed")
              : openStep(nextStep?.id ?? 1)}
          />
          {warningCount > 0 ? (
            <div className="warning-banner route-warning">
              <CircleAlert />
              <span>
                <strong>В ответах найдено: {warningLabel(warningCount)}</strong>
                <small>Особенно внимательно проверьте договор и условия оплаты.</small>
              </span>
            </div>
          ) : null}
          <div className="steps-list">
            {workSteps.map((step) => {
              const isDone = state.completedSteps.includes(step.id);
              const firstIncomplete = workSteps.find((item) => !state.completedSteps.includes(item.id))?.id;
              const isCurrent = step.id === firstIncomplete && !isDone;
              return (
                <button
                  className={`step-row ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                  type="button"
                  key={step.id}
                  onClick={() => openStep(step.id)}
                >
                  <span className="step-row__number">{isDone ? <Check size={17} /> : step.id}</span>
                  <span>
                    <strong>{step.title}</strong>
                    <small>{step.duration}</small>
                  </span>
                  <ChevronRight />
                </button>
              );
            })}
          </div>
          {completedCount === workSteps.length ? (
            <button className="primary-button route-finish" type="button" onClick={() => navigate("completed")}>Посмотреть результат</button>
          ) : null}
        </Screen>
        <BottomNav active="plans" navigate={navigate} />
      </>
    );
  } else if (state.screen === "step") {
    const isDone = state.completedSteps.includes(activeStep.id);
    content = (
      <Screen className="step-screen">
        <AppHeader
          title={`Шаг ${activeStep.id} из 6`}
          onBack={() => navigate("route")}
          action={<IconButton label="Ещё"><MoreHorizontal /></IconButton>}
        />
        <h1>{activeStep.title}</h1>
        <p className="duration"><Clock3 />{activeStep.duration}</p>
        <button
          className="mascot-peek"
          type="button"
          onClick={() => setToast(`Планчик: ${activeStep.summary}`)}
        >
          <MascotImage pose="guide" />
          <span><strong>Нужна короткая версия?</strong><small>Нажмите, и Планчик подскажет суть шага.</small></span>
          <ChevronRight />
        </button>
        <section className="instruction-section">
          <h2><FileCheck2 />Что сделать</h2>
          <p>{activeStep.action}</p>
        </section>
        <section className="instruction-section">
          <h2><FolderOpen />Что понадобится</h2>
          <div className="chips">
            {activeStep.needs.map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>
        <div className="warning-box">
          <CircleAlert />
          <p><strong>Красный флаг</strong><span>{activeStep.warning}</span></p>
        </div>
        <div className="verified-box">
          <ShieldCheck />
          <p><strong>Проверено экспертом</strong><span>Обновлено 12.06.2026</span></p>
        </div>
        <a className="source-button" href={activeStep.sourceUrl} target="_blank" rel="noreferrer">
          <ExternalLink />
          <span><strong>Официальный источник</strong><small>{activeStep.source}</small></span>
          <ChevronRight />
        </a>
        <div className="screen-spacer" />
        <button className={isDone ? "secondary-button sticky-action" : "primary-button sticky-action"} type="button" onClick={isDone ? () => navigate("route") : completeStep}>
          {isDone ? "Вернуться к плану" : "Отметить выполненным"}
        </button>
      </Screen>
    );
  } else if (state.screen === "completed") {
    content = (
      <Screen className="completed-screen">
        <div className="completion-mascot"><MascotImage pose="success" /></div>
        <h1>План выполнен</h1>
        <p className="completion-lead">Вы прошли все 6 шагов</p>
        <div className="completion-summary">
          <div><FileCheck2 /><span>Договор проверен</span><Check /></div>
          <div><FolderOpen /><span>Документы подготовлены</span><Check /></div>
          <div><Clock3 /><span>Важные сроки сохранены</span><Check /></div>
        </div>
        <div className="confidence-box">
          <CheckCircle2 />
          <p><strong>Теперь вы знаете, что делать дальше</strong><span>План останется в истории и будет доступен в любое время.</span></p>
        </div>
        <div className="screen-spacer" />
        <button className="primary-button" type="button" onClick={() => navigate("home")}>Завершить</button>
        <button className="secondary-button" type="button" onClick={() => { setState((current) => ({ ...current, saved: true })); setToast("План сохранён"); }}>Сохранить план</button>
      </Screen>
    );
  } else if (state.screen === "plans") {
    content = (
      <>
        <Screen>
          <AppHeader title="Мои планы" />
          <h1>Ваши маршруты</h1>
          <p className="lead">Возвращайтесь к шагам и сохраняйте результат.</p>
          {state.planCreated ? (
            <button className="plan-card" type="button" onClick={() => navigate(completedCount === 6 ? "completed" : "route")}>
              <span className="plan-card__icon"><BriefcaseIcon /></span>
              <span className="plan-card__copy">
                <small>{completedCount === 6 ? "Завершён" : "В процессе"}</small>
                <strong>Первая работа</strong>
                <em>{completedCount} из 6 шагов</em>
                <ProgressBar value={planProgress} />
              </span>
              <ChevronRight />
            </button>
          ) : (
            <div className="empty-state">
              <ListChecks />
              <h2>Планов пока нет</h2>
              <p>Выберите жизненную ситуацию, и мы подготовим маршрут.</p>
              <button className="primary-button" type="button" onClick={() => navigate("situations")}>Выбрать ситуацию</button>
            </div>
          )}
        </Screen>
        <BottomNav active="plans" navigate={navigate} />
      </>
    );
  } else {
    content = (
      <>
        <Screen>
          <AppHeader title="Профиль" action={<IconButton label="Настройки"><Settings2 /></IconButton>} />
          <div className="profile-head">
            <div className="profile-avatar"><UserRound /></div>
            <div><h1>Демо-профиль</h1><p>Ваша информация хранится только в этом браузере.</p></div>
          </div>
          <div className="stats-row">
            <div><strong>{completedCount === 6 ? 1 : 0}</strong><span>Завершено планов</span></div>
            <div><strong>{completedCount}</strong><span>Выполнено шагов</span></div>
          </div>
          <h2 className="list-title">Почему можно доверять</h2>
          <div className="trust-list">
            {trustItems.map(({ Icon, title, text }) => (
              <div key={title}><Icon /><p><strong>{title}</strong><span>{text}</span></p></div>
            ))}
          </div>
          <button className="danger-link" type="button" onClick={resetDemo}>Сбросить демонстрацию</button>
        </Screen>
        <BottomNav active="profile" navigate={navigate} />
      </>
    );
  }

  return (
    <div className="presentation-shell">
      <aside className="presentation-note">
        <BrandMark />
        <h2>Жизнь не готовила.<br />План есть.</h2>
        <p>Интерактивный прототип навигатора по взрослой жизни.</p>
        <div className="presentation-note__path">
          <span>1</span><p><strong>Выберите ситуацию</strong><small>Начните с «Первой работы»</small></p>
          <span>2</span><p><strong>Ответьте на вопросы</strong><small>План подстроится под ответы</small></p>
          <span>3</span><p><strong>Выполните маршрут</strong><small>Прогресс сохранится автоматически</small></p>
        </div>
        <div className="presentation-mascot">
          <MascotImage pose="wave" />
          <p><strong>Планчик</strong><small>Помогает не потеряться, но не мешает делу.</small></p>
        </div>
      </aside>
      <div className="device">
        <div className="device__speaker" />
        <div className="app">{content}</div>
      </div>
      {toast ? <div className="toast" role="status"><Info size={18} />{toast}</div> : null}
    </div>
  );
}

function BriefcaseIcon() {
  return <BriefcaseBusinessIcon />;
}

function BriefcaseBusinessIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7V5.8c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6V7" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 11.5c2.8 1.4 5.8 2.1 9 2.1s6.2-.7 9-2.1M10 13.2v1.3h4v-1.3" />
    </svg>
  );
}

export default App;
