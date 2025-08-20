import React, { useRef, useEffect, useState } from 'react';
import './App.css';

const App = () => {
  const canvasRef = useRef(null);
  const [trialState, setTrialState] = useState('input');
  const [currentTrial, setCurrentTrial] = useState(0);
  const [instructions, setInstructions] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [responseAngle, setResponseAngle] = useState(null);
  const [currentCoherence, setCurrentCoherence] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [currentStimDuration] = useState(800);
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [responseStartTime, setResponseStartTime] = useState(0);
  const [dots, setDots] = useState([]);
  const [trials, setTrials] = useState([]);
  const [numTrials, setNumTrials] = useState('');
  const [blockIndex, setBlockIndex] = useState(0); // Track current block
  const [blockType, setBlockType] = useState('practice'); // 'practice' or 'experimental'
  const [blockInstructions, setBlockInstructions] = useState('');
  const [blockResults, setBlockResults] = useState([]); // Store results for each block

  const blockStructure = [
    { type: 'practice', coherence: null, trials: 10 },
    { type: 'experimental', coherence: 0.1, trials: 10 },
    { type: 'experimental', coherence: 0.3, trials: 10 },
    { type: 'experimental', coherence: 0.6, trials: 10 },
    { type: 'experimental', coherence: 0.1, trials: 10 },
    { type: 'experimental', coherence: 0.3, trials: 10 },
    { type: 'experimental', coherence: 0.6, trials: 10 },
  ];

  const parameters = {
    fixationSize: 0.03 * 400,
    iti: 1500, // Increased gap between trials
    fixationDuration: 500,
    responseDelay: 500, // Reduced delay before response window
    maxResponseDuration: 1500, // Maximum time to respond
    feedbackDuration: 500,
    coherences: [0.02, 0.04, 0.06, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5],
    angles: [0, 90, 180, 270], // Right, Up, Left, Down
    blockRepeatsPerRun: 2,
    maxAngleDiff: 45,
    numberOfDots: 100,
    dotSize: 0.0115 * 400,
    speed: 0.01 * 400,
    radius: 0.4 * 400,
  };

  const centerX = 600 / 2;
  const centerY = 400 / 2;

  const generateTrials = (maxTrials) => {
    let newTrials = [];
    for (let repeat = 0; repeat < parameters.blockRepeatsPerRun; repeat++) {
      for (let coh of parameters.coherences) {
        for (let angle of parameters.angles) {
          newTrials.push({
            coherence: coh,
            angle: angle * Math.PI / 180,
            stimDuration: 800,
          });
        }
      }
    }
    for (let i = newTrials.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newTrials[i], newTrials[j]] = [newTrials[j], newTrials[i]];
    }
    return newTrials.slice(0, maxTrials);
  };

  const initializeDots = (coherence, angle) => {
    const newDots = [];
    const nCoherent = Math.round(parameters.numberOfDots * coherence);
    
    for (let i = 0; i < parameters.numberOfDots; i++) {
      const r = Math.random() * parameters.radius;
      const theta = Math.random() * 2 * Math.PI;
      newDots.push({
        x: centerX + r * Math.cos(theta),
        y: centerY + r * Math.sin(theta),
        isCoherent: i < nCoherent, // First nCoherent dots are coherent
        targetAngle: angle, // Store the target angle for coherent dots
      });
    }
    
    // Shuffle so coherent/incoherent dots are randomly distributed
    for (let i = newDots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDots[i], newDots[j]] = [newDots[j], newDots[i]];
    }
    
    setDots(newDots);
    setCurrentCoherence(coherence);
    setCurrentAngle(angle);
  };

  const updateDots = () => {
    setDots(prevDots =>
      prevDots.map(dot => {
        let newDot = { ...dot };
        
        // For coherent dots, use the stored target angle consistently
        // For incoherent dots, use a new random direction each frame
        const moveAngle = dot.isCoherent ? dot.targetAngle : Math.random() * 2 * Math.PI;
        
        newDot.x += parameters.speed * Math.cos(moveAngle);
        newDot.y -= parameters.speed * Math.sin(moveAngle);

        const dx = newDot.x - centerX;
        const dy = newDot.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > parameters.radius) {
          // Reset dot to opposite side when it exits the boundary
          let newX, newY;
          
          if (dot.isCoherent) {
            // For coherent dots, reset on the opposite side based on their direction
            const oppositeAngle = dot.targetAngle + Math.PI;
            const resetDistance = parameters.radius * 0.9; // Slightly inside the boundary
            newX = centerX + resetDistance * Math.cos(oppositeAngle) + (Math.random() - 0.5) * parameters.radius * 0.3;
            newY = centerY - resetDistance * Math.sin(oppositeAngle) + (Math.random() - 0.5) * parameters.radius * 0.3;
          } else {
            // For incoherent dots, reset randomly within the circle
            const r = Math.random() * parameters.radius * 0.8;
            const theta = Math.random() * 2 * Math.PI;
            newX = centerX + r * Math.cos(theta);
            newY = centerY + r * Math.sin(theta);
          }

          // Ensure the new position is within bounds
          const newDx = newX - centerX;
          const newDy = newY - centerY;
          const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
          if (newDistance > parameters.radius) {
            const scale = parameters.radius * 0.9 / newDistance;
            newX = centerX + newDx * scale;
            newY = centerY + newDy * scale;
          }

          newDot.x = newX;
          newDot.y = newY;
        }

        return newDot;
      })
    );
  };

  const drawFixation = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX, centerY, parameters.fixationSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawDots = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, parameters.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#333';
    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, parameters.dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawResponsePrompt = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press', centerX, centerY - 10);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
  };

  const drawFeedback = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, parameters.radius, 0, Math.PI * 2);
    ctx.stroke();

    const lineLength = 100;
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + lineLength * Math.cos(currentAngle), centerY - lineLength * Math.sin(currentAngle));
    ctx.stroke();

    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = isCorrect ? '#28a745' : '#dc3545';
    ctx.fillText(isCorrect ? 'Correct!' : 'Wrong', centerX, centerY - 30);
  };

  const drawNoResponseFeedback = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.fillStyle = '#dc3545';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No response', centerX, centerY);
  };

  const drawResults = (ctx) => {
    ctx.clearRect(0, 0, 600, 400);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 600, 400);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Experiment Results', centerX, 150);

    // Filter out practice block and get experimental blocks
    const experimentalBlocks = blockResults.filter(block => block.blockType === 'experimental');

    // Calculate total results (excluding practice)
    const totalTrials = experimentalBlocks.reduce((sum, block) => sum + block.trialsCompleted, 0);
    const totalCorrect = experimentalBlocks.reduce((sum, block) => sum + block.correctResponses, 0);
    const totalAccuracy = totalTrials > 0 ? (totalCorrect / totalTrials * 100).toFixed(2) : '0.00';
    const totalRT = experimentalBlocks.reduce((sum, block) => sum + (block.avgReactionTime * block.trialsCompleted), 0);
    const avgTotalRT = totalTrials > 0 ? (totalRT / totalTrials).toFixed(2) : 'N/A';

    // Draw total results centered
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#28a745';
    ctx.fillText(`Total Accuracy: ${totalAccuracy}%`, centerX, 200);
    ctx.fillStyle = '#ff9800';
    ctx.fillText(`Average Reaction Time: ${avgTotalRT}ms`, centerX, 250);
  };

  const handleKeyPress = (e) => {
    if (trialState !== 'response') return;

    let keyAngle = null;
    switch (e.key) {
      case 'ArrowRight':
        keyAngle = 0;
        break;
      case 'ArrowUp':
        keyAngle = 90;
        break;
      case 'ArrowLeft':
        keyAngle = 180;
        break;
      case 'ArrowDown':
        keyAngle = 270;
        break;
      default:
        return;
    }

    const reactionTime = performance.now() - responseStartTime;
    setReactionTimes(prev => [...prev, reactionTime]);
    setResponseAngle(keyAngle);
    evaluateResponse(keyAngle);
  };

  const getCoordinatesFromEvent = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; // Adjust for CSS scaling
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.type === 'click') {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e.type === 'touchstart') {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  };

  const handleClickOrTouch = (e) => {
    if (trialState !== 'response') return;
    e.preventDefault(); // Prevent default touch behavior

    const { x, y } = getCoordinatesFromEvent(e);
    console.log(`Click/Touch: x=${x.toFixed(2)}, y=${y.toFixed(2)}`); // Debug log

    const dx = x - centerX;
    const dy = y - centerY;
    let clickAngle = Math.atan2(-dy, dx) * 180 / Math.PI; // Negate dy for canvas y-axis
    if (clickAngle < 0) clickAngle += 360;

    let snappedAngle;
    if (clickAngle >= 315 || clickAngle < 45) snappedAngle = 0; // Right
    else if (clickAngle >= 45 && clickAngle < 135) snappedAngle = 90; // Up
    else if (clickAngle >= 135 && clickAngle < 225) snappedAngle = 180; // Left
    else snappedAngle = 270; // Down

    console.log(`Snapped Angle: ${snappedAngle}°`); // Debug log

    const reactionTime = performance.now() - responseStartTime;
    setReactionTimes(prev => [...prev, reactionTime]);
    setResponseAngle(snappedAngle);
    evaluateResponse(snappedAngle);
  };

  const generateBlockTrials = (block) => {
    let newTrials = [];
    if (block.type === 'practice') {
      // Practice: fixed 60% coherence with random angles
      for (let i = 0; i < block.trials; i++) {
        const angle = parameters.angles[Math.floor(Math.random() * parameters.angles.length)];
        newTrials.push({
          coherence: 0.6, // Fixed 60% coherence for practice
          angle: angle * Math.PI / 180,
          stimDuration: 800,
        });
      }
    } else {
      // Experimental: fixed coherence, random angle
      for (let i = 0; i < block.trials; i++) {
        const angle = parameters.angles[Math.floor(Math.random() * parameters.angles.length)];
        newTrials.push({
          coherence: block.coherence,
          angle: angle * Math.PI / 180,
          stimDuration: 800,
        });
      }
    }
    // Shuffle trials
    for (let i = newTrials.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newTrials[i], newTrials[j]] = [newTrials[j], newTrials[i]];
    }
    return newTrials;
  };

  const startBlock = (blockIdx) => {
    const block = blockStructure[blockIdx];
    setBlockIndex(blockIdx);
    setBlockType(block.type);
    setTrials(generateBlockTrials(block));
    setTrialState('fixation');
    setInstructions('');
    setCurrentTrial(0);
    setStartTime(performance.now());
    setCorrectCount(0);
    setReactionTimes([]);
    if (block.type === 'practice') {
      setBlockInstructions('Practice Block: Try to get used to the task.');
    } else {
      let cohLabel = block.coherence === 0.1 ? 'Low' : block.coherence === 0.3 ? 'Medium' : 'High';
      // blockIdx 0 is practice, so experimental blocks start from 1
      const experimentalBlockNum = blockIdx;
      setBlockInstructions(`Block ${experimentalBlockNum}: ${cohLabel} Coherence (${Math.round(block.coherence * 100)}% coherent dots)`);
    }
  };

  const handleStart = () => {
    // Start with practice block
    startBlock(0);
  };

  const handleStartAgain = () => {
    setTrialState('input');
    setCurrentTrial(0);
    setInstructions('');
    setCorrectCount(0);
    setReactionTimes([]);
    setTrials([]);
    setNumTrials('');
    setBlockIndex(0);
    setBlockType('practice');
    setBlockInstructions('');
  };

  const evaluateResponse = (responseAngleDeg) => {
    const targetAngleDeg = currentAngle * 180 / Math.PI;
    let angleDiff = Math.abs(responseAngleDeg - targetAngleDeg);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    const correct = angleDiff < parameters.maxAngleDiff;
    setIsCorrect(correct);
    if (correct) setCorrectCount(prev => prev + 1);
    console.log(`Trial ${currentTrial + 1}: Target=${targetAngleDeg.toFixed(1)}°, Response=${responseAngleDeg}°, Diff=${angleDiff.toFixed(1)}°, Correct=${correct}, RT=${reactionTimes[reactionTimes.length - 1]?.toFixed(2) || 'N/A'}ms`);
    
    setTrialState('feedback');
    setStartTime(performance.now());
    setResponseAngle(null);
  };

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
            if (currentTrial < trials.length) {
              const trial = trials[currentTrial];
              initializeDots(trial.coherence, trial.angle);
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
          drawResponsePrompt(ctx);
          if (timestamp - startTime >= parameters.maxResponseDuration) {
            console.log(`Trial ${currentTrial + 1}: No response`);
            setIsCorrect(false);
            setReactionTimes(prev => [...prev, parameters.maxResponseDuration]);
            setTrialState('feedback');
            setStartTime(timestamp);
          }
          break;

        case 'feedback':
          if (isCorrect === false && reactionTimes[reactionTimes.length - 1] === parameters.maxResponseDuration) {
            drawNoResponseFeedback(ctx);
          } else {
            drawFeedback(ctx);
          }
          if (timestamp - startTime >= parameters.feedbackDuration) {
            setTrialState('iti');
            setStartTime(timestamp);
          }
          break;

        case 'iti':
          ctx.clearRect(0, 0, 600, 400);
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.arc(centerX, centerY, parameters.fixationSize / 2, 0, Math.PI * 2);
          ctx.fill();
          if (timestamp - startTime >= parameters.iti) {
            if (currentTrial + 1 < trials.length) {
              setCurrentTrial(prev => prev + 1);
              setTrialState('fixation');
            } else {
              // Block finished - save block results
              const currentBlock = blockStructure[blockIndex];
              const blockResult = {
                blockNumber: currentBlock.type === 'practice' ? 'Practice' : blockIndex,
                blockType: currentBlock.type,
                coherence: currentBlock.coherence,
                trialsCompleted: trials.length,
                correctResponses: correctCount,
                accuracy: trials.length > 0 ? (correctCount / trials.length * 100) : 0,
                avgReactionTime: reactionTimes.length > 0 ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0
              };
              setBlockResults(prev => [...prev, blockResult]);
              
              if (blockIndex + 1 < blockStructure.length) {
                setTrialState('blockTransition');
                setInstructions('');
              } else {
                setTrialState('results');
                setInstructions('');
              }
            }
            setStartTime(timestamp);
          }
          break;

        case 'results':
          drawResults(ctx);
          return;

        default:
          return;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    if (trialState !== 'input' && trialState !== 'results') {
      animationFrameId = requestAnimationFrame(animate);
    } else if (trialState === 'results') {
      drawResults(ctx);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [trialState, startTime, currentTrial, dots, isCorrect, correctCount, reactionTimes, trials, blockIndex]);

  // Block transition effect
  useEffect(() => {
    if (trialState === 'blockTransition') {
      setBlockInstructions(
        blockIndex + 1 < blockStructure.length
          ? blockStructure[blockIndex + 1].type === 'practice' 
            ? 'Practice block starting soon. Click to continue.'
            : `Block ${blockIndex + 1} starting soon. Click to continue.`
          : ''
      );
      const handleContinue = () => {
        startBlock(blockIndex + 1);
        setTrialState('fixation');
      };
      window.addEventListener('click', handleContinue, { once: true });
      return () => window.removeEventListener('click', handleContinue);
    }
  }, [trialState, blockIndex]);

  // Remove global keydown listener, and add it only during 'response' state
  useEffect(() => {
    if (trialState === 'response') {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [trialState, responseStartTime, currentAngle, reactionTimes, currentTrial]);

  // Remove old useEffect for click/touchstart, and add listeners only during 'response' state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (trialState === 'response') {
      canvas.addEventListener('click', handleClickOrTouch);
      canvas.addEventListener('touchstart', handleClickOrTouch);
      return () => {
        canvas.removeEventListener('click', handleClickOrTouch);
        canvas.removeEventListener('touchstart', handleClickOrTouch);
      };
    }
  }, [trialState, responseStartTime, currentAngle, reactionTimes, currentTrial]);

  return (
    <div className="app-container">
      <h1 className="app-title">Motion Perception Experiment</h1>
      <canvas ref={canvasRef} width={600} height={400} className="experiment-canvas" />
      {trialState === 'input' ? (
        <div className="input-section">
          <button onClick={handleStart} className="start-button">Start Experiment</button>
        </div>
      ) : trialState === 'results' ? (
        <div className="results-section">
          <button onClick={handleStartAgain} className="start-again-button">Start Again</button>
        </div>
      ) : trialState === 'blockTransition' ? (
        <div className="instructions" style={{color:'black'}}>{blockInstructions}</div>
      ) : (
        (instructions || blockInstructions) && <div className="instructions" style={{color:'black'}}>{instructions || blockInstructions}</div>
      )}
    </div>
  );
};

export default App;