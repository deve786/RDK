// src/App.js
import React, { useRef, useEffect, useState } from 'react';
import './App.css';

const App = () => {
  const canvasRef = useRef(null);
  const [trialState, setTrialState] = useState('input');
  const [currentTrial, setCurrentTrial] = useState(0);
  const [instructions, setInstructions] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [responseX, setResponseX] = useState(null);
  const [responseY, setResponseY] = useState(null);
  const [currentCoherence, setCurrentCoherence] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [currentStimDuration, setCurrentStimDuration] = useState(0);
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [responseStartTime, setResponseStartTime] = useState(0);
  const [dots, setDots] = useState([]);
  const [trials, setTrials] = useState([]);
  const [numTrials, setNumTrials] = useState('');

  // Parameters
  const parameters = {
    fixationSize: 0.03 * 400,
    iti: 400,
    fixationDuration: 250,
    responseDelay: 500,
    maxResponseDuration: 4000,
    feedbackDuration: 500,
    stimDurations: [200, 800],
    coherences: [0.02, 0.04, 0.06, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5],
    angles: [45, 135, 225, 315],
    blockRepeatsPerRun: 2,
    maxAngleDiff: 22.5,
    numberOfDots: 100,
    dotSize: 0.0115 * 400,
    speed: 0.01 * 400,
    radius: 0.4 * 400,
  };

  const centerX = 600 / 2;
  const centerY = 400 / 2;

  // Generate trials
  const generateTrials = (maxTrials) => {
    let newTrials = [];
    for (let repeat = 0; repeat < parameters.blockRepeatsPerRun; repeat++) {
      for (let coh of parameters.coherences) {
        for (let angle of parameters.angles) {
          for (let dur of parameters.stimDurations) {
            newTrials.push({
              coherence: coh,
              angle: angle * Math.PI / 180,
              stimDuration: dur,
            });
          }
        }
      }
    }
    for (let i = newTrials.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newTrials[i], newTrials[j]] = [newTrials[j], newTrials[i]];
    }
    return newTrials.slice(0, maxTrials);
  };

  // Initialize dots
  const initializeDots = (coherence, angle) => {
    const newDots = [];
    for (let i = 0; i < parameters.numberOfDots; i++) {
      const r = Math.random() * parameters.radius;
      const theta = Math.random() * 2 * Math.PI;
      newDots.push({
        x: centerX + r * Math.cos(theta),
        y: centerY + r * Math.sin(theta),
        isCoherent: Math.random() < coherence,
        angle: Math.random() * 2 * Math.PI,
      });
    }
    setDots(newDots);
    setCurrentCoherence(coherence);
    setCurrentAngle(angle);
  };

  // Update dots
  const updateDots = () => {
    setDots(prevDots =>
      prevDots.map(dot => {
        let newDot = { ...dot };
        if (newDot.isCoherent) {
          newDot.x += parameters.speed * Math.cos(currentAngle);
          newDot.y += parameters.speed * Math.sin(currentAngle);
        } else {
          newDot.x += parameters.speed * Math.cos(newDot.angle);
          newDot.y += parameters.speed * Math.sin(newDot.angle);
        }
        const dx = newDot.x - centerX;
        const dy = newDot.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > parameters.radius) {
          const r = Math.random() * parameters.radius;
          const theta = Math.random() * 2 * Math.PI;
          newDot.x = centerX + r * Math.cos(theta);
          newDot.y = centerY + r * Math.sin(theta);
        }
        return newDot;
      })
    );
  };

  // Draw functions
  const drawFixation = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX, centerY, parameters.fixationSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawDots = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.strokeStyle = 'gray';
    ctx.beginPath();
    ctx.arc(centerX, centerY, parameters.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'black';
    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, parameters.dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawFeedback = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.strokeStyle = 'gray';
    ctx.beginPath();
    ctx.arc(centerX, centerY, parameters.radius, 0, Math.PI * 2);
    ctx.stroke();

    const lineLength = 100;
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + lineLength * Math.cos(currentAngle), centerY + lineLength * Math.sin(currentAngle));
    ctx.stroke();

    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = isCorrect ? 'green' : 'red';
    ctx.fillText(isCorrect ? 'Correct' : 'Wrong', centerX, centerY - 20);
  };

  const drawResults = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';

    const trialCount = trials.length || 0;
    const accuracy = trialCount > 0 ? (correctCount / trialCount * 100).toFixed(2) : '0.00';
    const avgReactionTime = reactionTimes.length > 0
      ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(2)
      : 'N/A';

    ctx.fillText('Experiment Results', centerX, centerY - 100);
    ctx.fillText(`Trials Completed: ${trialCount}`, centerX, centerY - 60);
    ctx.fillText(`Correct Responses: ${correctCount}`, centerX, centerY - 20);
    ctx.fillText(`Accuracy: ${accuracy}%`, centerX, centerY + 20);
    ctx.fillText(`Avg Reaction Time: ${avgReactionTime} ms`, centerX, centerY + 60);
  };

  // Handle click
  const handleClick = (e) => {
    if (trialState === 'response') {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const reactionTime = performance.now() - responseStartTime;
      setReactionTimes(prev => [...prev, reactionTime]);
      setResponseX(x);
      setResponseY(y);
      evaluateResponse(x, y);
    }
  };

  // Handle start button
  const handleStart = () => {
    const maxTrials = parseInt(numTrials, 10);
    if (isNaN(maxTrials) || maxTrials <= 0) {
      alert('Please enter a valid number of trials (greater than 0)');
      return;
    }
    const newTrials = generateTrials(maxTrials);
    setTrials(newTrials);
    setTrialState('fixation');
    setInstructions('Please click on the direction of coherent dots');
    setCurrentTrial(0);
    setStartTime(performance.now());
    setCorrectCount(0);
    setReactionTimes([]);
  };

  // Evaluate response
  const evaluateResponse = (x, y) => {
    const dx = x - centerX;
    const dy = y - centerY;
    let responseAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (responseAngle < 0) responseAngle += 360;

    const targetAngleDeg = currentAngle * 180 / Math.PI;
    let angleDiff = Math.abs(responseAngle - targetAngleDeg);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    const correct = angleDiff < parameters.maxAngleDiff;
    setIsCorrect(correct);
    if (correct) setCorrectCount(prev => prev + 1);
    console.log(`Trial ${currentTrial}: Angle=${targetAngleDeg.toFixed(1)}°, Response=${responseAngle.toFixed(1)}°, Diff=${angleDiff.toFixed(1)}°, Correct=${correct}, RT=${reactionTimes[reactionTimes.length - 1]?.toFixed(2) || 'N/A'}ms`);
    
    setTrialState('feedback');
    setStartTime(performance.now());
    setResponseX(null);
    setResponseY(null);
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const animate = (timestamp) => {
      switch (trialState) {
        case 'input':
          break;

        case 'fixation':
          drawFixation(ctx);
          if (timestamp - startTime >= parameters.fixationDuration) {
            setTrialState('dotDisplay');
            setCurrentTrial(prev => prev + 1);
            if (trials.length > 0 && currentTrial < trials.length) {
              const trial = trials[currentTrial];
              initializeDots(trial.coherence, trial.angle);
              setCurrentStimDuration(trial.stimDuration);
            }
            setStartTime(timestamp);
          }
          break;

        case 'dotDisplay':
          updateDots();
          drawDots(ctx);
          if (timestamp - startTime >= currentStimDuration) {
            setTrialState('responseDelay');
            ctx.clearRect(0, 0, 600, 400);
            setStartTime(timestamp);
          }
          break;

        case 'responseDelay':
          if (timestamp - startTime >= parameters.responseDelay) {
            setTrialState('response');
            setResponseStartTime(timestamp);
            setStartTime(timestamp);
          }
          break;

        case 'response':
          ctx.clearRect(0, 0, 600, 400);
          if (timestamp - startTime >= parameters.maxResponseDuration) {
            console.log(`Trial ${currentTrial}: No response`);
            setIsCorrect(false);
            setReactionTimes(prev => [...prev, parameters.maxResponseDuration]);
            setTrialState('feedback');
            setStartTime(timestamp);
          }
          break;

        case 'feedback':
          drawFeedback(ctx);
          if (timestamp - startTime >= parameters.feedbackDuration) {
            setTrialState('iti');
            setStartTime(timestamp);
          }
          break;

        case 'iti':
          ctx.clearRect(0, 0, 600, 400);
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.arc(centerX, centerY, parameters.fixationSize / 2, 0, Math.PI * 2);
          ctx.fill();
          if (timestamp - startTime >= parameters.iti) {
            if (currentTrial < trials.length) {
              setTrialState('fixation');
            } else {
              setTrialState('results');
              setInstructions(''); // Clear instructions to focus on results
            }
            setStartTime(timestamp);
          }
          break;

        case 'results':
          drawResults(ctx);
          return; // Stop animation

        default:
          return;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    if (trialState !== 'input' && trialState !== 'results') {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [trialState, startTime, currentTrial, dots, currentStimDuration, isCorrect, correctCount, reactionTimes, trials]);

  return (
    <div className="App">
      <canvas ref={canvasRef} width={600} height={400} onClick={handleClick} />
      {trialState === 'input' ? (
        <div className="input-container">
          <input
            type="number"
            value={numTrials}
            onChange={(e) => setNumTrials(e.target.value)}
            placeholder="Enter number of trials"
            min="1"
          />
          <button onClick={handleStart}>Start</button>
        </div>
      ) : (
        instructions && <div id="instructions">{instructions}</div>
      )}
    </div>
  );
};

export default App;