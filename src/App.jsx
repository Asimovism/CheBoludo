import { useState, useMemo, useRef } from "react";
import "./styles.css";
import { vocabulary, multipleChoiceQuestions, shuffleArray } from "./data";

const TOTAL_QUESTIONS = 10;
const GAME_OVER_MESSAGES = [
  "You ran out of empanadas, boludo!",
  "No more empanadas for you, che!",
  "Qué quilombo! Try again!",
  "Estás al horno, pibe!",
  "Dale, intentá de nuevo!",
];

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ empanadas, streak, adultMode, onToggleAdult }) {
  const empanadasDisplay =
    "🥟".repeat(Math.max(0, empanadas)) +
    "💀".repeat(Math.max(0, 3 - empanadas));
  return (
    <div className="stats-bar">
      <div className="stat stat-large">
        <span className="stat-label">Empanadas</span>
        <span className="stat-value stat-value-large">{empanadasDisplay}</span>
      </div>
      <div className="stat stat-large">
        <span className="stat-label">Streak</span>
        <span className="stat-value stat-value-large">{streak}</span>
      </div>
      <button
        className={`adult-toggle${adultMode ? " adult-toggle-on" : ""}`}
        onClick={onToggleAdult}
      >
        <span className="adult-toggle-emoji">{adultMode ? "🤬" : "😇"}</span>
      </button>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  const pct = total > 0 ? ((current + 1) / total) * 100 : 0;
  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
      <div className="progress-text">
        {current + 1} / {total}
      </div>
    </div>
  );
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function Menu({ onSelect }) {
  return (
    <div>
      <div className="mode-selection">
        <button className="mode-btn" onClick={() => onSelect("flashcards")}>
          <span className="mode-icon">🃏</span>
          <div>Flashcards</div>
        </button>
        <button className="mode-btn" onClick={() => onSelect("multiplechoice")}>
          <span className="mode-icon">✍️</span>
          <div>Multiple Choice</div>
        </button>
        <button className="mode-btn" onClick={() => onSelect("glossary")}>
          <span className="mode-icon">📖</span>
          <div>Glossary</div>
        </button>
      </div>
      <div className="mode-selection mode-selection-premium">
        <button
          className="mode-btn mode-btn-premium"
          onClick={() => onSelect("premium")}
        >
          <span className="mode-icon">🥩</span>
          <div>Asado</div>
        </button>
        <button
          className="mode-btn mode-btn-premium"
          onClick={() => onSelect("premium")}
        >
          <span className="mode-icon">⚽</span>
          <div>Fútbol</div>
        </button>
        <button
          className="mode-btn mode-btn-premium"
          onClick={() => onSelect("premium")}
        >
          <span className="mode-icon">💃</span>
          <div>Folklore</div>
        </button>
      </div>
    </div>
  );
}

// ─── Flashcards ───────────────────────────────────────────────────────────────
function Flashcards({
  empanadas,
  learned,
  adultMode,
  onCorrect,
  onWrong,
  onGameOver,
  onComplete,
  onMenu,
}) {
  const sessionVocab = useMemo(() => {
    const pool = adultMode
      ? vocabulary
      : vocabulary.filter((w) => w.category !== "vulgar");
    return shuffleArray([...pool]).slice(0, TOTAL_QUESTIONS);
  }, []);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const correctRef = useRef(0);

  const card = sessionVocab[displayIndex];

  function advance(isCorrect) {
    const nextIndex = index + 1;
    if (isCorrect) {
      correctRef.current += 1;
      onCorrect(sessionVocab[index].spanish);
    } else {
      const newEmpanadas = empanadas - 1;
      onWrong();
      if (newEmpanadas <= 0) {
        onGameOver({ correct: correctRef.current, learnedCount: learned.size });
        return;
      }
    }
    if (nextIndex >= sessionVocab.length) {
      onComplete({
        correct: correctRef.current,
        learnedCount: learned.size + (isCorrect ? 1 : 0),
      });
      return;
    }
    setIndex(nextIndex);
    setFlipped(false);
    setTransitioning(true);
    // Wait for flip-back animation to finish before showing new card text
    setTimeout(() => {
      setDisplayIndex(nextIndex);
      setTransitioning(false);
    }, 650);
  }

  function handleKnown() {
    advance(true);
  }
  function handleUnknown() {
    advance(false);
  }

  return (
    <div>
      <ProgressBar current={index} total={sessionVocab.length} />

      <div
        className="flashcard-container"
        onClick={() => !transitioning && setFlipped((f) => !f)}
      >
        <div className={`flashcard${flipped ? " flipped" : ""}`}>
          <div className="card-face">
            <div
              style={{
                opacity: transitioning ? 0 : 1,
                transition: "opacity 0.1s",
              }}
            >
              <div className="card-text">{card.spanish}</div>
              <div className="card-context">✦ {card.category} ✦</div>
            </div>
          </div>
          <div className="card-face card-back">
            <div
              style={{
                opacity: transitioning ? 0 : 1,
                transition: "opacity 0.1s",
              }}
            >
              <div className="card-text">{card.english}</div>
              <div className="card-context">{card.context}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="btn-group">
        <button className="pixel-btn" onClick={handleKnown}>
          Knew it!
        </button>
        <button className="pixel-btn secondary" onClick={handleUnknown}>
          No idea
        </button>
      </div>
      <div className="btn-group">
        <button className="pixel-btn secondary" onClick={onMenu}>
          Back to menu
        </button>
      </div>
    </div>
  );
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────
function MultipleChoice({
  empanadas,
  learned,
  onCorrect,
  onWrong,
  onGameOver,
  onComplete,
  onMenu,
}) {
  const sessionQ = useMemo(
    () => shuffleArray([...multipleChoiceQuestions]).slice(0, TOTAL_QUESTIONS),
    []
  );
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [showContinue, setShowContinue] = useState(false);
  const [waitingGameOver, setWaitingGameOver] = useState(false);
  const correctRef = useRef(0);

  const q = sessionQ[index];
  const options = useMemo(
    () => shuffleArray([q.correct, ...q.options]),
    [index]
  );
  const letters = ["A", "B", "C", "D", "E"];

  function handleSelect(option) {
    if (answered || waitingGameOver) return;
    const isCorrect = option.toLowerCase() === q.correct.toLowerCase();
    setAnswered({ selected: option, isCorrect });

    if (isCorrect) {
      correctRef.current += 1;
      onCorrect(q.correct);
      setShowContinue(true);
    } else {
      const newEmpanadas = empanadas - 1;
      onWrong();
      if (newEmpanadas <= 0) {
        setWaitingGameOver(true);
        setTimeout(() => {
          onGameOver({
            correct: correctRef.current,
            learnedCount: learned.size,
          });
        }, 2000);
      } else {
        setShowContinue(true);
      }
    }
  }

  function handleContinue() {
    if (index + 1 >= sessionQ.length) {
      onComplete({ correct: correctRef.current, learnedCount: learned.size });
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(null);
    setShowContinue(false);
  }

  function getBtnClass(option) {
    if (!answered) return "choice-btn";
    if (option.toLowerCase() === q.correct.toLowerCase())
      return "choice-btn correct";
    if (option === answered.selected && !answered.isCorrect)
      return "choice-btn incorrect disabled";
    return "choice-btn disabled";
  }

  return (
    <div>
      <ProgressBar current={index} total={sessionQ.length} />
      <div className="question">{q.question}</div>
      <div className="choices-container">
        {options.map((option, i) => (
          <button
            key={option}
            className={getBtnClass(option)}
            onClick={() => handleSelect(option)}
            disabled={!!answered}
          >
            <span className="choice-letter">{letters[i]}.</span>
            <span>{option}</span>
          </button>
        ))}
      </div>

      {answered && (
        <div
          className={`feedback ${answered.isCorrect ? "correct" : "incorrect"}`}
        >
          {answered.isCorrect ? (
            <>
              ¡Correcto!
              <div className="correct-answer">{q.explanation}</div>
            </>
          ) : (
            <>
              ¡La Puta! -1 Empanada
              <div className="correct-answer">
                The answer was: {q.correct}
                <br />
                {q.explanation}
              </div>
            </>
          )}
        </div>
      )}

      {showContinue && !waitingGameOver && (
        <div className="btn-group">
          <button className="pixel-btn" onClick={handleContinue}>
            ¡Dale! Next
          </button>
        </div>
      )}
      <div className="btn-group">
        <button className="pixel-btn secondary" onClick={onMenu}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}

// ─── Glossary ─────────────────────────────────────────────────────────────────
function Glossary({ onMenu }) {
  const [hideMode, setHideMode] = useState(null);
  const [revealed, setReveal] = useState(new Set());

  const sorted = useMemo(
    () => [...vocabulary].sort((a, b) => a.spanish.localeCompare(b.spanish)),
    []
  );

  function toggleHide(mode) {
    setHideMode((prev) => (prev === mode ? null : mode));
    setReveal(new Set());
  }

  function revealItem(key) {
    setReveal((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div className="glossary-controls">
        <button
          className={`pixel-btn small${
            hideMode === "spanish" ? " active-hide" : ""
          }`}
          onClick={() => toggleHide("spanish")}
        >
          Hide Spanish
        </button>
        <button
          className={`pixel-btn small${
            hideMode === "english" ? " active-hide" : ""
          }`}
          onClick={() => toggleHide("english")}
        >
          Hide English
        </button>
        <button
          className="pixel-btn small secondary"
          onClick={() => {
            setHideMode(null);
            setReveal(new Set());
          }}
        >
          Show All
        </button>
      </div>
      <div className="glossary-scroll">
        {sorted.map((item, i) => {
          const spKey = `sp-${i}`;
          const enKey = `en-${i}`;
          const spHidden = hideMode === "spanish" && !revealed.has(spKey);
          const enHidden = hideMode === "english" && !revealed.has(enKey);
          return (
            <div className="glossary-item" key={i}>
              <div
                className={`glossary-spanish${spHidden ? " hidden-word" : ""}`}
                onClick={() => spHidden && revealItem(spKey)}
              >
                {item.spanish}
              </div>
              <div
                className={`glossary-english${enHidden ? " hidden-word" : ""}`}
                onClick={() => enHidden && revealItem(enKey)}
              >
                {item.english}
              </div>
              <div className="glossary-context">
                <div className="glossary-category">
                  {item.category.toUpperCase()}
                </div>
                {item.context}
              </div>
            </div>
          );
        })}
      </div>
      <div className="btn-group">
        <button className="pixel-btn secondary" onClick={onMenu}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}

function PremiumScreen({ onMenu }) {
  return (
    <div className="premium-container">
      <div className="premium-icon">🔥</div>
      <h2 className="premium-title">¡Esto es Premium, che!</h2>
      <p className="premium-text">
        This game mode is part of the full version of Che Boludo.
      </p>
      <p className="premium-text">
        The full version includes Asado, Fútbol, and Folklore game modes with
        hundreds more words, phrases, and challenges.
      </p>
      <p className="premium-link-text">
        Purchase page coming soon — watch this space.
      </p>
      <div className="btn-group">
        <button className="pixel-btn secondary" onClick={onMenu}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}

// ─── Game Over ────────────────────────────────────────────────────────────────
function GameOver({ correct, learnedCount, onRetry, onMenu }) {
  const msg = useRef(
    GAME_OVER_MESSAGES[Math.floor(Math.random() * GAME_OVER_MESSAGES.length)]
  );
  return (
    <div className="game-over-container">
      <div className="game-over-title">¡La Concha de la Lora!</div>
      <div className="game-over-subtitle">Game Over</div>
      <img src="/Empanada.png" alt="" className="game-over-empanada" />
      <div className="game-over-message">{msg.current}</div>
      <div className="btn-group" style={{ marginTop: "28px" }}>
        <button className="pixel-btn" onClick={onRetry}>
          ¡De Vuelta! Retry
        </button>
        <button className="pixel-btn secondary" onClick={onMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}

// ─── Session Complete ─────────────────────────────────────────────────────────
function SessionComplete({ correct, learnedCount, onMenu }) {
  const messages = [
    "¡EXCELENTE, BOLUDO! You're killing it!",
    "¡MUY BIEN, CHE! Keep it up!",
    "¡DE PRIMERA, PIBE! You're on fire!",
    "¡QUÉ BÁRBARO! Look at you go!",
    "¡DALE QUE VA! You're getting there!",
  ];
  const message = messages[Math.floor(Math.random() * messages.length)];
  return (
    <div className="session-complete">
      <div className="session-title">¡Goooooooooool!</div>
      <img src="/Goal.png" alt="" className="session-image" />
      <div className="session-score">
        Correct: {correct} / {TOTAL_QUESTIONS}
      </div>
      <div className="session-message">{message}</div>
      <div className="btn-group">
        <button className="pixel-btn secondary" onClick={onMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("menu");
  const [showAbout, setShowAbout] = useState(false);
  const audioRef = useRef(new Audio("/Tango.mp3"));
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastMode, setLastMode] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [adultMode, setAdultMode] = useState(false);
  const [empanadas, setEmpanadas] = useState(3);
  const [streak, setStreak] = useState(0);
  const [learned, setLearned] = useState(new Set());

  function toggleMusic() {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.loop = true;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function handleCorrect(word) {
    setStreak((s) => s + 1);
    setLearned((prev) => {
      const next = new Set(prev);
      next.add(word);
      return next;
    });
  }

  function handleWrong() {
    setEmpanadas((e) => e - 1);
    setStreak(0);
  }

  function startMode(mode) {
    setLastMode(mode);
    setEmpanadas(3);
    setStreak(0);
    setScreen(mode);
  }

  function handleGameOver(result) {
    setGameResult(result);
    setScreen("gameover");
  }

  function handleComplete(result) {
    setGameResult(result);
    setScreen("complete");
  }

  function handleMenu() {
    setScreen("menu");
  }

  const gameProps = {
    empanadas,
    streak,
    learned,
    adultMode,
    onCorrect: handleCorrect,
    onWrong: handleWrong,
    onGameOver: handleGameOver,
    onComplete: handleComplete,
    onMenu: handleMenu,
  };

  return (
    <div className="container">
      <div className="game-window">
        <div className="header">
          <img src="/Logo2.png" alt="Che Boludo!" className="header-logo" />
          <div className="header-icons">
            <button
              className={`header-icon-btn tooltip-above${
                isPlaying ? " playing" : ""
              }`}
              data-tooltip={isPlaying ? "Pause" : "Play me!"}
              onClick={toggleMusic}
            >
              <img src="/bandoneon.png" alt="Music" />
            </button>
            <button
              className="header-icon-btn"
              data-tooltip="¿Qué es esto?"
              onClick={() => setShowAbout(true)}
            >
              <img src="/Mate.png" alt="About" />
            </button>
          </div>
        </div>

        <StatsBar
          empanadas={empanadas}
          streak={streak}
          adultMode={adultMode}
          onToggleAdult={() => setAdultMode((a) => !a)}
        />

        <div className="content">
          {screen === "menu" && <Menu onSelect={startMode} />}
          {screen === "flashcards" && <Flashcards key="fc" {...gameProps} />}
          {screen === "multiplechoice" && (
            <MultipleChoice key="mc" {...gameProps} />
          )}
          {screen === "glossary" && <Glossary onMenu={handleMenu} />}
          {screen === "premium" && <PremiumScreen onMenu={handleMenu} />}
          {screen === "gameover" && (
            <GameOver
              correct={gameResult?.correct ?? 0}
              learnedCount={gameResult?.learnedCount ?? 0}
              onRetry={() => startMode(lastMode)}
              onMenu={handleMenu}
            />
          )}
          {screen === "complete" && (
            <SessionComplete
              correct={gameResult?.correct ?? 0}
              learnedCount={gameResult?.learnedCount ?? 0}
              onMenu={handleMenu}
            />
          )}
        </div>
      </div>
      {showAbout && (
        <div className="about-overlay" onClick={() => setShowAbout(false)}>
          <div className="about-popup" onClick={(e) => e.stopPropagation()}>
            <button className="about-close" onClick={() => setShowAbout(false)}>
              Close
            </button>
            <h2 className="about-title">¿Qué es esto?</h2>
            <p className="about-text about-text-spanish">
              ¡Che, bienvenido! Esta aplicación nació del amor por el habla
              porteña — ese lunfardo callejero, ese voseo inconfundible, esa
              manera tan única de ver el mundo. Acá vas a encontrar el
              vocabulario real que se usa en Buenos Aires, no el español de los
              libros.
            </p>
            <p className="about-text about-text-english">
              This app was built for anyone who's fallen for Argentine culture —
              the music, the food, the football, the people — and wants to speak
              the language the way porteños actually speak it. Forget textbook
              Spanish. This is the real thing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
