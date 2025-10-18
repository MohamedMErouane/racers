// Complete raceClient.js with all methods

export class RaceClient {
  constructor(socket, ui = null) {
    this.socket = socket;
    this.ui = ui;
    this.raceState = null;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.characterImages = new Map();
    this.characterFrames = new Map(); // Store both frames for animation
    this.raceStartTime = null;
    this.raceDuration = 35000; // 35 seconds race - longer duration for full distance
    this.currentBackground = null;
    this.currentBackgroundName = 'default';
    this.animationFrame = 0; // Track animation frame for switching
  }

  // Setup event handlers
  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('race:start', (data) => {
      this.handleRaceStart(data);
    });

    this.socket.on('race:update', (data) => {
      this.updateRaceProgress(data);
    });

    this.socket.on('race:end', (data) => {
      this.handleRaceEnd(data);
    });

    // Initialize canvas
    this.initializeCanvas();
    
    // Load character sprites
    this.loadCharacterSprites();
  }

  // Initialize race canvas
  initializeCanvas() {
    this.canvas = document.getElementById('raceCanvas');
    if (!this.canvas) {
      console.warn('Race canvas not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    
    // Make canvas responsive to container size
    const container = this.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    // Set canvas size based on container
    this.canvas.width = Math.max(800, containerRect.width - 40);
    this.canvas.height = Math.max(600, containerRect.height - 40);
    
    // Style canvas to fill container
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.background = '#1a1a2e';
    this.canvas.style.borderRadius = '12px';
    this.canvas.style.display = 'block';
    
    console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);
  }

  // Load random race background from your actual images
  loadRandomBackground() {
       const backgrounds = [
      'background-image17.png',           // Desert/Nuketown theme
      'background-image19.png',    // Post-apocalyptic theme  
      'background-image24.png',             // Ninja village theme
      'background-image33.png',             // Pure desert theme
      'background-image34.png',           // Springfield theme
      'background-image35.png',          // Pirate ship theme
      'background-image36.png',          // Night mountain theme
      'background-image37.png',       // Desert/RV theme
      'background-image38.png'          // Colorful fantasy theme
    ];
    // Pick random background
    const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    const backgroundPath = `images/backgrounds/${randomBg}`;
    
    console.log(`🎨 Loading background: ${backgroundPath}`);
    
    const bgImage = new Image();
    bgImage.onload = () => {
      console.log(`✅ Loaded background: ${backgroundPath}`);
      this.currentBackground = bgImage;
      this.currentBackgroundName = randomBg.replace('.png', '');
    };
    
    bgImage.onerror = () => {
      console.log(`⚠️ Background not found: ${backgroundPath}, using fallback`);
      this.currentBackground = null;
      this.currentBackgroundName = 'default';
    };
    
    bgImage.src = backgroundPath;
  }

  // Load character running sprites
  async loadCharacterSprites() {
    try {
      const response = await fetch('/js/animeRacers.json');
      const racers = await response.json();
      
      racers.forEach(racer => {
        if (racer.name && racer.id) {
          // Load both animation frames for each character
          const frames = {
            frame1: null,
            frame2: null
          };
          
          const characterName = racer.name.toLowerCase();
          
          // Load frame1 (RUNNING FRAME 1 - NOT FACE!)
          const frame1Path = `images/characters/${characterName}-frame1.png`;
          const img1 = new Image();
          img1.onload = () => {
            console.log(`✅ Loaded RUNNING frame1 for ${racer.name}: ${frame1Path}`);
            frames.frame1 = img1;
            this.characterFrames.set(racer.id, frames);
            this.characterImages.set(racer.id, frames.frame1);
          };
          img1.onerror = () => {
            console.warn(`❌ Failed to load running frame1 for ${racer.name}: ${frame1Path}`);
          };
          img1.src = frame1Path;
          
          // Load frame2 (RUNNING FRAME 2 - NOT FACE!)
          const frame2Path = `images/characters/${characterName}-frame2.png`;
          const img2 = new Image();
          img2.onload = () => {
            console.log(`✅ Loaded RUNNING frame2 for ${racer.name}: ${frame2Path}`);
            frames.frame2 = img2;
            this.characterFrames.set(racer.id, frames);
            if (!frames.frame1) {
              this.characterImages.set(racer.id, frames.frame2);
            }
          };
          img2.onerror = () => {
            console.warn(`❌ Failed to load running frame2 for ${racer.name}: ${frame2Path}`);
          };
          img2.src = frame2Path;
          
          console.log(`🏃‍♀️ Loading RUNNING frames for ${racer.name}: ${frame1Path} & ${frame2Path}`);
        }
      });
    } catch (error) {
      console.error('Failed to load character sprites:', error);
    }
  }

  // Handle race start
  handleRaceStart(data) {
    console.log('🏁 Race starting soon...', data);
    
    // Load random background for this race
    this.loadRandomBackground();
    
    this.raceState = {
      racers: data.racers || this.generateMockRacers(),
      isRunning: false, // Don't start immediately
      positions: {}
    };
    
    // Initialize positions
    this.raceState.racers.forEach((racer, index) => {
      this.raceState.positions[racer.id] = {
        progress: 0,
        position: index + 1,
        speed: racer.speed || (Math.random() * 2 + 3)
      };
    });
    
    // Show race container
    const raceContainer = document.getElementById('raceContainer');
    if (raceContainer) {
      raceContainer.style.display = 'block';
    }
    
    // Start countdown
    this.showCountdown();
  }

  // Add countdown method
  showCountdown() {
    let countdownValue = 3;
    
    const countdownInterval = setInterval(() => {
      // Update countdown display on canvas instead of overlay
      this.drawRaceWithCountdown(countdownValue);
      
      countdownValue--;
      
      if (countdownValue < 0) {
        clearInterval(countdownInterval);
        // Start the actual race
        this.raceStartTime = Date.now();
        this.raceState.isRunning = true;
        this.startRaceAnimation();
      }
    }, 1000);
  }

  // Draw race with countdown overlay
  drawRaceWithCountdown(countdown) {
    if (!this.ctx || !this.raceState) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw race track background
    this.drawRaceTrack();
    
    // Draw racing lanes
    this.drawRacingLanes();
    
    // Don't draw finish line - use the one from background image
    
    // Draw racers at starting positions
    this.drawRacers();
    
    // Draw countdown in center without blocking the view
    if (countdown > 0) {
      // Semi-transparent background for countdown
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(this.canvas.width/2 - 80, this.canvas.height/2 - 60, 160, 120);
      
      // Countdown number
      this.ctx.fillStyle = '#ff69b4';
      this.ctx.font = 'bold 72px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 4;
      this.ctx.strokeText(countdown.toString(), this.canvas.width/2, this.canvas.height/2 + 20);
      this.ctx.fillText(countdown.toString(), this.canvas.width/2, this.canvas.height/2 + 20);
      
      // "GET READY" text
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText('GET READY!', this.canvas.width/2, this.canvas.height/2 - 20);
    }
  }

  // Generate mock racers for testing
  generateMockRacers() {
    return [
      { id: 1, name: 'Hana', color: '#ff1493', speed: 4.1 },
      { id: 2, name: 'Miku', color: '#00ced1', speed: 4.6 },
      { id: 3, name: 'Akane', color: '#ff4500', speed: 4.8 },
      { id: 4, name: 'Sakura', color: '#ff69b4', speed: 4.5 },
      { id: 5, name: 'Kira', color: '#ffa500', speed: 4.4 },
      { id: 6, name: 'Luna', color: '#9370db', speed: 4.3 },
      { id: 7, name: 'Yuki', color: '#00bfff', speed: 4.2 },
      { id: 8, name: 'Neko', color: '#ffd700', speed: 4.7 }
    ];
  }

  // Start race animation loop - THIS WAS MISSING!
  startRaceAnimation() {
    const animate = () => {
      if (!this.raceState || !this.raceState.isRunning) return;
      
      this.updateRacePositions();
      this.drawRace();
      
      // Check if race should end
      const elapsedTime = Date.now() - this.raceStartTime;
      if (elapsedTime >= this.raceDuration) {
        this.handleRaceEnd();
        return;
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  // Update race positions
  updateRacePositions() {
    if (!this.raceState) return;
    
    const elapsedTime = Date.now() - this.raceStartTime;
    const raceProgress = Math.min(elapsedTime / this.raceDuration, 1);
    
    this.raceState.racers.forEach(racer => {
      const position = this.raceState.positions[racer.id];
      if (!position) return;
      
      // Add some randomness to make race exciting
      const speedVariation = (Math.random() - 0.5) * 0.1;
      const adjustedSpeed = position.speed + speedVariation;
      
      // Update progress - ensure characters can reach the finish line (100%)
      // Allow faster characters to finish early and slower ones to catch up
      const speedMultiplier = (adjustedSpeed / 4.5);
      position.progress = Math.min(raceProgress * speedMultiplier * 1.5, 1); // Increased multiplier to reach full distance
      
      // Debug: Log progress for first character to monitor
      if (racer.id === 1 && Math.floor(elapsedTime / 1000) % 5 === 0) {
        console.log(`Character ${racer.name}: progress=${(position.progress * 100).toFixed(1)}%, raceProgress=${(raceProgress * 100).toFixed(1)}%`);
      }
    });
    
    // Update position rankings (highest progress = closest to finish = best position)
    const sortedRacers = [...this.raceState.racers].sort((a, b) => {
      return this.raceState.positions[b.id].progress - this.raceState.positions[a.id].progress;
    });
    
    sortedRacers.forEach((racer, index) => {
      this.raceState.positions[racer.id].position = index + 1;
    });
    
    // Update displays
    this.updatePositionsDisplay();
    this.updateSpeedDisplay();
  }

  // Draw the race
  drawRace() {
    if (!this.ctx || !this.raceState) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw race track background
    this.drawRaceTrack();
    
    // Draw racing lanes
    this.drawRacingLanes();
    
    // Don't draw finish line - use the one from background image
    
    // Draw racers
    this.drawRacers();
  }

  // Draw race track background
  drawRaceTrack() {
    // If we have a background image, use it
    if (this.currentBackground && this.currentBackground.complete) {
      // Draw the background image to fill the canvas
      this.ctx.drawImage(this.currentBackground, 0, 0, this.canvas.width, this.canvas.height);
      
      // Add a subtle overlay to make the track more visible
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      this.ctx.fillRect(0, this.canvas.height * 0.6, this.canvas.width, this.canvas.height * 0.4);
      
    } else {
      // Fallback: Simple gradient background
      const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      gradient.addColorStop(0, '#87CEEB'); // Sky blue
      gradient.addColorStop(0.6, '#F4A460'); // Sandy brown
      gradient.addColorStop(1, '#CD853F'); // Peru
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Draw racing lanes
  drawRacingLanes() {
    const laneWidth = this.canvas.width / 8;
    
    // Draw vertical track lanes
    for (let i = 0; i < 8; i++) {
      const x = i * laneWidth;
      
      // Lane background - alternating colors
      this.ctx.fillStyle = i % 2 === 0 ? 'rgba(139, 69, 19, 0.3)' : 'rgba(160, 82, 45, 0.3)';
      this.ctx.fillRect(x, 0, laneWidth, this.canvas.height);
      
      // Lane borders (vertical lines)
      this.ctx.strokeStyle = 'rgba(101, 67, 33, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
  }

  // Draw finish line
  drawFinishLine() {
    const finishY = 60; // TOP of canvas
    const trackWidth = this.canvas.width;
    
    // Finish line poles
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(50, finishY - 10, 100, 20);
    this.ctx.fillRect(trackWidth - 150, finishY - 10, 100, 20);
    
    // Checkered pattern across the top
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, finishY - 20, trackWidth, 40);
    
    this.ctx.fillStyle = '#fff';
    for (let x = 0; x < trackWidth; x += 20) {
      for (let y = finishY - 20; y < finishY + 20; y += 20) {
        if ((Math.floor(x / 20) + Math.floor((y - (finishY - 20)) / 20)) % 2 === 0) {
          this.ctx.fillRect(x, y, 20, 20);
        }
      }
    }
    
    // "FINISH" text
    this.ctx.fillStyle = '#FF0000';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeText('FINISH', trackWidth / 2, finishY - 30);
    this.ctx.fillText('FINISH', trackWidth / 2, finishY - 30);
  }

  // Draw racers
  drawRacers() {
    if (!this.raceState) return;
    
    const laneWidth = this.canvas.width / 8; // Divide canvas into 8 vertical lanes
    const raceHeight = this.canvas.height - 60; // Use full height minus small margin
    const finishLineY = 10; // Y position at the very back/top of the background
    const startingY = this.canvas.height - 40; // Starting Y position at bottom
    
    // Update animation frame counter for switching between frames
    this.animationFrame++;
    
    this.raceState.racers.forEach((racer, index) => {
      const position = this.raceState.positions[racer.id];
      if (!position) return;
      
      // Calculate perspective trajectory
      const progress = position.progress; // 0 to 1
      
      // Starting position: each character in their lane at bottom (spread out)
      const startLaneX = (index * laneWidth) + (laneWidth / 2);
      
      // Ending position: characters finish VERY close together at the far back of background
      const finishCenterX = this.canvas.width / 2;
      const finishSpread = 80; // Even tighter at the very back (distance effect)
      const charactersCount = this.raceState.racers.length;
      const finishLaneWidth = finishSpread / charactersCount;
      const finishX = finishCenterX - (finishSpread / 2) + (index * finishLaneWidth) + (finishLaneWidth / 2);
      
      // Calculate current position with strong perspective convergence
      // Characters move from their starting lane towards their tight finish position
      const currentX = startLaneX + (finishX - startLaneX) * progress;
      
      // Characters move from BOTTOM all the way to the very back of the background
      const currentY = startingY - (progress * (startingY - finishLineY));
      
      // Scale characters much smaller as they reach the very back (strong perspective)
      const baseCharacterWidth = 60;
      const baseCharacterHeight = 80;
      const scaleFactor = 1.0 - (progress * 0.6); // Characters get 60% smaller at the very back
      const characterWidth = baseCharacterWidth * scaleFactor;
      const characterHeight = baseCharacterHeight * scaleFactor;
      
      // Get character frames for animation
      const characterFrames = this.characterFrames.get(racer.id);
      let characterImg = null;
      
      if (characterFrames) {
        // Animate between frame1 and frame2 for running effect
        // Switch frames every 10 animation cycles (faster animation for better running effect)
        const frameSwitch = Math.floor(this.animationFrame / 10) % 2;
        
        if (this.raceState.isRunning) {
          // ONLY use running frames when race is running - NO FACE IMAGES!
          if (frameSwitch === 0 && characterFrames.frame1) {
            characterImg = characterFrames.frame1;
          } else if (frameSwitch === 1 && characterFrames.frame2) {
            characterImg = characterFrames.frame2;
          } else {
            // If one frame is missing, use the available running frame
            characterImg = characterFrames.frame1 || characterFrames.frame2;
          }
        } else {
          // When not running, use frame1 as idle pose (still a running frame, not face)
          characterImg = characterFrames.frame1 || characterFrames.frame2;
        }
      } else {
        // Fallback to old system only if no frames loaded
        characterImg = this.characterImages.get(racer.id);
      }
      
      // Draw character with perspective positioning and scaling
      if (characterImg && characterImg.complete) {
        // Add subtle shadow for depth
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        this.ctx.shadowBlur = 8 * scaleFactor;
        this.ctx.shadowOffsetX = 2 * scaleFactor;
        this.ctx.shadowOffsetY = 4 * scaleFactor;
        
        // Draw character sprite with perspective scaling
        this.ctx.drawImage(
          characterImg, 
          currentX - characterWidth/2, 
          currentY - characterHeight/2, 
          characterWidth, 
          characterHeight
        );
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Add character name below character (also scaled)
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${12 * scaleFactor}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3 * scaleFactor;
        this.ctx.strokeText(racer.name, currentX, currentY + characterHeight/2 + 15 * scaleFactor);
        this.ctx.fillText(racer.name, currentX, currentY + characterHeight/2 + 15 * scaleFactor);
        
      } else {
        // Fallback: larger colored circle with character initial (also with perspective)
        this.ctx.fillStyle = racer.color;
        this.ctx.beginPath();
        this.ctx.arc(currentX, currentY, 25 * scaleFactor, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // White border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3 * scaleFactor;
        this.ctx.stroke();
        
        // Character initial
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${18 * scaleFactor}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(racer.name.charAt(0), currentX, currentY + 6 * scaleFactor);
        
        // Character name below
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${12 * scaleFactor}px Arial`;
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3 * scaleFactor;
        this.ctx.strokeText(racer.name, currentX, currentY + 45 * scaleFactor);
        this.ctx.fillText(racer.name, currentX, currentY + 45 * scaleFactor);
      }
    });
  }

  // Update positions display
  updatePositionsDisplay() {
    const positionsDisplay = document.getElementById('positionsDisplay');
    if (!positionsDisplay || !this.raceState) return;
    
    const sortedRacers = [...this.raceState.racers].sort((a, b) => {
      return this.raceState.positions[a.id].position - this.raceState.positions[b.id].position;
    });
    
    positionsDisplay.innerHTML = '<h3 style="color: #FFD700; margin: 0 0 10px 0;">POSITIONS</h3>';
    sortedRacers.forEach((racer) => {
      const position = this.raceState.positions[racer.id];
      const progressPercent = (position.progress * 100).toFixed(1);
      
      const div = document.createElement('div');
      div.style.cssText = `
        color: white;
        font-size: 14px;
        margin: 4px 0;
        padding: 4px 8px;
        background: rgba(0,0,0,0.5);
        border-left: 3px solid ${racer.color};
        border-radius: 4px;
      `;
      div.textContent = `${position.position}. ${racer.name} (${progressPercent}%)`;
      positionsDisplay.appendChild(div);
    });
  }

  // Update speed display
  updateSpeedDisplay() {
    const speedDisplay = document.getElementById('speedDisplay');
    if (!speedDisplay || !this.raceState) return;
    
    let topSpeed = 0;
    this.raceState.racers.forEach(racer => {
      const position = this.raceState.positions[racer.id];
      if (position && position.speed > topSpeed) {
        topSpeed = position.speed;
      }
    });
    
    speedDisplay.innerHTML = `
      <h3 style="color: #FFD700; margin: 0 0 10px 0;">TOP SPEED</h3>
      <div style="color: #00FF00; font-size: 24px; font-weight: bold;">
        ${(topSpeed * 8).toFixed(0)} km/h
      </div>
    `;
  }

  // Handle race end
  handleRaceEnd(data) {
    console.log('🏁 Race ended:', data);
    
    if (this.raceState) {
      this.raceState.isRunning = false;
    }
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Show winner
    if (this.raceState) {
      const winner = [...this.raceState.racers].sort((a, b) => {
        return this.raceState.positions[b.id].progress - this.raceState.positions[a.id].progress;
      })[0];
      
      if (winner) {
        // Add a small delay to ensure race animation completes
        setTimeout(() => {
          this.showWinner(winner);
        }, 500);
      }
    }
  }

  // Show winner
  showWinner(winner) {
    console.log('🏆 Showing winner:', winner);
    
    // Show the winner modal using UI if available
    if (this.ui && this.ui.showWinnerModal) {
      // Use the character's avatar or face image
      let characterImage = 'images/characters/hana-face.png'; // fallback
      
      if (winner.avatar) {
        // Use the avatar from the character data
        characterImage = winner.avatar;
      } else if (winner.name) {
        // Fallback to face image based on name
        const characterName = winner.name.toLowerCase();
        characterImage = `images/characters/${characterName}-face.png`;
      }
      
      // Prepare winner data for the modal
      const winnerData = {
        name: winner.name,
        image: characterImage,
        totalPot: '20.00 SOL ($3305.60)', // You can get this from race data
        yourBet: '0.00 SOL ($0.00)',
        winnings: '+0.00 SOL ($0.00)',
        netResult: '+0.00 SOL ($0.00)'
      };
      
      this.ui.showWinnerModal(winnerData);
      
      // Auto-close the modal after 10 seconds (optional)
      setTimeout(() => {
        if (this.ui.hideWinnerModal) {
          this.ui.hideWinnerModal();
        }
      }, 10000);
      
    } else {
      // Fallback to the old method if UI is not available
      const winnerDisplay = document.getElementById('winnerDisplay');
      if (winnerDisplay) {
        winnerDisplay.innerHTML = `
          <div style="text-align: center; color: white; padding: 30px; background: rgba(0,0,0,0.9); border-radius: 12px; border: 3px solid ${winner.color};">
            <h2 style="color: ${winner.color}; margin: 0 0 10px 0; font-size: 32px;">🏆 WINNER! 🏆</h2>
            <h3 style="margin: 10px 0; font-size: 24px;">${winner.name}</h3>
            <p style="font-size: 16px;">Congratulations!</p>
          </div>
        `;
        winnerDisplay.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
          winnerDisplay.style.display = 'none';
        }, 5000);
      }
    }
  }

  // Add any missing methods that might be called
  updateRaceProgress(data) {
    // Handle real-time race updates if needed
    console.log('Race progress update:', data);
  }

  // Update the updateDistributionLegend method in bettingClient.js with better styling
  updateDistributionLegend(data) {
    const distributionLegend = document.querySelector('.distribution-legend');
    if (!distributionLegend) {
      console.warn('Distribution legend element not found');
      return;
    }
    
    distributionLegend.innerHTML = '';
    
    // Sort by percentage (highest first) and filter out 0%
    const sortedData = Object.entries(data)
      .filter(([racerId, raceData]) => raceData.percentage > 0)
      .sort(([,a], [,b]) => b.percentage - a.percentage)
      .slice(0, 6); // Show top 6
    
    sortedData.forEach(([racerId, raceData]) => {
      const racer = this.racers.find(r => r.id == racerId);
      if (!racer) return;
      
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        margin: 4px 0;
        background: linear-gradient(135deg, rgba(30, 30, 40, 0.9), rgba(45, 45, 55, 0.9));
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
        min-height: 40px;
      `;
      
      // Left side container
      const leftSide = document.createElement('div');
      leftSide.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      `;
      
      // Color dot
      const colorDot = document.createElement('div');
      colorDot.style.cssText = `
        width: 12px;
        height: 12px;
        background: ${racer.color || '#ff69b4'};
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 0 8px ${racer.color}40;
      `;
      
      // Character image
      const imageContainer = document.createElement('div');
      imageContainer.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid ${racer.color || '#ff69b4'};
        flex-shrink: 0;
        background: ${racer.color || '#ff69b4'}20;
      `;
      
      const img = document.createElement('img');
      img.src = racer.avatar || `images/characters/${racer.name.toLowerCase()}-face.png`;
      img.alt = racer.name;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      
      img.onerror = () => {
        imageContainer.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            background: ${racer.color || '#ff69b4'};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">${racer.name.charAt(0).toUpperCase()}</div>
        `;
      };
      
      imageContainer.appendChild(img);
      
      // Character name
      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = `
        color: white;
        font-size: 14px;
        font-weight: 600;
        flex: 1;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      `;
      nameSpan.textContent = racer.name;
      
      // Right side container
      const rightSide = document.createElement('div');
      rightSide.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      `;
      
      // Percentage
      const percentSpan = document.createElement('span');
      percentSpan.style.cssText = `
        color: ${racer.color || '#ff69b4'};
        font-size: 16px;
        font-weight: bold;
        text-shadow: 0 0 8px ${racer.color}60;
      `;
      percentSpan.textContent = `${raceData.percentage.toFixed(1)}%`;
      
      // Odds (calculated from percentage)
      const odds = (100 / raceData.percentage).toFixed(2);
      const oddsSpan = document.createElement('span');
      oddsSpan.style.cssText = `
        color: #9ca3af;
        font-size: 11px;
        font-weight: 500;
      `;
      oddsSpan.textContent = `${odds}x`;
      
      // Assemble the legend item
      leftSide.appendChild(colorDot);
      leftSide.appendChild(imageContainer);
      leftSide.appendChild(nameSpan);
      
      rightSide.appendChild(percentSpan);
      rightSide.appendChild(oddsSpan);
      
      legendItem.appendChild(leftSide);
      legendItem.appendChild(rightSide);
      
      // Add hover effect
      legendItem.addEventListener('mouseenter', () => {
        legendItem.style.background = `linear-gradient(135deg, rgba(40, 40, 50, 0.9), rgba(55, 55, 65, 0.9))`;
        legendItem.style.transform = 'translateY(-2px)';
        legendItem.style.boxShadow = `0 4px 12px ${racer.color}30`;
      });
      
      legendItem.addEventListener('mouseleave', () => {
        legendItem.style.background = 'linear-gradient(135deg, rgba(30, 30, 40, 0.9), rgba(45, 45, 55, 0.9))';
        legendItem.style.transform = 'translateY(0)';
        legendItem.style.boxShadow = 'none';
      });
      
      distributionLegend.appendChild(legendItem);
    });
    
    console.log(`✅ Updated distribution legend with ${sortedData.length} items`);
  }
}
